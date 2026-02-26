@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title Автонастройка Git для проекта ECHO

echo =============================================
echo    Автоматическая настройка Git и отправка
echo           на GitHub (репозиторий ECHO)
echo =============================================
echo.

:: Проверка наличия Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Git не установлен или не прописан в PATH.
    echo Скачайте и установите с https://git-scm.com/
    pause
    exit /b
)

:: Переходим в папку скрипта (корень проекта)
cd /d "%~dp0"

:: 1. Инициализация репозитория, если ещё нет
if not exist ".git" (
    echo 📁 Инициализация нового репозитория...
    git init
    if !errorlevel! neq 0 (
        echo ❌ Ошибка при git init
        pause
        exit /b
    )
) else (
    echo ✅ Репозиторий уже инициализирован.
)

:: 2. Устанавливаем локальные имя пользователя и email (для этого репозитория)
echo 👤 Настройка пользователя: Руслан ^<ruslanmailhome1@gmail.com^>
git config user.name "Руслан"
git config user.email "ruslanmailhome1@gmail.com"

:: 3. Создаём .gitignore, если его нет (исправлено создание)
if not exist ".gitignore" (
    echo 📄 Создание файла .gitignore...
    (
        echo # Зависимости
        echo node_modules/
        echo backend/node_modules/
        echo frontend/node_modules/
        echo.
        echo # Файлы окружения
        echo .env
        echo backend/.env
        echo frontend/.env
        echo frontend/.env.local
        echo.
        echo # Сборки и логи
        echo dist/
        echo build/
        echo *.log
        echo backend/dist/
        echo frontend/.next/
        echo frontend/out/
        echo.
        echo # Системные файлы
        echo .DS_Store
        echo Thumbs.db
    ) > .gitignore
    if !errorlevel! equ 0 (
        echo ✅ .gitignore создан.
    ) else (
        echo ❌ Ошибка при создании .gitignore
        pause
        exit /b
    )
) else (
    echo ⏭️ .gitignore уже существует, пропускаем создание.
)

:: 4. Добавляем все файлы в индекс (с проверкой, есть ли изменения)
echo ➕ Добавление файлов в индекс...
git add .
if !errorlevel! neq 0 (
    echo ❌ Ошибка при git add
    pause
    exit /b
)

:: 5. Проверяем, есть ли изменения для коммита
git diff --cached --quiet
if !errorlevel! equ 0 (
    echo ⚠️ Нет изменений для коммита. Возможно, всё уже закоммичено.
) else (
    :: 6. Создаём коммит
    echo 📝 Создание коммита "Initial commit"...
    git commit -m "Initial commit"
    if !errorlevel! neq 0 (
        echo ❌ Ошибка при коммите. Проверьте, настроены ли имя и почта.
        pause
        exit /b
    )
)

:: 7. Настраиваем remote origin (удаляем старый, если есть)
echo 🔗 Настройка remote origin...
git remote remove origin 2>nul
git remote add origin https://github.com/ruslant9/ECHO.git
if !errorlevel! neq 0 (
    echo ❌ Не удалось добавить remote.
    pause
    exit /b
)

:: 8. Переименовываем текущую ветку в main, если нужно
for /f "tokens=*" %%i in ('git branch --show-current') do set "BRANCH=%%i"
if "!BRANCH!"=="" (
    :: Если не удалось получить ветку (пустой репозиторий), просто создадим main
    git checkout -b main 2>nul
) else (
    if not "!BRANCH!"=="main" (
        echo 🔀 Переименование ветки !BRANCH! в main...
        git branch -m main
    )
)

:: 9. Отправка на GitHub
echo.
echo ⚠️ Сейчас будет запрошена авторизация на GitHub.
echo    Введите ваш логин и пароль (или Personal Access Token).
echo    Если используете двухфакторную аутентификацию, вместо пароля введите токен.
echo    Токен можно создать здесь: https://github.com/settings/tokens
echo.
echo 🚀 Отправка изменений в ветку main...
git push -u origin main

if !errorlevel! equ 0 (
    echo ✅ Готово! Проект успешно отправлен на GitHub.
) else (
    echo ❌ Ошибка при push. Возможно, неверные учётные данные или remote уже содержит коммиты.
    echo    Попробуйте выполнить вручную: git push -u origin main
)

pause