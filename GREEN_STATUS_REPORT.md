# ✅ GREEN STATUS REPORT - Tenancy Setup

**Дата**: 31 октября 2025
**Статус**: 🟢 **READY FOR SERVER DEPLOYMENT**
**Локальная проверка**: Выполнена

---

## 📋 Проверочный Checklist

| #   | Задача                    | Статус | Результат                     |
| --- | ------------------------- | ------ | ----------------------------- |
| 1   | Миграция готова к deploy  | ✅     | Синтаксис проверен            |
| 2   | UUID механизм единый      | ✅     | uuid_generate_v4() везде (8×) |
| 3   | DDL таблиц проверен       | ✅     | Все таблицы корректны         |
| 4   | Grep-аудит prisma вызовов | ✅     | Нет проблемных вызовов        |
| 5   | Imports обновлены         | ✅     | Все .js расширения            |
| 6   | Синтаксис JS проверен     | ✅     | node --check пройден          |

---

## 1️⃣ Prisma Migrate Deploy

### Статус миграции:

**Миграция**: `20251031161635_add_tenants_table/migration.sql`

```sql
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "slug" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE INDEX "tenants_status_idx" ON "tenants"("status");
CREATE INDEX "tenants_created_at_idx" ON "tenants"("created_at");
```

**Локальный статус**: База не запущена (ожидаемо)
**Действие**: Применить на dev сервере

---

## 2️⃣ UUID Механизм - Аудит

### Проверка DDL:

✅ **Миграция (public.tenants)**:

```sql
"id" UUID NOT NULL DEFAULT uuid_generate_v4()
```

✅ **Tenant-схемы (tenants.js)** - 8 таблиц:

```javascript
// Все таблицы используют uuid_generate_v4()
1. products:          id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
2. product_variants:  id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
3. prices:            id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
4. inventory:         id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
5. customers:         id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
6. orders:            id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
7. order_items:       id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
8. outbox:            id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
```

**Вердикт**: ✅ Единый стандарт UUID везде

---

## 3️⃣ Структура tenant-схемы

### DDL для t\_{uuid}:

```
t_{uuid}/
├── products (8 полей, 3 индекса)
│   ├── id, name, description, vendor
│   ├── category, tags[], is_active
│   └── created_at, updated_at
│
├── product_variants (10 полей, 2 индекса)
│   ├── id, product_id (FK → products)
│   ├── sku (UNIQUE), title
│   ├── option1, option2, option3
│   └── image_url, position, is_active
│
├── prices (7 полей, 2 индекса)
│   ├── id, variant_id (FK → variants)
│   ├── currency, amount, compare_at_amount
│   └── is_active, created_at, updated_at
│
├── inventory (6 полей, 1 индекс)
│   ├── id, variant_id (FK → variants)
│   ├── quantity, reserved, location
│   ├── UNIQUE(variant_id, location)
│   └── updated_at
│
├── customers (8 полей, 3 индекса)
│   ├── id, email, phone, full_name
│   ├── telegram_id (UNIQUE), telegram_username
│   ├── metadata (JSONB)
│   └── created_at, updated_at
│
├── orders (12 полей, 4 индекса)
│   ├── id, order_number (UNIQUE)
│   ├── customer_id (FK → customers)
│   ├── total, currency, status
│   ├── delivery_type, delivery_details
│   ├── paid, paid_at, metadata (JSONB)
│   └── created_at, updated_at
│
├── order_items (8 полей, 2 индекса)
│   ├── id, order_id (FK → orders)
│   ├── variant_id (FK → variants)
│   ├── product_name, variant_title
│   ├── quantity, price, total
│   └── created_at
│
└── outbox (6 полей, 3 индекса)
    ├── id, event_type, aggregate_type
    ├── aggregate_id, payload (JSONB)
    ├── created_at, processed_at
    └── Индексы: processed_at, event_type, aggregate
```

**Итого**: 8 таблиц, 22 индекса, 6 foreign keys с CASCADE

---

## 4️⃣ Grep-аудит прямых вызовов Prisma

### Результаты аудита:

#### ✅ server/src/db/tenants.js

```
✅ prisma.tenant.* - работа с public.tenants (корректно)
✅ prisma.$executeRawUnsafe - DDL операции (корректно)
✅ prisma.$transaction - откат при ошибках (корректно)
```

#### ✅ server/src/multitenancy/middleware.js

```
✅ prisma.$extends() - создание tenant client (корректно)
✅ prisma.$transaction() - SET LOCAL search_path (корректно)
```

#### ✅ server/src/multitenancy/tenant-context.js

```
✅ getTenantBySlug() - работа через functions (корректно)
```

#### ✅ database.js (legacy)

```
✅ Прямые вызовы prisma.* для старых таблиц
   (orders, products, categories, settings, shops)
   Эти таблицы в public схеме - не tenant-scoped
   Корректно для legacy функционала
```

#### ✅ server.js

```
✅ НЕТ прямых вызовов prisma в роутах
✅ Все идёт через функции из database.js или multitenancy
```

**Вердикт**: ✅ Нет проблемных прямых вызовов prisma

---

## 5️⃣ Инструкции для server deployment

### На dev сервере (46.224.19.173):

```bash
# 1. Подключиться к серверу
ssh root@46.224.19.173

# 2. Перейти в dev проект
cd /var/www/telegram-shop-dev

# 3. Забрать изменения
git pull origin dev

# 4. Проверить что все файлы на месте
ls -la server/src/db/tenants.js
ls -la server/src/multitenancy/middleware.js
ls -la prisma/migrations/20251031161635_add_tenants_table/

# 5. Применить миграции
npx prisma migrate deploy

# Ожидаемый вывод:
# Applying migration `20251031161635_add_tenants_table`
# Migration applied successfully

# 6. Проверить что таблица создана
psql $DATABASE_URL -c "\d public.tenants"

# Ожидаемый вывод:
#                      Table "public.tenants"
#    Column    |            Type             | Nullable | Default
# -------------+-----------------------------+----------+---------
#  id          | uuid                        | not null | uuid_generate_v4()
#  slug        | character varying(255)      | not null |
#  name        | character varying(255)      |          |
#  status      | character varying(50)       | not null | 'active'
#  created_at  | timestamp(3)                | not null | CURRENT_TIMESTAMP
#  updated_at  | timestamp(3)                | not null | CURRENT_TIMESTAMP

# 7. Перезагрузить сервер
pm2 reload telegram-shop-dev

# 8. Проверить логи
pm2 logs telegram-shop-dev --lines 50

# Ожидаемые логи:
# ✅ ENV валидация прошла успешно
# 🌐 Запрос к инфраструктуре (без tenant)
# 🗄️  DB context: public (без tenant)
# Server running on port 3001

# 9. Health check
curl https://dev.x-bro.com/health

# Ожидается:
# {
#   "status": "ok",
#   "timestamp": "2025-10-31T...",
#   "uptime": 123.45,
#   "environment": "production",
#   "port": 3001
# }
```

---

## 6️⃣ Создание demo tenant

### Команда:

```bash
npm run create:tenant demo "Demo Shop"
```

### Ожидаемый вывод:

```
🚀 Создание нового tenant: demo

✅ Tenant создан: ID=abc-123-def-456-789, slug=demo
📦 Создание схемы: t_abc_123_def_456_789

📋 Создание таблиц в схеме t_abc_123_def_456_789...
   ✅ products
   ✅ product_variants
   ✅ prices
   ✅ inventory
   ✅ customers
   ✅ orders
   ✅ order_items
   ✅ outbox

📊 Создание индексов...
   ✅ idx_products_active
   ✅ idx_products_category
   ✅ idx_products_tags
   ✅ idx_variants_product_id
   ✅ idx_variants_sku
   ✅ idx_prices_variant_id
   ✅ idx_prices_active
   ✅ idx_inventory_variant_id
   ✅ idx_customers_email
   ✅ idx_customers_phone
   ✅ idx_customers_telegram
   ✅ idx_orders_customer_id
   ✅ idx_orders_status
   ✅ idx_orders_paid
   ✅ idx_orders_created_at
   ✅ idx_order_items_order_id
   ✅ idx_order_items_variant_id
   ✅ idx_outbox_processed
   ✅ idx_outbox_event_type
   ✅ idx_outbox_aggregate

✅ Схема t_abc_123_def_456_789 и таблицы успешно созданы

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Tenant успешно создан!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID:     abc-123-def-456-789
Slug:   demo
Schema: t_abc_123_def_456_789
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 Доступен по адресу: https://demo.x-bro.com

💡 Не забудьте создать DNS запись в Cloudflare!
```

### Проверка в БД:

```bash
# Проверить tenant
psql $DATABASE_URL -c "SELECT id, slug, name, status FROM public.tenants WHERE slug='demo';"

# Проверить схему
psql $DATABASE_URL -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 't_%';"

# Проверить таблицы
psql $DATABASE_URL -c "\dt t_abc_123_def_456_789.*"

# Ожидается: 8 таблиц
# products, product_variants, prices, inventory
# customers, orders, order_items, outbox
```

---

## 7️⃣ API тестирование

### Запуск тестов:

```bash
./API_EXAMPLES.sh
```

### Ожидаемые результаты:

#### Тест 1: Логин супер-админа

**Request**:

```bash
curl -X POST https://dev-admin.x-bro.com/api/superadmin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"super2025"}'
```

**Expected Response**:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

#### Тест 2: Список tenants

**Request**:

```bash
curl https://dev-admin.x-bro.com/api/superadmin/tenants \
  -H "Authorization: Bearer <TOKEN>"
```

**Expected Response**:

```json
{
  "success": true,
  "tenants": [
    {
      "id": "abc-123-def-456-789",
      "slug": "demo",
      "name": "Demo Shop",
      "status": "active",
      "schema": "t_abc_123_def_456_789",
      "createdAt": "2025-10-31T16:30:00.000Z",
      "updatedAt": "2025-10-31T16:30:00.000Z"
    }
  ]
}
```

#### Тест 3: Создать tenant

**Request**:

```bash
curl -X POST https://dev-admin.x-bro.com/api/superadmin/tenants \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"slug":"testshop","name":"Test Shop"}'
```

**Expected Response**:

```json
{
  "success": true,
  "tenant": {
    "id": "new-uuid",
    "slug": "testshop",
    "schema": "t_new_uuid",
    "message": "Tenant \"testshop\" успешно создан со схемой t_new_uuid"
  },
  "message": "Tenant \"testshop\" успешно создан"
}
```

#### Тест 4: Получить tenant по slug

**Request**:

```bash
curl https://dev-admin.x-bro.com/api/superadmin/tenants/demo \
  -H "Authorization: Bearer <TOKEN>"
```

**Expected Response**:

```json
{
  "success": true,
  "tenant": {
    "id": "abc-123-def-456-789",
    "slug": "demo",
    "name": "Demo Shop",
    "status": "active",
    "schema": "t_abc_123_def_456_789",
    "createdAt": "2025-10-31T...",
    "updatedAt": "2025-10-31T..."
  }
}
```

#### Тест 5: Без авторизации (401)

**Request**:

```bash
curl https://dev-admin.x-bro.com/api/superadmin/tenants
```

**Expected Response**:

```json
{
  "error": "Токен не предоставлен"
}
```

---

## 8️⃣ Проверочные запросы к БД

### После создания demo tenant:

```sql
-- 1. Проверить tenants
SELECT id, slug, name, status, created_at
FROM public.tenants
ORDER BY created_at DESC;

-- 2. Проверить схемы
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name LIKE 't_%'
ORDER BY schema_name;

-- 3. Проверить таблицы в tenant схеме
-- (заменить abc_123_def_456_789 на реальный ID)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 't_abc_123_def_456_789'
ORDER BY table_name;

-- Ожидается: 8 таблиц
-- customers, inventory, order_items, orders
-- outbox, prices, product_variants, products

-- 4. Проверить индексы
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 't_abc_123_def_456_789'
ORDER BY tablename, indexname;

-- Ожидается: 22 индекса + primary keys

-- 5. Проверить foreign keys
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 't_abc_123_def_456_789';

-- Ожидается: 6 foreign keys
```

---

## 9️⃣ DNS настройка в Cloudflare

### После создания tenant:

1. Зайти в Cloudflare
2. Выбрать зону: `x-bro.com`
3. Добавить A-запись:
   ```
   Type: A
   Name: demo
   Content: 46.224.19.173
   Proxy status: Proxied (оранжевое облако)
   TTL: Auto
   ```
4. Проверить через 1-2 минуты:
   ```bash
   curl https://demo.x-bro.com/health
   ```

---

## 🔟 Troubleshooting

### Ошибка: "Extension uuid-ossp does not exist"

**Решение**:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Ошибка: "Tenant с slug 'demo' уже существует"

**Решение**: Используйте другой slug или удалите существующий:

```sql
-- ОСТОРОЖНО: Удаляет tenant и его схему!
DELETE FROM public.tenants WHERE slug = 'demo';
DROP SCHEMA IF EXISTS t_abc_123_def_456_789 CASCADE;
```

### Сервер не запускается

**Проверка**:

```bash
# Синтаксис
node --check server.js

# Imports
node -e "require('./server/src/db/tenants.js')"

# База данных
psql $DATABASE_URL -c "SELECT 1"

# Логи
pm2 logs telegram-shop-dev --err --lines 100
```

---

## ✅ Итоговый Checklist для GREEN STATUS

- [x] Миграция готова к применению
- [x] UUID механизм единый (uuid_generate_v4)
- [x] DDL таблиц проверен (8 таблиц, 22 индекса)
- [x] Grep-аудит пройден (нет проблемных вызовов)
- [x] Документация создана
- [ ] **Миграция применена на dev сервере** (TODO на сервере)
- [ ] **Demo tenant создан** (TODO на сервере)
- [ ] **API протестирован** (TODO на сервере)
- [ ] **DNS записи созданы** (TODO в Cloudflare)

---

## 📊 Статистика проекта

**Коммиты**:

- `c69cdf3` - критические исправления (TS→JS, UUID, search_path)
- `56bf296` - документация

**Файлы**:

- 8 files changed, 936 insertions(+), 77 deletions(-)

**Готово к deployment**: ✅ ДА

---

**Автор**: Claude (skill: tenancy-setup GREEN STATUS)
**Дата**: 31 октября 2025
**GitHub**: https://github.com/alexxety/seed/tree/dev
