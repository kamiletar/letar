@echo off
REM Автоматический релиз Animatrona
REM Использование: scripts\release.bat
REM Создаёт тег из текущей версии и пушит для запуска GitHub Actions

echo.
echo === Animatrona Release ===
echo.

REM Получаем версию из package.json
for /f "tokens=2 delims=:" %%a in ('findstr /c:"\"version\"" apps\animatrona\package.json') do (
    set VERSION=%%a
)
REM Убираем пробелы, кавычки и запятую
set VERSION=%VERSION: =%
set VERSION=%VERSION:"=%
set VERSION=%VERSION:,=%

echo Current version: %VERSION%
echo Creating tag: animatrona-v%VERSION%
echo.

REM Создаём тег
git tag -a animatrona-v%VERSION% -m "Release Animatrona v%VERSION%"
if errorlevel 1 exit /b 1

REM Пушим
echo Pushing to GitHub...
git push origin main
if errorlevel 1 exit /b 1

git push origin animatrona-v%VERSION%
if errorlevel 1 exit /b 1

echo.
echo === Release Complete ===
echo.
echo Tag: animatrona-v%VERSION%
echo GitHub Actions will build for all platforms.
echo Track progress: https://github.com/kamiletar/lena/actions
echo.
