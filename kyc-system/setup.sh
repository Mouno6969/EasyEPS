#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting KYC System Setup..."

# Detect environment
if [ -d "/data/data/com.termux" ]; then
    echo "📱 Termux detected. Installing dependencies..."
    pkg update && pkg upgrade -y
    pkg install python nodejs git cmake clang binutils libjpeg-turbo libpng -y
else
    echo "💻 VPS/Linux detected. Installing dependencies..."
    sudo apt update
    sudo apt install python3 python3-pip nodejs npm git cmake g++ -y
fi

# Backend Setup
echo "🐍 Setting up Backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cd ..

# Frontend Setup
echo "🌐 Setting up Frontend..."
cd frontend
npm install
cd ..

echo "✅ Setup Complete!"
echo "To start the system, run: ./run.sh"
