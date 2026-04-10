@echo off
cd /d C:\Users\Judit\Documents\Cals2Gains
npx firebase-tools deploy --only hosting > deploy-landing-output.txt 2>&1
echo === DONE === >> deploy-landing-output.txt
