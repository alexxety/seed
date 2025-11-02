#!/bin/bash

echo "🔒 Получение wildcard SSL сертификата для *.x-bro.com"
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Проверяем наличие Cloudflare API токена
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  CLOUDFLARE_API_TOKEN не найден${NC}"
    echo ""
    echo "Для автоматического получения wildcard сертификата нужен Cloudflare API Token."
    echo ""
    echo "Как получить токен:"
    echo "1. Зайди на https://dash.cloudflare.com/profile/api-tokens"
    echo "2. Create Token → Edit zone DNS"
    echo "3. Permissions: Zone - DNS - Edit"
    echo "4. Zone Resources: Include - Specific zone - x-bro.com"
    echo "5. Скопируй созданный токен"
    echo ""
    echo "Затем добавь в .env на сервере:"
    echo "CLOUDFLARE_API_TOKEN=your_token_here"
    echo ""
    echo -e "${YELLOW}Используем manual режим...${NC}"
    echo ""

    # Manual DNS challenge
    # ВАЖНО: Wildcard *.x-bro.com покрывает все поддомены,
    # поэтому указываем только базовый домен и wildcard
    sudo certbot certonly \
      --manual \
      --preferred-challenges dns \
      --email admin@x-bro.com \
      --agree-tos \
      --no-eff-email \
      -d x-bro.com \
      -d '*.x-bro.com' \
      --cert-name x-bro.com

else
    echo -e "${GREEN}✅ CLOUDFLARE_API_TOKEN найден${NC}"
    echo ""

    # Создаём конфиг файл для Cloudflare
    mkdir -p /root/.secrets
    cat > /root/.secrets/cloudflare.ini <<EOF
# Cloudflare API token
dns_cloudflare_api_token = $CLOUDFLARE_API_TOKEN
EOF

    chmod 600 /root/.secrets/cloudflare.ini

    echo "🔧 Получаем wildcard сертификат через Cloudflare DNS..."
    echo ""

    # Автоматический DNS challenge с Cloudflare
    # ВАЖНО: Wildcard *.x-bro.com покрывает все поддомены,
    # поэтому указываем только базовый домен и wildcard
    sudo certbot certonly \
      --dns-cloudflare \
      --dns-cloudflare-credentials /root/.secrets/cloudflare.ini \
      --email admin@x-bro.com \
      --agree-tos \
      --no-eff-email \
      -d x-bro.com \
      -d '*.x-bro.com' \
      --cert-name x-bro.com
fi

CERT_STATUS=$?

if [ $CERT_STATUS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Сертификат успешно получен!${NC}"
    echo ""
    echo "📋 Проверяем сертификат:"
    openssl x509 -in /etc/letsencrypt/live/x-bro.com/fullchain.pem -noout -text | grep -A2 "Subject Alternative Name"
    echo ""
    echo "🔄 Перезагружаем Nginx..."
    sudo systemctl reload nginx

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Nginx успешно перезагружен${NC}"
        echo ""
        echo "🧪 Тестируем HTTPS:"
        echo "   curl -I https://demo.x-bro.com"
        echo "   curl -I https://testshop.x-bro.com"
        echo ""
    else
        echo -e "${RED}❌ Ошибка перезагрузки Nginx${NC}"
        exit 1
    fi
else
    echo ""
    echo -e "${RED}❌ Ошибка получения сертификата${NC}"
    echo ""
    echo "Проверьте логи: /var/log/letsencrypt/letsencrypt.log"
    exit 1
fi
