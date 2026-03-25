@echo off
REM Deploy Nexus to Vercel from the repository root
cd /d "c:\Users\mikia\Documents"

echo.
echo Deploying to Vercel...
call npx.cmd vercel --prod
pause
