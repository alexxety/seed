#!/usr/bin/env node

/**
 * Seed storefront data for existing tenants
 * Добавляет store_settings и демо товары в demo и testshop
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedTenantStorefront(tenantSlug, config) {
  try {
    console.log(`\n🌱 Seeding storefront data for: ${tenantSlug}`);

    // Получаем tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug }
    });

    if (!tenant) {
      console.error(`❌ Tenant "${tenantSlug}" not found`);
      return;
    }

    const schemaName = `t_${tenant.id.replace(/-/g, '_')}`;
    console.log(`   Schema: ${schemaName}`);

    // Проверяем, есть ли таблица store_settings
    const tableExists = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = '${schemaName}'
        AND table_name = 'store_settings'
      ) as exists
    `);

    if (!tableExists[0].exists) {
      console.log(`   Creating store_settings table...`);
      await prisma.$executeRawUnsafe(`
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
    }

    // Добавляем store_settings
    console.log(`   Inserting store_settings...`);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "${schemaName}".store_settings (title, brand_color, logo_path, currency)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
    `, config.title, config.brandColor, config.logoPath, config.currency);

    // Добавляем товары
    console.log(`   Inserting products...`);
    for (const product of config.products) {
      // Создаём товар
      const productResult = await prisma.$queryRawUnsafe(`
        INSERT INTO "${schemaName}".products (name, description, category, tags, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, product.name, product.description, product.category, product.tags, true);

      const productId = productResult[0].id;
      console.log(`      ✓ Product: ${product.name} (${productId})`);

      // Создаём вариант товара
      const variantResult = await prisma.$queryRawUnsafe(`
        INSERT INTO "${schemaName}".product_variants (product_id, sku, title, is_active)
        VALUES ($1::uuid, $2, $3, $4)
        RETURNING id
      `, productId, product.sku, 'Default', true);

      const variantId = variantResult[0].id;

      // Создаём цену для варианта
      await prisma.$queryRawUnsafe(`
        INSERT INTO "${schemaName}".prices (variant_id, currency, amount, is_active)
        VALUES ($1::uuid, $2, $3, $4)
      `, variantId, config.currency, product.price, true);

      // Создаём inventory для варианта
      await prisma.$queryRawUnsafe(`
        INSERT INTO "${schemaName}".inventory (variant_id, quantity, reserved, location)
        VALUES ($1::uuid, $2, $3, $4)
      `, variantId, product.quantity || 100, 0, 'warehouse');
    }

    console.log(`✅ Successfully seeded ${tenantSlug}`);
  } catch (error) {
    console.error(`❌ Error seeding ${tenantSlug}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Seeding storefront data for tenants...\n');

  // Demo Shop configuration
  await seedTenantStorefront('demo', {
    title: 'Demo Shop',
    brandColor: '#0ea5e9',
    logoPath: '/assets/tenants/demo/logo.png',
    currency: 'USD',
    products: [
      {
        name: 'Premium Headphones',
        description: 'High-quality wireless headphones with noise cancellation. Perfect for music lovers and professionals.',
        category: 'Electronics',
        tags: ['audio', 'wireless', 'premium'],
        sku: 'DEMO-HP-001',
        price: 299.99,
        quantity: 50
      },
      {
        name: 'Smart Watch',
        description: 'Feature-rich smartwatch with health tracking, notifications, and long battery life.',
        category: 'Electronics',
        tags: ['wearable', 'smart', 'fitness'],
        sku: 'DEMO-SW-002',
        price: 199.99,
        quantity: 75
      },
      {
        name: 'Laptop Stand',
        description: 'Ergonomic aluminum laptop stand with adjustable height. Improve your workspace.',
        category: 'Accessories',
        tags: ['desk', 'ergonomic', 'aluminum'],
        sku: 'DEMO-LS-003',
        price: 49.99,
        quantity: 100
      },
      {
        name: 'Mechanical Keyboard',
        description: 'RGB mechanical keyboard with custom switches. Perfect for gamers and typists.',
        category: 'Electronics',
        tags: ['keyboard', 'gaming', 'rgb'],
        sku: 'DEMO-KB-004',
        price: 149.99,
        quantity: 40
      }
    ]
  });

  // Test Shop configuration
  await seedTenantStorefront('testshop', {
    title: 'Test Shop',
    brandColor: '#16a34a',
    logoPath: '/assets/tenants/testshop/logo.png',
    currency: 'USD',
    products: [
      {
        name: 'Organic Coffee Beans',
        description: 'Premium organic coffee beans sourced from sustainable farms. Rich aroma and smooth taste.',
        category: 'Food & Beverages',
        tags: ['organic', 'coffee', 'fair-trade'],
        sku: 'TEST-COF-001',
        price: 24.99,
        quantity: 200
      },
      {
        name: 'Yoga Mat',
        description: 'Non-slip eco-friendly yoga mat with extra cushioning. Perfect for all types of yoga.',
        category: 'Sports',
        tags: ['yoga', 'fitness', 'eco-friendly'],
        sku: 'TEST-YM-002',
        price: 39.99,
        quantity: 80
      },
      {
        name: 'Stainless Steel Water Bottle',
        description: 'Insulated water bottle keeps drinks cold for 24h or hot for 12h. BPA-free and durable.',
        category: 'Accessories',
        tags: ['bottle', 'insulated', 'eco-friendly'],
        sku: 'TEST-WB-003',
        price: 29.99,
        quantity: 150
      }
    ]
  });

  console.log('\n🎉 Seeding complete!');
  await prisma.$disconnect();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
