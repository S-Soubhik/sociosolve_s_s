import sqlite3
import os
import shutil
from datetime import datetime

# Serverless environment detection (Vercel / AWS Lambda)
IS_VERCEL = os.environ.get('VERCEL') == '1' or os.environ.get('AWS_LAMBDA_FUNCTION_NAME') is not None
SEED_DB_PATH = os.path.join(os.path.dirname(__file__), 'samadhan.db')

if IS_VERCEL:
    DB_PATH = '/tmp/samadhan.db'
else:
    DB_PATH = SEED_DB_PATH

def get_db():
    if IS_VERCEL and not os.path.exists(DB_PATH):
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        if os.path.exists(SEED_DB_PATH):
            try:
                shutil.copy2(SEED_DB_PATH, DB_PATH)
            except Exception as e:
                print(f"Failed to copy seed database to /tmp: {e}")
                init_db()
        else:
            init_db()

    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.executescript('''
    DROP TABLE IF EXISTS problem_updates;
    DROP TABLE IF EXISTS project_milestones;
    DROP TABLE IF EXISTS industry_sponsorships;
    DROP TABLE IF EXISTS university_adoptions;
    DROP TABLE IF EXISTS problems;

    CREATE TABLE problems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_code TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        village TEXT NOT NULL,
        district TEXT NOT NULL,
        state TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        description TEXT NOT NULL,
        photo_url TEXT,
        severity TEXT DEFAULT 'Medium',
        affected_count INTEGER DEFAULT 100,
        citizen_name TEXT NOT NULL,
        citizen_contact TEXT,
        status TEXT DEFAULT 'Reported',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE university_adoptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        problem_id INTEGER NOT NULL,
        college_name TEXT NOT NULL,
        department TEXT NOT NULL,
        team_lead TEXT NOT NULL,
        team_members TEXT,
        faculty_mentor TEXT NOT NULL,
        project_title TEXT NOT NULL,
        proposed_solution TEXT NOT NULL,
        progress_percent INTEGER DEFAULT 20,
        status TEXT DEFAULT 'In Progress',
        adopted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
    );

    CREATE TABLE project_milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        adoption_id INTEGER NOT NULL,
        milestone_index INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'Pending',
        completed_at DATETIME,
        FOREIGN KEY (adoption_id) REFERENCES university_adoptions(id) ON DELETE CASCADE
    );

    CREATE TABLE industry_sponsorships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        problem_id INTEGER NOT NULL,
        company_name TEXT NOT NULL,
        sponsor_type TEXT NOT NULL,
        amount_pledged INTEGER DEFAULT 0,
        mentor_assigned TEXT,
        notes TEXT,
        pledged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
    );

    CREATE TABLE problem_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        problem_id INTEGER NOT NULL,
        author_role TEXT NOT NULL,
        author_name TEXT NOT NULL,
        update_text TEXT NOT NULL,
        badge_status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
    );
    ''')

    # Seed data
    problems_data = [
        (
            'SS-2026-101',
            'Garbage not collected for 5 days near Village Square & School',
            'Waste Management',
            'XYZ Village',
            'Pune',
            'Maharashtra',
            18.847,
            73.864,
            'Garbage has not been collected for 5 days. Village dump site is overflowing right adjacent to the Zilla Parishad primary school. Stray animals, rodents, and foul stench are creating acute sanitation risks for over 450 school children and residents.',
            'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&w=800&q=80',
            'Critical',
            450,
            'Ramesh Patil (Ward 3 Resident)',
            '+91 98230 45120',
            'Prototype In Progress',
            '2026-09-02 09:30:00'
        ),
        (
            'SS-2026-102',
            'High Fluoride Contamination in Community Borewell Water',
            'Clean Water & Sanitation',
            'Rampur Village',
            'Nalgonda',
            'Telangana',
            17.058,
            79.268,
            'Groundwater tests show fluoride levels at 3.4 mg/L (safe limit: 1.0 mg/L). Several children and elderly show early symptoms of skeletal fluorosis. The village requires a low-cost, low-maintenance household or community-level de-fluoridation system.',
            'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80',
            'Critical',
            1200,
            'Lakshmi Narsimha (Panchayat Sarpanch)',
            '+91 94401 88312',
            'CSR Sponsored',
            '2026-08-28 11:15:00'
        ),
        (
            'SS-2026-103',
            'Tomato Post-Harvest Spoilage Due to Frequent Rural Grid Outages',
            'AgriTech & Rural Energy',
            'Srinivasapura',
            'Kolar',
            'Karnataka',
            13.344,
            78.212,
            'Smallholder farmers lose up to 35% of freshly harvested tomatoes during peak summer because of 8-hour daily power blackouts. Need a decentralized solar-assisted evaporative cool chamber that can preserve 1-2 tons of produce at farm-gate cost.',
            'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80',
            'High',
            320,
            'Venkatappa Gowda (Farmers Producer Org)',
            '+91 97312 60419',
            'Field Testing',
            '2026-08-20 14:00:00'
        ),
        (
            'SS-2026-104',
            'Severe Monsoon Pothole Crater on Feeder Road to Primary Health Centre',
            'Rural Infrastructure',
            'Sinnar Rural',
            'Nashik',
            'Maharashtra',
            19.845,
            74.002,
            'A 2.5 km stretch of road connecting 4 hamlets to the Taluka hospital has developed dangerous 1-foot deep craters following recent rains. Ambulances are delayed by 40 minutes, causing medical emergencies.',
            'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
            'High',
            1800,
            'Sunil Deshmukh (Gram Panchayat Member)',
            '+91 98221 34990',
            'Adopted by University',
            '2026-09-04 16:45:00'
        ),
        (
            'SS-2026-105',
            'Vaccine Cold-Chain Storage Outage in Off-Grid Coastal Hamlet',
            'Healthcare & Assistive Tech',
            'Gosaba Island',
            'South 24 Parganas',
            'West Bengal',
            22.164,
            88.807,
            'The sub-center clinic lacks reliable electricity to store child immunization vaccines and anti-venom vials. Need an ultra-low-power, solar-thermal portable vaccine cooler resistant to saline cyclone conditions.',
            'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
            'Critical',
            850,
            'Arundhati Mondal (ANM Health Worker)',
            '+91 94332 10765',
            'Prototype In Progress',
            '2026-08-15 10:00:00'
        ),
        (
            'SS-2026-106',
            'Unsegregated Plastic Waste Clogging Village Irrigation Canal',
            'Waste Management',
            'Bhiwadi Peripheral',
            'Alwar',
            'Rajasthan',
            27.923,
            76.852,
            'Irrigation canal carrying canal water to 600 acres of mustard farms is choked with single-use plastic and synthetic wrappers, preventing water flow to tail-end farms.',
            'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
            'Medium',
            210,
            'Balram Yadav (Farmer)',
            '+91 99280 44102',
            'Reported',
            '2026-09-06 18:20:00'
        )
    ]

    cursor.executemany('''
    INSERT INTO problems (ticket_code, title, category, village, district, state, lat, lng, description, photo_url, severity, affected_count, citizen_name, citizen_contact, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', problems_data)

    # University Adoptions
    adoptions_data = [
        (
            1, # XYZ village garbage
            'COEP Technological University, Pune',
            'Environmental & Mechanical Engineering',
            'Aditya Kulkarni (Final Year B.Tech)',
            'Neha Joshi, Rohan Mane, Tanvi Shinde',
            'Dr. Pradeep Sawant (Professor, Rural Tech Lab)',
            'Jan-Compost: Solar-Assisted Micro Bio-Composter & Low-Cost Waste Segregator',
            'Developing a decentralized 100 kg/day modular composter with an automated solar rotary drum and bio-enzyme spray. Eliminates landfill dumping and turns village organic waste into high-grade organic manure within 18 days.',
            65,
            'In Progress',
            '2026-09-03 14:00:00'
        ),
        (
            2, # Rampur fluoride
            'National Institute of Technology (NIT), Warangal',
            'Chemical & Civil Engineering',
            'K. Sai Krishna (M.Tech Water Resources)',
            'M. Sravani, V. Teja',
            'Dr. K. V. Jayakumar (Dean R&D)',
            'Nano-Activated Alumina & Bio-Char Gravity De-fluoridation Unit',
            'Zero-electricity gravity-fed community filtration column using modified local clay and agricultural waste bio-char, reducing fluoride from 3.4 mg/L to under 0.8 mg/L at under 5 paise per liter.',
            80,
            'In Progress',
            '2026-08-30 16:30:00'
        ),
        (
            3, # Tomato cold storage
            'Indian Institute of Science (IISc), Bangalore / RVCE',
            'Sustainable Technologies & Energy Systems',
            'Harish Gowda (Research Scholar)',
            'Deepak R., Meera Nair',
            'Prof. Monto Mani (Centre for Sustainable Technologies)',
            'Surya-Sheetal: Solar-Biomass Hybrid Cold Room (2-Ton Capacity)',
            'Phase-change material (PCM) thermal storage combined with rooftop solar PV that sustains 12-14°C storage temperature for tomatoes for up to 21 days without grid dependency.',
            90,
            'In Progress',
            '2026-08-22 10:00:00'
        ),
        (
            4, # Sinnar Pothole
            'K. K. Wagh Institute of Engineering Education & Research, Nashik',
            'Civil & Infrastructure Engineering',
            'Pooja Patil (B.Tech Civil)',
            'Sanket Gaikwad, Aniket Tambe',
            'Dr. Sunil Kute (Head of Civil Dept)',
            'Eco-Pave: Recycled Plastic & Agro-Waste Geopolymer Cold-Patch Compound',
            'Cold-mix instant repair formulation using shredded recycled plastic waste and fly ash that cures in 2 hours even during rain, costing 60% less than conventional bitumen.',
            30,
            'In Progress',
            '2026-09-05 12:00:00'
        ),
        (
            5, # Sundarbans vaccine cooler
            'Jadavpur University, Kolkata',
            'Biomedical & Electrical Engineering',
            'Subham Roy (B.Tech Electrical)',
            'Ananya Das, Pritam Mukherjee',
            'Dr. Balaram Neogi',
            'Hing-Cool: Solar-Peltier Smart Thermoelectric Vaccine Carrier with IoT Monitor',
            'Lightweight, floatable thermoelectric cooler maintaining 2-8°C for 48 hours with solar back-pack panel and GSM-based temperature SMS alerts for rural healthcare workers.',
            55,
            'In Progress',
            '2026-08-18 11:30:00'
        )
    ]

    cursor.executemany('''
    INSERT INTO university_adoptions (problem_id, college_name, department, team_lead, team_members, faculty_mentor, project_title, proposed_solution, progress_percent, status, adopted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', adoptions_data)

    # Milestones for Adoption 1 (XYZ Village)
    milestones_data = [
        (1, 1, 'Site Inspection & Waste Audit in XYZ Village', 'Conducted physical survey of dump site with Gram Panchayat and measured 280 kg/day daily organic waste.', 'Completed', '2026-09-04 17:00:00'),
        (1, 2, 'CAD Modeling & Mechanical Drum Design', 'Engineered rotary drum specifications with 12V DC gear motor and solar panel sizing.', 'Completed', '2026-09-06 18:30:00'),
        (1, 3, 'Fabrication of Working Prototype v1', 'Welding and assembly of composter drum, bio-enzyme dispenser, and odor-carbon filter.', 'In Progress', None),
        (1, 4, 'Village Pilot Deployment & Odor Testing', '14-day continuous operation trial in XYZ Village with local sanitary staff.', 'Pending', None),
        (1, 5, 'Final Handover & Panchayat Maintenance Manual', 'Training village youth and establishing compost buyback model for farmers.', 'Pending', None),

        # Milestones for Adoption 3 (Tomato cold storage)
        (3, 1, 'Thermal Load Calculation & Farmer Survey', 'Interviewed 40 farmers in Kolar to establish load profile and target temperature.', 'Completed', '2026-08-24 15:00:00'),
        (3, 2, 'PCM Material Testing & Solar Hybrid Circuit', 'Lab testing of paraffin wax PCM canisters with 1.2 kW solar PV array.', 'Completed', '2026-08-28 16:00:00'),
        (3, 3, 'Chamber Construction & Insulated Enclosure', 'Assembled polyurethane insulated chamber at farm site.', 'Completed', '2026-09-02 12:00:00'),
        (3, 4, 'Field Validation with 1.5 Tons of Fresh Tomatoes', 'Testing shelf-life extension and moisture retention vs ambient control.', 'In Progress', None),
        (3, 5, 'Commercial Cost Audit & Farmer Co-op Handover', 'Formulating micro-financing model for farmer cluster.', 'Pending', None)
    ]

    cursor.executemany('''
    INSERT INTO project_milestones (adoption_id, milestone_index, title, description, status, completed_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', milestones_data)

    # Industry Sponsorships
    sponsorships_data = [
        (
            1, # XYZ Village
            'Tata Motors Sustainability & CSR Wing',
            'Prototyping Grant & Technical Mentorship',
            150000,
            'Vikram Singhania (Senior Lead, Green Mobility & CSR)',
            'Pledged ₹1,50,000 fabrication grant and provided access to Pune plant fabrication machinery and engineering mentors.',
            '2026-09-05 15:30:00'
        ),
        (
            2, # Rampur Water
            'Vedanta Foundation - Jal Jeevan CSR Initiative',
            'Filtration Media & Village Pilot Funding',
            200000,
            'Sunita Krishnan (CSR Water Lead)',
            'Full sponsorship of activated alumina media for 5 community water kiosks and testing lab kits.',
            '2026-08-31 14:00:00'
        ),
        (
            3, # Tomato Cold Storage
            'Mahindra & Mahindra Farm Equipment Division',
            'CSR Scale-up & Manufacturing Support',
            350000,
            'Rajeev Sharma (VP, Rural Innovations)',
            'Pledged ₹3,50,000 for field prototype scale-up and offering commercial manufacturing line assistance for state-wide distribution.',
            '2026-08-25 17:00:00'
        ),
        (
            5, # Sundarbans Vaccine Cooler
            'Serum Institute Rural Health Outreach',
            'Biomedical Grant & Field Trials',
            250000,
            'Dr. Arindam Ghosh (Chief Medical Officer, Public Health)',
            'Support for WHO standard temperature compliance testing and supply of 20 pilot units for Sunderbans island clinics.',
            '2026-08-20 16:00:00'
        )
    ]

    cursor.executemany('''
    INSERT INTO industry_sponsorships (problem_id, company_name, sponsor_type, amount_pledged, mentor_assigned, notes, pledged_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', sponsorships_data)

    # Problem Updates Timeline
    updates_data = [
        (1, 'Citizen', 'Ramesh Patil (Ward 3)', 'Submitted problem report with live location coordinates and photo evidence of uncollected garbage.', 'Reported', '2026-09-02 09:30:00'),
        (1, 'District Administration', 'Block Development Officer (BDO)', 'Verified complaint as genuine community health priority. Released challenge to state university network.', 'Verified', '2026-09-03 10:15:00'),
        (1, 'University', 'COEP Tech Team EcoClean', 'Adopted problem for final year capstone engineering. Initiated waste audit with 5 student researchers.', 'Adopted by University', '2026-09-03 14:00:00'),
        (1, 'Industry', 'Tata Motors CSR', 'Approved ₹1,50,000 prototyping grant and appointed senior mechanical engineer as project mentor.', 'CSR Sponsored', '2026-09-05 15:30:00'),
        (1, 'University', 'COEP Tech Team EcoClean', 'Milestone 2 CAD design complete! Drum fabrication underway at Pune Maker Lab. 65% progress achieved.', 'Prototype In Progress', '2026-09-07 11:45:00'),

        (2, 'Citizen', 'Lakshmi Narsimha (Sarpanch)', 'Reported high fluoride water crisis causing dental and bone fluorosis among schoolchildren.', 'Reported', '2026-08-28 11:15:00'),
        (2, 'University', 'NIT Warangal Water Lab', 'Adopted challenge. Tested water samples and designed low-cost bio-char alumina filtration column.', 'Adopted by University', '2026-08-30 16:30:00'),
        (2, 'Industry', 'Vedanta Foundation', 'Pledged ₹2,00,000 CSR funding for pilot installation across 5 community drinking stations.', 'CSR Sponsored', '2026-08-31 14:00:00')
    ]

    cursor.executemany('''
    INSERT INTO problem_updates (problem_id, author_role, author_name, update_text, badge_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', updates_data)

    conn.commit()
    conn.close()
    print("Database initialized successfully.")

if __name__ == '__main__':
    init_db()
