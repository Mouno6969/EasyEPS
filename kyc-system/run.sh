#!/bin/bash

# Kill background processes on exit
trap "kill 0" EXIT

echo "🚀 Starting KYC System..."

# Get local IP
LOCAL_IP=$(hostname -I | awk '{print $1}')
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP="localhost"
fi

# Backend
echo "🐍 Starting Backend on port 8000..."
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
cd ..

# Wait for backend to start
sleep 5

# Frontend
echo "🌐 Starting Frontend on port 3000..."
cd frontend
export NEXT_PUBLIC_API_URL="http://$LOCAL_IP:8000"
npm run dev -- -p 3000 &
cd ..

echo "✨ KYC System is running!"
echo "User Interface: http://$LOCAL_IP:3000"
echo "Admin Dashboard: http://$LOCAL_IP:3000/admin"
echo "Backend API: http://$LOCAL_IP:8000"

wait
