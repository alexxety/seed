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

    // Таблица products
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        stock INTEGER DEFAULT 0,
        image_url TEXT,
        category VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Таблица customers
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255),
        phone VARCHAR(50),
        full_name VARCHAR(255),
        telegram_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Таблица orders
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id UUID REFERENCES "${schemaName}".customers(id),
        total DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        items JSONB NOT NULL,
        delivery_type VARCHAR(50),
        delivery_details TEXT,
        paid BOOLEAN DEFAULT false,
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Таблица outbox (для event sourcing)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".outbox (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP
      )
    `);

    // Создаём индексы
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_products_active ON "${schemaName}".products(is_active);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_orders_status ON "${schemaName}".orders(status);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX idx_outbox_processed ON "${schemaName}".outbox(processed_at);
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
