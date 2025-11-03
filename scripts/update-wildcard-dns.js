#!/usr/bin/env node
require('dotenv').config();
const Cloudflare = require('cloudflare');

const cloudflare = new Cloudflare({
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
});

const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const DOMAIN = 'x-bro.com';
const SERVER_IP = '46.224.19.173';

async function updateWildcardDNS() {
  try {
    console.log('🔍 Поиск wildcard записи *.x-bro.com...\n');

    // Получаем все DNS записи
    const records = await cloudflare.dns.records.list({
      zone_id: ZONE_ID,
      name: `*.${DOMAIN}`,
      type: 'A',
    });

    if (!records.result || records.result.length === 0) {
      console.log('❌ Wildcard запись *.x-bro.com не найдена!');
      console.log('📝 Создаём новую wildcard запись без proxy...\n');

      const newRecord = await cloudflare.dns.records.create({
        zone_id: ZONE_ID,
        type: 'A',
        name: '*',
        content: SERVER_IP,
        ttl: 1, // Auto
        proxied: false, // DNS only (серое облачко)
      });

      console.log('✅ Wildcard запись создана:');
      console.log(`   Name: ${newRecord.name}`);
      console.log(`   Content: ${newRecord.content}`);
      console.log(
        `   Proxied: ${newRecord.proxied} (${newRecord.proxied ? '🟠 оранжевое' : '⚪ серое'} облачко)`
      );
      console.log(`   ID: ${newRecord.id}\n`);

      return;
    }

    const wildcardRecord = records.result[0];
    console.log('✅ Найдена wildcard запись:');
    console.log(`   Name: ${wildcardRecord.name}`);
    console.log(`   Content: ${wildcardRecord.content}`);
    console.log(
      `   Proxied: ${wildcardRecord.proxied} (${wildcardRecord.proxied ? '🟠 оранжевое' : '⚪ серое'} облачко)`
    );
    console.log(`   ID: ${wildcardRecord.id}\n`);

    if (!wildcardRecord.proxied) {
      console.log('✅ Запись уже настроена без proxy (серое облачко)');
      console.log('   Ничего делать не нужно!\n');
      return;
    }

    console.log('🔧 Обновляем запись: отключаем Cloudflare proxy...\n');

    // Обновляем запись - отключаем proxy
    const updatedRecord = await cloudflare.dns.records.update(wildcardRecord.id, {
      zone_id: ZONE_ID,
      type: 'A',
      name: '*',
      content: SERVER_IP,
      ttl: 1,
      proxied: false, // DNS only (серое облачко)
    });

    console.log('✅ Запись успешно обновлена:');
    console.log(`   Name: ${updatedRecord.name}`);
    console.log(`   Content: ${updatedRecord.content}`);
    console.log(
      `   Proxied: ${updatedRecord.proxied} (${updatedRecord.proxied ? '🟠 оранжевое' : '⚪ серое'} облачко)`
    );
    console.log(`   TTL: ${updatedRecord.ttl === 1 ? 'Auto' : updatedRecord.ttl}\n`);

    console.log('🎉 Готово! Теперь все поддомены *.x-bro.com резолвятся напрямую на сервер.');
    console.log('⚠️  Изменения могут занять несколько минут для распространения.\n');

    console.log('🧪 Проверка через несколько минут:');
    console.log('   dig demo.x-bro.com +short');
    console.log('   # Должен показать: 46.224.19.173\n');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

updateWildcardDNS();
