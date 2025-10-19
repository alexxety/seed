#!/bin/bash

# Скрипт для первоначальной настройки сервера
# Запускать на дроплете под root или с sudo

echo "=== Настройка сервера для Telegram Mini App ==="

# Обновление системы
echo "Обновление системы..."
apt update && apt upgrade -y

# Установка nginx
echo "Установка nginx..."
apt install nginx -y

# Создание директории для приложения
echo "Создание директории приложения..."
mkdir -p /var/www/telegram-shop
chown -R www-data:www-data /var/www/telegram-shop

# Создание конфигурации nginx
echo "Создание конфигурации nginx..."
cat > /etc/nginx/sites-available/telegram-shop << 'EOF'
server {
    listen 80;
    listen [::]:80;

    server_name 143.198.141.222;

    root /var/www/telegram-shop;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Кеширование статических файлов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

# Активация сайта
echo "Активация сайта..."
ln -sf /etc/nginx/sites-available/telegram-shop /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации nginx
echo "Проверка конфигурации nginx..."
nginx -t

# Перезапуск nginx
echo "Перезапуск nginx..."
systemctl restart nginx
systemctl enable nginx

# Настройка firewall
echo "Настройка firewall..."
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw --force enable

echo ""
echo "=== Настройка завершена! ==="
echo ""
echo "Приложение будет доступно по адресу: http://143.198.141.222"
echo ""
echo "Для настройки HTTPS выполните:"
echo "1. Настройте домен, указывающий на 143.198.141.222"
echo "2. Установите certbot: apt install certbot python3-certbot-nginx"
echo "3. Получите SSL сертификат: certbot --nginx -d ваш-домен.com"
