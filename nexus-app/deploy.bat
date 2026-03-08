@echo off
REM Deploy Nexus to Vercel - run from Documents
cd /d "c:\Users\mikia\Documents"

echo Copying project to nexus-app...
powershell -ExecutionPolicy Bypass -NoProfile -File ".\setup-nexus-deploy.ps1"
if errorlevel 1 (
  echo Setup failed. Try: cd nexus-app
  echo Then: npx.cmd vercel --prod
  pause
  exit /b 1
)

echo.
echo Deploying to Vercel...
cd nexus-app
call npx.cmd vercel --prod
pause
