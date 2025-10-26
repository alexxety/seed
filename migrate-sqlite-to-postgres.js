// Migration script: SQLite → PostgreSQL
// This script migrates all data from SQLite to PostgreSQL

const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();
const sqliteDb = new Database(path.join(__dirname, 'orders.db'));

async function migrateData() {
  console.log('🚀 Starting data migration from SQLite to PostgreSQL...\n');

  try {
    // 1. Migrate Categories
    console.log('📦 Migrating categories...');
    const categories = sqliteDb.prepare('SELECT * FROM categories').all();

    for (const cat of categories) {
      await prisma.category.upsert({
        where: { id: cat.id },
        update: {
          name: cat.name,
          icon: cat.icon,
          createdAt: new Date(cat.created_at),
        },
        create: {
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          createdAt: new Date(cat.created_at),
        },
      });
    }
    console.log(`✅ Migrated ${categories.length} categories\n`);

    // 2. Migrate Products
    console.log('📦 Migrating products...');
    const products = sqliteDb.prepare('SELECT * FROM products').all();

    for (const prod of products) {
      await prisma.product.upsert({
        where: { id: prod.id },
        update: {
          name: prod.name,
          price: prod.price,
          categoryId: prod.category_id,
          image: prod.image,
          description: prod.description,
          isActive: prod.is_active === 1,
          createdAt: new Date(prod.created_at),
          updatedAt: new Date(prod.updated_at),
        },
        create: {
          id: prod.id,
          name: prod.name,
          price: prod.price,
          categoryId: prod.category_id,
          image: prod.image,
          description: prod.description,
          isActive: prod.is_active === 1,
          createdAt: new Date(prod.created_at),
          updatedAt: new Date(prod.updated_at),
        },
      });
    }
    console.log(`✅ Migrated ${products.length} products\n`);

    // 3. Migrate Orders
    console.log('📦 Migrating orders...');
    const orders = sqliteDb.prepare('SELECT * FROM orders').all();

    for (const order of orders) {
      await prisma.order.upsert({
        where: { id: order.id },
        update: {
          orderNumber: order.order_number,
          fullName: order.full_name,
          phone: order.phone,
          deliveryType: order.delivery_type,
          deliveryDetails: order.delivery_details,
          items: JSON.parse(order.items),
          total: order.total,
          telegramUsername: order.telegram_username,
          telegramId: order.telegram_id,
          telegramFirstName: order.telegram_first_name,
          telegramLastName: order.telegram_last_name,
          createdAt: new Date(order.created_at),
          status: order.status,
        },
        create: {
          id: order.id,
          orderNumber: order.order_number,
          fullName: order.full_name,
          phone: order.phone,
          deliveryType: order.delivery_type,
          deliveryDetails: order.delivery_details,
          items: JSON.parse(order.items),
          total: order.total,
          telegramUsername: order.telegram_username,
          telegramId: order.telegram_id,
          telegramFirstName: order.telegram_first_name,
          telegramLastName: order.telegram_last_name,
          createdAt: new Date(order.created_at),
          status: order.status,
        },
      });
    }
    console.log(`✅ Migrated ${orders.length} orders\n`);

    // 4. Migrate Order Counter
    console.log('📦 Migrating order counter...');
    const counter = sqliteDb.prepare('SELECT * FROM order_counter WHERE id = 1').get();

    if (counter) {
      await prisma.orderCounter.upsert({
        where: { id: 1 },
        update: {
          counter: counter.counter,
        },
        create: {
          id: 1,
          counter: counter.counter,
        },
      });
      console.log(`✅ Migrated order counter (current: ${counter.counter})\n`);
    }

    // Update sequences to match current max IDs
    console.log('🔧 Updating PostgreSQL sequences...');

    const maxCategoryId = await prisma.category.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    if (maxCategoryId) {
      await prisma.$executeRawUnsafe(
        `SELECT setval('categories_id_seq', ${maxCategoryId.id}, true);`
      );
    }

    const maxProductId = await prisma.product.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    if (maxProductId) {
      await prisma.$executeRawUnsafe(
        `SELECT setval('products_id_seq', ${maxProductId.id}, true);`
      );
    }

    const maxOrderId = await prisma.order.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    if (maxOrderId) {
      await prisma.$executeRawUnsafe(
        `SELECT setval('orders_id_seq', ${maxOrderId.id}, true);`
      );
    }

    console.log('✅ Sequences updated\n');

    console.log('🎉 Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  Categories: ${categories.length}`);
    console.log(`  Products: ${products.length}`);
    console.log(`  Orders: ${orders.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    sqliteDb.close();
  }
}

// Run migration
migrateData()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
