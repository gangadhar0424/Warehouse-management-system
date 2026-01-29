@echo off
echo ========================================
echo  WAREHOUSE MANAGEMENT SYSTEM
echo  DATABASE RESET UTILITY
echo ========================================
echo.
echo WARNING: This will DELETE ALL DATA!
echo - All users (owners, customers, workers)
echo - All vehicles
echo - All transactions
echo - All storage allocations
echo - All loans
echo - All warehouse layouts
echo.
set /p confirm="Are you sure you want to continue? (yes/no): "

if /i "%confirm%"=="yes" (
    echo.
    echo Starting database reset...
    cd /d "%~dp0"
    node utils\resetDatabase.js
) else (
    echo.
    echo Reset cancelled.
    echo.
    pause
)
