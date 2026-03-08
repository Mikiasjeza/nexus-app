@echo off
REM AI Skill Passport - Quick Backup Script
echo Creating backup of your AI Skill Passport project...

REM Create backup folder with date
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
set BACKUP_DIR=C:\Users\mikia\Backups\AI-Skill-Passport-%mydate%

REM Create backup directory
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Copy all project files (excluding node_modules and .next)
xcopy /E /I /H /Y "C:\Users\mikia\Documents\app" "%BACKUP_DIR%\app"
xcopy /E /I /H /Y "C:\Users\mikia\Documents\components" "%BACKUP_DIR%\components"
xcopy /E /I /H /Y "C:\Users\mikia\Documents\lib" "%BACKUP_DIR%\lib"
xcopy /E /I /H /Y "C:\Users\mikia\Documents\types" "%BACKUP_DIR%\types"
copy /Y "C:\Users\mikia\Documents\package.json" "%BACKUP_DIR%\"
copy /Y "C:\Users\mikia\Documents\package-lock.json" "%BACKUP_DIR%\" 2>nul
copy /Y "C:\Users\mikia\Documents\next.config.js" "%BACKUP_DIR%\"
copy /Y "C:\Users\mikia\Documents\postcss.config.js" "%BACKUP_DIR%\"
copy /Y "C:\Users\mikia\Documents\tailwind.config.ts" "%BACKUP_DIR%\"
copy /Y "C:\Users\mikia\Documents\tsconfig.json" "%BACKUP_DIR%\"
copy /Y "C:\Users\mikia\Documents\.gitignore" "%BACKUP_DIR%\" 2>nul
copy /Y "C:\Users\mikia\Documents\README.md" "%BACKUP_DIR%\"
copy /Y "C:\Users\mikia\Documents\INSTALL.md" "%BACKUP_DIR%\" 2>nul

echo.
echo ========================================
echo Backup completed successfully!
echo Location: %BACKUP_DIR%
echo ========================================
echo.
pause
