@echo off
REM Double-cliquer ou lancer depuis CMD : utilise npm.cmd (pas npm.ps1) et Docker sur le port 5433.
setlocal EnableExtensions

cd /d "%~dp0"

REM Utilise npm.cmd (evite l'erreur PowerShell ExecutionPolicy avec npm.ps1)

set "NPM="
if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPM=%ProgramFiles%\nodejs\npm.cmd"
if not defined NPM if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" set "NPM=%ProgramFiles(x86)%\nodejs\npm.cmd"
if not defined NPM (
  where npm.cmd >nul 2>nul
  if not errorlevel 1 (
    for /f "delims=" %%i in ('where npm.cmd 2^>nul') do (
      set "NPM=%%i"
      goto :npm_found
    )
  )
)
:npm_found
if not defined NPM (
  echo [ERREUR] Node.js/npm introuvable.
  echo Installez Node.js LTS : https://nodejs.org/
  echo Puis double-cliquez de nouveau sur ce fichier.
  pause
  exit /b 1
)

if not exist .env (
  if exist env.docker.template (
    copy /Y env.docker.template .env >nul
    echo [OK] Fichier .env cree depuis env.docker.template
  ) else (
    echo [ERREUR] env.docker.template manquant — impossible de creer .env
    pause
    exit /b 1
  )
)

where docker >nul 2>nul
if not errorlevel 1 (
  echo [Docker] Demarrage de PostgreSQL...
  docker compose up -d
  if errorlevel 1 (
    echo [ATTENTION] docker compose a echoue. Utilisez une base Postgres locale ou reinstallez Docker Desktop.
  ) else (
    echo [Docker] En attente de la base (~10-20 s au premier demarrage)...
    ping -n 8 127.0.0.1 >nul
  )
) else (
  echo [INFO] Docker non trouve : assurez-vous que PostgreSQL tourne et que DATABASE_URL dans .env est correct.
)

echo [npm] Installation des dependances...
call "%NPM%" install
if errorlevel 1 (
  pause
  exit /b 1
)

echo [Prisma] Generate client...
call "%NPM%" run db:generate
if errorlevel 1 (
  pause
  exit /b 1
)

echo [Prisma] Push schema vers la base (ignorez les erreurs si Postgres n'est pas encore pret)...
call "%NPM%" run db:push
if errorlevel 1 (
  echo [ATTENTION] db:push a echoue : verifiez PostgreSQL ou relancez apres quelques secondes.
)

echo [Next] Demarrage sur http://localhost:3000 (via node, sans dependre du PATH)
echo Fermez cette fenetre pour arreter le serveur.
echo.
if exist "node_modules\next\dist\bin\next" (
  node "node_modules\next\dist\bin\next" dev
) else (
  call "%NPM%" run dev:server
)
set "EXITCODE=%ERRORLEVEL%"
if not "%EXITCODE%"=="0" pause
exit /b %EXITCODE%
