import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.JWT_SECRET || 'default-encryption-key-change-in-production';
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt sensitive setting value
 */
function encrypt(text: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive setting value
 */
function decrypt(text: string): string {
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return text;
  }
}

/**
 * Get all settings (tenant-scoped)
 */
export async function getAllSettings(db: PrismaClient) {
  const settings = await db.setting.findMany({
    orderBy: [{ category: 'asc' }, { label: 'asc' }],
  });

  return settings.map(setting => {
    if (setting.isEncrypted && setting.value) {
      const decryptedValue = decrypt(setting.value);
      if (setting.type === 'secret') {
        return {
          ...setting,
          displayValue: '••••' + decryptedValue.slice(-4),
          value: decryptedValue,
        };
      }
      return { ...setting, value: decryptedValue };
    }
    return setting;
  });
}

/**
 * Get settings by category (tenant-scoped)
 */
export async function getSettingsByCategory(db: PrismaClient, category: string) {
  const settings = await db.setting.findMany({
    where: { category },
    orderBy: { label: 'asc' },
  });

  return settings.map(setting => {
    if (setting.isEncrypted && setting.value) {
      const decryptedValue = decrypt(setting.value);
      if (setting.type === 'secret') {
        return {
          ...setting,
          displayValue: '••••' + decryptedValue.slice(-4),
          value: decryptedValue,
        };
      }
      return { ...setting, value: decryptedValue };
    }
    return setting;
  });
}

/**
 * Get single setting by key (tenant-scoped)
 */
export async function getSetting(db: PrismaClient, key: string) {
  const setting = await db.setting.findUnique({
    where: { key },
  });

  if (!setting) return null;

  if (setting.isEncrypted && setting.value) {
    setting.value = decrypt(setting.value);
  }

  return setting;
}

/**
 * Update setting value (tenant-scoped)
 */
export async function updateSetting(db: PrismaClient, key: string, value: string) {
  const setting = await db.setting.findUnique({
    where: { key },
  });

  if (!setting) {
    throw new Error(`Setting with key "${key}" not found`);
  }

  const updatedValue = setting.isEncrypted ? encrypt(value) : value;

  return await db.setting.update({
    where: { key },
    data: { value: updatedValue },
  });
}

/**
 * Update multiple settings (tenant-scoped)
 */
export async function updateSettings(db: PrismaClient, updates: any[]) {
  const results = [];

  for (const update of updates) {
    try {
      const result = await updateSetting(db, update.key, update.value);
      results.push({ success: true, key: update.key, setting: result });
    } catch (error: any) {
      results.push({ success: false, key: update.key, error: error.message });
    }
  }

  return results;
}

/**
 * Initialize default settings (tenant-scoped)
 */
export async function initializeSettings(db: PrismaClient) {
  const defaultSettings = [
    {
      key: 'telegram.bot_token',
      value: process.env.TELEGRAM_BOT_TOKEN || '',
      label: 'Токен Telegram бота',
      description: 'Токен бота для работы мини-приложения',
      type: 'secret',
      category: 'telegram',
      isRequired: true,
      isEncrypted: true,
    },
    {
      key: 'telegram.admin_chat_id',
      value: process.env.TELEGRAM_ADMIN_CHAT_ID || '',
      label: 'ID чата админа',
      description: 'Telegram ID чата для уведомлений администратора',
      type: 'text',
      category: 'telegram',
      isRequired: true,
      isEncrypted: false,
    },
    {
      key: 'shop.name',
      value: 'Мой магазин',
      label: 'Название магазина',
      description: 'Название вашего магазина',
      type: 'text',
      category: 'shop',
      isRequired: true,
      isEncrypted: false,
    },
    {
      key: 'shop.description',
      value: 'Описание магазина',
      label: 'Описание',
      description: 'Краткое описание вашего магазина',
      type: 'textarea',
      category: 'shop',
      isRequired: false,
      isEncrypted: false,
    },
  ];

  for (const settingData of defaultSettings) {
    const existing = await db.setting.findUnique({
      where: { key: settingData.key },
    });

    if (!existing) {
      const valueToStore = settingData.isEncrypted
        ? encrypt(settingData.value)
        : settingData.value;

      await db.setting.create({
        data: {
          ...settingData,
          value: valueToStore,
        },
      });
    }
  }
}
