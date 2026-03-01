@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title Git Sync (Универсальный с автообновлением Prisma)

:: Переходим в папку скрипта
cd /d "%~dp0"

:menu
cls
echo =============================================
echo       Git Sync - Управление репозиторием
echo =============================================
echo.

:: Проверяем наличие папки .git
if exist ".git" (
    echo Текущая папка: %CD%
    echo Статус: ✅ Репозиторий уже существует.
    echo.
    echo Выберите действие:
    echo   1 - Получить изменения (git pull + автообновление БД)
    echo   2 - Отправить изменения (git push)
    echo   3 - Показать статус (git status)
    echo   4 - Клонировать заново (удалит текущий .git)
    echo   5 - Выход
    echo.
    set /p choice="Ваш выбор: "

    if "!choice!"=="1" goto :pull
    if "!choice!"=="2" goto :push
    if "!choice!"=="3" goto :status
    if "!choice!"=="4" goto :clone_force
    if "!choice!"=="5" exit /b
    echo Неверный выбор. Повторите.
    pause
    goto :menu
) else (
    echo Текущая папка: %CD%
    echo Статус: ❌ Репозиторий не найден.
    echo.
    echo Выберите действие:
    echo   1 - Клонировать репозиторий (git clone)
    echo   2 - Инициализировать новый репозиторий
    echo   3 - Выход
    echo.
    set /p choice="Ваш выбор: "

    if "!choice!"=="1" goto :clone
    if "!choice!"=="2" goto :init_repo
    if "!choice!"=="3" exit /b
    echo Неверный выбор. Повторите.
    pause
    goto :menu
)

:: ========== ДЕЙСТВИЯ (для существующего репозитория) ==========

:pull
echo.
echo 📥 Получение изменений из удалённого репозитория...
:: Определяем текущую ветку
for /f "delims=" %%I in ('git rev-parse --abbrev-ref HEAD') do set CURRENT_BRANCH=%%I
echo Текущая ветка: !CURRENT_BRANCH!

:: Привязываем локальную ветку к удаленной
git branch --set-upstream-to=origin/!CURRENT_BRANCH! !CURRENT_BRANCH! >nul 2>&1

:: Получаем изменения
git pull origin !CURRENT_BRANCH!
if %errorlevel% equ 0 (
    echo ✅ Новые файлы успешно загружены.
    :: Вызываем блок автообновления бэкенда и БД
    call :update_backend
) else (
    echo ❌ Ошибка при pull. Проверьте подключение или конфликты.
)
pause
goto :menu

:push
echo.
echo 📤 Отправка изменений в удалённый репозиторий...
:: Проверка, есть ли что коммитить
git diff --quiet && git diff --cached --quiet
if %errorlevel% equ 0 (
    echo ⚠️ Нет изменений для коммита.
) else (
    set /p commit_msg="Введите сообщение коммита: "
    if "!commit_msg!"=="" set commit_msg=Автоматический коммит %DATE% %TIME%
    git add .
    git commit -m "!commit_msg!"
)

:: Определяем текущую ветку
for /f "delims=" %%I in ('git rev-parse --abbrev-ref HEAD') do set CURRENT_BRANCH=%%I

:: Отправляем изменения
git push -u origin !CURRENT_BRANCH!
if %errorlevel% equ 0 (
    echo ✅ Готово.
) else (
    echo ❌ Ошибка при push. Возможно, нужно сначала сделать pull.
)
pause
goto :menu

:status
echo.
echo 📊 Статус репозитория:
git status
pause
goto :menu

:clone_force
echo.
echo ⚠️ ВНИМАНИЕ! Это удалит текущую папку .git и клонирует репозиторий заново.
set /p confirm="Вы уверены? (y/n): "
if /i not "!confirm!"=="y" goto :menu
:: Удаляем .git
rmdir /s /q .git 2>nul
:: Переходим к клонированию

:clone
echo.
echo Введите URL репозитория (по умолчанию https://github.com/ruslant9/ECHO.git):
set /p repo_url="URL: "
if "!repo_url!"=="" set repo_url=https://github.com/ruslant9/ECHO.git
echo 🚀 Клонирование из !repo_url! ...
:: Клонируем во временную папку и переносим содержимое
git clone !repo_url! temp_clone
if %errorlevel% neq 0 (
    echo ❌ Ошибка клонирования.
    pause
    goto :menu
)
:: Копируем всё из temp_clone в текущую папку (кроме .git)
xcopy temp_clone\* . /E /H /C /Y >nul
:: Удаляем временную папку
rmdir /s /q temp_clone
echo ✅ Клонирование завершено.
:: Вызываем блок автообновления бэкенда и БД после клонирования
call :update_backend
pause
goto :menu

:init_repo
echo.
echo 📁 Инициализация нового репозитория...
git init
echo 👤 Настройка пользователя
set /p git_name="Ваше имя (по умолчанию Руслан): "
if "!git_name!"=="" set git_name=Руслан
set /p git_email="Ваш email (по умолчанию ruslanmailhome1@gmail.com): "
if "!git_email!"=="" set git_email=ruslanmailhome1@gmail.com
git config user.name "!git_name!"
git config user.email "!git_email!"
if not exist ".gitignore" (
    echo Создание .gitignore...
    (
        echo node_modules/
        echo backend/node_modules/
        echo frontend/node_modules/
        echo .env
        echo backend/.env
        echo frontend/.env
        echo frontend/.env.local
        echo dist/
        echo build/
        echo *.log
        echo backend/dist/
        echo frontend/.next/
        echo frontend/out/
        echo .DS_Store
        echo Thumbs.db
    ) > .gitignore
)
git add .
git commit -m "Initial commit"
echo Добавьте удалённый репозиторий: git remote add origin ^<URL^>
pause
goto :menu

:: ========== ФУНКЦИЯ ОБНОВЛЕНИЯ БЭКЕНДА И PRISMA ==========
:update_backend
if exist "backend\prisma\schema.prisma" (
    echo.
    echo 🔄 Обнаружена папка backend. Применяю обновления базы данных...
    cd backend
    
    echo 📦 Установка зависимостей (если изменился package.json)...
    call npm install >nul 2>&1
    
    echo 🛠️ Генерация новых типов Prisma...
    call npx prisma generate
    
    echo 🗄️ Обновление колонок в базе данных...
    call npx prisma db push --accept-data-loss
    
    echo 🏗️ Пересборка бэкенда...
    call npm run build
    
    echo 🚀 Перезапуск сервера в PM2...
    call pm2 restart backend 2>nul
    
    cd ..
    echo ✅ Обновление бэкенда завершено успешно!
)
goto :eof