@echo off
cd /d "C:\Users\tofm4\OneDrive\Development\Banking"
start python -m http.server 8000
timeout /t 2 /nobreak >nul
start http://localhost:8000/index.html


