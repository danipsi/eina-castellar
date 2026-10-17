@echo off
cd /d "%~dp0"
rem pypdf llegeix les actes del Ple; sense ella les mocions queden sense resultat.
py -3.13 -m pip install -q --disable-pip-version-check -r requirements.txt
if errorlevel 1 echo Avis: no s'han pogut instal.lar les dependencies. Les actes del Ple no es llegiran.
py -3.13 scripts\ingest.py
if errorlevel 1 (
  echo Captura aturada. Es conserva el cataleg anterior.
  pause
  exit /b 1
)
echo Dades actualitzades. Executa Prepara-netlify.cmd si vols generar un paquet nou.
pause
