@echo off
cd /d C:\Users\Judit\Documents\Cals2Gains
git push origin master > git-push-output.txt 2>&1
echo === DONE === >> git-push-output.txt
