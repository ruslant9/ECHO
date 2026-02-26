@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title Echo Project Launcher (Universal)

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"
set "FRONTEND_DIR=%SCRIPT_DIR%frontend"

echo =========================================
echo      Запуск проекта Echo v2.0
echo =========================================
echo.

:: 1. ПРОВЕРКА PM2
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ PM2 не найден. Установите его: npm install -g pm2
    pause
    exit /b
)

:: 2. ПРОВЕРКА ПАПОК
if not exist "%BACKEND_DIR%" (
    call :error_backend_missing
    pause
    exit /b
)

set "SKIP_FRONTEND=0"
if not exist "%FRONTEND_DIR%" (
    echo ⚠️ Папка frontend не найдена.
    set "SKIP_FRONTEND=1"
)

:: 3. ПОДГОТОВКА BACKEND
cd /d "%BACKEND_DIR%"
if not exist "ecosystem.config.js" (
    echo ❌ Файл ecosystem.config.js не найден в %BACKEND_DIR%
    pause
    exit /b
)

call pm2 flush > nul 2>&1

:: 4. БД
:retry_db
echo ▶️  Синхронизация базы данных...
call npx prisma db push --accept-data-loss
if %errorlevel% neq 0 (
    echo.
    echo ❌ Ошибка подключения к БД.
    set /p fix_choice="Хотите настроить подключение? (y/n): "
    if /i "!fix_choice!"=="y" (
        call :configure_database
        goto retry_db
    ) else (
        exit /b
    )
)

call npx prisma generate

:: 5. ЗАПУСК
call pm2 delete backend > nul 2>&1
call pm2 start ecosystem.config.js --update-env

if "!SKIP_FRONTEND!"=="0" (
    start "Echo Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"
)

start "Echo Backend Logs" cmd /k "pm2 logs backend --lines 20"

echo ✅ Все компоненты запущены.
pause
exit /b

:: --- ФУНКЦИИ ---

:error_backend_missing
echo ❌ Папка backend не найдена по пути: %BACKEND_DIR%
echo Убедитесь, что скрипт в корне проекта.
exit /b

:configure_database
echo.
echo ==== Настройка PostgreSQL ====
set /p DB_HOST="Хост (localhost): "
if "!DB_HOST!"=="" set DB_HOST=localhost
set /p DB_PORT="Порт (5432): "
if "!DB_PORT!"=="" set DB_PORT=5432
set /p DB_USER="Пользователь (postgres): "
if "!DB_USER!"=="" set DB_USER=postgres
set /p DB_PASS="Пароль: "
set /p DB_NAME="Имя БД (echo): "
if "!DB_NAME!"=="" set DB_NAME=echo

set "DATABASE_URL=postgresql://!DB_USER!:!DB_PASS!@!DB_HOST!:!DB_PORT!/!DB_NAME!"

:: Записываем в файл без использования PowerShell внутри блоков if
if exist ".env" (
    findstr /v "DATABASE_URL" .env > .env.tmp
    echo DATABASE_URL=!DATABASE_URL!>> .env.tmp
    move /y .env.tmp .env > nul
) else (
    echo DATABASE_URL=!DATABASE_URL!> .env
)
echo ✅ Файл .env обновлен.
exit /b