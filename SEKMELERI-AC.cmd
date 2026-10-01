@echo off
cd /d "%~dp0"
echo Sekmeler icin gerekli paketler kuruluyor...
call npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants
if errorlevel 1 goto fail
call npx tsc --noEmit
if errorlevel 1 goto fail
node scripts/activate-tabs.cjs
if errorlevel 1 goto fail
call npx expo start --clear --lan
exit /b
:fail
echo Kurulum tamamlanamadi. Bu pencerenin ekran goruntusunu gonderebilirsin.
pause
exit /b 1
