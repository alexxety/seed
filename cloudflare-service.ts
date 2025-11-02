import 'dotenv/config';
import Cloudflare from 'cloudflare';

const cloudflare = new Cloudflare({
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
});

const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID!;
const DOMAIN = 'x-bro.com';
const SERVER_IP = '46.224.19.173';

interface DNSResult {
  success: boolean;
  recordId?: string;
  error?: string;
}

interface AvailabilityResult {
  available: boolean;
}

export async function createShopDNS(subdomain: string): Promise<DNSResult> {
  try {
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return {
        success: false,
        error: 'Поддомен может содержать только буквы, цифры и дефис',
      };
    }

    const record = await cloudflare.dns.records.create({
      zone_id: ZONE_ID,
      type: 'A',
      name: subdomain,
      content: SERVER_IP,
      ttl: 1,
      proxied: true,
    });

    console.log(`DNS запись создана: ${subdomain}.${DOMAIN} -> ${SERVER_IP}`);

    return {
      success: true,
      recordId: record.id,
    };
  } catch (error: any) {
    console.error('Ошибка создания DNS записи:', error);

    if (error.message && error.message.includes('already exists')) {
      return {
        success: false,
        error: 'Этот поддомен уже занят',
      };
    }

    return {
      success: false,
      error: error.message || 'Ошибка создания DNS записи',
    };
  }
}

export async function deleteShopDNS(subdomain: string): Promise<DNSResult> {
  try {
    const records = await cloudflare.dns.records.list({
      zone_id: ZONE_ID,
      name: `${subdomain}.${DOMAIN}`,
      type: 'A',
    });

    if (!records.result || records.result.length === 0) {
      return {
        success: false,
        error: 'DNS запись не найдена',
      };
    }

    await cloudflare.dns.records.delete(records.result[0].id, {
      zone_id: ZONE_ID,
    });

    console.log(`DNS запись удалена: ${subdomain}.${DOMAIN}`);

    return { success: true };
  } catch (error: any) {
    console.error('Ошибка удаления DNS записи:', error);
    return {
      success: false,
      error: error.message || 'Ошибка удаления DNS записи',
    };
  }
}

export async function checkSubdomainAvailability(
  subdomain: string
): Promise<AvailabilityResult> {
  try {
    const records = await cloudflare.dns.records.list({
      zone_id: ZONE_ID,
      name: `${subdomain}.${DOMAIN}`,
    });

    return {
      available: !records.result || records.result.length === 0,
    };
  } catch (error) {
    console.error('Ошибка проверки поддомена:', error);
    return { available: false };
  }
}
