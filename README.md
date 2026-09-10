# SocioSolve — Societal Challenges & Innovation Platform
### **Grassroots Problem Resolution & University-Industry Innovation Exchange**

> **Vision:** A collaborative public innovation exchange platform where citizens report local community challenges (rural & urban), engineering universities adopt them for accredited R&D and capstone projects, and industry sponsors prototype development through corporate CSR grants.

---

## 🚀 Vercel Deployment Steps

This project is fully optimized for one-click deployment on **Vercel** using `@vercel/python`.

### Method 1: Deploying via Vercel Dashboard (Recommended)

1. **Push to GitHub**:
   - Create a repository on GitHub (e.g., `sociosolve`).
   - Push all files from this project directory.

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com) and log in.
   - Click **Add New...** &rarr; **Project**.
   - Import your `sociosolve` GitHub repository.

3. **Configure & Deploy**:
   - Vercel automatically detects `vercel.json` and configures the `@vercel/python` runtime.
   - **Framework Preset**: Select **Other**.
   - (Optional) Set Environment Variables in Vercel settings (see list below).
   - Click **Deploy**.

4. **Live URL**:
   - In ~1 minute, Vercel will provide your live URL (e.g. `https://sociosolve.vercel.app`).

---

## 🔑 Environment Variables

If deploying on Vercel or production hosting, set the following optional environment variables:

| Variable Name | Required | Default | Description |
|---|---|---|---|
| `FLASK_ENV` | Optional | `production` | Flask execution mode |
| `PORT` | Optional | `5000` | Local server port |
| `SECRET_KEY` | Optional | `default-secret` | Flask session secret key |

---

## 🛠️ Local Development & Build Verification

### 1. Installation
```bash
# Install npm dependencies (if using npm workflow)
npm install

# Install Python requirements
pip install -r requirements.txt
```

### 2. Run Local Development Server
```bash
# Option A: Using npm script
npm start

# Option B: Direct Python execution
python app.py
```
Open **http://localhost:5000** in your browser.

### 3. Production Build Test
```bash
npm run build
```

---

## 💻 Tech Stack & Architecture

- **Backend**: Python 3.10+, Flask RESTful API
- **Database**: SQLite3 (`samadhan.db`), automatically using `/tmp/samadhan.db` in Vercel serverless environments
- **Frontend**: Responsive Single Page App (SPA) built with HTML5, Tailwind CSS, FontAwesome 6
- **GIS Mapping**: Interactive Leaflet.js GIS map with custom geotag pins across India
- **Data Visualization**: Chart.js (Sector breakdown & Innovation pipeline analytics)
- **Deployment**: Vercel `@vercel/python` Serverless Functions

---

## 🌟 Platform Highlights

1. **Citizen Hub**: Fast geo-tagged reporting with photo evidence, public tracking ticket (`SS-2026-101`), and transparent status updates.
2. **University R&D Hub**: Engineering project adoption (COEP, NIT, IISc, Jadavpur), faculty mentorship, and 5-stage milestone tracking.
3. **Industry CSR Marketplace**: Section 135 compliant CSR funding marketplace with milestone-linked grants.
4. **Impact Dashboard & GIS Map**: Interactive India map and live KPI metrics.
