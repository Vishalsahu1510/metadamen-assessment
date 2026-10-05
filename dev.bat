@echo off
echo ========================================================
echo 🎙️  Starting VAANI™ AI Interview & Assessment Intelligence
echo ========================================================
echo.
echo Starting Backend API on http://localhost:5000 ...
start "VAANI Backend API" cmd /k "cd backend && npm run dev"

echo Starting Frontend UI on http://localhost:3000 ...
start "VAANI Frontend UI" cmd /k "cd frontend && npm run dev"

echo.
echo Both services are booting!
echo Frontend will be accessible at: http://localhost:3000
echo Backend will be accessible at:  http://localhost:5000
echo.
