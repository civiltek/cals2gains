@echo off
cd /d C:\Users\Judit\Documents\Cals2Gains
call npx expo install --fix > fix-output.txt 2>&1
call npx expo-doctor >> fix-output.txt 2>&1
echo DONE >> fix-output.txt
