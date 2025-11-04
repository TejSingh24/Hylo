@echo off
title Hylo Frontend
color 0B
echo.
echo ================================================
echo   Hylo Auto Calculator - Frontend
echo ================================================
echo.
echo Starting frontend development server...
echo This will run on http://localhost:5173
echo.
echo IMPORTANT: Keep this window open!
echo.
echo After it starts, open your browser to:
echo http://localhost:5173
echo.
echo ================================================
echo.

cd /d "c:\Work\Hylo"
call npm run dev

pause
