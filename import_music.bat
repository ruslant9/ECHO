@echo off
chcp 65001
title ECHO Music Importer
cls

echo ===================================================
echo      ЗАПУСК ИМПОРТА МУЗЫКИ ИЗ ЯНДЕКСА
echo ===================================================
echo.

cd backend

:: Проверка, установлен ли ts-node, если нет - используем npx
call npx ts-node scripts/import-yandex.ts

echo.
echo Скрипт завершил работу.
pause