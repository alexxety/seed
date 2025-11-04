#!/usr/bin/env node
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createTenant } from '../server/src/db/tenants.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Использование: node --loader ts-node/esm scripts/create-tenant-esm.ts <slug> [name]');
    console.error('   Пример: node --loader ts-node/esm scripts/create-tenant-esm.ts demo "Demo Shop"');
    process.exit(1);
  }

  const slug = args[0];
  const name = args[1] || slug;

  console.log(`\n🚀 Создание tenant: "${slug}"`);
  console.log(`📝 Название: "${name}"\n`);

  const db = new PrismaClient();

  try {
    // Enable uuid extension
    await db.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    const result = await createTenant(db, slug, name);

    console.log('\n✅ Tenant успешно создан!');
    console.log('━'.repeat(50));
    console.log(`ID:     ${result.id}`);
    console.log(`Slug:   ${result.slug}`);
    console.log(`Schema: ${result.schema}`);
    console.log('━'.repeat(50));
    console.log(`\n🌐 Доступен по адресу: https://${slug}.x-bro.com`);
    console.log(`\n💡 Не забудьте создать DNS запись в Cloudflare!\n`);

    await db.$disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error(`\n❌ Ошибка: ${error.message}\n`);
    await db.$disconnect();
    process.exit(1);
  }
}

main();
