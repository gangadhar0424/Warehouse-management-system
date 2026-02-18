@echo off
REM Warehouse Management System - Quick Setup Script for Windows
REM This script automates the initial setup process

echo.
echo ============================================
echo    Warehouse Management System - Setup
echo ============================================
echo.

REM Check Node.js installation
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found
node --version
echo.

REM Check npm installation
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed
    pause
    exit /b 1
)

echo [OK] npm found
npm --version
echo.

REM Navigate to server directory
cd /d "%~dp0server"

echo ============================================
echo Installing server dependencies...
echo ============================================
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Server dependency installation failed
    pause
    exit /b 1
)

echo.
echo [OK] Server dependencies installed
echo.

REM Navigate to client directory
cd /d "%~dp0client"

echo ============================================
echo Installing client dependencies...
echo ============================================
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Client dependency installation failed
    pause
    exit /b 1
)

echo.
echo [OK] Client dependencies installed
echo.

REM Go back to root
cd /d "%~dp0"

REM Check if .env exists
if not exist "server\.env" (
    echo ============================================
    echo Creating .env file from template...
    echo ============================================
    copy "server\.env.example" "server\.env"
    echo.
    echo [WARNING] Please edit server\.env and add your credentials:
    echo   - GEMINI_API_KEY ^(Get from: https://makersuite.google.com/app/apikey^)
    echo   - EMAIL_USER and EMAIL_PASS ^(Gmail App Password^)
    echo   - JWT_SECRET ^(Generate a random 32+ character string^)
    echo.
) else (
    echo [OK] .env file already exists
    echo.
)

echo.
echo ============================================
echo          Setup Complete!
echo ============================================
echo.
echo Next Steps:
echo.
echo 1. Configure environment variables in server\.env
echo.
echo 2. Start MongoDB:
echo    net start MongoDB
echo.
echo 3. Start the backend server:
echo    cd server
echo    npm start
echo.
echo 4. Open a NEW terminal and start the frontend:
echo    cd client
echo    npm start
echo.
echo 5. Access the application:
echo    Frontend: http://localhost:3000
echo    Backend API: http://localhost:5000
echo.
echo For detailed instructions, see SETUP_INSTRUCTIONS.md
echo.
pause
