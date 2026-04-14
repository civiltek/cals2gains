@echo off
cd /d C:\Users\Judit\Documents\Cals2Gains
npx firebase deploy --only hosting 2>&1
echo DEPLOY_DONE
