@echo off
REM Supprime .next puis demarre (corrige chunk 682.js / cache corrompu).
cd /d "%~dp0"
if exist .next (
  echo Suppression de .next ...
  rmdir /s /q .next
)
if not exist "node_modules\next\dist\bin\next" (
  echo [ERREUR] npm.cmd install requis
  pause
  exit /b 1
)
if exist "node_modules\prisma\build\index.js" (
  node "node_modules\prisma\build\index.js" generate
)
node "node_modules\next\dist\bin\next" dev
