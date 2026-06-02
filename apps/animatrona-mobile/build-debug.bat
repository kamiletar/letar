@echo off
set JAVA_HOME=C:\Program Files\JetBrains\WebStorm2025.1\jbr
set PATH=%JAVA_HOME%\bin;%PATH%
cd /d C:\web\letar\apps\animatrona-mobile\android
call .\gradlew.bat assembleDebug --no-daemon
echo Build finished with error level %ERRORLEVEL%
