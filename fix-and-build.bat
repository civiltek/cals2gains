@echo off
title CALS2GAINS - Fix and Build
cd /d C:\Users\Judit\Documents\Cals2Gains
color 0A
echo.
echo  ========================================
echo    CALS2GAINS - FIX AND BUILD
echo  ========================================
echo.
echo [1/4] Committing fixes...
git add package.json tsconfig.json "app/(tabs)/_layout.tsx" .env
git commit -m "fix: add expo-modules-core, replace metro, fix env and types"
echo.
echo [2/4] Logging into EAS (se abrira el navegador)...
call npx eas-cli login
echo.
echo [3/4] Launching PRODUCTION build for Android...
call npx eas-cli build --platform android --profile production
echo.
echo  ========================================
echo    DONE! Check expo.dev for build status
echo  ========================================
echo.
pause
