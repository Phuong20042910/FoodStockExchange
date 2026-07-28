@echo off
title Food Stock Exchange Runner
echo =========================================================
echo       KHOI CHAY TOAN BO DU AN FOOD STOCK EXCHANGE
echo =========================================================
echo.

echo [+] Dang khoi chay Python AI Service (Port 8000)...
start "1. Python AI Service" cmd /k "cd AI_Python_Service && python main.py"

timeout /t 2 /nobreak > nul

echo [+] Dang khoi chay NodeJS Backend (Port 5000)...
start "2. NodeJS Backend" cmd /k "cd Backend_NodeJS && npm run dev"

timeout /t 2 /nobreak > nul

echo [+] Dang khoi chay React Frontend (Port 5173)...
start "3. React Frontend" cmd /k "cd Frontend_React && npm run dev"

echo.
echo =========================================================
echo [OK] Ca 3 dich vu dang duoc khoi chay trong 3 cua so rieng!
echo ban co the theo doi log cua tung dich vu o cac cua so do.
echo =========================================================
echo.
pause
