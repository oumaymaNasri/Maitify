@echo off
REM Lance Next.js sans dependre de "next" dans le PATH ni de npm.ps1 (double-clic OK).
cd /d "%~dp0"
if not exist "node_modules\next\dist\bin\next" (
  echo [ERREUR] node_modules manquant. Executez : npm.cmd install
  pause
  exit /b 1
)
node "node_modules\next\dist\bin\next" dev
