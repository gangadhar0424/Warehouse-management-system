#!/bin/bash

# Warehouse Management System - Quick Setup Script
# This script automates the initial setup process

echo "🎯 Warehouse Management System - Quick Setup"
echo "=============================================="
echo ""

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "📥 Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Check MongoDB installation
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB is not installed or not in PATH"
    echo "📥 Please install MongoDB from https://www.mongodb.com/try/download/community"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ MongoDB found: $(mongod --version | head -n 1)"
    echo ""
fi

# Navigate to server directory
cd "$(dirname "$0")/server" || exit

echo "📦 Installing server dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Server dependency installation failed"
    exit 1
fi

echo "✅ Server dependencies installed"
echo ""

# Navigate to client directory
cd ../client || exit

echo "📦 Installing client dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Client dependency installation failed"
    exit 1
fi

echo "✅ Client dependencies installed"
echo ""

# Go back to root
cd .. || exit

# Check if .env exists
if [ ! -f "server/.env" ]; then
    echo "📝 Creating .env file from template..."
    cp server/.env.example server/.env
    echo "⚠️  Please edit server/.env and add your credentials:"
    echo "   - GEMINI_API_KEY (Get from: https://makersuite.google.com/app/apikey)"
    echo "   - EMAIL_USER and EMAIL_PASS (Gmail App Password)"
    echo "   - JWT_SECRET (Generate a random 32+ character string)"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

echo "=============================================="
echo "🎉 Setup Complete!"
echo "=============================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Configure environment variables in server/.env"
echo "2. Start MongoDB:"
echo "   - Windows: net start MongoDB"
echo "   - macOS/Linux: brew services start mongodb-community"
echo ""
echo "3. Start the backend server:"
echo "   cd server && npm start"
echo ""
echo "4. Start the frontend (in a new terminal):"
echo "   cd client && npm start"
echo ""
echo "5. Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo ""
echo "📚 For detailed instructions, see SETUP_INSTRUCTIONS.md"
echo ""
