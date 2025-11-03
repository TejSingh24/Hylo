@echo off
title Hylo Backend Server
color 0A
echo.
echo ================================================
echo   Hylo Auto Calculator - Backend Server
echo ================================================
echo.
echo Starting backend server...
echo This will run on http://localhost:3001
echo.
echo IMPORTANT: Keep this window open!
echo.
echo ================================================
echo.

cd /d "c:\Work\Hylo\server"
call npm start

pause
