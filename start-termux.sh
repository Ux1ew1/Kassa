#!/bin/bash
# Скрипт для запуска приложения в Termux

echo "🚀 Запуск приложения кассы в Termux..."
echo ""

# Проверка наличия Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен!"
    echo "Установите: pkg install nodejs"
    exit 1
fi

# Проверка наличия зависимостей
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей..."
    npm install
    echo ""
fi

# Получение IP адреса
IP=$(ip addr show wlan0 2>/dev/null | grep "inet " | awk '{print $2}' | cut -d/ -f1)
if [ -z "$IP" ]; then
    IP=$(ip addr show | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}' | cut -d/ -f1 | head -n1)
fi

echo "📱 IP адрес устройства: ${IP:-не найден}"
echo ""
echo "Выберите режим запуска:"
echo "1) Режим разработки (npm run dev + server)"
echo "2) Режим продакшена (только собранное приложение)"
echo "3) Только backend сервер"
read -p "Введите номер (1-3): " choice

case $choice in
    1)
        echo ""
        echo "⚠️  Для режима разработки нужно запустить два терминала:"
        echo "Терминал 1: npm run server"
        echo "Терминал 2: npm run dev"
        echo ""
        read -p "Запустить backend сервер сейчас? (y/n): " start_backend
        if [ "$start_backend" = "y" ]; then
            echo "🌐 Backend запущен на http://localhost:3000"
            npm run server
        fi
        ;;
    2)
        # Проверка наличия сборки
        if [ ! -d "dist" ]; then
            echo "📦 Сборка приложения..."
            npm run build
            echo ""
        fi
        echo "🚀 Запуск сервера..."
        echo "📱 Доступ: http://localhost:3000"
        if [ ! -z "$IP" ]; then
            echo "🌐 Доступ из сети: http://$IP:3000"
        fi
        npm start
        ;;
    3)
        echo "🚀 Запуск backend сервера..."
        echo "📱 API: http://localhost:3000/api/menu"
        if [ ! -z "$IP" ]; then
            echo "🌐 API из сети: http://$IP:3000/api/menu"
        fi
        npm run server
        ;;
    *)
        echo "❌ Неверный выбор"
        exit 1
        ;;
esac

