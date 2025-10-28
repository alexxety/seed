// Database layer using Prisma ORM with PostgreSQL
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Encryption settings for sensitive data
const ENCRYPTION_KEY = process.env.JWT_SECRET || 'default-encryption-key-change-in-production';
const ALGORITHM = 'aes-256-cbc';

// Helper functions for encryption
function encrypt(text) {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
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
    return text; // Return original if decryption fails
  }
}

// ==================== ORDERS ====================

// Function to generate order number
async function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const todayPrefix = `${year}${month}${day}`;

  // Get or create counter
  let counter = await prisma.orderCounter.findUnique({
    where: { id: 1 },
  });

  if (!counter) {
    counter = await prisma.orderCounter.create({
      data: { id: 1, counter: 0 },
    });
  }

  // Increment counter
  counter = await prisma.orderCounter.update({
    where: { id: 1 },
    data: { counter: { increment: 1 } },
  });

  // Format: YYYYMMDD-NNNN
  const orderNumber = `${todayPrefix}-${String(counter.counter).padStart(4, '0')}`;
  return orderNumber;
}

// Function to create a new order
async function createOrder(customer, items, total) {
  const orderNumber = await generateOrderNumber();

  const order = await prisma.order.create({
    data: {
      orderNumber,
      fullName: customer.fullName,
      phone: customer.phone,
      deliveryType: customer.deliveryType,
      deliveryDetails: customer.deliveryDetails,
      items: items, // Prisma handles JSON automatically
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

// Function to get order by number
async function getOrderByNumber(orderNumber) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
  });
  return order;
}

// Function to get order by ID
async function getOrderById(id) {
  const order = await prisma.order.findUnique({
    where: { id },
  });
  return order;
}

// Function to get all orders
async function getAllOrders(limit = 100) {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return orders;
}

// Function to update order status
async function updateOrderStatus(id, status) {
  const validStatuses = ['new', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid order status');
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status },
  });

  return order;
}

// Function to delete order
async function deleteOrder(id) {
  await prisma.order.delete({
    where: { id },
  });
  return { success: true };
}

// ==================== CATEGORIES ====================

async function getAllCategories() {
  return await prisma.category.findMany({
    orderBy: { id: 'asc' },
  });
}

async function createCategory(name, icon) {
  const category = await prisma.category.create({
    data: { name, icon },
  });
  return category;
}

async function updateCategory(id, name, icon) {
  const category = await prisma.category.update({
    where: { id },
    data: { name, icon },
  });
  return category;
}

async function deleteCategory(id) {
  // Check if there are products in this category
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

// ==================== PRODUCTS ====================

async function getAllProducts() {
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

  // Map to match old API format
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.categoryId, // For frontend compatibility
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

async function getProductById(id) {
  const product = await prisma.product.findUnique({
    where: { id },
  });
  return product;
}

async function createProduct(product) {
  const newProduct = await prisma.product.create({
    data: {
      name: product.name,
      price: product.price,
      categoryId: product.category_id,
      image: product.image,
      description: product.description,
    },
  });
  return newProduct;
}

async function updateProduct(id, product) {
  const updatedProduct = await prisma.product.update({
    where: { id },
    data: {
      name: product.name,
      price: product.price,
      categoryId: product.category_id,
      image: product.image,
      description: product.description,
    },
  });
  return updatedProduct;
}

async function deleteProduct(id) {
  // Soft delete - mark as inactive
  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });
}

// ==================== SETTINGS ====================

// Get all settings
async function getAllSettings() {
  const settings = await prisma.setting.findMany({
    orderBy: [
      { category: 'asc' },
      { label: 'asc' }
    ]
  });

  // Decrypt encrypted values and mask secrets for display
  return settings.map(setting => {
    if (setting.isEncrypted && setting.value) {
      const decryptedValue = decrypt(setting.value);
      // For secret type, mask the value for display
      if (setting.type === 'secret') {
        return {
          ...setting,
          displayValue: '••••' + decryptedValue.slice(-4),
          value: decryptedValue // Full value for backend use
        };
      }
      return { ...setting, value: decryptedValue };
    }
    return setting;
  });
}

// Get settings by category
async function getSettingsByCategory(category) {
  const settings = await prisma.setting.findMany({
    where: { category },
    orderBy: { label: 'asc' }
  });

  return settings.map(setting => {
    if (setting.isEncrypted && setting.value) {
      const decryptedValue = decrypt(setting.value);
      if (setting.type === 'secret') {
        return {
          ...setting,
          displayValue: '••••' + decryptedValue.slice(-4),
          value: decryptedValue
        };
      }
      return { ...setting, value: decryptedValue };
    }
    return setting;
  });
}

// Get single setting by key
async function getSetting(key) {
  const setting = await prisma.setting.findUnique({
    where: { key }
  });

  if (!setting) return null;

  if (setting.isEncrypted && setting.value) {
    setting.value = decrypt(setting.value);
  }

  return setting;
}

// Get setting value by key (returns just the value)
async function getSettingValue(key, defaultValue = null) {
  const setting = await getSetting(key);
  return setting ? setting.value : defaultValue;
}

// Create new setting
async function createSetting(data) {
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

  const setting = await prisma.setting.create({
    data: settingData
  });

  return setting;
}

// Update setting
async function updateSetting(key, value) {
  const setting = await prisma.setting.findUnique({
    where: { key }
  });

  if (!setting) {
    throw new Error(`Setting with key "${key}" not found`);
  }

  const updatedValue = setting.isEncrypted ? encrypt(value) : value;

  const updated = await prisma.setting.update({
    where: { key },
    data: { value: updatedValue }
  });

  return updated;
}

// Update multiple settings at once
async function updateSettings(updates) {
  const results = [];

  for (const update of updates) {
    try {
      const result = await updateSetting(update.key, update.value);
      results.push({ success: true, key: update.key, setting: result });
    } catch (error) {
      results.push({ success: false, key: update.key, error: error.message });
    }
  }

  return results;
}

// Delete setting
async function deleteSetting(key) {
  await prisma.setting.delete({
    where: { key }
  });
}

// Initialize default settings from environment variables
async function initializeSettings() {
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
      where: { key: settingData.key }
    });

    if (!existing) {
      await createSetting(settingData);
      console.log(`✅ Initialized setting: ${settingData.key}`);
    }
  }

  console.log('✅ Settings initialization completed');
}

// Export database client and functions
module.exports = {
  prisma,
  db: prisma, // Alias for compatibility
  createOrder,
  getOrderByNumber,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllSettings,
  getSettingsByCategory,
  getSetting,
  getSettingValue,
  createSetting,
  updateSetting,
  updateSettings,
  deleteSetting,
  initializeSettings,
};
