@echo off
cd /d "C:\Users\Judit\Documents\Cals2Gains"

echo === Renaming metro.config.js to avoid ESM crash ===
if exist metro.config.js ren metro.config.js metro.config.js.bak

echo === Setting EAS_SKIP_AUTO_FINGERPRINT ===
set EAS_SKIP_AUTO_FINGERPRINT=1

echo === Starting EAS Build (preview/Android/APK) ===
call npx eas build --profile preview --platform android --non-interactive 2>&1

echo === Restoring metro.config.js ===
if exist metro.config.js.bak ren metro.config.js.bak metro.config.js

echo === BUILD COMMAND COMPLETE ===
echo Exit code: %ERRORLEVEL%
