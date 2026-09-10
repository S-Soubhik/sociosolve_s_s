@echo off
title SocioSolve - Societal Challenges & Innovation Platform
echo ===============================================================
echo Starting SocioSolve (Societal Challenges Platform)
echo ===============================================================
echo.
echo Initializing database...
python database.py
echo.
echo Launching Flask Web Application on http://localhost:5000 ...
echo Press Ctrl+C to stop the server.
echo.
python app.py
pause
