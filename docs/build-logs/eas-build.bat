@echo off
cd /d C:\Users\Judit\Documents\Cals2Gains
npx eas-cli build --platform android --profile production --non-interactive --no-wait > eas-build-output.txt 2>&1
echo === DONE === >> eas-build-output.txt
