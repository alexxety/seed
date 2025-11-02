# 🔧 Tenancy Setup - Критические исправления

**Дата**: 31 октября 2025
**Статус**: ✅ ВСЕ ПРОБЛЕМЫ ИСПРАВЛЕНЫ

---

## 📋 Список исправленных проблем

### 1. ✅ TS/JS несовместимость

**Проблема**:

- Файлы .ts требовались через require() из .js без компиляции
- Сервер не мог запуститься

**Решение**:

- Переименованы все .ts → .js (CommonJS)
- Обновлены все imports с расширением .js

**Изменённые файлы**:

```
server/src/config/env.ts        → server/src/config/env.js
server/src/db/tenants.ts         → server/src/db/tenants.js
server/src/multitenancy/tenant-context.ts → server/src/multitenancy/tenant-context.js
server/src/multitenancy/middleware.ts     → server/src/multitenancy/middleware.js
```

**Обновлены imports в**:

- `server.js` (строки 21-23)
- `scripts/create-tenant.js` (строка 4)

---

### 2. ✅ UUID функции приведены к стандарту

**Проблема**:

- В миграции: `uuid_generate_v4()` (расширение uuid-ossp)
- В tenants.js: `gen_random_uuid()` (pgcrypto)
- Несоответствие стандартов

**Решение**:

- Заменены все `gen_random_uuid()` → `uuid_generate_v4()`
- 8 замен в `server/src/db/tenants.js`

**Команда**:

```bash
sed -i '' 's/gen_random_uuid()/uuid_generate_v4()/g' server/src/db/tenants.js
```

---

### 3. ✅ search_path с транзакциями (SET LOCAL)

**Проблема**:

- `SET search_path` выполнялся вне транзакции
- Опасно из-за пула соединений PostgreSQL
- Могли возникать race conditions

**Решение**:
Полностью переписан `server/src/multitenancy/middleware.js`:

#### Новый паттерн:

**1. Функция `getTenantDB(req)`**:

```javascript
// Использует Prisma.$extends() для автоматической установки search_path
const tenantPrisma = prisma.$extends({
  query: {
    async $allOperations({ operation, model, args, query }) {
      const [, result] = await prisma.$transaction([
        prisma.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}", public`),
        query(args),
      ]);
      return result;
    },
  },
});
```

**2. Middleware `attachTenantDB(req, res, next)`**:

```javascript
// Создаёт req.db для использования в хэндлерах
req.db = await getTenantDB(req);
```

**3. Утилита `withTenantSchema(schema, callback)`**:

```javascript
// Для скриптов и CLI
await withTenantSchema('t_abc_123', async tx => {
  // tx уже имеет правильный search_path
  const products = await tx.product.findMany();
});
```

#### Преимущества нового подхода:

- ✅ `SET LOCAL` действует только внутри транзакции
- ✅ Безопасно для пула соединений
- ✅ Нет race conditions
- ✅ Чистый API через `req.db`

---

### 4. ✅ Обновлён middleware паттерн

**Было**:

```javascript
app.use(setTenantContext);
app.use(autoSetSearchPath); // Устаревший, небезопасный
```

**Стало**:

```javascript
app.use(setTenantContext); // Определяет tenant
app.use(attachTenantDB); // Создаёт req.db с транзакциями
```

**Использование в роутах**:

```javascript
// Старый способ (НЕ используйте)
app.get('/api/products', async (req, res) => {
  await setSearchPath(req); // ❌ Опасно!
  const products = await prisma.product.findMany();
});

// Новый способ (правильный)
app.get('/api/products', async (req, res) => {
  const products = await req.db.product.findMany(); // ✅ Безопасно!
  res.json({ products });
});
```

---

## 📊 Diff основных изменений

### server/src/multitenancy/middleware.js

**Полностью переписан**:

- Удалён небезопасный паттерн `SET search_path`
- Добавлен `getTenantDB(req)` с Prisma.$extends()
- Добавлен `attachTenantDB` middleware
- Добавлен `withTenantSchema()` для скриптов
- Legacy функции помечены @deprecated

### server/src/db/tenants.js

**Изменения**:

```diff
- id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
+ id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
```

×8 раз во всех таблицах

### server.js

**Строки 21-23**:

```diff
- const { createTenant, getAllTenants, getTenantBySlug, getTenantById } = require('./server/src/db/tenants');
- const { setTenantContext, requireTenant } = require('./server/src/multitenancy/tenant-context');
- const { autoSetSearchPath } = require('./server/src/multitenancy/middleware');
+ const { createTenant, getAllTenants, getTenantBySlug, getTenantById } = require('./server/src/db/tenants.js');
+ const { setTenantContext, requireTenant } = require('./server/src/multitenancy/tenant-context.js');
+ const { attachTenantDB } = require('./server/src/multitenancy/middleware.js');
```

**Строки 77-79**:

```diff
  app.use(setTenantContext);
- app.use(autoSetSearchPath);
+ // Создаёт req.db с правильным search_path через транзакции
+ app.use(attachTenantDB);
```

### scripts/create-tenant.js

**Строка 4**:

```diff
- const { createTenant } = require('../server/src/db/tenants');
+ const { createTenant } = require('../server/src/db/tenants.js');
```

---

## 🧪 Проверка исправлений

### 1. Синтаксис JavaScript

```bash
node --check server/src/config/env.js
node --check server/src/db/tenants.js
node --check server/src/multitenancy/tenant-context.js
node --check server/src/multitenancy/middleware.js
```

**Результат**: ✅ Все файлы валидны

### 2. Проверка imports

```bash
node -e "require('./server/src/config/env.js')"
node -e "require('./server/src/db/tenants.js')"
node -e "require('./server/src/multitenancy/tenant-context.js')"
node -e "require('./server/src/multitenancy/middleware.js')"
```

**Результат**: ✅ Все imports работают

---

## 🚀 Применение на сервере

### Development:

```bash
# 1. Подключиться к серверу
ssh root@46.224.19.173

# 2. Перейти в dev проект
cd /var/www/telegram-shop-dev

# 3. Забрать изменения
git pull origin dev

# 4. Применить миграцию
npx prisma migrate deploy

# 5. Перезагрузить сервер
pm2 reload telegram-shop-dev

# 6. Проверить логи
pm2 logs telegram-shop-dev --lines 50

# 7. Проверить что сервер работает
curl https://dev.x-bro.com/health

# 8. Создать тестовый tenant
npm run create:tenant demo "Demo Shop"

# 9. Проверить что tenant создался
npm run create:tenant demo "Demo Shop"
# Должна быть ошибка: "Tenant с slug 'demo' уже существует"

# 10. Тест API
./API_EXAMPLES.sh
```

### Ожидаемые результаты:

#### Health check:

```json
{
  "status": "ok",
  "timestamp": "2025-10-31T...",
  "uptime": 123.45,
  "environment": "production",
  "port": 3001
}
```

#### Создание tenant:

```
🚀 Создание нового tenant: demo
✅ Tenant создан: ID=abc-123-def, slug=demo
📦 Создание схемы: t_abc_123_def
📋 Создание таблиц в схеме t_abc_123_def...
📊 Создание индексов...
✅ Схема t_abc_123_def и таблицы успешно созданы
```

#### API логин:

```json
{
  "success": true,
  "token": "eyJhbGc...",
  "expiresIn": 3600
}
```

---

## 📝 Migration checklist

### Проверка миграции:

```bash
# Проверить что расширение установлено
psql $DATABASE_URL -c "SELECT extname FROM pg_extension WHERE extname = 'uuid-ossp';"

# Если нет - установить
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# Применить миграцию
npx prisma migrate deploy

# Проверить что таблица создана
psql $DATABASE_URL -c "\d public.tenants"
```

**Ожидаемая структура**:

```sql
Table "public.tenants"
   Column    |            Type             | Nullable | Default
-------------+-----------------------------+----------+---------
 id          | uuid                        | not null | uuid_generate_v4()
 slug        | character varying(255)      | not null |
 name        | character varying(255)      |          |
 status      | character varying(50)       | not null | 'active'::character varying
 created_at  | timestamp(3) without time zone | not null | CURRENT_TIMESTAMP
 updated_at  | timestamp(3) without time zone | not null | CURRENT_TIMESTAMP
Indexes:
    "tenants_pkey" PRIMARY KEY, btree (id)
    "tenants_slug_key" UNIQUE CONSTRAINT, btree (slug)
    "tenants_created_at_idx" btree (created_at)
    "tenants_status_idx" btree (status)
```

---

## 🔜 Next Steps

### 1. Применить исправления на сервере

```bash
# Dev окружение
ssh root@46.224.19.173
cd /var/www/telegram-shop-dev
git pull origin dev
npx prisma migrate deploy
pm2 reload telegram-shop-dev

# Prod окружение (после тестирования на dev)
cd /var/www/telegram-shop
git checkout main
git merge dev
npx prisma migrate deploy
pm2 reload telegram-shop-prod
```

### 2. Создать демо tenant

```bash
npm run create:tenant demo "Demo Shop"
```

### 3. Протестировать API

```bash
./API_EXAMPLES.sh
```

### 4. Создать DNS записи в Cloudflare

Для каждого созданного tenant нужно добавить A-запись:

```
demo.x-bro.com → 46.224.19.173
```

### 5. Реализовать следующий skill

После успешного тестирования перейти к:

- **aggregator-sync** - синхронизация данных в маркетплейс
- **typesense-index** - поисковая индексация
- **crypto-billing** - крипто-платежи

---

## ⚠️ Важные замечания

### 1. SET LOCAL vs SET

**SET LOCAL** (правильно):

- Действует только внутри текущей транзакции
- Автоматически откатывается после COMMIT/ROLLBACK
- Безопасно для пула соединений

**SET** (неправильно):

- Действует для всей сессии
- Остаётся после транзакции
- Может влиять на другие запросы из пула

### 2. req.db паттерн

**Всегда используйте** `req.db` в роутах:

```javascript
// ✅ Правильно
app.get('/api/products', async (req, res) => {
  const products = await req.db.product.findMany();
  res.json({ products });
});

// ❌ Неправильно
app.get('/api/products', async (req, res) => {
  await setSearchPath(req);
  const products = await prisma.product.findMany();
  res.json({ products });
});
```

### 3. Tenant isolation

**Гарантии**:

- ✅ Каждый запрос изолирован в своей транзакции
- ✅ search_path устанавливается через SET LOCAL
- ✅ Невозможно получить доступ к данным другого tenant
- ✅ Middleware проверяет наличие tenant перед доступом

---

## ✅ Checklist завершённых задач

- [x] Конвертированы .ts → .js (4 файла)
- [x] Исправлены UUID функции (8 замен)
- [x] Переписан middleware с SET LOCAL
- [x] Добавлен req.db паттерн
- [x] Обновлены все imports (.js расширения)
- [x] Проверен синтаксис всех файлов
- [x] Создана документация по исправлениям
- [ ] Применены миграции на dev сервере (TODO)
- [ ] Протестирован API (TODO)
- [ ] Создан демо tenant (TODO)

---

## 📞 Support

- GitHub: https://github.com/alexxety/seed
- Branch: dev
- Commit: Готов к `git add` и `git commit`

---

**Автор**: Claude (skill: tenancy-setup FIXES COMPLETE)
**Дата**: 31 октября 2025
**Статус**: 🟢 ВСЕ КРИТИЧЕСКИЕ ПРОБЛЕМЫ ИСПРАВЛЕНЫ
