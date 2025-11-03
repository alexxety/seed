# 📌 Информация о проекте - Быстрый старт

> **Этот файл содержит ВСЮ информацию для работы с проектом.**
> Используйте его при открытии нового терминала Claude Code.

## 🗂️ Где находятся файлы

### Локальная машина

```
Проект: /Users/raketa23/seed
Ветка: dev
Git: https://github.com/alexxety/seed.git
```

### Сервер Production

```
Хост: root@46.224.19.173
Путь: /var/www/telegram-shop
Порт: 3000
PM2: telegram-shop-prod
База: PostgreSQL seedshop (localhost:5432)
```

### Сервер Development

```
Хост: root@46.224.19.173
Путь: /var/www/telegram-shop-dev
Порт: 3001
PM2: telegram-shop-dev
База: PostgreSQL seedshop_dev (localhost:5432)
```

## 🌐 Все домены и URLs

### Production (работает на порту 3000)

| URL                                      | Назначение             | Логин        | Пароль      |
| ---------------------------------------- | ---------------------- | ------------ | ----------- |
| https://x-bro.com                        | Главная страница       | -            | -           |
| https://admin.x-bro.com/superadmin/login | **Супер-Админ панель** | `superadmin` | `super2025` |
| https://seed.x-bro.com                   | Демо магазин           | -            | -           |
| https://seed.x-bro.com/admin/login       | Админ демо-магазина    | `admin`      | `seed2025`  |
| https://\*.x-bro.com                     | Магазины пользователей | -            | -           |

### Development (работает на порту 3001)

| URL                                          | Назначение          | Логин        | Пароль      |
| -------------------------------------------- | ------------------- | ------------ | ----------- |
| https://dev.x-bro.com                        | Dev главная         | -            | -           |
| https://dev-admin.x-bro.com/superadmin/login | **Dev Супер-Админ** | `superadmin` | `super2025` |
| https://deva.x-bro.com                       | Dev демо магазин    | -            | -           |

## 🔐 Все учетные данные

### Серверы

```bash
# SSH доступ к серверу
ssh root@46.224.19.173
# Пароль: (хранится в безопасном месте)
```

### База данных

```bash
# PostgreSQL Production
Host: localhost (на сервере)
Port: 5432
Database: seedshop
User: seedshop
Password: seedshop_secure_password_2025

# PostgreSQL Development
Host: localhost (на сервере)
Port: 5432
Database: seedshop_dev
User: seedshop
Password: seedshop_secure_password_2025
```

### Супер-Админ

```
Production: https://admin.x-bro.com/superadmin/login
Dev: https://dev-admin.x-bro.com/superadmin/login
Логин: superadmin
Пароль: super2025
Роль: Управление всеми магазинами
```

### Админ демо-магазина

```
URL: https://seed.x-bro.com/admin/login
Логин: admin
Пароль: seed2025
Роль: Управление демо-магазином
```

### GitHub

```
Репозиторий: https://github.com/alexxety/seed
Ветка production: main
Ветка development: dev
```

### Cloudflare API

```bash
# В .env файле на сервере
CLOUDFLARE_API_TOKEN="NR5WkmdXtP3RuEZCd5juCYR76-JVstwovpTy2Vuc"
CLOUDFLARE_ZONE_ID="187bc600e8a0b4076e391eaf6283fdad"
Zone: x-bro.com
```

### JWT Secret

```bash
# В .env файле на сервере
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
```

## 📂 Структура проекта

```
seed/
├── src/                          # Frontend исходники
│   ├── app/
│   │   └── routes/              # React Router файлы
│   │       ├── __root.tsx       # Корневой layout
│   │       ├── index.tsx        # Главная страница
│   │       ├── admin/           # Админ панель магазина
│   │       │   ├── login.tsx    # Логин админа
│   │       │   └── _admin/      # Защищенные роуты
│   │       │       ├── products.tsx
│   │       │       ├── orders.tsx
│   │       │       ├── categories.tsx
│   │       │       └── settings.tsx
│   │       └── superadmin/      # Супер-админ панель
│   │           ├── login.tsx    # Логин супер-админа
│   │           └── _superadmin/
│   │               └── shops.tsx # Управление магазинами
│   ├── features/                # Фичи по доменам
│   ├── components/              # Переиспользуемые компоненты
│   ├── lib/                     # Утилиты
│   └── main.tsx                 # Точка входа
├── dist/                        # Собранный frontend
├── server.js                    # Express API сервер
├── database.js                  # Функции работы с БД
├── cloudflare-service.js        # Cloudflare DNS API
├── prisma/                      # Prisma схема и миграции
├── ecosystem.config.js          # PM2 конфигурация
├── .github/workflows/           # GitHub Actions CI/CD
│   ├── deploy.yml              # Production деплой
│   └── deploy-dev.yml          # Dev деплой
└── README.md                    # Документация

На сервере:
/var/www/telegram-shop/          # Production
/var/www/telegram-shop-dev/      # Development
/etc/nginx/sites-available/x-bro.com  # Nginx config
/var/log/pm2/                    # PM2 логи
/var/log/nginx/                  # Nginx логи
```

## 🚀 Быстрые команды

### Локальная разработка

```bash
cd /Users/raketa23/seed

# Запустить dev сервер
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3000

# Собрать production
npm run build

# Проверить статус git
git status

# Запушить в dev
git add .
git commit -m "Your message"
git push origin dev

# Запушить в production
git push origin main
```

### Работа с сервером

```bash
# Подключиться к серверу
ssh root@46.224.19.173

# Статус PM2
pm2 status
pm2 logs telegram-shop-prod
pm2 logs telegram-shop-dev

# Перезагрузка (zero-downtime)
pm2 reload telegram-shop-prod
pm2 reload telegram-shop-dev

# Остановить/Запустить
pm2 stop telegram-shop-prod
pm2 start telegram-shop-prod

# Production деплой вручную
cd /var/www/telegram-shop
git pull origin main
npm install --omit=dev
npm run build
pm2 reload telegram-shop-prod

# Dev деплой вручную
cd /var/www/telegram-shop-dev
git pull origin dev
npm install --omit=dev
npm run build
pm2 reload telegram-shop-dev

# Проверить здоровье серверов
curl https://x-bro.com/health
curl https://dev.x-bro.com/health

# Логи
tail -f /var/log/pm2/telegram-shop-prod-out.log
tail -f /var/log/pm2/telegram-shop-prod-error.log
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### База данных

```bash
# Подключиться к PostgreSQL на сервере
ssh root@46.224.19.173
sudo -u postgres psql

# Подключиться к БД
\c seedshop

# Посмотреть таблицы
\dt

# Выход
\q

# Применить миграции (локально)
npx prisma migrate dev

# Применить миграции (на сервере)
cd /var/www/telegram-shop
npx prisma migrate deploy

# Сгенерировать Prisma Client
npx prisma generate

# Посмотреть БД в браузере
npx prisma studio
```

### Nginx

```bash
# На сервере
sudo nginx -t                    # Проверить конфиг
sudo systemctl reload nginx       # Перезагрузить
sudo systemctl status nginx       # Статус
```

### Cloudflare DNS

```bash
# Создать DNS запись через curl
curl -X POST "https://api.cloudflare.com/client/v4/zones/187bc600e8a0b4076e391eaf6283fdad/dns_records" \
  -H "Authorization: Bearer NR5WkmdXtP3RuEZCd5juCYR76-JVstwovpTy2Vuc" \
  -H "Content-Type: application/json" \
  -d '{"type":"A","name":"test","content":"46.224.19.173","proxied":true}'

# Список всех DNS записей
curl -X GET "https://api.cloudflare.com/client/v4/zones/187bc600e8a0b4076e391eaf6283fdad/dns_records" \
  -H "Authorization: Bearer NR5WkmdXtP3RuEZCd5juCYR76-JVstwovpTy2Vuc"
```

## 🔄 Как работает мультитенантность

1. **Создание магазина**:
   - Супер-админ → https://admin.x-bro.com/superadmin/shops
   - Заполняет: Name="My Shop", Subdomain="myshop"
   - POST /api/superadmin/shops (с JWT токеном)

2. **Сервер**:
   - Создает запись в таблице `shops`
   - Вызывает `cloudflare-service.js`
   - Создает DNS A-запись: myshop.x-bro.com → 46.224.19.173

3. **Результат**:
   - Через 1-2 минуты https://myshop.x-bro.com работает!
   - Nginx принимает запрос на \*.x-bro.com
   - Node.js определяет магазин по Host заголовку
   - Загружает данные только для этого магазина

## 📊 Что было сделано

### Последние изменения (31 октября 2025)

1. ✅ **Исправлена бесконечная рекурсия в роутере**
   - Проблема: `/superadmin` редиректил на `/superadmin/login` в цикле
   - Решение: Добавили проверку `location.pathname === '/superadmin'`
   - Файл: `src/app/routes/superadmin.tsx`

2. ✅ **Убран Telegram SDK из браузерной версии**
   - Проблема: Страница зависала при загрузке в браузере
   - Решение: Удалили `telegram-web-app.js` из `index.html`
   - Файлы: `index.html`, `src/app/routes/__root.tsx`

3. ✅ **Добавлена аутентификация супер-админа**
   - Эндпоинт: `POST /api/superadmin/login`
   - Учетные данные: superadmin / super2025
   - Файл: `server.js` (строки 183-219)

4. ✅ **Добавлен Health Check**
   - Эндпоинт: `GET /health`
   - Показывает статус, uptime, environment
   - Файл: `server.js` (строки 67-78)

5. ✅ **Graceful Shutdown**
   - Обработка SIGTERM, SIGINT
   - Таймаут 10 секунд
   - Файл: `server.js` (строки 862-893)

6. ✅ **PM2 конфигурация**
   - Fork mode (вместо cluster из-за SIGINT проблем)
   - Логи в `/var/log/pm2/`
   - Файл: `ecosystem.config.js`

7. ✅ **GitHub Actions zero-downtime**
   - Используется `pm2 reload` вместо `restart`
   - Файлы: `.github/workflows/deploy.yml`, `.github/workflows/deploy-dev.yml`

8. ✅ **Создан README.md**
   - Полная документация проекта
   - Архитектура, API, мультитенантность
   - 580 строк документации

### Коммиты

```
c113469 - Add comprehensive README documentation
a4413dc - Fix superadmin infinite redirect loop and add authentication
4716fdf - Enable SPA fallback route in Express
3018444 - Fix infinite redirect loop in domain routing
c94a383 - Add domain-based automatic routing
dd537d8 - Setup full domain infrastructure and super-admin panel
```

## 🎯 Текущие задачи

- [x] Исправить бесконечный редирект в супер-админе
- [x] Убрать Telegram SDK для браузерной версии
- [x] Добавить аутентификацию супер-админа
- [x] Создать README документацию
- [ ] Реализовать страницу управления магазинами
- [ ] Добавить создание магазинов через UI
- [ ] Протестировать создание DNS через Cloudflare

## 🧪 Тестирование

### Тест супер-админ логина

```bash
curl -X POST https://dev-admin.x-bro.com/api/superadmin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin","password":"super2025"}'

# Должен вернуть:
# {"success":true,"token":"jwt...","expiresIn":3600}
```

### Тест health check

```bash
curl https://x-bro.com/health
curl https://dev.x-bro.com/health

# Должен вернуть:
# {"status":"ok","timestamp":"...","uptime":123.45,"environment":"production","port":3000}
```

### Проверка PM2

```bash
ssh root@46.224.19.173 "pm2 status"

# Должны быть online:
# telegram-shop-prod (port 3000)
# telegram-shop-dev (port 3001)
```

## 🐛 Известные проблемы

1. **Решено**: ~~Бесконечный редирект в /superadmin~~ ✅
2. **Решено**: ~~Страница зависает при загрузке (Telegram SDK)~~ ✅
3. **В работе**: Нужно реализовать UI для создания магазинов

## 📞 Поддержка

- **GitHub Issues**: https://github.com/alexxety/seed/issues
- **README**: https://github.com/alexxety/seed/blob/dev/README.md
- **Email**: support@x-bro.com

---

## ⚡ Быстрый старт для нового терминала

```bash
# 1. Перейти в проект
cd /Users/raketa23/seed

# 2. Проверить ветку
git status
git branch

# 3. Запустить dev сервер
npm run dev

# 4. Открыть в браузере
# Frontend: http://localhost:5173
# Backend: http://localhost:3000

# 5. Подключиться к серверу (если нужно)
ssh root@46.224.19.173

# 6. Проверить production
open https://admin.x-bro.com/superadmin/login
# Логин: superadmin / Пароль: super2025
```

---

**Последнее обновление**: 31 октября 2025
**Версия проекта**: 1.0.0
**Статус**: Production Ready ✅
