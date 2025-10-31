#!/usr/bin/env node
require('dotenv').config();

const { createTenant } = require('../server/src/db/tenants');

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Использование: npm run create:tenant <slug> [name]');
    console.error('   Пример: npm run create:tenant myshop "My Shop"');
    process.exit(1);
  }

  const slug = args[0];
  const name = args[1] || slug;

  console.log(`\n🚀 Создание tenant: "${slug}"`);
  console.log(`📝 Название: "${name}"\n`);

  try {
    const result = await createTenant(slug, name);

    console.log('\n✅ Tenant успешно создан!');
    console.log('━'.repeat(50));
    console.log(`ID:     ${result.id}`);
    console.log(`Slug:   ${result.slug}`);
    console.log(`Schema: ${result.schema}`);
    console.log('━'.repeat(50));
    console.log(`\n🌐 Доступен по адресу: https://${slug}.x-bro.com`);
    console.log(`\n💡 Не забудьте создать DNS запись в Cloudflare!\n`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Ошибка: ${error.message}\n`);
    process.exit(1);
  }
}

main();
