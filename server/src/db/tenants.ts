const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Создать новый tenant с изолированной схемой
 * @param {string} slug - уникальный slug для tenant (например, "myshop")
 * @param {string} name - название магазина (опционально)
 * @returns {Promise<{id: string, slug: string, schema: string}>}
 */
async function createTenant(slug, name = null) {
  console.log(`🚀 Создание нового tenant: ${slug}`);

  // Проверка уникальности slug
  const existing = await prisma.tenant.findUnique({
    where: { slug }
  });

  if (existing) {
    throw new Error(`❌ Tenant с slug "${slug}" уже существует`);
  }

  // Создаём запись в public.tenants
  const tenant = await prisma.tenant.create({
    data: {
      slug,
      name: name || slug,
      status: 'active'
    }
  });

  console.log(`✅ Tenant создан: ID=${tenant.id}, slug=${slug}`);

  // Создаём схему t_{id}
  const schemaName = `t_${tenant.id.replace(/-/g, '_')}`;

  try {
    console.log(`📦 Создание схемы: ${schemaName}`);

    // Создаём схему
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    // Создаём таблицы в новой схеме
    console.log(`📋 Создание таблиц в схеме ${schemaName}...`);

    // ============================================
    // ТАБЛИЦА: products (базовая информация о товаре)
    // ============================================
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        vendor VARCHAR(255),
        category VARCHAR(100),
        tags TEXT[],
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============================================
    // ТАБЛИЦА: product_variants (варианты товара: размер, цвет и т.д.)
    // ============================================
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES "${schemaName}".products(id) ON DELETE CASCADE,
        sku VARCHAR(100) UNIQUE,
        title VARCHAR(255) NOT NULL,
        option1 VARCHAR(100),
        option2 VARCHAR(100),
        option3 VARCHAR(100),
        image_url TEXT,
        position INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============================================
    // ТАБЛИЦА: prices (цены для вариантов)
    // ============================================
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".prices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        variant_id UUID NOT NULL REFERENCES "${schemaName}".product_variants(id) ON DELETE CASCADE,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        amount DECIMAL(10,2) NOT NULL,
        compare_at_amount DECIMAL(10,2),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============================================
    // ТАБЛИЦА: inventory (запасы товаров)
    // ============================================
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        variant_id UUID NOT NULL REFERENCES "${schemaName}".product_variants(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 0,
        reserved INTEGER NOT NULL DEFAULT 0,
        location VARCHAR(255),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT inventory_variant_location_unique UNIQUE(variant_id, location)
      )
    `);

    // ============================================
    // ТАБЛИЦА: customers (клиенты)
    // ============================================
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255),
        phone VARCHAR(50),
        full_name VARCHAR(255),
        telegram_id VARCHAR(100) UNIQUE,
        telegram_username VARCHAR(255),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============================================
    // ТАБЛИЦА: orders (заказы)
    // ============================================
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id UUID REFERENCES "${schemaName}".customers(id) ON DELETE SET NULL,
        total DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        status VARCHAR(50) DEFAULT 'pending',
        delivery_type VARCHAR(50),
        delivery_details TEXT,
        paid BOOLEAN DEFAULT false,
        paid_at TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============================================
    // ТАБЛИЦА: order_items (позиции в заказе)
    // ============================================
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES "${schemaName}".orders(id) ON DELETE CASCADE,
        variant_id UUID REFERENCES "${schemaName}".product_variants(id) ON DELETE SET NULL,
        product_name VARCHAR(255) NOT NULL,
        variant_title VARCHAR(255),
        quantity INTEGER NOT NULL DEFAULT 1,
        price DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============================================
    // ТАБЛИЦА: outbox (event sourcing для синхронизации)
    // ============================================
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".outbox (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(100) NOT NULL,
        aggregate_type VARCHAR(50) NOT NULL,
        aggregate_id UUID NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP
      )
    `);

    console.log(`📊 Создание индексов...`);

    // Индексы для products
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_products_active ON "${schemaName}".products(is_active);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_products_category ON "${schemaName}".products(category);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_products_tags ON "${schemaName}".products USING GIN(tags);
    `);

    // Индексы для product_variants
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_variants_product_id ON "${schemaName}".product_variants(product_id);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_variants_sku ON "${schemaName}".product_variants(sku);
    `);

    // Индексы для prices
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_prices_variant_id ON "${schemaName}".prices(variant_id);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_prices_active ON "${schemaName}".prices(is_active);
    `);

    // Индексы для inventory
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_inventory_variant_id ON "${schemaName}".inventory(variant_id);
    `);

    // Индексы для customers
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_customers_email ON "${schemaName}".customers(email);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_customers_phone ON "${schemaName}".customers(phone);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_customers_telegram ON "${schemaName}".customers(telegram_id);
    `);

    // Индексы для orders
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_orders_customer_id ON "${schemaName}".orders(customer_id);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_orders_status ON "${schemaName}".orders(status);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_orders_paid ON "${schemaName}".orders(paid);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_orders_created_at ON "${schemaName}".orders(created_at DESC);
    `);

    // Индексы для order_items
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_order_items_order_id ON "${schemaName}".order_items(order_id);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_order_items_variant_id ON "${schemaName}".order_items(variant_id);
    `);

    // Индексы для outbox
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_outbox_processed ON "${schemaName}".outbox(processed_at);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_outbox_event_type ON "${schemaName}".outbox(event_type);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_outbox_aggregate ON "${schemaName}".outbox(aggregate_type, aggregate_id);
    `);

    console.log(`✅ Схема ${schemaName} и таблицы успешно созданы`);

    return {
      id: tenant.id,
      slug: tenant.slug,
      schema: schemaName,
      message: `Tenant "${slug}" успешно создан со схемой ${schemaName}`
    };

  } catch (error) {
    // Откат: удаляем tenant из public.tenants если схема не создалась
    console.error(`❌ Ошибка при создании схемы: ${error.message}`);
    await prisma.tenant.delete({ where: { id: tenant.id } });
    throw new Error(`Не удалось создать схему для tenant: ${error.message}`);
  }
}

/**
 * Получить список всех tenants
 */
async function getAllTenants() {
  return await prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Получить tenant по slug
 */
async function getTenantBySlug(slug) {
  return await prisma.tenant.findUnique({
    where: { slug }
  });
}

/**
 * Получить tenant по ID
 */
async function getTenantById(id) {
  return await prisma.tenant.findUnique({
    where: { id }
  });
}

/**
 * Получить имя схемы для tenant
 */
function getTenantSchema(tenantId) {
  return `t_${tenantId.replace(/-/g, '_')}`;
}

module.exports = {
  createTenant,
  getAllTenants,
  getTenantBySlug,
  getTenantById,
  getTenantSchema
};
