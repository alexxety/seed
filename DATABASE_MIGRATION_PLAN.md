# План миграции базы данных на PostgreSQL (Стандарты 2025)

## 📋 Обзор задачи

**Цель:** Мигрировать базу данных с SQLite на PostgreSQL с применением современных отраслевых стандартов 2025 года.

**Текущее состояние:**
- SQLite (файл `orders.db`)
- better-sqlite3
- Ручные SQL запросы
- JSON в TEXT полях
- Нет типобезопасности
- Нет миграций как код

**Целевое состояние:**
- PostgreSQL 16+ (последняя стабильная версия)
- Prisma ORM или Drizzle ORM
- Type-safe запросы из TypeScript
- JSONB вместо TEXT
- Миграции как код
- Connection pooling
- Индексы и оптимизация
- Row-level security
- Автоматические бэкапы

---

## 🎯 Зачем PostgreSQL? (Преимущества над SQLite)

### Масштабируемость:
- ✅ Concurrent writes без блокировок
- ✅ Горизонтальное масштабирование (read replicas)
- ✅ Партиционирование таблиц
- ✅ Поддержка миллионов записей

### Производительность:
- ✅ Мощный query planner
- ✅ Partial indexes
- ✅ GiST/GIN индексы для JSONB
- ✅ Materialized views
- ✅ Параллельные запросы

### Безопасность:
- ✅ Row-level security (RLS)
- ✅ Role-based access control (RBAC)
- ✅ Encrypted connections (SSL/TLS)
- ✅ Audit logging

### Функциональность:
- ✅ JSONB с индексами
- ✅ Full-text search
- ✅ PostGIS для геоданных
- ✅ Triggers и stored procedures
- ✅ UUID, ARRAY, ENUM типы

### Экосистема:
- ✅ Современные ORM (Prisma, Drizzle)
- ✅ Managed services (Supabase, Neon, Railway)
- ✅ Мониторинг (pgAdmin, Grafana)
- ✅ Бэкапы и репликация

---

## 🎯 Текущая структура SQLite

```sql
-- Categories
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

-- Products
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  image TEXT NOT NULL,
  description TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
)

-- Orders
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  delivery_type TEXT NOT NULL,
  delivery_details TEXT NOT NULL,
  items TEXT NOT NULL,  -- JSON stored as TEXT
  total INTEGER NOT NULL,
  telegram_username TEXT,
  telegram_id INTEGER,
  telegram_first_name TEXT,
  telegram_last_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'new'
)
```

**Проблемы текущей схемы:**
- ❌ `items` хранится как TEXT (JSON), нельзя индексировать
- ❌ `is_active` как INTEGER вместо BOOLEAN
- ❌ Нет `deleted_at` для soft deletes
- ❌ Нет индексов
- ❌ `price` и `total` как INTEGER (копейки), неочевидно
- ❌ Нет ENUM для `delivery_type` и `status`
- ❌ Нет отношений заказ → товары (many-to-many)

---

## 🎯 Целевая структура PostgreSQL (улучшенная)

### Вариант 1: С Prisma ORM (рекомендуется для TypeScript)

**Создать файл:** `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== ENUMS ====================

enum DeliveryType {
  ADDRESS @map("address")
  CDEK    @map("cdek")

  @@map("delivery_type")
}

enum OrderStatus {
  NEW        @map("new")
  PROCESSING @map("processing")
  SHIPPED    @map("shipped")
  DELIVERED  @map("delivered")
  CANCELLED  @map("cancelled")

  @@map("order_status")
}

// ==================== MODELS ====================

model Category {
  id        Int       @id @default(autoincrement())
  name      String    @db.VarChar(100)
  icon      String    @db.VarChar(10)
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz

  products  Product[]

  @@index([deletedAt])
  @@map("categories")
}

model Product {
  id          Int       @id @default(autoincrement())
  name        String    @db.VarChar(255)
  price       Decimal   @db.Decimal(10, 2) // Цена в рублях с копейками
  categoryId  Int       @map("category_id")
  image       String    @db.VarChar(500)
  description String    @db.Text
  isActive    Boolean   @default(true) @map("is_active")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt   DateTime? @map("deleted_at") @db.Timestamptz

  category    Category      @relation(fields: [categoryId], references: [id])
  orderItems  OrderItem[]

  @@index([categoryId])
  @@index([isActive])
  @@index([deletedAt])
  @@index([createdAt])
  @@map("products")
}

model Order {
  id                 Int          @id @default(autoincrement())
  orderNumber        String       @unique @map("order_number") @db.VarChar(50)
  fullName           String       @map("full_name") @db.VarChar(255)
  phone              String       @db.VarChar(20)
  deliveryType       DeliveryType @map("delivery_type")
  deliveryDetails    String       @map("delivery_details") @db.Text
  total              Decimal      @db.Decimal(10, 2)

  // Telegram данные
  telegramUsername   String?      @map("telegram_username") @db.VarChar(100)
  telegramId         BigInt?      @map("telegram_id")
  telegramFirstName  String?      @map("telegram_first_name") @db.VarChar(100)
  telegramLastName   String?      @map("telegram_last_name") @db.VarChar(100)

  status             OrderStatus  @default(NEW)
  createdAt          DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt          DateTime     @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt          DateTime?    @map("deleted_at") @db.Timestamptz

  items              OrderItem[]

  @@index([orderNumber])
  @@index([status])
  @@index([createdAt])
  @@index([telegramId])
  @@index([deletedAt])
  @@map("orders")
}

model OrderItem {
  id        Int      @id @default(autoincrement())
  orderId   Int      @map("order_id")
  productId Int      @map("product_id")
  name      String   @db.VarChar(255) // Снапшот названия на момент заказа
  price     Decimal  @db.Decimal(10, 2) // Снапшот цены на момент заказа
  quantity  Int      @default(1)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product   Product  @relation(fields: [productId], references: [id])

  @@index([orderId])
  @@index([productId])
  @@map("order_items")
}

// ==================== AUDIT LOG ====================

model AuditLog {
  id          Int      @id @default(autoincrement())
  tableName   String   @map("table_name") @db.VarChar(100)
  recordId    Int      @map("record_id")
  action      String   @db.VarChar(50) // INSERT, UPDATE, DELETE
  oldData     Json?    @map("old_data") @db.JsonB
  newData     Json?    @map("new_data") @db.JsonB
  userId      String?  @map("user_id") @db.VarChar(100) // JWT username или ID
  ipAddress   String?  @map("ip_address") @db.VarChar(50)
  userAgent   String?  @map("user_agent") @db.Text
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@index([tableName, recordId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

**Ключевые улучшения:**
1. ✅ `OrderItem` - отдельная таблица вместо JSON
2. ✅ ENUM для `delivery_type` и `status`
3. ✅ `Decimal` для денег (точность)
4. ✅ `Timestamptz` для дат (timezone aware)
5. ✅ Soft deletes (`deletedAt`)
6. ✅ Индексы на важных полях
7. ✅ AuditLog для отслеживания изменений
8. ✅ Cascade delete для order items
9. ✅ Снапшот цены и названия в OrderItem

---

## 📝 Пошаговый план выполнения

### Шаг 1: Выбор ORM/Query Builder

**Сравнение популярных решений 2025:**

| Критерий | Prisma | Drizzle | Kysely |
|----------|--------|---------|--------|
| **TypeScript** | ✅ Отлично | ✅ Отлично | ✅ Отлично |
| **Миграции** | ✅ Встроенные | ✅ Через kit | ⚠️ Внешние |
| **Type-safety** | ✅ 100% | ✅ 100% | ✅ 100% |
| **Генерация типов** | ✅ Из схемы | ✅ Из схемы | ⚠️ Ручные |
| **Query Builder** | ⚠️ ORM-стиль | ✅ SQL-like | ✅ SQL-like |
| **Производительность** | ✅ Хорошая | ✅ Отличная | ✅ Отличная |
| **Edge Runtime** | ⚠️ Ограничено | ✅ Поддержка | ✅ Поддержка |
| **Экосистема** | ✅ Большая | 🆕 Растущая | 🟡 Средняя |
| **Обучение** | 🟢 Легко | 🟡 Средне | 🟡 Средне |

**Рекомендация:** **Prisma** для вашего проекта, потому что:
- ✅ Простота миграции из SQLite
- ✅ Встроенные миграции
- ✅ Prisma Studio (GUI для БД)
- ✅ Отличная документация
- ✅ Большое сообщество

**Альтернатива:** **Drizzle** если нужна максимальная производительность и SQL-подобный синтаксис.

---

### Шаг 2: Установка зависимостей

**Команды:**
```bash
cd /home/user/seed

# Prisma
npm install @prisma/client
npm install -D prisma

# PostgreSQL драйвер (если используется прямое подключение)
npm install pg

# Для миграции данных
npm install -D tsx

# Dotenv для env файлов
npm install dotenv
```

**Проверить:**
- ✅ Все пакеты установлены

---

### Шаг 3: Настройка PostgreSQL

**Вариант A: Docker (локальная разработка)**

**Создать файл:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: seed-postgres
    restart: always
    environment:
      POSTGRES_USER: seed_user
      POSTGRES_PASSWORD: seed_password_2025
      POSTGRES_DB: seed_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U seed_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Опционально: pgAdmin для GUI
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: seed-pgadmin
    restart: always
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@seed.local
      PGADMIN_DEFAULT_PASSWORD: admin2025
    ports:
      - "5050:80"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

**Команды для Docker:**
```bash
# Запустить PostgreSQL
docker-compose up -d postgres

# Проверить статус
docker-compose ps

# Посмотреть логи
docker-compose logs -f postgres

# Остановить
docker-compose down

# Полностью удалить (включая данные)
docker-compose down -v
```

**Вариант B: Managed PostgreSQL (Production)**

Рекомендуемые сервисы для 2025:

1. **Supabase** (рекомендуется)
   - ✅ Бесплатный tier (500 MB)
   - ✅ Встроенный Auth
   - ✅ Realtime subscriptions
   - ✅ Storage для файлов
   - ✅ Row-level security
   - 🔗 https://supabase.com

2. **Neon** (serverless)
   - ✅ Бесплатный tier
   - ✅ Autoscaling
   - ✅ Branching (как git для БД)
   - ✅ Очень быстрый
   - 🔗 https://neon.tech

3. **Railway**
   - ✅ Простой деплой
   - ✅ $5/месяц
   - ✅ Автобэкапы
   - 🔗 https://railway.app

4. **DigitalOcean Managed Databases**
   - ✅ Надежный
   - ✅ $15/месяц
   - ✅ Автобэкапы
   - ✅ Monitoring
   - 🔗 https://www.digitalocean.com/products/managed-databases-postgresql

**Для production рекомендую: Supabase или Neon**

---

### Шаг 4: Конфигурация Prisma

**Создать файл:** `.env`

```env
# PostgreSQL Connection
DATABASE_URL="postgresql://seed_user:seed_password_2025@localhost:5432/seed_db?schema=public"

# Или для Supabase:
# DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Или для Neon:
# DATABASE_URL="postgresql://[user]:[password]@[host]/[database]?sslmode=require"

# Existing env vars
PORT=3000
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
JWT_SECRET=your_jwt_secret
```

**Обновить файл:** `.env.example`

```env
# Server
PORT=3000

# PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Admin Auth
JWT_SECRET=your_random_jwt_secret_min_32_chars
```

**Инициализация Prisma:**
```bash
npx prisma init
```

Это создаст:
- `prisma/schema.prisma`
- `.env` (если его нет)

**Проверить:**
- ✅ Prisma инициализирован
- ✅ `.env` настроен

---

### Шаг 5: Создание схемы Prisma

**Скопировать схему из "Целевая структура PostgreSQL" выше** в файл `prisma/schema.prisma`

**Команды:**
```bash
# Форматирование схемы
npx prisma format

# Валидация схемы
npx prisma validate

# Визуализация схемы (опционально)
npx prisma studio
```

**Проверить:**
- ✅ Схема создана
- ✅ Нет ошибок валидации

---

### Шаг 6: Создание и применение миграций

**Создать первую миграцию:**
```bash
npx prisma migrate dev --name init
```

Это:
1. Создаст SQL миграцию в `prisma/migrations/`
2. Применит её к БД
3. Сгенерирует Prisma Client

**Проверить миграцию:**
```bash
# Посмотреть SQL
cat prisma/migrations/*/migration.sql

# Статус миграций
npx prisma migrate status

# Применить миграции (production)
npx prisma migrate deploy
```

**Проверить:**
- ✅ Миграция создана
- ✅ Миграция применена
- ✅ Таблицы созданы в PostgreSQL

---

### Шаг 7: Миграция данных из SQLite

**Создать скрипт:** `scripts/migrate-data.ts`

```typescript
import { PrismaClient } from '@prisma/client'
import Database from 'better-sqlite3'
import path from 'path'

const prisma = new PrismaClient()
const sqlite = new Database(path.join(__dirname, '..', 'orders.db'))

async function migrateData() {
  console.log('🚀 Начало миграции данных из SQLite в PostgreSQL...\n')

  try {
    // ==================== 1. Категории ====================
    console.log('📂 Миграция категорий...')
    const categories = sqlite.prepare('SELECT * FROM categories').all() as any[]

    for (const cat of categories) {
      await prisma.category.create({
        data: {
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          createdAt: new Date(cat.created_at),
        },
      })
    }
    console.log(`✅ Мигрировано категорий: ${categories.length}\n`)

    // ==================== 2. Товары ====================
    console.log('📦 Миграция товаров...')
    const products = sqlite.prepare('SELECT * FROM products').all() as any[]

    for (const prod of products) {
      await prisma.product.create({
        data: {
          id: prod.id,
          name: prod.name,
          price: prod.price / 100, // Конвертируем копейки в рубли
          categoryId: prod.category_id,
          image: prod.image,
          description: prod.description,
          isActive: prod.is_active === 1,
          createdAt: new Date(prod.created_at),
          updatedAt: new Date(prod.updated_at),
        },
      })
    }
    console.log(`✅ Мигрировано товаров: ${products.length}\n`)

    // ==================== 3. Заказы ====================
    console.log('🛒 Миграция заказов...')
    const orders = sqlite.prepare('SELECT * FROM orders').all() as any[]

    for (const order of orders) {
      const items = JSON.parse(order.items)

      // Создаем заказ
      const createdOrder = await prisma.order.create({
        data: {
          id: order.id,
          orderNumber: order.order_number,
          fullName: order.full_name,
          phone: order.phone,
          deliveryType: order.delivery_type.toUpperCase() as any,
          deliveryDetails: order.delivery_details,
          total: order.total / 100, // Конвертируем копейки в рубли
          telegramUsername: order.telegram_username,
          telegramId: order.telegram_id ? BigInt(order.telegram_id) : null,
          telegramFirstName: order.telegram_first_name,
          telegramLastName: order.telegram_last_name,
          status: (order.status || 'NEW').toUpperCase() as any,
          createdAt: new Date(order.created_at),
        },
      })

      // Создаем items заказа
      for (const item of items) {
        await prisma.orderItem.create({
          data: {
            orderId: createdOrder.id,
            productId: item.id,
            name: item.name,
            price: item.price / 100,
            quantity: item.quantity,
            createdAt: createdOrder.createdAt,
          },
        })
      }
    }
    console.log(`✅ Мигрировано заказов: ${orders.length}\n`)

    // ==================== 4. Сброс sequences ====================
    console.log('🔄 Сброс автоинкремента...')

    await prisma.$executeRaw`SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories))`
    await prisma.$executeRaw`SELECT setval('products_id_seq', (SELECT MAX(id) FROM products))`
    await prisma.$executeRaw`SELECT setval('orders_id_seq', (SELECT MAX(id) FROM orders))`
    await prisma.$executeRaw`SELECT setval('order_items_id_seq', (SELECT MAX(id) FROM order_items))`

    console.log('✅ Автоинкремент обновлен\n')

    console.log('🎉 Миграция данных завершена успешно!')
  } catch (error) {
    console.error('❌ Ошибка миграции:', error)
    throw error
  } finally {
    await prisma.$disconnect()
    sqlite.close()
  }
}

migrateData()
```

**Команда для миграции:**
```bash
npx tsx scripts/migrate-data.ts
```

**Проверить:**
- ✅ Все категории мигрированы
- ✅ Все товары мигрированы
- ✅ Все заказы мигрированы
- ✅ Order items созданы
- ✅ Автоинкремент работает

---

### Шаг 8: Обновление кода приложения

**Создать файл:** `src/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Создать файл:** `src/lib/database.ts` (замена старого database.js)

```typescript
import { prisma } from './prisma'
import type { Prisma } from '@prisma/client'

// ==================== КАТЕГОРИИ ====================

export async function getAllCategories() {
  return prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: { id: 'asc' },
  })
}

export async function createCategory(name: string, icon: string) {
  return prisma.category.create({
    data: { name, icon },
  })
}

export async function updateCategory(id: number, name: string, icon: string) {
  return prisma.category.update({
    where: { id },
    data: { name, icon },
  })
}

export async function deleteCategory(id: number) {
  // Soft delete
  return prisma.category.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}

// ==================== ТОВАРЫ ====================

export async function getAllProducts() {
  return prisma.product.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    include: {
      category: true,
    },
    orderBy: { id: 'asc' },
  })
}

export async function getProductById(id: number) {
  return prisma.product.findUnique({
    where: { id },
    include: { category: true },
  })
}

export async function createProduct(data: {
  name: string
  price: number
  category_id: number
  image: string
  description: string
}) {
  return prisma.product.create({
    data: {
      name: data.name,
      price: data.price,
      categoryId: data.category_id,
      image: data.image,
      description: data.description,
    },
  })
}

export async function updateProduct(
  id: number,
  data: {
    name: string
    price: number
    category_id: number
    image: string
    description: string
  }
) {
  return prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      price: data.price,
      categoryId: data.category_id,
      image: data.image,
      description: data.description,
    },
  })
}

export async function deleteProduct(id: number) {
  // Soft delete
  return prisma.product.update({
    where: { id },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  })
}

// ==================== ЗАКАЗЫ ====================

export async function generateOrderNumber() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const todayPrefix = `${year}${month}${day}`

  const totalOrders = await prisma.order.count()
  const orderCount = totalOrders + 1

  return `${todayPrefix}-${String(orderCount).padStart(4, '0')}`
}

export async function createOrder(
  customer: {
    fullName: string
    phone: string
    deliveryType: 'address' | 'cdek'
    deliveryDetails: string
    telegramUsername?: string
    telegramId?: number
    telegramFirstName?: string
    telegramLastName?: string
  },
  items: Array<{
    id: number
    name: string
    price: number
    quantity: number
  }>,
  total: number
) {
  const orderNumber = await generateOrderNumber()

  const order = await prisma.order.create({
    data: {
      orderNumber,
      fullName: customer.fullName,
      phone: customer.phone,
      deliveryType: customer.deliveryType.toUpperCase() as any,
      deliveryDetails: customer.deliveryDetails,
      total,
      telegramUsername: customer.telegramUsername,
      telegramId: customer.telegramId ? BigInt(customer.telegramId) : null,
      telegramFirstName: customer.telegramFirstName,
      telegramLastName: customer.telegramLastName,
      items: {
        create: items.map((item) => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      },
    },
    include: {
      items: true,
    },
  })

  return {
    id: order.id,
    orderNumber: order.orderNumber,
  }
}

export async function getOrderByNumber(orderNumber: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
    },
  })

  if (!order) return null

  // Преобразуем к старому формату для совместимости
  return {
    ...order,
    order_number: order.orderNumber,
    full_name: order.fullName,
    delivery_type: order.deliveryType.toLowerCase(),
    delivery_details: order.deliveryDetails,
    telegram_username: order.telegramUsername,
    telegram_id: order.telegramId ? Number(order.telegramId) : null,
    telegram_first_name: order.telegramFirstName,
    telegram_last_name: order.telegramLastName,
    created_at: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.productId,
      name: item.name,
      price: Number(item.price),
      quantity: item.quantity,
    })),
    total: Number(order.total),
  }
}

export async function getAllOrders(limit = 100) {
  const orders = await prisma.order.findMany({
    where: { deletedAt: null },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  // Преобразуем к старому формату
  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    fullName: order.fullName,
    phone: order.phone,
    deliveryType: order.deliveryType.toLowerCase(),
    deliveryDetails: order.deliveryDetails,
    telegramUsername: order.telegramUsername,
    telegramId: order.telegramId ? Number(order.telegramId) : null,
    telegramFirstName: order.telegramFirstName,
    telegramLastName: order.telegramLastName,
    createdAt: order.createdAt.toISOString(),
    status: order.status.toLowerCase(),
    items: order.items.map((item) => ({
      id: item.productId,
      name: item.name,
      price: Number(item.price),
      quantity: item.quantity,
    })),
    total: Number(order.total),
  }))
}

// Экспортируем prisma для прямого использования
export { prisma }
```

**Обновить:** `server.js` → `server.ts`

```typescript
import express from 'express'
import dotenv from 'dotenv'
import {
  createOrder,
  getOrderByNumber,
  getAllOrders,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from './lib/database'

dotenv.config()

// ... rest of server code (same as before, but with types)
```

**Проверить:**
- ✅ Prisma Client сгенерирован
- ✅ Новые функции БД работают
- ✅ API endpoints работают

---

### Шаг 9: Connection Pooling

**Для Production добавить pooling:**

**Обновить:** `src/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'

// Connection pooling для production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Максимум 20 соединений
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect()
  await pool.end()
  process.exit(0)
})
```

**Или использовать Prisma Accelerate** (managed connection pooling):

```env
# .env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..." # Для миграций

# Prisma Accelerate
ACCELERATE_URL="prisma://accelerate.prisma-data.net/?api_key=..."
```

**Проверить:**
- ✅ Connection pooling настроен
- ✅ Graceful shutdown работает

---

### Шаг 10: Индексы и оптимизация

**Создать миграцию для индексов:**

```bash
npx prisma migrate dev --name add_indexes
```

**Добавить в схему (уже включено выше):**
```prisma
@@index([deletedAt])
@@index([categoryId])
@@index([isActive])
@@index([orderNumber])
@@index([status])
@@index([createdAt])
```

**Проверить индексы:**
```sql
-- Запустить в psql или Prisma Studio
SELECT
  tablename,
  indexname,
  indexdef
FROM
  pg_indexes
WHERE
  schemaname = 'public'
ORDER BY
  tablename,
  indexname;
```

**Проверить:**
- ✅ Индексы созданы
- ✅ Запросы быстрые

---

### Шаг 11: Бэкапы

**Создать скрипт:** `scripts/backup.sh`

```bash
#!/bin/bash

# Автоматический бэкап PostgreSQL

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
BACKUP_FILE="$BACKUP_DIR/seed_db_$DATE.sql"

mkdir -p $BACKUP_DIR

echo "🔄 Создание бэкапа базы данных..."

# Для локального Docker
docker exec seed-postgres pg_dump -U seed_user seed_db > $BACKUP_FILE

# Или для удаленного сервера
# pg_dump $DATABASE_URL > $BACKUP_FILE

gzip $BACKUP_FILE

echo "✅ Бэкап создан: $BACKUP_FILE.gz"

# Удаляем старые бэкапы (старше 30 дней)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "🧹 Старые бэкапы удалены"
```

**Сделать исполняемым:**
```bash
chmod +x scripts/backup.sh
```

**Автоматизация через cron:**
```bash
# Открыть crontab
crontab -e

# Добавить задачу (каждый день в 2:00 AM)
0 2 * * * /home/user/seed/scripts/backup.sh
```

**Для managed сервисов (Supabase, Neon):**
- ✅ Автобэкапы встроены
- ✅ Point-in-time recovery
- ✅ Не требуется настройка

**Проверить:**
- ✅ Бэкап скрипт работает
- ✅ Бэкапы создаются

---

### Шаг 12: Мониторинг

**Вариант 1: Prisma Studio (встроенный)**

```bash
npx prisma studio
```

Откроется GUI на http://localhost:5555

**Вариант 2: pgAdmin (Docker Compose выше)**

Открыть http://localhost:5050

**Вариант 3: Grafana + Prometheus (production)**

**Создать файл:** `docker-compose.monitoring.yml`

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin2025
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  grafana-data:
```

**Проверить:**
- ✅ Мониторинг настроен

---

### Шаг 13: Тестирование

**Создать тесты:** `tests/database.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../src/lib/prisma'
import {
  createCategory,
  getAllCategories,
  createProduct,
  getAllProducts,
  createOrder,
  getAllOrders,
} from '../src/lib/database'

describe('Database Operations', () => {
  beforeAll(async () => {
    // Очистка тестовой БД
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.product.deleteMany()
    await prisma.category.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('should create and get category', async () => {
    const category = await createCategory('Test Category', '🌱')
    expect(category).toBeDefined()
    expect(category.name).toBe('Test Category')

    const categories = await getAllCategories()
    expect(categories.length).toBeGreaterThan(0)
  })

  it('should create and get product', async () => {
    const category = await createCategory('Test Cat', '🌿')

    const product = await createProduct({
      name: 'Test Product',
      price: 100,
      category_id: category.id,
      image: 'https://example.com/image.jpg',
      description: 'Test description',
    })

    expect(product).toBeDefined()
    expect(product.name).toBe('Test Product')

    const products = await getAllProducts()
    expect(products.length).toBeGreaterThan(0)
  })

  it('should create order with items', async () => {
    const category = await createCategory('Cat', '🌱')
    const product = await createProduct({
      name: 'Product',
      price: 100,
      category_id: category.id,
      image: 'https://example.com/image.jpg',
      description: 'Description',
    })

    const order = await createOrder(
      {
        fullName: 'Test User',
        phone: '+79991234567',
        deliveryType: 'address',
        deliveryDetails: 'Test address',
      },
      [
        {
          id: product.id,
          name: product.name,
          price: 100,
          quantity: 2,
        },
      ],
      200
    )

    expect(order).toBeDefined()
    expect(order.orderNumber).toMatch(/\d{8}-\d{4}/)

    const orders = await getAllOrders()
    expect(orders.length).toBeGreaterThan(0)
  })
})
```

**Запустить тесты:**
```bash
npm install -D vitest
npx vitest
```

**Проверить:**
- ✅ Все тесты проходят
- ✅ CRUD операции работают

---

### Шаг 14: Обновление GitHub Actions для deployment

**Обновить файл:** `.github/workflows/deploy.yml`

```yaml
# ... existing steps ...

      - name: Set environment variables on server
        run: |
          ssh -o StrictHostKeyChecking=no ${{ secrets.DROPLET_USER }}@${{ secrets.DROPLET_HOST }} "cat > /var/www/telegram-shop/.env << 'ENV_EOF'
          PORT=3000
          TELEGRAM_BOT_TOKEN=${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID=${{ secrets.TELEGRAM_CHAT_ID }}
          JWT_SECRET=${{ secrets.JWT_SECRET }}
          DATABASE_URL=${{ secrets.DATABASE_URL }}
          ENV_EOF
          "

      - name: Run database migrations
        run: |
          ssh -o StrictHostKeyChecking=no ${{ secrets.DROPLET_USER }}@${{ secrets.DROPLET_HOST }} "cd /var/www/telegram-shop && npx prisma migrate deploy"

      - name: Generate Prisma Client
        run: |
          ssh -o StrictHostKeyChecking=no ${{ secrets.DROPLET_USER }}@${{ secrets.DROPLET_HOST }} "cd /var/www/telegram-shop && npx prisma generate"

      # ... existing restart steps ...
```

**Добавить GitHub Secret:**
- `DATABASE_URL` - connection string PostgreSQL

**Проверить:**
- ✅ GitHub Actions обновлен
- ✅ Миграции применяются автоматически

---

### Шаг 15: Откат на SQLite (если нужно)

**Создать backup перед миграцией:**
```bash
cp orders.db orders.db.backup
```

**Для отката:**
1. Восстановить `orders.db.backup`
2. Откатить изменения в коде (git revert)
3. Удалить Prisma:
```bash
npm uninstall @prisma/client prisma
rm -rf prisma/
```

**Проверить:**
- ✅ Backup создан
- ✅ План отката есть

---

## ✅ Чеклист готовности

### Перед началом:
- [ ] PostgreSQL установлен (Docker или managed)
- [ ] Backup SQLite создан
- [ ] Prisma установлен
- [ ] `.env` настроен

### Во время:
- [ ] Prisma схема создана
- [ ] Миграции применены
- [ ] Данные мигрированы
- [ ] Код обновлен для Prisma
- [ ] Connection pooling настроен
- [ ] Индексы созданы
- [ ] Тесты написаны и проходят

### После:
- [ ] Все API endpoints работают
- [ ] Производительность хорошая
- [ ] Бэкапы настроены
- [ ] Мониторинг настроен
- [ ] GitHub Actions обновлен
- [ ] Production деплой успешен

---

## 🚨 Важные примечания

1. **Данные:** Всегда делайте backup перед миграцией!
2. **Типы:** `price` и `total` мигрируются из копеек в рубли (делим на 100)
3. **JSON:** `items` в заказах становятся отдельной таблицей `order_items`
4. **IDs:** Сохраняются для совместимости
5. **Timestamps:** Конвертируются в Timestamptz (с timezone)
6. **Soft deletes:** Используется `deletedAt` вместо физического удаления

---

## 📚 Полезные команды Prisma

```bash
# Форматирование схемы
npx prisma format

# Валидация схемы
npx prisma validate

# Создать миграцию (dev)
npx prisma migrate dev --name migration_name

# Применить миграции (production)
npx prisma migrate deploy

# Сбросить БД (dev only!)
npx prisma migrate reset

# Генерация Prisma Client
npx prisma generate

# Prisma Studio (GUI)
npx prisma studio

# Просмотр схемы БД
npx prisma db pull

# Синхронизация схемы (dev only!)
npx prisma db push
```

---

## 🎯 Ожидаемый результат

После выполнения всех шагов:

✅ **PostgreSQL 16** в production
✅ **Prisma ORM** с type-safety
✅ **Миграции как код**
✅ **Connection pooling**
✅ **Индексы** на всех важных полях
✅ **Soft deletes** вместо hard deletes
✅ **JSONB** вместо TEXT
✅ **Enum** для статусов
✅ **Audit log** (опционально)
✅ **Автобэкапы**
✅ **Мониторинг**
✅ **100% type-safe** запросы

---

## 📈 Performance сравнение

| Операция | SQLite | PostgreSQL |
|----------|--------|------------|
| Read (1000 записей) | ~50ms | ~30ms |
| Write (1 запись) | ~10ms | ~5ms |
| Concurrent writes | ❌ Блокировки | ✅ MVCC |
| Complex queries | 🟡 Ограничено | ✅ Отлично |
| Full-text search | ❌ Нет | ✅ Встроено |
| Scaling | ❌ Один файл | ✅ Репликация |

---

**Время выполнения:** 1-2 дня
**Сложность:** Средняя
**Риски:** Низкие (есть backup и rollback план)

**Рекомендация:** Выполнить после миграции клиента и админки на TypeScript.
