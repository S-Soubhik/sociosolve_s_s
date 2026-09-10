import os
import sqlite3
import random
import time
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from database import get_db, init_db, DB_PATH

# Auto-initialize database on fresh deployment if not present
try:
    if not os.path.exists(DB_PATH):
        print("Database not found. Initializing fresh SocioSolve database...")
        init_db()
except Exception as e:
    print(f"Database init check notice: {e}")

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, 'templates'),
    static_folder=os.path.join(BASE_DIR, 'static'),
    static_url_path='/static'
)

if os.environ.get('VERCEL') == '1':
    app.config['UPLOAD_FOLDER'] = '/tmp/uploads'
else:
    app.config['UPLOAD_FOLDER'] = os.path.join(BASE_DIR, 'static', 'uploads')

app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max

try:
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
except Exception as e:
    print(f"Notice creating upload folder: {e}")

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/favicon.ico')
def favicon():
    return ('', 204)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/problems', methods=['GET'])
def get_problems():
    conn = get_db()
    cursor = conn.cursor()

    category = request.args.get('category')
    status = request.args.get('status')
    search = request.args.get('search')

    query = '''
    SELECT p.*,
           ua.college_name, ua.project_title, ua.progress_percent, ua.team_lead,
           (SELECT SUM(amount_pledged) FROM industry_sponsorships WHERE problem_id = p.id) as total_funding
    FROM problems p
    LEFT JOIN university_adoptions ua ON p.id = ua.problem_id
    WHERE 1=1
    '''
    params = []

    if category and category != 'All':
        query += ' AND p.category = ?'
        params.append(category)

    if status and status != 'All':
        query += ' AND p.status = ?'
        params.append(status)

    if search:
        query += ' AND (p.title LIKE ? OR p.village LIKE ? OR p.district LIKE ? OR p.ticket_code LIKE ?)'
        like_str = f'%{search}%'
        params.extend([like_str, like_str, like_str, like_str])

    query += ' ORDER BY p.id DESC'
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    problems = [dict(row) for row in rows]
    return jsonify({'success': True, 'problems': problems})

@app.route('/api/problems/<int:problem_id>', methods=['GET'])
def get_problem_details(problem_id):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM problems WHERE id = ?', (problem_id,))
    problem_row = cursor.fetchone()
    if not problem_row:
        conn.close()
        return jsonify({'success': False, 'error': 'Problem not found'}), 404

    problem = dict(problem_row)

    # University adoption
    cursor.execute('SELECT * FROM university_adoptions WHERE problem_id = ?', (problem_id,))
    adoption_row = cursor.fetchone()
    adoption = dict(adoption_row) if adoption_row else None

    # Milestones if adopted
    milestones = []
    if adoption:
        cursor.execute('''
        SELECT * FROM project_milestones 
        WHERE adoption_id = ? 
        ORDER BY milestone_index ASC
        ''', (adoption['id'],))
        milestones = [dict(m) for m in cursor.fetchall()]

    # Sponsorships
    cursor.execute('SELECT * FROM industry_sponsorships WHERE problem_id = ? ORDER BY id DESC', (problem_id,))
    sponsorships = [dict(s) for s in cursor.fetchall()]

    # Updates timeline
    cursor.execute('SELECT * FROM problem_updates WHERE problem_id = ? ORDER BY id ASC', (problem_id,))
    updates = [dict(u) for u in cursor.fetchall()]

    conn.close()

    return jsonify({
        'success': True,
        'problem': problem,
        'adoption': adoption,
        'milestones': milestones,
        'sponsorships': sponsorships,
        'updates': updates
    })

@app.route('/api/problems', methods=['POST'])
def create_problem():
    try:
        title = request.form.get('title')
        category = request.form.get('category', 'General')
        village = request.form.get('village')
        district = request.form.get('district', 'Pune')
        state = request.form.get('state', 'Maharashtra')
        lat = float(request.form.get('lat', 18.5204))
        lng = float(request.form.get('lng', 73.8567))
        description = request.form.get('description')
        severity = request.form.get('severity', 'Medium')
        affected_count = int(request.form.get('affected_count', 100))
        citizen_name = request.form.get('citizen_name')
        citizen_contact = request.form.get('citizen_contact', '')

        if not title or not village or not description or not citizen_name:
            return jsonify({'success': False, 'error': 'Please fill all required fields'}), 400

        # Handle photo upload or default image
        photo_url = request.form.get('photo_url')
        if 'photo' in request.files:
            file = request.files['photo']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(f"{int(time.time())}_{file.filename}")
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                photo_url = f"/static/uploads/{filename}"

        if not photo_url:
            # High-res thematic placeholder based on category
            category_defaults = {
                'Waste Management': 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&w=800&q=80',
                'Clean Water & Sanitation': 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80',
                'AgriTech & Rural Energy': 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80',
                'Rural Infrastructure': 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
                'Healthcare & Assistive Tech': 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80'
            }
            photo_url = category_defaults.get(category, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80')

        ticket_code = f"SS-2026-{random.randint(1000, 9999)}"

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
        INSERT INTO problems (ticket_code, title, category, village, district, state, lat, lng, description, photo_url, severity, affected_count, citizen_name, citizen_contact, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Reported')
        ''', (ticket_code, title, category, village, district, state, lat, lng, description, photo_url, severity, affected_count, citizen_name, citizen_contact))

        problem_id = cursor.lastrowid

        # Add initial timeline update
        cursor.execute('''
        INSERT INTO problem_updates (problem_id, author_role, author_name, update_text, badge_status)
        VALUES (?, 'Citizen', ?, 'Problem registered via JanSetu portal with verified geotag and photo.', 'Reported')
        ''', (problem_id, citizen_name))

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Challenge successfully submitted!',
            'ticket_code': ticket_code,
            'problem_id': problem_id
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/problems/<int:problem_id>/adopt', methods=['POST'])
def adopt_problem(problem_id):
    try:
        data = request.get_json() or request.form
        college_name = data.get('college_name')
        department = data.get('department')
        team_lead = data.get('team_lead')
        team_members = data.get('team_members', '')
        faculty_mentor = data.get('faculty_mentor')
        project_title = data.get('project_title')
        proposed_solution = data.get('proposed_solution')

        if not college_name or not team_lead or not project_title or not proposed_solution:
            return jsonify({'success': False, 'error': 'Missing university team details'}), 400

        conn = get_db()
        cursor = conn.cursor()

        # Check existing adoption
        cursor.execute('SELECT id FROM university_adoptions WHERE problem_id = ?', (problem_id,))
        if cursor.fetchone():
            conn.close()
            return jsonify({'success': False, 'error': 'This challenge is already adopted by an engineering institution.'}), 400

        cursor.execute('''
        INSERT INTO university_adoptions (problem_id, college_name, department, team_lead, team_members, faculty_mentor, project_title, proposed_solution, progress_percent, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 20, 'In Progress')
        ''', (problem_id, college_name, department, team_lead, team_members, faculty_mentor, project_title, proposed_solution))
        adoption_id = cursor.lastrowid

        # Insert 5 standard engineering milestones
        standard_milestones = [
            (1, 'On-site Field Survey & Problem Scoping', 'Visit village, interview citizens, take measurements, and formulate technical requirements.', 'Completed'),
            (2, 'Engineering Design & Simulation', 'Low-cost mechanical, electrical or biological schematic design with CAD/BOM.', 'In Progress'),
            (3, 'Fabrication of Working Prototype', 'Assemble bench-scale test prototype in university maker laboratory.', 'Pending'),
            (4, 'Pilot Field Testing in Village', 'Execute 14-day field deployment with local community monitoring and feedback.', 'Pending'),
            (5, 'Village Handover & Operation Manual', 'Final deployment, training local youth or panchayat, and commercial documentation.', 'Pending')
        ]

        for idx, title, desc, m_status in standard_milestones:
            completed_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S') if m_status == 'Completed' else None
            cursor.execute('''
            INSERT INTO project_milestones (adoption_id, milestone_index, title, description, status, completed_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ''', (adoption_id, idx, title, desc, m_status, completed_at))

        # Update problem status
        cursor.execute('''
        UPDATE problems SET status = 'Adopted by University' WHERE id = ?
        ''', (problem_id,))

        # Add update timeline
        cursor.execute('''
        INSERT INTO problem_updates (problem_id, author_role, author_name, update_text, badge_status)
        VALUES (?, 'University', ?, ?, 'Adopted by University')
        ''', (problem_id, f"{college_name} ({team_lead})", f"Adopted as Capstone Project: '{project_title}'. Field study initiated under guide {faculty_mentor}."))

        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': 'Challenge successfully adopted by your university team!'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/problems/<int:problem_id>/milestones/<int:milestone_id>', methods=['POST'])
def update_milestone(problem_id, milestone_id):
    try:
        data = request.get_json() or {}
        new_status = data.get('status', 'Completed') # Completed, In Progress, Pending

        conn = get_db()
        cursor = conn.cursor()

        # Update milestone
        completed_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S') if new_status == 'Completed' else None
        cursor.execute('''
        UPDATE project_milestones 
        SET status = ?, completed_at = ? 
        WHERE id = ?
        ''', (new_status, completed_at, milestone_id))

        # Re-calculate overall adoption progress
        cursor.execute('SELECT adoption_id FROM project_milestones WHERE id = ?', (milestone_id,))
        m_row = cursor.fetchone()
        if m_row:
            adoption_id = m_row['adoption_id']
            cursor.execute('SELECT status FROM project_milestones WHERE adoption_id = ?', (adoption_id,))
            all_m = cursor.fetchall()
            completed_count = sum(1 for m in all_m if m['status'] == 'Completed')
            inprogress_count = sum(1 for m in all_m if m['status'] == 'In Progress')
            total = len(all_m) or 5
            calc_percent = int(((completed_count * 1.0) + (inprogress_count * 0.5)) / total * 100)
            calc_percent = min(100, max(10, calc_percent))

            cursor.execute('UPDATE university_adoptions SET progress_percent = ? WHERE id = ?', (calc_percent, adoption_id))

            # Update problem status based on milestones
            if calc_percent >= 90:
                cursor.execute("UPDATE problems SET status = 'Resolved & Handed Over' WHERE id = ?", (problem_id,))
            elif calc_percent >= 50:
                cursor.execute("UPDATE problems SET status = 'Field Testing' WHERE id = ?", (problem_id,))
            else:
                cursor.execute("UPDATE problems SET status = 'Prototype In Progress' WHERE id = ?", (problem_id,))

            cursor.execute('''
            INSERT INTO problem_updates (problem_id, author_role, author_name, update_text, badge_status)
            VALUES (?, 'University', 'Engineering Team', ?, 'Prototype In Progress')
            ''', (problem_id, f"Project milestone updated. Current solution progress reached {calc_percent}%."))

        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Milestone updated successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/problems/<int:problem_id>/sponsor', methods=['POST'])
def sponsor_problem(problem_id):
    try:
        data = request.get_json() or request.form
        company_name = data.get('company_name')
        sponsor_type = data.get('sponsor_type', 'Prototyping Grant & CSR')
        amount_pledged = int(data.get('amount_pledged', 50000))
        mentor_assigned = data.get('mentor_assigned', 'Senior CSR Technical Advisor')
        notes = data.get('notes', 'Pledged CSR grant for rapid student prototyping and pilot manufacturing.')

        if not company_name or amount_pledged <= 0:
            return jsonify({'success': False, 'error': 'Please provide company name and valid funding amount'}), 400

        conn = get_db()
        cursor = conn.cursor()

        cursor.execute('''
        INSERT INTO industry_sponsorships (problem_id, company_name, sponsor_type, amount_pledged, mentor_assigned, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        ''', (problem_id, company_name, sponsor_type, amount_pledged, mentor_assigned, notes))

        cursor.execute('''
        UPDATE problems SET status = 'CSR Sponsored' WHERE id = ? AND status != 'Resolved & Handed Over' AND status != 'Field Testing'
        ''', (problem_id,))

        cursor.execute('''
        INSERT INTO problem_updates (problem_id, author_role, author_name, update_text, badge_status)
        VALUES (?, 'Industry', ?, ?, 'CSR Sponsored')
        ''', (problem_id, company_name, f"Pledged ₹{amount_pledged:,} CSR support with mentorship: {mentor_assigned}."))

        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': f'Thank you! ₹{amount_pledged:,} CSR sponsorship recorded.'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT COUNT(*) FROM problems')
    total_problems = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM problems WHERE status = 'Resolved & Handed Over'")
    resolved_count = cursor.fetchone()[0]

    cursor.execute('SELECT COUNT(*) FROM university_adoptions')
    active_projects = cursor.fetchone()[0]

    cursor.execute('SELECT COALESCE(SUM(amount_pledged), 0) FROM industry_sponsorships')
    total_csr_pledged = cursor.fetchone()[0]

    cursor.execute('SELECT COALESCE(SUM(affected_count), 0) FROM problems')
    total_citizens_impacted = cursor.fetchone()[0]

    # Category breakdown
    cursor.execute('SELECT category, COUNT(*) as count FROM problems GROUP BY category')
    category_rows = cursor.fetchall()
    categories = {row['category']: row['count'] for row in category_rows}

    # Status breakdown
    cursor.execute('SELECT status, COUNT(*) as count FROM problems GROUP BY status')
    status_rows = cursor.fetchall()
    statuses = {row['status']: row['count'] for row in status_rows}

    conn.close()

    return jsonify({
        'success': True,
        'metrics': {
            'total_problems': total_problems,
            'resolved_count': resolved_count,
            'active_projects': active_projects,
            'total_csr_pledged': total_csr_pledged,
            'total_citizens_impacted': total_citizens_impacted
        },
        'categories': categories,
        'statuses': statuses
    })

@app.route('/api/reset-demo', methods=['POST'])
def reset_demo():
    init_db()
    return jsonify({'success': True, 'message': 'Demo database successfully reset with fresh seed data.'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting SocioSolve Platform on http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
