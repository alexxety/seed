# 🏢 Multitenancy Setup - Документация

## 📌 Обзор

Проект переведён на **schema-per-tenant архитектуру**:

- **core (public)** - глобальные данные: таблица `tenants`, `shops`
- **t\_{id}** - данные каждого магазина изолированы в отдельной схеме

## 🗂️ Структура файлов

```
server/src/
├── config/
│   └── env.ts              # Валидация ENV через Zod
├── db/
│   └── tenants.ts          # Функции работы с tenants
└── multitenancy/
    ├── tenant-context.ts   # Определение tenant по поддомену
    └── middleware.ts       # Установка search_path
```

## 🚀 Быстрый старт

### 1. Применить миграцию

На сервере или локально (если БД запущена):

```bash
npx prisma migrate deploy
```

Это создаст таблицу `public.tenants`.

### 2. Создать tenant через CLI

```bash
npm run create:tenant myshop "My Shop Name"
```

Это создаст:

- Запись в `public.tenants`
- Схему `t_{uuid}` с таблицами:
  - `products` - товары
  - `customers` - клиенты
  - `orders` - заказы
  - `outbox` - события для синхронизации

### 3. Создать tenant через API

```bash
# Логин супер-админа
curl -X POST https://admin.x-bro.com/api/superadmin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"super2025"}'

# Создание tenant
curl -X POST https://admin.x-bro.com/api/superadmin/tenants \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"slug":"testshop","name":"Test Shop"}'

# Получить список tenants
curl https://admin.x-bro.com/api/superadmin/tenants \
  -H "Authorization: Bearer <TOKEN>"

# Получить tenant по slug
curl https://admin.x-bro.com/api/superadmin/tenants/testshop \
  -H "Authorization: Bearer <TOKEN>"
```

## 🔧 API Endpoints

### Супер-админ API

| Метод | URL                             | Описание                |
| ----- | ------------------------------- | ----------------------- |
| POST  | `/api/superadmin/tenants`       | Создать tenant          |
| GET   | `/api/superadmin/tenants`       | Список всех tenants     |
| GET   | `/api/superadmin/tenants/:slug` | Получить tenant по slug |

### Tenant-scoped API

Для работы с данными конкретного tenant используйте:

- **Поддомен**: `https://myshop.x-bro.com/api/...`
- **Заголовок**: `X-Tenant: myshop`

Middleware автоматически:

1. Определит tenant по поддомену/заголовку
2. Установит `search_path` в схему tenant
3. Все запросы к БД будут изолированы

## 💻 Использование в коде

### Получение tenant context

```js
app.get('/api/tenant/products', async (req, res) => {
  // req.context.tenant содержит:
  // {
  //   id: "uuid",
  //   slug: "myshop",
  //   name: "My Shop",
  //   schema: "t_uuid"
  // }

  if (!req.context.tenant) {
    return res.status(403).json({ error: 'Tenant required' });
  }

  // search_path уже установлен, можно делать запросы
  const products = await prisma.$queryRaw`SELECT * FROM products`;

  res.json({ products });
});
```

### Требовать tenant

```js
const { requireTenant } = require('./server/src/multitenancy/tenant-context');

// Этот эндпоинт доступен только с tenant context
app.get('/api/tenant/orders', requireTenant, async (req, res) => {
  const { tenant } = req.context;

  // Работа с данными tenant
  const orders = await prisma.$queryRaw`
    SELECT * FROM orders WHERE status = 'pending'
  `;

  res.json({ orders });
});
```

### Установка search_path вручную

```js
const { setSearchPath } = require('./server/src/multitenancy/middleware');

app.post('/api/tenant/products', async (req, res) => {
  const prisma = await setSearchPath(req);

  // Теперь все запросы идут в схему tenant
  await prisma.$executeRaw`
    INSERT INTO products (name, price) VALUES ('Product', 100)
  `;

  res.json({ success: true });
});
```

## 🏗️ Структура схемы tenant

Каждая схема `t_{id}` содержит:

```sql
-- Товары
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Клиенты
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  email VARCHAR(255),
  phone VARCHAR(50),
  full_name VARCHAR(255),
  telegram_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Заказы
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  items JSONB NOT NULL,
  delivery_type VARCHAR(50),
  delivery_details TEXT,
  paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Outbox для event sourcing
CREATE TABLE outbox (
  id UUID PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);
```

## 🔒 Безопасность

### Изоляция данных

✅ Каждый tenant имеет свою схему
✅ `search_path` устанавливается автоматически
✅ Невозможно получить доступ к данным другого tenant
✅ Middleware проверяет наличие tenant перед доступом к данным

### Правила

1. **Никогда не делайте запросы без установки search_path**
2. **Используйте `requireTenant` для tenant-scoped эндпоинтов**
3. **Инфраструктурные домены** (admin, www, seed) не имеют tenant
4. **Супер-админ API** работает только с `role='superadmin'`

## 🧪 Тестирование

### Локально

```bash
# Установите DATABASE_URL в .env
DATABASE_URL="postgresql://user:password@localhost:5432/seedshop"

# Примените миграции
npx prisma migrate deploy

# Создайте тестовый tenant
npm run create:tenant test "Test Shop"

# Проверьте в БД
psql seedshop
\dn  # список схем
\dt t_*.*  # таблицы в tenant схемах
```

### На сервере

```bash
# Подключитесь к серверу
ssh root@46.224.19.173

# Перейдите в проект
cd /var/www/telegram-shop-dev

# Примените миграции
npx prisma migrate deploy

# Создайте tenant
npm run create:tenant demo "Demo Shop"

# Перезагрузите сервер
pm2 reload telegram-shop-dev
```

## 📊 Мониторинг

```sql
-- Список всех tenants
SELECT id, slug, name, status, created_at FROM public.tenants;

-- Список всех схем tenants
SELECT schema_name FROM information_schema.schemata
WHERE schema_name LIKE 't_%';

-- Количество товаров в схеме tenant
SET search_path TO t_<uuid>, public;
SELECT COUNT(*) FROM products;
```

## 🚧 Roadmap

- [ ] Aggregator синхронизация (outbox → маркетплейс)
- [ ] Typesense индексация
- [ ] Крипто-платежи для tenants
- [ ] Миграция данных из старой структуры
- [ ] UI для управления tenants в супер-админ панели

## 📞 Поддержка

При проблемах проверьте:

1. Таблица `tenants` создана: `\dt public.tenants`
2. Схема tenant существует: `\dn t_*`
3. Middleware подключён в server.js
4. ENV переменные корректны

---

**Последнее обновление**: 31 октября 2025
**Версия**: 1.0.0 (multitenancy baseline)
