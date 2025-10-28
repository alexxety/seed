require('dotenv/config');
const Cloudflare = require('cloudflare');

const cloudflare = new Cloudflare({
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
});

const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const DOMAIN = 'x-bro.com';
const SERVER_IP = '46.224.19.173';

/**
 * Создаёт DNS запись для нового магазина
 * @param {string} subdomain - поддомен (например: ivan)
 * @returns {Promise<{success: boolean, recordId?: string, error?: string}>}
 */
async function createShopDNS(subdomain) {
  try {
    // Проверяем что поддомен валидный
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return {
        success: false,
        error: 'Поддомен может содержать только буквы, цифры и дефис'
      };
    }

    // Создаём A запись
    const record = await cloudflare.dns.records.create({
      zone_id: ZONE_ID,
      type: 'A',
      name: subdomain,
      content: SERVER_IP,
      ttl: 1, // Auto
      proxied: true, // Через Cloudflare proxy
    });

    console.log(`DNS запись создана: ${subdomain}.${DOMAIN} -> ${SERVER_IP}`);

    return {
      success: true,
      recordId: record.id,
    };
  } catch (error) {
    console.error('Ошибка создания DNS записи:', error);

    // Проверяем если запись уже существует
    if (error.message && error.message.includes('already exists')) {
      return {
        success: false,
        error: 'Этот поддомен уже занят'
      };
    }

    return {
      success: false,
      error: error.message || 'Ошибка создания DNS записи'
    };
  }
}

/**
 * Удаляет DNS запись магазина
 * @param {string} subdomain - поддомен (например: ivan)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteShopDNS(subdomain) {
  try {
    // Сначала находим запись
    const records = await cloudflare.dns.records.list({
      zone_id: ZONE_ID,
      name: `${subdomain}.${DOMAIN}`,
      type: 'A',
    });

    if (!records.result || records.result.length === 0) {
      return {
        success: false,
        error: 'DNS запись не найдена'
      };
    }

    // Удаляем запись
    await cloudflare.dns.records.delete(records.result[0].id, {
      zone_id: ZONE_ID,
    });

    console.log(`DNS запись удалена: ${subdomain}.${DOMAIN}`);

    return { success: true };
  } catch (error) {
    console.error('Ошибка удаления DNS записи:', error);
    return {
      success: false,
      error: error.message || 'Ошибка удаления DNS записи'
    };
  }
}

/**
 * Проверяет доступность поддомена
 * @param {string} subdomain - поддомен
 * @returns {Promise<{available: boolean}>}
 */
async function checkSubdomainAvailability(subdomain) {
  try {
    const records = await cloudflare.dns.records.list({
      zone_id: ZONE_ID,
      name: `${subdomain}.${DOMAIN}`,
    });

    return {
      available: !records.result || records.result.length === 0
    };
  } catch (error) {
    console.error('Ошибка проверки поддомена:', error);
    return { available: false };
  }
}

module.exports = {
  createShopDNS,
  deleteShopDNS,
  checkSubdomainAvailability,
};
