@echo off
cd /d "%~dp0"
py -3.13 scripts\ingest.py
if errorlevel 1 (
  echo Captura aturada. Es conserva el cataleg anterior.
  pause
  exit /b 1
)
echo Dades actualitzades. Executa Prepara-netlify.cmd si vols generar un paquet nou.
pause
