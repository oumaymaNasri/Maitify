@echo off
REM ============================================================================
REM  deployer.bat - Envoi securise des modifications vers GitHub
REM
REM  Etapes :
REM    1. Verifie Git, le depot, l'identite (user.name / user.email) et le remote
REM    2. Garantit que .gitignore exclut backups/, *.dump, .env, .claude/launch.json
REM       et refuse de continuer si l'un de ces fichiers est deja suivi par Git
REM    3. Verifie que la branche locale n'est pas en retard sur GitHub
REM    4. Affiche git status, demande un message de commit (defaut horodate)
REM    5. Demande confirmation O/N puis : git add . / git commit / git push
REM
REM  Le deploiement (Vercel) se declenche automatiquement depuis GitHub apres le push.
REM ============================================================================
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul <nul
title NutriFish GMAO - deploiement GitHub

cd /d "%~dp0"

set "REMOTE=origin"
set "MSG_FILE=%TEMP%\gmao_commit_msg_%RANDOM%.txt"

echo.
echo  ===== NutriFish GMAO - envoi vers GitHub =====
echo.

REM --- 1. Git, depot, identite, remote ----------------------------------------
where git >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] Git est introuvable. Installez Git pour Windows : https://git-scm.com/
  goto :fail
)

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] Ce dossier n'est pas un depot Git.
  goto :fail
)

set "GIT_NAME="
set "GIT_EMAIL="
for /f "delims=" %%a in ('git config user.name 2^>nul') do set "GIT_NAME=%%a"
for /f "delims=" %%a in ('git config user.email 2^>nul') do set "GIT_EMAIL=%%a"
if not defined GIT_NAME (
  echo [ERREUR] Identite Git manquante. Executez : git config --global user.name "Votre nom"
  goto :fail
)
if not defined GIT_EMAIL (
  echo [ERREUR] Email Git manquant. Executez : git config --global user.email "vous@exemple.com"
  goto :fail
)
echo [OK] Auteur Git : %GIT_NAME%

set "BRANCH="
for /f "delims=" %%b in ('git branch --show-current') do set "BRANCH=%%b"
if not defined BRANCH (
  echo [ERREUR] Aucune branche courante ^(HEAD detache^). Placez-vous sur une branche, ex. : git switch main
  goto :fail
)

git remote get-url %REMOTE% >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] Le remote "%REMOTE%" n'est pas configure.
  goto :fail
)
for /f "delims=" %%u in ('git remote get-url %REMOTE%') do echo [OK] Branche : %BRANCH%  -^>  %%u

REM --- 2. .gitignore : exclusions obligatoires --------------------------------
if not exist ".gitignore" type nul > ".gitignore"
call :ensure_ignore "backups/" "/backups/"
call :ensure_ignore "*.dump" "*.dump"
call :ensure_ignore ".env" "/.env"
call :ensure_ignore ".claude/launch.json" "/.claude/launch.json"

REM Un fichier deja suivi par Git n'est pas protege par .gitignore : on bloque.
set "TRACKED="
for /f "delims=" %%f in ('git ls-files -- ".env" "*.dump" "backups" ".claude/launch.json"') do (
  set "TRACKED=1"
  echo [ERREUR] Fichier sensible deja suivi par Git : %%f
)
if defined TRACKED (
  echo          Retirez-le de l'index sans le supprimer : git rm --cached "chemin"
  goto :fail
)
echo [OK] .gitignore protege backups/, *.dump, .env et .claude/launch.json

REM --- 3. Synchronisation avec GitHub -----------------------------------------
echo [Git] Recuperation de l'etat distant...
git fetch %REMOTE% --quiet
if errorlevel 1 (
  echo [ERREUR] Impossible de joindre GitHub ^(connexion ou authentification^).
  goto :fail
)
set "BEHIND=0"
git rev-parse --verify --quiet "%REMOTE%/%BRANCH%" >nul
if not errorlevel 1 (
  for /f %%n in ('git rev-list --count "HEAD..%REMOTE%/%BRANCH%"') do set "BEHIND=%%n"
)
if not "%BEHIND%"=="0" (
  echo [ERREUR] La branche locale a %BEHIND% commit^(s^) de retard sur %REMOTE%/%BRANCH%.
  echo          Recuperez-les d'abord : git pull --rebase %REMOTE% %BRANCH%
  goto :fail
)

REM --- 4. Etat des fichiers -------------------------------------------------------
echo.
echo ----- git status ---------------------------------------------------------
git status --short --branch
echo --------------------------------------------------------------------------
echo.

set "HAS_CHANGES="
for /f "delims=" %%s in ('git status --porcelain') do set "HAS_CHANGES=1"
set "AHEAD=0"
git rev-parse --verify --quiet "%REMOTE%/%BRANCH%" >nul
if not errorlevel 1 (
  for /f %%n in ('git rev-list --count "%REMOTE%/%BRANCH%..HEAD"') do set "AHEAD=%%n"
) else (
  set "AHEAD=1"
)
if not defined HAS_CHANGES if "%AHEAD%"=="0" (
  echo [INFO] Aucune modification a envoyer : la branche est deja a jour sur GitHub.
  goto :end
)

REM --- Message de commit --------------------------------------------------------
if defined HAS_CHANGES (
  for /f "delims=" %%d in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm'" ^<nul') do set "NOW=%%d"
  call :ask_message
) else (
  echo [INFO] Aucun fichier modifie, mais %AHEAD% commit^(s^) local^(aux^) non envoye^(s^).
)

REM --- 5. Confirmation explicite ----------------------------------------------
echo.
if defined HAS_CHANGES (
  echo Actions prevues :
  echo   1. git add .
  echo   2. git commit  ^(message ci-dessus^)
  echo   3. git push %REMOTE% %BRANCH%
) else (
  echo Action prevue : git push %REMOTE% %BRANCH%
)
echo.
:confirm
set "CONFIRM="
set /p "CONFIRM=Confirmer l'envoi vers GitHub ? [O/N] : "
if defined CONFIRM set "CONFIRM=%CONFIRM:"=%"
if /i "%CONFIRM%"=="O" goto :do_push
if /i "%CONFIRM%"=="OUI" goto :do_push
if /i "%CONFIRM%"=="N" goto :cancel
if /i "%CONFIRM%"=="NON" goto :cancel
REM Entree vide ou fin d'entree (fenetre non interactive) : on annule par securite.
if not defined CONFIRM goto :cancel
echo Repondez O (oui) ou N (non).
goto :confirm

:cancel
echo [ANNULE] Aucune action effectuee.
goto :end_pause

:do_push

if defined HAS_CHANGES (
  echo [Git] git add .
  git add .
  if errorlevel 1 (
    echo [ERREUR] git add a echoue.
    goto :fail
  )
  echo [Git] git commit
  git commit -F "%MSG_FILE%"
  if errorlevel 1 (
    echo [ERREUR] git commit a echoue ^(hook, identite ou rien a valider^).
    goto :fail
  )
)

echo [Git] git push %REMOTE% %BRANCH%
git push -u %REMOTE% %BRANCH%
if errorlevel 1 (
  echo [ERREUR] git push a echoue ^(droits GitHub, authentification ou branche protegee^).
  echo          Le commit reste enregistre en local : corrigez puis relancez ce fichier.
  goto :fail
)

echo.
echo ==========================================================================
echo  [SUCCES] Modifications envoyees sur %REMOTE%/%BRANCH%.
echo  Le deploiement automatique (Vercel) se declenche depuis GitHub :
echo  suivez son avancement dans le tableau de bord Vercel.
echo ==========================================================================
goto :end_pause

REM ============================================================================
REM  Sous-routines
REM ============================================================================

REM :ensure_ignore <motif a ajouter> <variante acceptee>
REM Ajoute le motif a .gitignore si ni lui ni sa variante n'y figurent deja.
:ensure_ignore
findstr /x /l /c:"%~1" ".gitignore" >nul 2>nul && exit /b 0
findstr /x /l /c:"%~2" ".gitignore" >nul 2>nul && exit /b 0
>>".gitignore" echo(%~1
echo [.gitignore] Ajout de : %~1
exit /b 0

REM :ask_message - lit le message de commit et l'ecrit dans %MSG_FILE%
REM (fichier + delayed expansion : les caracteres speciaux & ^| ^< ^> " ! sont preserves)
:ask_message
set "MSG="
set /p "MSG=Message de commit (Entree = "Mise a jour du %NOW%") : "
if not defined MSG set "MSG=Mise a jour du %NOW%"
setlocal EnableDelayedExpansion
>"%MSG_FILE%" echo(!MSG!
echo [OK] Message : !MSG!
endlocal
exit /b 0

:fail
echo.
echo Envoi interrompu : aucune donnee n'a ete poussee si l'erreur precede l'etape "git push".
if exist "%MSG_FILE%" del "%MSG_FILE%" >nul 2>nul
pause
endlocal
exit /b 1

:end_pause
if exist "%MSG_FILE%" del "%MSG_FILE%" >nul 2>nul
pause
:end
endlocal
exit /b 0
