# SocioSolve — Live Deployment Guide (Free Hosting)

This guide shows you how to make **SocioSolve** accessible to anyone in the world (judges, evaluators, teammates, and mobile users).

---

## 🌟 Method 1: Permanent 24/7 Free Cloud Deployment (Recommended)
**Result:** A permanent public link like `https://sociosolve.onrender.com` that stays online 24/7, even when your PC is turned off.

### Using Render.com (100% Free):
1. **Push your code to GitHub**:
   - Create a free account on [github.com](https://github.com).
   - Create a new public repository named `sociosolve`.
   - Upload the files from this folder (`societal-challenges-platform`) into the repository.
   *(All required files like `requirements.txt`, `Procfile`, and `app.py` are already created and configured!)*

2. **Deploy on Render**:
   - Go to [render.com](https://render.com) and click **Sign Up** (choose "Sign in with GitHub").
   - In your Render dashboard, click the blue **New +** button &rarr; select **Web Service**.
   - Click **Connect** next to your `sociosolve` GitHub repository.
   - Enter the settings:
     - **Name**: `sociosolve` (or any name you prefer)
     - **Region**: Singapore or Frankfurt (fastest for India)
     - **Branch**: `main`
     - **Runtime**: `Python 3`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `gunicorn app:app`
     - **Instance Type**: **Free**
   - Click **Deploy Web Service**.

3. **Done!**
   - In about 2 minutes, Render will provide your live URL (e.g. `https://sociosolve.onrender.com`).
   - Share this link with anyone — judges, citizens, and colleges can access it anytime!

---

## ⚡ Method 2: Instant Public Link from Your Computer (Takes 2 Minutes)
**Result:** An instant public HTTPS link (e.g. `https://xxxx.ngrok-free.app`) that forwards live traffic directly to your running Flask app.

### Using ngrok:
1. Open [ngrok.com](https://ngrok.com) and sign up for a free account.
2. Download ngrok for Windows (or install via PowerShell: `winget install ngrok`).
3. Connect your account with your auth token (shown on your ngrok dashboard):
   ```bash
   ngrok config add-authtoken <YOUR_TOKEN>
   ```
4. Start your Flask app:
   ```bash
   python app.py
   ```
5. In another terminal window, run:
   ```bash
   ngrok http 5000
   ```
6. ngrok will give you a public URL like:
   `https://a1b2-c3d4.ngrok-free.app` &rarr; Share this link with anyone!

---

## 🐍 Method 3: PythonAnywhere (No Git Required)
**Result:** `https://yourusername.pythonanywhere.com`

1. Go to [pythonanywhere.com](https://www.pythonanywhere.com) and create a free "Beginner" account.
2. Go to the **Files** tab and upload your files (or zip and extract).
3. Go to the **Web** tab &rarr; Click **Add a new web app** &rarr; Select **Flask** &rarr; Select **Python 3.10+**.
4. In the WSGI configuration file, point to `app.py`.
5. Click **Reload yourusername.pythonanywhere.com**.
