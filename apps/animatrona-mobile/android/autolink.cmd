@echo off
REM Автолинкинг: вызывает react-native CLI config для генерации autolinking.json
REM node ищется через PATH или через where
where node >nul 2>&1
if %errorlevel% equ 0 (
    node "%~dp0..\node_modules\react-native\cli.js" config
) else (
    echo ERROR: node not found in PATH 1>&2
    exit /b 1
)
