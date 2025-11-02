# 🌱 Seed Shop - Мультитенантная платформа интернет-магазинов

Универсальная SaaS-платформа для создания и управления интернет-магазинами с поддержкой Telegram Mini Apps и веб-интерфейса.

## 📋 Оглавление

- [Описание](#описание)
- [Архитектура](#архитектура)
- [Технологический стек](#технологический-стек)
- [Структура доменов](#структура-доменов)
- [Учетные данные](#учетные-данные)
- [Установка и запуск](#установка-и-запуск)
- [Развертывание](#развертывание)
- [API Endpoints](#api-endpoints)
- [Конфигурация](#конфигурация)
- [Мультитенантность](#мультитенантность)

## 🎯 Описание

Seed Shop — это мультитенантная платформа, позволяющая создавать неограниченное количество интернет-магазинов с индивидуальными поддоменами. Каждый магазин работает как отдельная единица с собственными товарами, заказами и настройками.

### Ключевые возможности

- 🏪 **Мультитенантность** - неограниченное количество магазинов на одной платформе
- 🌐 **Индивидуальные поддомены** - каждый магазин доступен по `shop-name.x-bro.com`
- 📱 **Telegram Mini Apps** - нативная интеграция с Telegram
- 🖥️ **Веб-интерфейс** - полноценная работа в браузере
- 👥 **Три уровня доступа** - супер-админ, админы магазинов, пользователи
- 🔄 **Автоматическое создание** - мгновенное развертывание новых магазинов
- 🎨 **DNS интеграция** - автоматическое создание DNS записей через Cloudflare
- 🔐 **JWT авторизация** - безопасная аутентификация с токенами

## 🏗️ Архитектура

### Уровни доступа

```
┌─────────────────────────────────────────────────────┐
│              Супер-Админ Панель                      │
│         (admin.x-bro.com, dev-admin.x-bro.com)      │
│    • Управление всеми магазинами                    │
│    • Создание новых магазинов                       │
│    • Автоматическое создание DNS записей            │
└─────────────────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                  │
┌───────▼───────────┐         ┌───────────▼────────┐
│  Админ Панель     │         │  Демо Магазин      │
│  (каждого магазина)│         │  (seed.x-bro.com)  │
│  • Товары         │         │  • Демонстрация    │
│  • Заказы         │         │  • Тестирование    │
│  • Категории      │         └────────────────────┘
│  • Настройки      │
└───────┬───────────┘
        │
┌───────▼────────────────────────────────┐
│    Магазины (Поддомены)                │
│    • shop1.x-bro.com                   │
│    • shop2.x-bro.com                   │
│    • любое-название.x-bro.com          │
└────────────────────────────────────────┘
```

### Потоки данных

```
Запрос → Nginx (SSL/Rate Limiting) → Node.js Server → PostgreSQL
                                          ↓
                                    Cloudflare API
                                    (DNS Management)
```

## 💻 Технологический стек

### Frontend

- **React 18** - UI библиотека
- **TypeScript** - типизация
- **TanStack Router** - клиентская маршрутизация
- **TanStack Query** - управление серверным состоянием
- **Tailwind CSS** - стилизация
- **Zustand** - управление состоянием
- **React Hook Form + Zod** - валидация форм
- **Vite** - сборщик

### Backend

- **Node.js + Express** - REST API сервер
- **PostgreSQL** - основная БД
- **Prisma ORM** - работа с БД
- **JWT** - аутентификация
- **bcrypt** - хеширование паролей

### Infrastructure

- **PM2** - процесс-менеджер
- **Nginx** - reverse proxy, SSL, rate limiting
- **Let's Encrypt** - SSL сертификаты
- **Cloudflare API** - управление DNS
- **GitHub Actions** - CI/CD
- **Hetzner Cloud** - хостинг

## 🌐 Структура доменов

### Production (Port 3000)

| Домен             | Назначение             | Описание                    |
| ----------------- | ---------------------- | --------------------------- |
| `x-bro.com`       | Главная страница       | Лендинг платформы           |
| `admin.x-bro.com` | Супер-админ панель     | Управление всеми магазинами |
| `seed.x-bro.com`  | Демо магазин           | Демонстрационный магазин    |
| `*.x-bro.com`     | Магазины пользователей | Динамические поддомены      |

### Development (Port 3001)

| Домен                 | Назначение      |
| --------------------- | --------------- |
| `dev.x-bro.com`       | Dev главная     |
| `dev-admin.x-bro.com` | Dev супер-админ |
| `deva.x-bro.com`      | Dev демо        |

## 🔑 Учетные данные

### Production

#### Супер-Админ

- **URL**: https://admin.x-bro.com/superadmin/login
- **Логин**: `superadmin`
- **Пароль**: `super2025`
- **Доступ**: Управление всеми магазинами

#### Демо Админ (seed.x-bro.com)

- **URL**: https://seed.x-bro.com/admin/login
- **Логин**: `admin`
- **Пароль**: `seed2025`
- **Доступ**: Управление демо-магазином

### Development

#### Dev Супер-Админ

- **URL**: https://dev-admin.x-bro.com/superadmin/login
- **Логин**: `superadmin`
- **Пароль**: `super2025`

## 🚀 Установка и запуск

### Предварительные требования

- Node.js 18+
- PostgreSQL 14+
- npm или yarn

### Локальная разработка

```bash
# Клонировать репозиторий
git clone https://github.com/alexxety/seed.git
cd seed

# Установить зависимости
npm install

# Создать .env файл
cp .env.example .env

# Настроить переменные окружения в .env
# DATABASE_URL, JWT_SECRET, CLOUDFLARE_API_TOKEN, etc.

# Применить миграции БД
npx prisma migrate dev

# Сгенерировать Prisma Client
npx prisma generate

# Запустить dev сервер (frontend + backend)
npm run dev
```

Приложение будет доступно:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Production build

```bash
# Собрать frontend
npm run build

# Запустить production сервер
NODE_ENV=production PORT=3000 node server.js

# Или через PM2
pm2 start ecosystem.config.js
```

## 🔧 Развертывание

### GitHub Actions (Автоматическое)

Push в соответствующую ветку автоматически запускает деплой:

```bash
# Production деплой
git push origin main

# Dev деплой
git push origin dev
```

### Ручное развертывание

```bash
# Подключиться к серверу
ssh root@46.224.19.173

# Production
cd /var/www/telegram-shop
git pull origin main
npm install --omit=dev
npm run build
pm2 reload telegram-shop-prod

# Dev
cd /var/www/telegram-shop-dev
git pull origin dev
npm install --omit=dev
npm run build
pm2 reload telegram-shop-dev
```

### Первоначальная настройка сервера

```bash
# Установить Node.js, PM2, PostgreSQL
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs postgresql postgresql-contrib
npm install -g pm2

# Настроить PostgreSQL
sudo -u postgres psql
CREATE DATABASE seedshop;
CREATE USER seedshop WITH ENCRYPTED PASSWORD 'seedshop_secure_password_2025';
GRANT ALL PRIVILEGES ON DATABASE seedshop TO seedshop;
\q

# Настроить Nginx
# Скопировать конфигурацию из /tmp/x-bro-nginx.conf на сервере
sudo cp /path/to/x-bro-nginx.conf /etc/nginx/sites-available/x-bro.com
sudo ln -s /etc/nginx/sites-available/x-bro.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Получить SSL сертификаты
sudo certbot --nginx -d x-bro.com -d *.x-bro.com
```

## 📡 API Endpoints

### Аутентификация

#### Супер-Админ

```http
POST /api/superadmin/login
Content-Type: application/json

{
  "email": "superadmin",
  "password": "super2025"
}

Response: {
  "success": true,
  "token": "jwt_token",
  "expiresIn": 3600
}
```

#### Админ магазина

```http
POST /api/admin/login
Content-Type: application/json

{
  "email": "admin",
  "password": "seed2025"
}
```

### Магазины (Супер-Админ)

```http
# Получить список всех магазинов
GET /api/superadmin/shops
Authorization: Bearer {token}

# Создать новый магазин
POST /api/superadmin/shops
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "My Shop",
  "subdomain": "myshop",
  "ownerName": "John Doe",
  "ownerEmail": "john@example.com",
  "ownerTelegramId": "123456789"
}

# Обновить магазин
PUT /api/superadmin/shops/:id
Authorization: Bearer {token}

# Удалить магазин
DELETE /api/superadmin/shops/:id
Authorization: Bearer {token}
```

### Товары

```http
# Получить товары
GET /api/products?shopId={shopId}

# Создать товар (требует авторизации)
POST /api/products
Authorization: Bearer {token}

# Обновить товар
PUT /api/products/:id
Authorization: Bearer {token}

# Удалить товар
DELETE /api/products/:id
Authorization: Bearer {token}
```

### Категории

```http
GET /api/categories?shopId={shopId}
POST /api/categories
PUT /api/categories/:id
DELETE /api/categories/:id
```

### Заказы

```http
# Получить заказы магазина
GET /api/orders?shopId={shopId}
Authorization: Bearer {token}

# Создать заказ
POST /api/orders

# Обновить статус
PUT /api/orders/:id
Authorization: Bearer {token}
```

### Health Check

```http
GET /health

Response: {
  "status": "ok",
  "timestamp": "2025-10-31T20:00:00.000Z",
  "uptime": 12345.67,
  "environment": "production",
  "port": 3000
}
```

## ⚙️ Конфигурация

### Переменные окружения

```bash
# Сервер
NODE_ENV=production
PORT=3000

# База данных
DATABASE_URL="postgresql://user:password@localhost:5432/database"

# Безопасность
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"

# Telegram (опционально)
TELEGRAM_BOT_TOKEN="your-bot-token"
TELEGRAM_CHAT_ID="your-chat-id"

# Cloudflare API
CLOUDFLARE_API_TOKEN="your-cloudflare-token"
CLOUDFLARE_ZONE_ID="your-zone-id"
```

### PM2 Ecosystem Config

```javascript
module.exports = {
  apps: [
    {
      name: 'telegram-shop-prod',
      script: './server.js',
      cwd: '/var/www/telegram-shop',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/telegram-shop-prod-error.log',
      out_file: '/var/log/pm2/telegram-shop-prod-out.log',
    },
    {
      name: 'telegram-shop-dev',
      script: './server.js',
      cwd: '/var/www/telegram-shop-dev',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      error_file: '/var/log/pm2/telegram-shop-dev-error.log',
      out_file: '/var/log/pm2/telegram-shop-dev-out.log',
    },
  ],
};
```

### Nginx Configuration

Основные возможности:

- SSL/TLS с Let's Encrypt
- Rate limiting (API: 10 req/s, General: 30 req/s)
- Security headers (X-Frame-Options, X-Content-Type-Options)
- Gzip compression
- Reverse proxy для Node.js
- Wildcard поддомены для магазинов

Конфигурация: `/etc/nginx/sites-available/x-bro.com`

## 🏪 Мультитенантность

### Как это работает

1. **Создание магазина**
   - Супер-админ создает новый магазин через панель
   - Указывается subdomain (например, "myshop")
   - Автоматически создается DNS A-запись через Cloudflare API
   - Магазин сразу доступен по `myshop.x-bro.com`

2. **Маршрутизация запросов**

   ```javascript
   // Nginx принимает запрос на любой поддомен *.x-bro.com
   // Node.js определяет магазин по Host заголовку
   const subdomain = req.hostname.split('.')[0];
   const shop = await getShopBySubdomain(subdomain);
   ```

3. **Изоляция данных**
   - Каждый магазин имеет уникальный `shopId`
   - Все запросы фильтруются по `shopId`
   - Админы видят только данные своего магазина
   - Супер-админ видит все магазины

4. **Автоматическое создание DNS**
   ```javascript
   // При создании магазина
   await cloudflareService.createDNSRecord({
     type: 'A',
     name: subdomain, // myshop
     content: '46.224.19.173',
     proxied: true,
   });
   ```

### Пример потока создания магазина

```
1. Супер-админ → admin.x-bro.com/superadmin/shops
2. Заполняет форму: name="My Shop", subdomain="myshop"
3. POST /api/superadmin/shops
4. Server:
   ├── Создает запись в БД (shops table)
   ├── Вызывает Cloudflare API
   └── Создает DNS A-запись myshop.x-bro.com → 46.224.19.173
5. Через 1-2 минуты:
   └── https://myshop.x-bro.com доступен!
```

## 📊 Мониторинг

### PM2 Commands

```bash
# Статус всех процессов
pm2 status

# Логи
pm2 logs telegram-shop-prod
pm2 logs telegram-shop-dev

# Перезагрузка (zero-downtime)
pm2 reload telegram-shop-prod

# Мониторинг ресурсов
pm2 monit

# Информация о процессе
pm2 info telegram-shop-prod
```

### Health Checks

```bash
# Production
curl https://x-bro.com/health

# Dev
curl https://dev.x-bro.com/health
```

### Логи

```bash
# PM2 логи
tail -f /var/log/pm2/telegram-shop-prod-out.log
tail -f /var/log/pm2/telegram-shop-prod-error.log

# Nginx логи
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 🔒 Безопасность

- JWT токены с истечением через 1 час
- bcrypt хеширование паролей (10 раундов)
- Rate limiting на всех эндпоинтах
- HTTPS принудительно для всех доменов
- Security headers (HSTS, X-Frame-Options, CSP)
- SQL injection защита через Prisma ORM
- XSS защита через React

## 🤝 Участие в разработке

```bash
# Создать feature ветку
git checkout -b feature/new-feature

# Внести изменения
git add .
git commit -m "Add new feature"

# Запушить в dev для тестирования
git push origin feature/new-feature
```

## 📝 Лицензия

MIT License - свободное использование

## 👨‍💻 Авторы

- **Разработка**: alexxety
- **Архитектура**: Claude Code

## 📞 Поддержка

- GitHub Issues: https://github.com/alexxety/seed/issues
- Email: support@x-bro.com

---

**Версия**: 1.0.0
**Последнее обновление**: 31 октября 2025
**Статус**: Production Ready ✅
