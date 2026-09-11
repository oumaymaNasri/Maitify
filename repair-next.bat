@echo off
REM Corrige : Error Cannot find module ./682.js (cache Next.js corrumpu, souvent avec OneDrive).
cd /d "%~dp0"
set "NPM="
if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPM=%ProgramFiles%\nodejs\npm.cmd"
if not defined NPM if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" set "NPM=%ProgramFiles(x86)%\nodejs\npm.cmd"
if not defined NPM set "NPM=npm.cmd"

echo [Reparation] Suppression du dossier .next puis demarrage...
if exist .next (
  rmdir /s /q .next
  if errorlevel 1 (
    echo Fermez Cursor, le navigateur sur localhost, puis reessayez.
    pause
    exit /b 1
  )
)
echo [Prisma] generate...
if exist "node_modules\prisma\build\index.js" (
  node "node_modules\prisma\build\index.js" generate
)
echo [Next] http://localhost:3000
if exist "node_modules\next\dist\bin\next" (
  node "node_modules\next\dist\bin\next" dev
) else (
  call "%NPM%" run dev:server
)
pause
