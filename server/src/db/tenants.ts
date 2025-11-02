import { PrismaClient } from '@prisma/client';

export async function createTenant(db: PrismaClient, slug: string, name: string | null = null) {
  console.log(`🚀 Создание нового tenant: ${slug}`);

  const existing = await db.tenant.findUnique({
    where: { slug },
  });

  if (existing) {
    throw new Error(`❌ Tenant с slug "${slug}" уже существует`);
  }

  const tenant = await db.tenant.create({
    data: {
      slug,
      name: name || slug,
      status: 'active',
    },
  });

  console.log(`✅ Tenant создан: ID=${tenant.id}, slug=${slug}`);

  const schemaName = `t_${tenant.id.replace(/-/g, '_')}`;

  try {
    console.log(`📦 Создание схемы: ${schemaName}`);

    await db.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    console.log(`📋 Создание таблиц в схеме ${schemaName}...`);

    await db.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

    await db.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".product_variants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

    await db.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".prices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        variant_id UUID NOT NULL REFERENCES "${schemaName}".product_variants(id) ON DELETE CASCADE,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        amount DECIMAL(10,2) NOT NULL,
        compare_at_amount DECIMAL(10,2),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".inventory (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        variant_id UUID NOT NULL REFERENCES "${schemaName}".product_variants(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 0,
        reserved INTEGER NOT NULL DEFAULT 0,
        location VARCHAR(255),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT inventory_variant_location_unique UNIQUE(variant_id, location)
      )
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".customers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

    await db.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

    await db.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".order_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

    await db.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".outbox (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_type VARCHAR(100) NOT NULL,
        aggregate_type VARCHAR(50) NOT NULL,
        aggregate_id UUID NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP
      )
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE "${schemaName}".store_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title TEXT NOT NULL,
        brand_color TEXT NOT NULL DEFAULT '#0ea5e9',
        logo_path TEXT,
        currency TEXT NOT NULL DEFAULT 'USD',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    console.log(`📊 Создание индексов...`);

    await db.$executeRawUnsafe(
      `CREATE INDEX idx_products_active ON "${schemaName}".products(is_active)`
    );
    await db.$executeRawUnsafe(
      `CREATE INDEX idx_products_category ON "${schemaName}".products(category)`
    );
    await db.$executeRawUnsafe(
      `CREATE INDEX idx_products_tags ON "${schemaName}".products USING GIN(tags)`
    );
    await db.$executeRawUnsafe(
      `CREATE INDEX idx_variants_product_id ON "${schemaName}".product_variants(product_id)`
    );
    await db.$executeRawUnsafe(
      `CREATE INDEX idx_variants_sku ON "${schemaName}".product_variants(sku)`
    );
    await db.$executeRawUnsafe(
      `CREATE INDEX idx_prices_variant_id ON "${schemaName}".prices(variant_id)`
    );
    await db.$executeRawUnsafe(
      `CREATE INDEX idx_prices_active ON "${schemaName}".prices(is_active)`
    );
    await db.$executeRawUnsafe(
      `CREATE INDEX idx_inventory_variant_id ON "${schemaName}".inventory(variant_id)`
    );
    await db.$executeRawUnsafe(
      `CREATE INDEX idx_customers_email ON "${schemaName}".customers(email)`
    );
    await db.$executeRawUnsafe(
      `CREATE INDEX idx_customers_phone ON "${schemaName}".customers(phone)`
    );
    await db.$executeRawUnsafe(
      `CREATE INDEX idx_customers_telegram ON "${schemaName}".customers(telegram_id)`
    );
    await db.$executeRawUnsafe(
      `CREATE INDEX idx_orders_customer_id ON "${schemaName}".orders(customer_id)`
    );
    await db.$executeRawUnsafe(`CREATE INDEX idx_orders_status ON "${schemaName}".orders(status)`);
    await db.$executeRawUnsafe(`CREATE INDEX idx_orders_paid ON "${schemaName}".orders(paid)`);
    await db.$executeRawUnsafe(
      `CREATE INDEX idx_orders_created_at ON "${schemaName}".orders(created_at DESC)`
    );
    await db.$executeRawUnsafe(
      `CREATE INDEX idx_order_items_order_id ON "${schemaName}".order_items(order_id)`
    );
    await db.$executeRawUnsafe(
      `CREATE INDEX idx_order_items_variant_id ON "${schemaName}".order_items(variant_id)`
    );
    await db.$executeRawUnsafe(
      `CREATE INDEX idx_outbox_processed ON "${schemaName}".outbox(processed_at)`
    );
    await db.$executeRawUnsafe(
      `CREATE INDEX idx_outbox_event_type ON "${schemaName}".outbox(event_type)`
    );
    await db.$executeRawUnsafe(
      `CREATE INDEX idx_outbox_aggregate ON "${schemaName}".outbox(aggregate_type, aggregate_id)`
    );

    console.log(`🎨 Создание дефолтных store_settings...`);

    const brandColors: Record<string, string> = {
      demo: '#0ea5e9',
      testshop: '#16a34a',
      seed: '#f59e0b',
    };
    const defaultBrandColor = brandColors[slug] || '#6366f1';

    const title = name || slug.charAt(0).toUpperCase() + slug.slice(1) + ' Shop';

    await db.$executeRawUnsafe(
      `
      INSERT INTO "${schemaName}".store_settings (title, brand_color, logo_path, currency)
      VALUES ($1, $2, $3, $4)
    `,
      title,
      defaultBrandColor,
      `/assets/tenants/${slug}/logo.png`,
      'USD'
    );

    console.log(`✅ Схема ${schemaName} и таблицы успешно созданы`);

    return {
      id: tenant.id,
      slug: tenant.slug,
      schema: schemaName,
      message: `Tenant "${slug}" успешно создан со схемой ${schemaName}`,
    };
  } catch (error: any) {
    console.error(`❌ Ошибка при создании схемы: ${error.message}`);
    await db.tenant.delete({ where: { id: tenant.id } });
    throw new Error(`Не удалось создать схему для tenant: ${error.message}`);
  }
}

export async function getAllTenants(db: PrismaClient) {
  return await db.tenant.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTenantBySlug(db: PrismaClient, slug: string) {
  return await db.tenant.findUnique({
    where: { slug },
  });
}

export async function getTenantById(db: PrismaClient, id: string) {
  return await db.tenant.findUnique({
    where: { id },
  });
}

export function getTenantSchema(tenantId: string): string {
  return `t_${tenantId.replace(/-/g, '_')}`;
}

export async function getAllTenantsAsShops(db: PrismaClient, options: any = {}) {
  const { status, orderBy = 'createdAt', order = 'desc' } = options;

  const where = status ? { status } : {};

  const tenants = await db.tenant.findMany({
    where,
    orderBy: { [orderBy]: order },
  });

  return tenants.map(tenant => ({
    id: tenant.id,
    domain: `${tenant.slug}.x-bro.com`,
    subdomain: tenant.slug,
    ownerName: '—',
    ownerEmail: '—',
    ownerPhone: '—',
    telegramAdminId: '—',
    botTokenMasked: '—',
    status: tenant.status,
    plan: 'free',
    expiresAt: null,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
    name: tenant.name,
    slug: tenant.slug,
    schema: getTenantSchema(tenant.id),
  }));
}
