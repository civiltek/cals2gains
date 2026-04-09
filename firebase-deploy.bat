@echo off
cd /d C:\Users\Judit\Documents\Cals2Gains
echo Y | firebase login 2>&1
echo === LOGIN DONE === 
firebase deploy --only hosting 2>&1
echo === DEPLOY DONE ===
pause