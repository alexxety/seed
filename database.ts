import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const ENCRYPTION_KEY = process.env.JWT_SECRET || 'default-encryption-key-change-in-production';
const ALGORITHM = 'aes-256-cbc';

function encrypt(text: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

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

async function generateOrderNumber(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const todayPrefix = `${year}${month}${day}`;

  let counter = await prisma.orderCounter.findUnique({
    where: { id: 1 },
  });

  if (!counter) {
    counter = await prisma.orderCounter.create({
      data: { id: 1, counter: 0 },
    });
  }

  counter = await prisma.orderCounter.update({
    where: { id: 1 },
    data: { counter: { increment: 1 } },
  });

  const orderNumber = `${todayPrefix}-${String(counter.counter).padStart(4, '0')}`;
  return orderNumber;
}

export async function createOrder(customer: any, items: any, total: number) {
  const orderNumber = await generateOrderNumber();

  const order = await prisma.order.create({
    data: {
      orderNumber,
      fullName: customer.fullName,
      phone: customer.phone,
      deliveryType: customer.deliveryType,
      deliveryDetails: customer.deliveryDetails,
      items: items,
      total,
      telegramUsername: customer.telegramUsername || null,
      telegramId: customer.telegramId || null,
      telegramFirstName: customer.telegramFirstName || null,
      telegramLastName: customer.telegramLastName || null,
    },
  });

  return {
    id: order.id,
    orderNumber: order.orderNumber,
  };
}

export async function getOrderByNumber(orderNumber: string) {
  return await prisma.order.findUnique({
    where: { orderNumber },
  });
}

export async function getOrderById(id: number) {
  return await prisma.order.findUnique({
    where: { id },
  });
}

export async function getAllOrders(limit = 100) {
  return await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function updateOrderStatus(id: number, status: string) {
  const validStatuses = ['new', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid order status');
  }

  return await prisma.order.update({
    where: { id },
    data: { status },
  });
}

export async function deleteOrder(id: number) {
  await prisma.order.delete({
    where: { id },
  });
  return { success: true };
}

export async function getAllCategories() {
  return await prisma.category.findMany({
    orderBy: { id: 'asc' },
  });
}

export async function createCategory(name: string, icon: string) {
  return await prisma.category.create({
    data: { name, icon },
  });
}

export async function updateCategory(id: number, name: string, icon: string) {
  return await prisma.category.update({
    where: { id },
    data: { name, icon },
  });
}

export async function deleteCategory(id: number) {
  const productsCount = await prisma.product.count({
    where: {
      categoryId: id,
      isActive: true,
    },
  });

  if (productsCount > 0) {
    throw new Error(
      `Cannot delete category with ${productsCount} products. Please move or delete products first.`
    );
  }

  await prisma.category.delete({
    where: { id },
  });
}

export async function getAllProducts() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: {
        select: {
          name: true,
          icon: true,
        },
      },
    },
    orderBy: { id: 'asc' },
  });

  return products.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.categoryId,
    category_id: p.categoryId,
    category_name: p.category.name,
    category_icon: p.category.icon,
    image: p.image,
    description: p.description,
    is_active: p.isActive,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }));
}

export async function getProductById(id: number) {
  return await prisma.product.findUnique({
    where: { id },
  });
}

export async function createProduct(product: any) {
  return await prisma.product.create({
    data: {
      name: product.name,
      price: product.price,
      categoryId: product.category_id,
      image: product.image,
      description: product.description,
    },
  });
}

export async function updateProduct(id: number, product: any) {
  return await prisma.product.update({
    where: { id },
    data: {
      name: product.name,
      price: product.price,
      categoryId: product.category_id,
      image: product.image,
      description: product.description,
    },
  });
}

export async function deleteProduct(id: number) {
  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function getAllSettings() {
  const settings = await prisma.setting.findMany({
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

export async function getSettingsByCategory(category: string) {
  const settings = await prisma.setting.findMany({
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

export async function getSetting(key: string) {
  const setting = await prisma.setting.findUnique({
    where: { key },
  });

  if (!setting) return null;

  if (setting.isEncrypted && setting.value) {
    setting.value = decrypt(setting.value);
  }

  return setting;
}

export async function getSettingValue(key: string, defaultValue: any = null) {
  const setting = await getSetting(key);
  return setting ? setting.value : defaultValue;
}

export async function createSetting(data: any) {
  const settingData = {
    key: data.key,
    value: data.isEncrypted ? encrypt(data.value) : data.value,
    label: data.label,
    description: data.description,
    type: data.type || 'text',
    category: data.category || 'general',
    isRequired: data.isRequired || false,
    isEncrypted: data.isEncrypted || false,
  };

  return await prisma.setting.create({
    data: settingData,
  });
}

export async function updateSetting(key: string, value: string) {
  const setting = await prisma.setting.findUnique({
    where: { key },
  });

  if (!setting) {
    throw new Error(`Setting with key "${key}" not found`);
  }

  const updatedValue = setting.isEncrypted ? encrypt(value) : value;

  return await prisma.setting.update({
    where: { key },
    data: { value: updatedValue },
  });
}

export async function updateSettings(updates: any[]) {
  const results = [];

  for (const update of updates) {
    try {
      const result = await updateSetting(update.key, update.value);
      results.push({ success: true, key: update.key, setting: result });
    } catch (error: any) {
      results.push({ success: false, key: update.key, error: error.message });
    }
  }

  return results;
}

export async function deleteSetting(key: string) {
  await prisma.setting.delete({
    where: { key },
  });
}

export async function initializeSettings() {
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
      key: 'telegram.chat_id',
      value: process.env.TELEGRAM_CHAT_ID || '',
      label: 'ID чата для уведомлений',
      description: 'ID чата или канала, куда отправляются заказы',
      type: 'text',
      category: 'telegram',
      isRequired: true,
      isEncrypted: false,
    },
    {
      key: 'telegram.admin_id',
      value: '',
      label: 'ID администратора',
      description: 'Telegram ID администратора магазина',
      type: 'text',
      category: 'telegram',
      isRequired: false,
      isEncrypted: false,
    },
    {
      key: 'bot.name',
      value: 'Seed Shop',
      label: 'Название магазина',
      description: 'Отображаемое название вашего магазина',
      type: 'text',
      category: 'bot',
      isRequired: true,
      isEncrypted: false,
    },
    {
      key: 'bot.welcome_message',
      value: 'Добро пожаловать в наш магазин! 🌱',
      label: 'Приветственное сообщение',
      description: 'Сообщение при запуске бота',
      type: 'textarea',
      category: 'bot',
      isRequired: false,
      isEncrypted: false,
    },
  ];

  for (const settingData of defaultSettings) {
    const existing = await prisma.setting.findUnique({
      where: { key: settingData.key },
    });

    if (!existing) {
      await createSetting(settingData);
      console.log(`✅ Initialized setting: ${settingData.key}`);
    }
  }

  console.log('✅ Settings initialization completed');
}

export async function createShop(shopData: any) {
  const encryptedToken = encrypt(shopData.botToken);

  return await prisma.shop.create({
    data: {
      subdomain: shopData.subdomain.toLowerCase(),
      ownerName: shopData.ownerName,
      ownerEmail: shopData.ownerEmail,
      ownerPhone: shopData.ownerPhone || null,
      botToken: encryptedToken,
      chatId: shopData.chatId,
      adminTelegramId: shopData.adminTelegramId,
      status: shopData.status || 'active',
      plan: shopData.plan || 'free',
      expiresAt: shopData.expiresAt || null,
    },
  });
}

export async function getAllShops(options: any = {}) {
  const { status, orderBy = 'createdAt', order = 'desc' } = options;

  const where = status ? { status } : {};

  const shops = await prisma.shop.findMany({
    where,
    orderBy: { [orderBy]: order },
  });

  return shops.map(shop => ({
    ...shop,
    botToken: decrypt(shop.botToken),
    botTokenMasked: '••••' + decrypt(shop.botToken).slice(-4),
  }));
}

export async function getShopBySubdomain(subdomain: string) {
  const shop = await prisma.shop.findUnique({
    where: { subdomain: subdomain.toLowerCase() },
  });

  if (!shop) return null;

  return {
    ...shop,
    botToken: decrypt(shop.botToken),
  };
}

export async function getShopById(id: number) {
  const shop = await prisma.shop.findUnique({
    where: { id },
  });

  if (!shop) return null;

  return {
    ...shop,
    botToken: decrypt(shop.botToken),
  };
}

export async function updateShop(id: number, updates: any) {
  const updateData = { ...updates };

  if (updateData.botToken) {
    updateData.botToken = encrypt(updateData.botToken);
  }

  if (updateData.subdomain) {
    updateData.subdomain = updateData.subdomain.toLowerCase();
  }

  const shop = await prisma.shop.update({
    where: { id },
    data: updateData,
  });

  return {
    ...shop,
    botToken: decrypt(shop.botToken),
  };
}

export async function updateShopStatus(id: number, status: string) {
  const validStatuses = ['active', 'blocked', 'pending'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid shop status');
  }

  return await prisma.shop.update({
    where: { id },
    data: { status },
  });
}

export async function deleteShop(id: number) {
  await prisma.shop.delete({
    where: { id },
  });
  return { success: true };
}

export async function isSubdomainAvailable(subdomain: string) {
  const existing = await prisma.shop.findUnique({
    where: { subdomain: subdomain.toLowerCase() },
  });
  return !existing;
}

export { prisma, prisma as db };
