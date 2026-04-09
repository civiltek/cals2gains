@echo off
echo ============================================
echo   CALS2GAINS - Login y Build
echo ============================================
echo.
echo PASO 1: Iniciando sesion en Expo...
echo (Se abrira el navegador para hacer login)
echo.
cd /d "C:\Users\Judit\Documents\Cals2Gains"
call eas login
echo.
echo ============================================
echo PASO 2: Lanzando build de produccion Android...
echo (Esto tarda 15-20 minutos en la nube)
echo.
call eas build --platform android --profile production --non-interactive
echo.
echo ============================================
echo BUILD COMPLETADO! 
echo El archivo .aab esta listo para subir a Google Play
echo ============================================
pause
