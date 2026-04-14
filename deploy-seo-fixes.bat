@echo off
echo ======================================
echo  Cals2Gains - Deploy SEO Fixes
echo ======================================
echo.
echo Paso 1: Reautenticando con Firebase...
firebase login --reauth
echo.
echo Paso 2: Desplegando a produccion...
firebase deploy --only hosting
echo.
echo Deploy completado. Verifica los cambios en:
echo   https://cals2gains.com
echo.
pause
