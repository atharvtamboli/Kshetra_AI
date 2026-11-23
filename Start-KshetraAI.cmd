@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo KshetraAI requires Node.js 24 or newer.
  pause
  exit /b 1
)
if not exist ".env" copy /y ".env.example" ".env" >nul
node --env-file-if-exists=.env server.js --open
if errorlevel 1 pause
