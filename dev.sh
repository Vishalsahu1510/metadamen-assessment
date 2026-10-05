#!/usr/bin/env bash
echo "========================================================"
echo "🎙️  Starting VAANI™ AI Interview & Assessment Intelligence"
echo "========================================================"
echo ""

# Launch backend in background
echo "▶ Starting Backend API on http://localhost:5000..."
(cd backend && npm run dev) &
BACKEND_PID=$!

# Launch frontend in background
echo "▶ Starting Frontend UI on http://localhost:3000..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

# Trap SIGINT to kill both processes
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

echo "Both services are running!"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5000"
wait
