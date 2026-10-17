
@echo off
cd /d "%~dp0"

py -m pip install -r requirements.txt

if errorlevel 1 (
    echo Python package installation failed.
    pause
    exit /b 1
)

echo Starting FarmBot Auto Mode...
echo Open http://127.0.0.1:5000 in Chrome or Edge.
py server.py

pause
