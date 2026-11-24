@echo off
REM ============================================================================
REM  demarrer.bat - Lancement local de NutriFish GMAO (http://localhost:3010)
REM
REM  Etapes :
REM    1. Verifie Node.js / npm et le fichier .env
REM    2. Demarre PostgreSQL (service Docker "db", port 5433) si Docker est present
REM    3. Installe les dependances si node_modules est absent
REM    4. Genere le client Prisma s'il est absent ou plus ancien que schema.prisma
REM    5. Lance Next.js en mode dev sur le port 3010 et ouvre le navigateur
REM
REM  Aucune modification du schema de la base n'est faite ici (pas de db push) :
REM  les migrations restent manuelles (voir prisma\migrations_pending\README.md).
REM ============================================================================
setlocal EnableExtensions
chcp 65001 >nul <nul
title NutriFish GMAO - serveur local (port 3010)

cd /d "%~dp0"

set "PORT=3010"
set "APP_URL=http://localhost:%PORT%"

echo.
echo  ===== NutriFish GMAO - demarrage local =====
echo.

REM --- 1. Node.js / npm -------------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] Node.js est introuvable dans le PATH.
  echo          Installez Node.js LTS : https://nodejs.org/ puis relancez ce fichier.
  goto :fail
)

REM npm.cmd (et non npm.ps1) pour eviter les blocages ExecutionPolicy PowerShell.
set "NPM="
for /f "delims=" %%i in ('where npm.cmd 2^>nul') do if not defined NPM set "NPM=%%i"
if not defined NPM (
  echo [ERREUR] npm est introuvable. Reinstallez Node.js LTS : https://nodejs.org/
  goto :fail
)
for /f "delims=" %%v in ('node --version') do echo [OK] Node.js %%v

REM --- 2. Fichier .env --------------------------------------------------------
if not exist ".env" (
  echo [ERREUR] Fichier .env introuvable a la racine du projet.
  echo          Copiez .env.example ou env.docker.template vers .env,
  echo          puis renseignez DATABASE_URL avant de relancer.
  goto :fail
)
echo [OK] Fichier .env present

REM --- Serveur deja lance ? ---------------------------------------------------
netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul
if not errorlevel 1 (
  echo [INFO] Le port %PORT% est deja utilise : l'application tourne probablement deja.
  echo        Ouverture de %APP_URL% ...
  start "" "%APP_URL%"
  goto :end
)

REM --- 3. PostgreSQL via Docker (non bloquant) --------------------------------
where docker >nul 2>nul
if errorlevel 1 (
  echo [INFO] Docker non trouve : verifiez que PostgreSQL tourne et que DATABASE_URL est correct.
  goto :deps
)
docker info >nul 2>nul
if errorlevel 1 (
  echo [ATTENTION] Docker Desktop n'est pas demarre : lancez-le si la base est dans Docker.
  goto :deps
)
echo [Docker] Demarrage de PostgreSQL (service db, port 5433)...
docker compose up -d db >nul
if errorlevel 1 (
  echo [ATTENTION] "docker compose up -d db" a echoue. Verifiez Docker Desktop.
  goto :deps
)
set /a TRIES=0
:wait_db
docker compose exec -T db pg_isready -q >nul 2>nul
if not errorlevel 1 (
  echo [OK] PostgreSQL pret
  goto :deps
)
set /a TRIES+=1
if %TRIES% geq 15 (
  echo [ATTENTION] PostgreSQL ne repond pas encore ; l'application affichera une erreur de base si besoin.
  goto :deps
)
ping -n 3 127.0.0.1 >nul
goto :wait_db

REM --- 4. Dependances ---------------------------------------------------------
:deps
if not exist "node_modules\next\dist\bin\next" (
  echo [npm] node_modules absent ou incomplet : installation des dependances...
  call "%NPM%" install
  if errorlevel 1 (
    echo [ERREUR] npm install a echoue. Verifiez la connexion Internet et les messages ci-dessus.
    goto :fail
  )
) else (
  echo [OK] Dependances installees
)

REM --- 5. Client Prisma (si absent ou plus ancien que le schema) --------------
node -e "const fs=require('fs');const c='node_modules/.prisma/client/index.js';process.exit(fs.existsSync(c)&&fs.statSync(c).mtimeMs>=fs.statSync('prisma/schema.prisma').mtimeMs?0:1)"
if errorlevel 1 (
  echo [Prisma] Generation du client Prisma...
  call "%NPM%" run db:generate
  if errorlevel 1 (
    echo [ERREUR] La generation du client Prisma a echoue ^(voir messages ci-dessus^).
    goto :fail
  )
) else (
  echo [OK] Client Prisma a jour
)

REM --- 6. Ouverture du navigateur des que le serveur repond --------------------
start "" /b powershell -NoProfile -WindowStyle Hidden -Command ^
  "for($i=0;$i -lt 90;$i++){try{Invoke-WebRequest '%APP_URL%' -UseBasicParsing -TimeoutSec 3 | Out-Null; break}catch{if($_.Exception.Response){break}; Start-Sleep -Seconds 2}}; Start-Process '%APP_URL%'"

REM --- 7. Serveur Next.js (premier plan) ---------------------------------------
echo.
echo [Next] Demarrage sur %APP_URL%  (le navigateur s'ouvrira automatiquement)
echo        Fermez cette fenetre ou faites Ctrl+C pour arreter le serveur.
echo.
node "node_modules\next\dist\bin\next" dev -p %PORT%
if errorlevel 1 (
  echo.
  echo [ERREUR] Le serveur Next.js s'est arrete avec une erreur ^(code %ERRORLEVEL%^).
  goto :fail
)
goto :end

:fail
echo.
echo Demarrage interrompu. Lisez les messages ci-dessus pour le diagnostic.
pause
endlocal
exit /b 1

:end
endlocal
exit /b 0
