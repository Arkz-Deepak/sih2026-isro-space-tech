@echo off
TITLE Project ASTRA-CLEAN Launcher
color 0B

echo ===============================================================================
echo            PROJECT ASTRA-CLEAN: MISSION CONTROL GROUND STATION
echo       Autonomous In-Orbit Servicing & Active Debris Mitigation (SIH26226)
echo ===============================================================================
echo.

echo [*] Starting Python FastAPI Astrodynamics Telemetry Bridge (Port 8000)...
start "ASTRA Backend Engine" cmd /k "cd /d %~dp0backend && python main.py"

timeout /t 2 /nobreak >nul

echo [*] Starting Next.js 15 Ground Control Station Web Dashboard (Port 3000)...
start "ASTRA Mission Control Web GCS" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 5 /nobreak >nul

echo [*] Opening Mission Control Dashboard in your browser...
start http://localhost:3000

echo.
echo ===============================================================================
echo [SUCCESS] All systems operational!
echo   - Backend Swagger API : http://localhost:8000/docs
echo   - Telemetry Stream    : ws://localhost:8000/ws/telemetry
echo   - 3D Web Dashboard    : http://localhost:3000
echo ===============================================================================
pause
