#!/usr/bin/env node
require('dotenv/config');
const { createShopDNS } = require('./cloudflare-service');
const Cloudflare = require('cloudflare');

const cloudflare = new Cloudflare({
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
});

const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const SERVER_IP = '46.224.19.173';

async function createDNSRecord(name, type = 'A', content = SERVER_IP) {
  try {
    const record = await cloudflare.dns.records.create({
      zone_id: ZONE_ID,
      type: type,
      name: name,
      content: content,
      ttl: 1, // Auto
      proxied: true, // Через Cloudflare proxy для SSL
    });
    console.log(`✅ DNS запись создана: ${name} -> ${content}`);
    return { success: true, recordId: record.id };
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      console.log(`⚠️  DNS запись уже существует: ${name}`);
      return { success: true, exists: true };
    }
    console.error(`❌ Ошибка создания DNS записи ${name}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function setupAllDNS() {
  console.log('🚀 Начинаю создание DNS записей...\n');

  const records = [
    // Корневой домен (главная страница)
    { name: 'x-bro.com', description: 'Главная страница (PROD)' },
    { name: '@', description: 'Корневой домен (альтернативная запись)' },

    // Production
    { name: 'admin', description: 'Супер-админ панель (PROD)' },
    // seed.x-bro.com уже существует

    // Dev
    { name: 'dev', description: 'Главная страница (DEV)' },
    { name: 'dev-admin', description: 'Супер-админ панель (DEV)' },
    // deva.x-bro.com уже существует
  ];

  console.log('📋 Создаю следующие DNS записи:\n');
  for (const record of records) {
    console.log(
      `   → ${record.name === '@' ? 'x-bro.com' : record.name + '.x-bro.com'} - ${record.description}`
    );
  }
  console.log('');

  for (const record of records) {
    await createDNSRecord(record.name);
    // Небольшая задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n✨ Настройка DNS завершена!');
  console.log('\n📝 Текущая структура:');
  console.log('   PRODUCTION:');
  console.log('   - https://x-bro.com              (главная + регистрация)');
  console.log('   - https://admin.x-bro.com        (супер-админ)');
  console.log('   - https://seed.x-bro.com         (демо-магазин)');
  console.log('');
  console.log('   DEV:');
  console.log('   - https://dev.x-bro.com          (главная + регистрация DEV)');
  console.log('   - https://dev-admin.x-bro.com    (супер-админ DEV)');
  console.log('   - https://deva.x-bro.com         (демо-магазин DEV)');
  console.log('');
  console.log('⏱️  DNS записи будут доступны через 2-3 минуты');
}

setupAllDNS().catch(console.error);
