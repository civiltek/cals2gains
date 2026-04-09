@echo off
title CALS2GAINS - SSO Login + Build
cd /d C:\Users\Judit\Documents\Cals2Gains
color 0A
echo.
echo  ========================================
echo    CALS2GAINS - LOGIN SSO + BUILD
echo  ========================================
echo.
echo [1/2] Login via SSO (se abre el navegador automaticamente)...
call npx eas-cli login --sso
echo.
echo [2/2] Launching PRODUCTION build...
call npx eas-cli build --platform android --profile production
echo.
echo  BUILD LAUNCHED!
pause
