import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';

import {
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
  updateSetting,
  updateSettings,
  initializeSettings,
  createShop,
  getAllShops,
  getShopById,
  updateShop,
  updateShopStatus,
  deleteShop,
  isSubdomainAvailable,
} from './database';

import { createShopDNS, deleteShopDNS } from './cloudflare-service';

import {
  createTenant,
  getAllTenants,
  getTenantBySlug,
  getAllTenantsAsShops,
} from './server/src/db/tenants';
import { setTenantContext } from './server/src/multitenancy/tenant-context';
import { attachTenantDB, getGlobalPrisma } from './server/src/multitenancy/middleware';

import storefrontRouter from './server/src/storefront/router';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Pino logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: { colorize: true },
        }
      : undefined,
});

const httpLogger = pinoHttp({ logger });

// Telegram credentials
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  logger.error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in environment variables');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  logger.error('JWT_SECRET must be set in environment variables');
  process.exit(1);
}

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('seed2025', 10);

const SUPERADMIN_USERNAME = 'superadmin';
const SUPERADMIN_PASSWORD_HASH = bcrypt.hashSync('super2025', 10);

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: /(^|\.)x-bro\.com$/,
    credentials: true,
  })
);
app.use(httpLogger);

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Слишком много попыток входа. Попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json());
app.use(generalLimiter);
app.use(express.static('public'));

// Health check (BEFORE tenant middleware)
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    port: PORT,
  });
});

// Multitenancy middleware (MUST be before storefront router)
app.use(setTenantContext);
app.use(attachTenantDB);

// JWT authentication middleware
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  jwt.verify(token, JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный или истёкший токен' });
    }
    (req as any).user = user;
    next();
  });
}

// Telegram helper
function sendTelegramMessage(message: string, chatId: string = CHAT_ID!) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, res => {
      let responseData = '';

      res.on('data', chunk => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`Telegram API error: ${res.statusCode} - ${responseData}`));
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Admin login
app.post('/api/admin/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;
    const login = email || username;

    if (!login || !password) {
      return res.status(400).json({ error: 'Требуется логин и пароль' });
    }

    if (login !== ADMIN_USERNAME) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const isPasswordValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET!, { expiresIn: '1h' });

    res.json({
      success: true,
      token,
      expiresIn: 3600,
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка авторизации' });
  }
});

// SuperAdmin login
app.post('/api/superadmin/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;
    const login = email || username;

    if (!login || !password) {
      return res.status(400).json({ error: 'Требуется логин и пароль' });
    }

    if (login !== SUPERADMIN_USERNAME) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const isPasswordValid = await bcrypt.compare(password, SUPERADMIN_PASSWORD_HASH);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const token = jwt.sign({ username: login, role: 'superadmin' }, JWT_SECRET!, {
      expiresIn: '1h',
    });

    res.json({
      success: true,
      token,
      expiresIn: 3600,
    });
  } catch (error) {
    logger.error('SuperAdmin login error:', error);
    res.status(500).json({ error: 'Ошибка авторизации' });
  }
});

// Superadmin tenants API
app.get('/api/superadmin/tenants', authenticateToken, async (req: Request, res: Response) => {
  try {
    if ((req as any).user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const db = getGlobalPrisma();
    const tenants = await getAllTenants(db);

    const tenantsWithSchema = tenants.map(tenant => ({
      ...tenant,
      schema: `t_${tenant.id.replace(/-/g, '_')}`,
    }));

    res.json({ success: true, tenants: tenantsWithSchema });
  } catch (error) {
    logger.error('Get tenants error:', error);
    res.status(500).json({ error: 'Ошибка получения списка tenants' });
  }
});

app.post('/api/superadmin/tenants', authenticateToken, async (req: Request, res: Response) => {
  try {
    if ((req as any).user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const { slug, name } = req.body;

    if (!slug) {
      return res.status(400).json({ error: 'slug обязателен' });
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({
        error: 'slug должен содержать только строчные буквы, цифры и дефисы',
      });
    }

    const db = getGlobalPrisma();
    const result = await createTenant(db, slug, name);

    res.json({
      success: true,
      tenant: result,
      message: `Tenant "${slug}" успешно создан`,
    });
  } catch (error: any) {
    logger.error('Create tenant error:', error);
    res.status(500).json({
      error: 'Ошибка создания tenant',
      message: error.message,
    });
  }
});

app.get('/api/superadmin/tenants/:slug', authenticateToken, async (req: Request, res: Response) => {
  try {
    if ((req as any).user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const { slug } = req.params;
    const db = getGlobalPrisma();
    const tenant = await getTenantBySlug(db, slug);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant не найден' });
    }

    res.json({
      success: true,
      tenant: {
        ...tenant,
        schema: `t_${tenant.id.replace(/-/g, '_')}`,
      },
    });
  } catch (error) {
    logger.error('Get tenant error:', error);
    res.status(500).json({ error: 'Ошибка получения tenant' });
  }
});

// Shops API (legacy compatibility)
app.get('/api/superadmin/shops', authenticateToken, async (req: Request, res: Response) => {
  try {
    if ((req as any).user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const { status, orderBy, order } = req.query;
    const db = getGlobalPrisma();
    const shops = await getAllTenantsAsShops(db, { status, orderBy, order });

    res.json({ success: true, shops });
  } catch (error) {
    logger.error('Get shops error:', error);
    res.status(500).json({ error: 'Ошибка получения списка магазинов' });
  }
});

app.get('/api/admin/verify', authenticateToken, (req: Request, res: Response) => {
  res.json({ success: true, user: (req as any).user });
});

app.post('/api/admin/logout', authenticateToken, (req: Request, res: Response) => {
  res.json({ success: true, message: 'Выход выполнен успешно' });
});

app.post('/api/send-order', apiLimiter, async (req: Request, res: Response) => {
  try {
    const { customer, items, total } = req.body;

    if (!customer || !items || !total) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const order = await createOrder(customer, items, total);

    const itemsList = items
      .map(
        (item: any) =>
          `• ${item.name} - ${item.quantity} шт. × ${item.price} ₽ = ${(item.price * item.quantity).toLocaleString('ru-RU')} ₽`
      )
      .join('\n');

    const deliveryLabel = customer.deliveryType === 'address' ? '📍 По адресу' : '📦 СДЕК ПВЗ';
    const deliveryDetailsLabel = customer.deliveryType === 'address' ? 'Адрес' : 'Номер ПВЗ';

    let telegramInfo = '';
    if (customer.telegramUsername) {
      telegramInfo = `\n💬 <b>Telegram:</b> @${customer.telegramUsername}`;
    } else if (customer.telegramFirstName || customer.telegramLastName) {
      const tgName = [customer.telegramFirstName, customer.telegramLastName]
        .filter(Boolean)
        .join(' ');
      telegramInfo = `\n💬 <b>Telegram:</b> ${tgName}`;
    }
    if (customer.telegramId) {
      telegramInfo += ` (ID: ${customer.telegramId})`;
    }

    const adminMessage = `🛒 <b>НОВЫЙ ЗАКАЗ #${order.orderNumber}</b>

👤 <b>ФИО:</b> ${customer.fullName}
📱 <b>Телефон:</b> ${customer.phone}${telegramInfo}
🚚 <b>Доставка:</b> ${deliveryLabel}
<b>${deliveryDetailsLabel}:</b> ${customer.deliveryDetails}

📦 <b>Товары:</b>
${itemsList}

💰 <b>Итого:</b> ${total.toLocaleString('ru-RU')} ₽`;

    const customerMessage = `✅ <b>Ваш заказ принят!</b>

🔢 <b>Номер заказа:</b> #${order.orderNumber}

📦 <b>Товары:</b>
${itemsList}

💰 <b>Итого:</b> ${total.toLocaleString('ru-RU')} ₽

🚚 <b>Доставка:</b> ${deliveryLabel}
<b>${deliveryDetailsLabel}:</b> ${customer.deliveryDetails}

Спасибо за заказ! Мы свяжемся с вами в ближайшее время.`;

    await sendTelegramMessage(adminMessage, CHAT_ID!);

    if (customer.telegramId) {
      try {
        await sendTelegramMessage(customerMessage, customer.telegramId);
      } catch (error) {
        logger.error('Failed to send message to customer:', error);
      }
    }

    res.json({
      success: true,
      message: 'Order sent successfully',
      orderNumber: order.orderNumber,
      orderId: order.id,
    });
  } catch (error: any) {
    logger.error('Error sending order:', error);
    res.status(500).json({ error: 'Failed to send order', details: error.message });
  }
});

app.get('/api/order/:orderNumber', async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;
    const order = await getOrderByNumber(orderNumber);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      success: true,
      order: {
        orderNumber: order.orderNumber,
        fullName: order.fullName,
        phone: order.phone,
        deliveryType: order.deliveryType,
        deliveryDetails: order.deliveryDetails,
        items: order.items,
        total: order.total,
        createdAt: order.createdAt,
        status: order.status,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order', details: error.message });
  }
});

app.get('/api/orders', authenticateToken, apiLimiter, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const orders = await getAllOrders(limit);

    res.json({
      success: true,
      count: orders.length,
      orders: orders.map(order => ({
        id: order.id,
        order_number: order.orderNumber,
        customer_name: order.fullName,
        customer_phone: order.phone,
        delivery_type: order.deliveryType,
        delivery_details: order.deliveryDetails,
        items: order.items,
        total_amount: order.total,
        telegram_username: order.telegramUsername,
        telegram_id: order.telegramId,
        telegram_first_name: order.telegramFirstName,
        telegram_last_name: order.telegramLastName,
        created_at: order.createdAt,
        updated_at: order.createdAt,
        status: order.status,
      })),
    });
  } catch (error: any) {
    logger.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
  }
});

app.get('/api/orders/:id', authenticateToken, apiLimiter, async (req: Request, res: Response) => {
  try {
    const order = await getOrderById(parseInt(req.params.id));
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.orderNumber,
        customer_name: order.fullName,
        customer_phone: order.phone,
        delivery_type: order.deliveryType,
        delivery_details: order.deliveryDetails,
        items: order.items,
        total_amount: order.total,
        telegram_username: order.telegramUsername,
        telegram_id: order.telegramId,
        telegram_first_name: order.telegramFirstName,
        telegram_last_name: order.telegramLastName,
        created_at: order.createdAt,
        updated_at: order.createdAt,
        status: order.status,
      },
    });
  } catch (error) {
    logger.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

app.patch('/api/orders/:id', authenticateToken, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const order = await updateOrderStatus(parseInt(req.params.id), status);

    res.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.orderNumber,
        customer_name: order.fullName,
        customer_phone: order.phone,
        delivery_type: order.deliveryType,
        delivery_details: order.deliveryDetails,
        items: order.items,
        total_amount: order.total,
        telegram_username: order.telegramUsername,
        telegram_id: order.telegramId,
        telegram_first_name: order.telegramFirstName,
        telegram_last_name: order.telegramLastName,
        created_at: order.createdAt,
        updated_at: order.createdAt,
        status: order.status,
      },
    });
  } catch (error) {
    logger.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

app.delete(
  '/api/orders/:id',
  authenticateToken,
  apiLimiter,
  async (req: Request, res: Response) => {
    try {
      await deleteOrder(parseInt(req.params.id));
      res.json({ success: true, message: 'Order deleted successfully' });
    } catch (error: any) {
      logger.error('Error deleting order:', error);
      if (error.message === 'Order not found') {
        res.status(404).json({ error: 'Order not found' });
      } else {
        res.status(500).json({ error: 'Failed to delete order', details: error.message });
      }
    }
  }
);

// Categories API
app.get('/api/categories', async (req: Request, res: Response) => {
  try {
    const categories = await getAllCategories();
    res.json({ success: true, categories });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/admin/categories', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, emoji, icon } = req.body;
    const iconValue = emoji || icon;
    const category = await createCategory(name, iconValue);
    res.json({ success: true, category });
  } catch (error) {
    logger.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.put('/api/admin/categories/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, emoji, icon } = req.body;
    const iconValue = emoji || icon;
    const category = await updateCategory(parseInt(id), name, iconValue);
    res.json({ success: true, category });
  } catch (error) {
    logger.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/admin/categories/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteCategory(parseInt(id));
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error deleting category:', error);
    if (error.message.includes('Cannot delete category')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete category' });
    }
  }
});

// Products API
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    const products = await getAllProducts();
    res.json({ success: true, products });
  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await getProductById(parseInt(id));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (error) {
    logger.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/api/admin/products', authenticateToken, async (req: Request, res: Response) => {
  try {
    const product = await createProduct(req.body);
    res.json({ success: true, product });
  } catch (error) {
    logger.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/admin/products/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await updateProduct(parseInt(id), req.body);
    res.json({ success: true, product });
  } catch (error) {
    logger.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/admin/products/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteProduct(parseInt(id));
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Settings API
app.get('/api/admin/settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const settings = await getAllSettings();

    const settingsForDisplay = settings.map((setting: any) => {
      if (setting.type === 'secret' && setting.displayValue) {
        return {
          ...setting,
          value: setting.displayValue,
        };
      }
      return setting;
    });

    res.json({ success: true, settings: settingsForDisplay });
  } catch (error) {
    logger.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.get(
  '/api/admin/settings/category/:category',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      const settings = await getSettingsByCategory(category);

      const settingsForDisplay = settings.map((setting: any) => {
        if (setting.type === 'secret' && setting.displayValue) {
          return {
            ...setting,
            value: setting.displayValue,
          };
        }
        return setting;
      });

      res.json({ success: true, settings: settingsForDisplay });
    } catch (error) {
      logger.error('Error fetching settings by category:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }
);

app.get('/api/admin/settings/:key', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const setting = await getSetting(key);

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    if (setting.type === 'secret') {
      (setting as any).displayValue = '••••' + setting.value.slice(-4);
      setting.value = (setting as any).displayValue;
    }

    res.json({ success: true, setting });
  } catch (error) {
    logger.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

app.put('/api/admin/settings/:key', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'Value is required' });
    }

    const updated = await updateSetting(key, value);
    res.json({ success: true, setting: updated });
  } catch (error: any) {
    logger.error('Error updating setting:', error);
    res.status(500).json({ error: error.message || 'Failed to update setting' });
  }
});

app.put('/api/admin/settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;

    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'Settings must be an array' });
    }

    const results = await updateSettings(settings);
    const allSuccess = results.every((r: any) => r.success);

    res.json({
      success: allSuccess,
      results,
      message: allSuccess ? 'All settings updated successfully' : 'Some settings failed to update',
    });
  } catch (error) {
    logger.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Shops API
app.get('/api/shops/check/:subdomain', async (req: Request, res: Response) => {
  try {
    const { subdomain } = req.params;

    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return res.json({
        available: false,
        error: 'Поддомен может содержать только буквы, цифры и дефис',
      });
    }

    if (subdomain.length < 3 || subdomain.length > 20) {
      return res.json({
        available: false,
        error: 'Поддомен должен содержать от 3 до 20 символов',
      });
    }

    const reserved = ['www', 'api', 'admin', 'seed', 'deva', 'mail', 'ftp', 'smtp'];
    if (reserved.includes(subdomain.toLowerCase())) {
      return res.json({
        available: false,
        error: 'Этот поддомен зарезервирован системой',
      });
    }

    const dbAvailable = await isSubdomainAvailable(subdomain);

    res.json({ available: dbAvailable });
  } catch (error) {
    logger.error('Error checking subdomain:', error);
    res.status(500).json({ error: 'Ошибка проверки поддомена' });
  }
});

app.post('/api/shops/register', async (req: Request, res: Response) => {
  try {
    const { subdomain, ownerName, ownerEmail, ownerPhone, botToken, chatId, adminTelegramId } =
      req.body;

    if (!subdomain || !ownerName || !ownerEmail || !botToken || !chatId || !adminTelegramId) {
      return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
    }

    const available = await isSubdomainAvailable(subdomain);
    if (!available) {
      return res.status(400).json({ error: 'Этот поддомен уже занят' });
    }

    const dnsResult = await createShopDNS(subdomain);
    if (!dnsResult.success) {
      return res.status(400).json({ error: dnsResult.error || 'Не удалось создать DNS запись' });
    }

    const shop = await createShop({
      subdomain,
      ownerName,
      ownerEmail,
      ownerPhone,
      botToken,
      chatId,
      adminTelegramId,
      status: 'active',
      plan: 'free',
    });

    res.json({
      success: true,
      shop: {
        id: shop.id,
        subdomain: shop.subdomain,
        url: `https://${shop.subdomain}.x-bro.com`,
        status: shop.status,
      },
      message: `Магазин успешно создан! Он будет доступен через 2-3 минуты по адресу: https://${shop.subdomain}.x-bro.com`,
    });
  } catch (error: any) {
    logger.error('Error registering shop:', error);
    res.status(500).json({ error: error.message || 'Ошибка создания магазина' });
  }
});

app.get('/api/admin/shops', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status, orderBy, order } = req.query;
    const shops = await getAllShops({ status, orderBy, order });

    const shopsForDisplay = shops.map(shop => ({
      ...shop,
      botToken: undefined,
      botTokenMasked: shop.botTokenMasked,
    }));

    res.json({ success: true, shops: shopsForDisplay });
  } catch (error) {
    logger.error('Error getting shops:', error);
    res.status(500).json({ error: 'Ошибка получения списка магазинов' });
  }
});

app.get('/api/admin/shops/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const shop = await getShopById(parseInt(id));

    if (!shop) {
      return res.status(404).json({ error: 'Магазин не найден' });
    }

    res.json({ success: true, shop });
  } catch (error) {
    logger.error('Error getting shop:', error);
    res.status(500).json({ error: 'Ошибка получения магазина' });
  }
});

app.put('/api/admin/shops/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const shop = await updateShop(parseInt(id), updates);

    res.json({ success: true, shop });
  } catch (error: any) {
    logger.error('Error updating shop:', error);
    res.status(500).json({ error: error.message || 'Ошибка обновления магазина' });
  }
});

app.put('/api/admin/shops/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Статус обязателен' });
    }

    const shop = await updateShopStatus(parseInt(id), status);

    res.json({ success: true, shop });
  } catch (error: any) {
    logger.error('Error updating shop status:', error);
    res.status(500).json({ error: error.message || 'Ошибка обновления статуса' });
  }
});

app.delete('/api/admin/shops/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const shop = await getShopById(parseInt(id));
    if (!shop) {
      return res.status(404).json({ error: 'Магазин не найден' });
    }

    await deleteShopDNS(shop.subdomain);

    await deleteShop(parseInt(id));

    res.json({ success: true, message: 'Магазин успешно удалён' });
  } catch (error: any) {
    logger.error('Error deleting shop:', error);
    res.status(500).json({ error: error.message || 'Ошибка удаления магазина' });
  }
});

// Storefront router (SEO endpoints: robots.txt, sitemap.xml - MUST be BEFORE express.static)
app.use((req: Request, res: Response, next: NextFunction) => {
  if ((req as any).context && (req as any).context.tenant) {
    return storefrontRouter(req, res, next);
  }
  next();
});

// Static files (admin SPA) - MUST be AFTER storefront router
app.use(express.static('dist'));

// SPA fallback
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Initialize settings
(async () => {
  try {
    await initializeSettings();
  } catch (error) {
    logger.error('Failed to initialize settings:', error);
  }
})();

// Start server
const server = app.listen(PORT, () => {
  logger.info(`✅ Server running on port ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
  logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
function gracefulShutdown(signal: string) {
  logger.info(`⚠️  Received ${signal}, starting graceful shutdown...`);

  server.close(() => {
    logger.info('✅ HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', error => {
  logger.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
