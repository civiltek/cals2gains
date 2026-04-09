@echo off
cd /d C:\Users\Judit\Documents\Cals2Gains
echo === NPM INSTALL === > build-output.txt
call npm install >> build-output.txt 2>&1
echo === EXPO INSTALL FIX === >> build-output.txt
call npx expo install --fix >> build-output.txt 2>&1
echo === GIT ADD === >> build-output.txt
git add -A >> build-output.txt 2>&1
echo === GIT STATUS === >> build-output.txt
git status --short >> build-output.txt 2>&1
echo === DONE === >> build-output.txt
