// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const https = require('https');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const {
  createOrder, getOrderByNumber, getOrderById, getAllOrders, updateOrderStatus, deleteOrder,
  getAllCategories, createCategory, updateCategory, deleteCategory,
  getAllProducts, getProductById, createProduct, updateProduct, deleteProduct,
  getAllSettings, getSettingsByCategory, getSetting, getSettingValue, updateSetting, updateSettings, initializeSettings,
  createShop, getAllShops, getShopBySubdomain, getShopById, updateShop, updateShopStatus, deleteShop, isSubdomainAvailable
} = require('./database');

const { createShopDNS, deleteShopDNS, checkSubdomainAvailability } = require('./cloudflare-service');

// Multitenancy functions
const { createTenant, getAllTenants, getTenantBySlug, getTenantById, getAllTenantsAsShops } = require('./server/src/db/tenants.js');
const { setTenantContext, requireTenant } = require('./server/src/multitenancy/tenant-context.js');
const { attachTenantDB } = require('./server/src/multitenancy/middleware.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Telegram credentials - MUST be set via environment variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('ERROR: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in environment variables');
  process.exit(1);
}

// JWT Secret - MUST be set via environment variables
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('ERROR: JWT_SECRET must be set in environment variables');
  process.exit(1);
}

// Admin credentials (в продакшене лучше хранить в БД с bcrypt)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('seed2025', 10);

// SuperAdmin credentials (управление всеми магазинами)
const SUPERADMIN_USERNAME = 'superadmin';
const SUPERADMIN_PASSWORD_HASH = bcrypt.hashSync('super2025', 10);

// Rate limiting для защиты от брутфорса
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // максимум 5 попыток
  message: 'Слишком много попыток входа. Попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting для API
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 минута
  max: 100, // максимум 100 запросов
  standardHeaders: true,
  legacyHeaders: false,
});

// Trust proxy - nginx проксирует запросы
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.static('public')); // Для assets (логотипы и т.д.)

// Configure EJS for storefront views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'server/src/storefront/views'));

// Tenant context middleware (определяет tenant по поддомену/заголовку)
app.use(setTenantContext);
// Создаёт req.db с правильным search_path через транзакции
app.use(attachTenantDB);

// ===========================================
// HEALTH CHECK ENDPOINT
// ===========================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    port: PORT
  });
});

// Middleware для проверки JWT токена
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный или истёкший токен' });
    }
    req.user = user;
    next();
  });
}

function sendTelegramMessage(message, chatId = CHAT_ID) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
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

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// API endpoint для логина админа
app.post('/api/admin/login', loginLimiter, async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const login = email || username;

    if (!login || !password) {
      return res.status(400).json({ error: 'Требуется логин и пароль' });
    }

    // Проверяем учетные данные
    if (login !== ADMIN_USERNAME) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const isPasswordValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    // Создаем JWT токен с истечением через 1 час
    const token = jwt.sign(
      { username, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      token,
      expiresIn: 3600 // 1 час в секундах
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка авторизации' });
  }
});

// API endpoint для логина супер-админа
app.post('/api/superadmin/login', loginLimiter, async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const login = email || username;

    if (!login || !password) {
      return res.status(400).json({ error: 'Требуется логин и пароль' });
    }

    // Проверяем учетные данные супер-админа
    if (login !== SUPERADMIN_USERNAME) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const isPasswordValid = await bcrypt.compare(password, SUPERADMIN_PASSWORD_HASH);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    // Создаем JWT токен с истечением через 1 час
    const token = jwt.sign(
      { username: login, role: 'superadmin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      token,
      expiresIn: 3600 // 1 час в секундах
    });
  } catch (error) {
    console.error('SuperAdmin login error:', error);
    res.status(500).json({ error: 'Ошибка авторизации' });
  }
});

// ===========================================
// SUPERADMIN TENANT MANAGEMENT API
// ===========================================

// Получить список всех tenants
app.get('/api/superadmin/tenants', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const tenants = await getAllTenants();

    // Добавляем схему для каждого tenant
    const tenantsWithSchema = tenants.map(tenant => ({
      ...tenant,
      schema: `t_${tenant.id.replace(/-/g, '_')}`
    }));

    res.json({ success: true, tenants: tenantsWithSchema });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ error: 'Ошибка получения списка tenants' });
  }
});

// Создать новый tenant
app.post('/api/superadmin/tenants', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const { slug, name } = req.body;

    if (!slug) {
      return res.status(400).json({ error: 'slug обязателен' });
    }

    // Валидация slug (только буквы, цифры, дефис)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({
        error: 'slug должен содержать только строчные буквы, цифры и дефисы'
      });
    }

    const result = await createTenant(slug, name);

    res.json({
      success: true,
      tenant: result,
      message: `Tenant "${slug}" успешно создан`
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({
      error: 'Ошибка создания tenant',
      message: error.message
    });
  }
});

// Получить tenant по slug
app.get('/api/superadmin/tenants/:slug', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const { slug } = req.params;
    const tenant = await getTenantBySlug(slug);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant не найден' });
    }

    res.json({
      success: true,
      tenant: {
        ...tenant,
        schema: `t_${tenant.id.replace(/-/g, '_')}`
      }
    });
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({ error: 'Ошибка получения tenant' });
  }
});

// ===========================================
// SUPERADMIN SHOPS API (Legacy Compatibility)
// ===========================================

// Получить список магазинов (tenants в формате shops для совместимости с frontend)
app.get('/api/superadmin/shops', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const { status, orderBy, order } = req.query;
    const shops = await getAllTenantsAsShops({ status, orderBy, order });

    res.json({ success: true, shops });
  } catch (error) {
    console.error('Get shops error:', error);
    res.status(500).json({ error: 'Ошибка получения списка магазинов' });
  }
});

// API endpoint для проверки токена
app.get('/api/admin/verify', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// API endpoint для логаута (очистка токена на клиенте)
app.post('/api/admin/logout', authenticateToken, (req, res) => {
  // В JWT нельзя явно инвалидировать токен на сервере без blacklist,
  // но клиент удалит токен из localStorage
  res.json({ success: true, message: 'Выход выполнен успешно' });
});

app.post('/api/send-order', apiLimiter, async (req, res) => {
  try {
    const { customer, items, total } = req.body;

    if (!customer || !items || !total) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Сохраняем заказ в базу данных
    const order = await createOrder(customer, items, total);

    // Формируем список товаров
    const itemsList = items.map(item =>
      `• ${item.name} - ${item.quantity} шт. × ${item.price} ₽ = ${(item.price * item.quantity).toLocaleString('ru-RU')} ₽`
    ).join('\n');

    const deliveryLabel = customer.deliveryType === 'address' ? '📍 По адресу' : '📦 СДЕК ПВЗ';
    const deliveryDetailsLabel = customer.deliveryType === 'address' ? 'Адрес' : 'Номер ПВЗ';

    // Формируем информацию о Telegram пользователе
    let telegramInfo = '';
    if (customer.telegramUsername) {
      telegramInfo = `\n💬 <b>Telegram:</b> @${customer.telegramUsername}`;
    } else if (customer.telegramFirstName || customer.telegramLastName) {
      const tgName = [customer.telegramFirstName, customer.telegramLastName].filter(Boolean).join(' ');
      telegramInfo = `\n💬 <b>Telegram:</b> ${tgName}`;
    }
    if (customer.telegramId) {
      telegramInfo += ` (ID: ${customer.telegramId})`;
    }

    // Сообщение для админа в канал
    const adminMessage = `🛒 <b>НОВЫЙ ЗАКАЗ #${order.orderNumber}</b>

👤 <b>ФИО:</b> ${customer.fullName}
📱 <b>Телефон:</b> ${customer.phone}${telegramInfo}
🚚 <b>Доставка:</b> ${deliveryLabel}
<b>${deliveryDetailsLabel}:</b> ${customer.deliveryDetails}

📦 <b>Товары:</b>
${itemsList}

💰 <b>Итого:</b> ${total.toLocaleString('ru-RU')} ₽`;

    // Сообщение для клиента в личку
    const customerMessage = `✅ <b>Ваш заказ принят!</b>

🔢 <b>Номер заказа:</b> #${order.orderNumber}

📦 <b>Товары:</b>
${itemsList}

💰 <b>Итого:</b> ${total.toLocaleString('ru-RU')} ₽

🚚 <b>Доставка:</b> ${deliveryLabel}
<b>${deliveryDetailsLabel}:</b> ${customer.deliveryDetails}

Спасибо за заказ! Мы свяжемся с вами в ближайшее время.`;

    // Отправляем уведомление админу в канал
    await sendTelegramMessage(adminMessage, CHAT_ID);

    // Отправляем уведомление клиенту в личные сообщения (если есть telegramId)
    if (customer.telegramId) {
      try {
        await sendTelegramMessage(customerMessage, customer.telegramId);
      } catch (error) {
        console.error('Failed to send message to customer:', error);
        // Не прерываем выполнение, даже если не удалось отправить клиенту
      }
    }

    res.json({
      success: true,
      message: 'Order sent successfully',
      orderNumber: order.orderNumber,
      orderId: order.id
    });
  } catch (error) {
    console.error('Error sending order:', error);
    res.status(500).json({ error: 'Failed to send order', details: error.message });
  }
});

// API endpoint для получения информации о заказе
app.get('/api/order/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const order = await getOrderByNumber(orderNumber);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      success: true,
      order: {
        orderNumber: order.order_number,
        fullName: order.full_name,
        phone: order.phone,
        deliveryType: order.delivery_type,
        deliveryDetails: order.delivery_details,
        items: order.items,
        total: order.total,
        createdAt: order.created_at,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order', details: error.message });
  }
});

// API endpoint для получения всех заказов (с JWT аутентификацией)
app.get('/api/orders', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const orders = await getAllOrders(limit);

    res.json({
      success: true,
      count: orders.length,
      orders: orders.map(order => ({
        id: order.id,
        order_number: order.order_number,
        customer_name: order.full_name,
        customer_phone: order.phone,
        delivery_type: order.delivery_type,
        delivery_details: order.delivery_details,
        items: order.items,
        total_amount: order.total,
        telegram_username: order.telegram_username,
        telegram_id: order.telegram_id,
        telegram_first_name: order.telegram_first_name,
        telegram_last_name: order.telegram_last_name,
        created_at: order.created_at,
        updated_at: order.created_at,
        status: order.status
      }))
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
  }
});

// Получить конкретный заказ по ID
app.get('/api/orders/:id', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const order = await getOrderById(parseInt(req.params.id));
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        customer_name: order.full_name,
        customer_phone: order.phone,
        delivery_type: order.delivery_type,
        delivery_details: order.delivery_details,
        items: order.items,
        total_amount: order.total,
        telegram_username: order.telegram_username,
        telegram_id: order.telegram_id,
        telegram_first_name: order.telegram_first_name,
        telegram_last_name: order.telegram_last_name,
        created_at: order.created_at,
        updated_at: order.created_at,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order', details: error.message });
  }
});

// Обновить статус заказа
app.patch('/api/orders/:id', authenticateToken, apiLimiter, async (req, res) => {
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
        order_number: order.order_number,
        customer_name: order.full_name,
        customer_phone: order.phone,
        delivery_type: order.delivery_type,
        delivery_details: order.delivery_details,
        items: order.items,
        total_amount: order.total,
        telegram_username: order.telegram_username,
        telegram_id: order.telegram_id,
        telegram_first_name: order.telegram_first_name,
        telegram_last_name: order.telegram_last_name,
        created_at: order.created_at,
        updated_at: order.created_at,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status', details: error.message });
  }
});

// Удалить заказ
app.delete('/api/orders/:id', authenticateToken, apiLimiter, async (req, res) => {
  try {
    await deleteOrder(parseInt(req.params.id));
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    if (error.message === 'Order not found') {
      res.status(404).json({ error: 'Order not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete order', details: error.message });
    }
  }
});

// ==================== API ДЛЯ КАТЕГОРИЙ ====================

// Получить все категории (публичный endpoint)
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await getAllCategories();
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Создать категорию (только для админа)
app.post('/api/admin/categories', authenticateToken, async (req, res) => {
  try {
    const { name, emoji, icon } = req.body;
    const iconValue = emoji || icon; // Принимаем как emoji, так и icon
    const category = await createCategory(name, iconValue);
    res.json({ success: true, category });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Обновить категорию (только для админа)
app.put('/api/admin/categories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, emoji, icon } = req.body;
    const iconValue = emoji || icon; // Принимаем как emoji, так и icon
    const category = await updateCategory(parseInt(id), name, iconValue);
    res.json({ success: true, category });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Удалить категорию (только для админа)
app.delete('/api/admin/categories/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteCategory(parseInt(id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    if (error.message.includes('Cannot delete category')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete category' });
    }
  }
});

// ==================== API ДЛЯ ТОВАРОВ ====================

// Получить все товары (публичный endpoint)
app.get('/api/products', async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json({ success: true, products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Получить товар по ID (публичный endpoint)
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await getProductById(parseInt(id));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Создать товар (только для админа)
app.post('/api/admin/products', authenticateToken, async (req, res) => {
  try {
    const product = await createProduct(req.body);
    res.json({ success: true, product });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Обновить товар (только для админа)
app.put('/api/admin/products/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await updateProduct(parseInt(id), req.body);
    res.json({ success: true, product });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Удалить товар (только для админа)
app.delete('/api/admin/products/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteProduct(parseInt(id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ==================== SETTINGS API ====================

// Получить все настройки (только для админа)
app.get('/api/admin/settings', authenticateToken, async (req, res) => {
  try {
    const settings = await getAllSettings();

    // Для frontend возвращаем displayValue для секретов
    const settingsForDisplay = settings.map(setting => {
      if (setting.type === 'secret' && setting.displayValue) {
        return {
          ...setting,
          value: setting.displayValue // Показываем маскированное значение
        };
      }
      return setting;
    });

    res.json({ success: true, settings: settingsForDisplay });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Получить настройки по категории (только для админа)
app.get('/api/admin/settings/category/:category', authenticateToken, async (req, res) => {
  try {
    const { category } = req.params;
    const settings = await getSettingsByCategory(category);

    const settingsForDisplay = settings.map(setting => {
      if (setting.type === 'secret' && setting.displayValue) {
        return {
          ...setting,
          value: setting.displayValue
        };
      }
      return setting;
    });

    res.json({ success: true, settings: settingsForDisplay });
  } catch (error) {
    console.error('Error fetching settings by category:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Получить одну настройку по ключу (только для админа)
app.get('/api/admin/settings/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await getSetting(key);

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    // Для секретов показываем маскированное значение
    if (setting.type === 'secret') {
      setting.displayValue = '••••' + setting.value.slice(-4);
      setting.value = setting.displayValue;
    }

    res.json({ success: true, setting });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Обновить одну настройку (только для админа)
app.put('/api/admin/settings/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'Value is required' });
    }

    const updated = await updateSetting(key, value);
    res.json({ success: true, setting: updated });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: error.message || 'Failed to update setting' });
  }
});

// Обновить несколько настроек за раз (только для админа)
app.put('/api/admin/settings', authenticateToken, async (req, res) => {
  try {
    const { settings } = req.body;

    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'Settings must be an array' });
    }

    const results = await updateSettings(settings);
    const allSuccess = results.every(r => r.success);

    res.json({
      success: allSuccess,
      results,
      message: allSuccess ? 'All settings updated successfully' : 'Some settings failed to update'
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ==================== SHOPS API ====================

// Проверка доступности поддомена (публичный endpoint)
app.get('/api/shops/check/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;

    // Валидация поддомена
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return res.json({
        available: false,
        error: 'Поддомен может содержать только буквы, цифры и дефис'
      });
    }

    if (subdomain.length < 3 || subdomain.length > 20) {
      return res.json({
        available: false,
        error: 'Поддомен должен содержать от 3 до 20 символов'
      });
    }

    // Проверка зарезервированных поддоменов
    const reserved = ['www', 'api', 'admin', 'seed', 'deva', 'mail', 'ftp', 'smtp'];
    if (reserved.includes(subdomain.toLowerCase())) {
      return res.json({
        available: false,
        error: 'Этот поддомен зарезервирован системой'
      });
    }

    // Проверка в базе данных
    const dbAvailable = await isSubdomainAvailable(subdomain);

    res.json({ available: dbAvailable });
  } catch (error) {
    console.error('Error checking subdomain:', error);
    res.status(500).json({ error: 'Ошибка проверки поддомена' });
  }
});

// Регистрация нового магазина (публичный endpoint)
app.post('/api/shops/register', async (req, res) => {
  try {
    const { subdomain, ownerName, ownerEmail, ownerPhone, botToken, chatId, adminTelegramId } = req.body;

    // Валидация
    if (!subdomain || !ownerName || !ownerEmail || !botToken || !chatId || !adminTelegramId) {
      return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
    }

    // Проверка доступности поддомена
    const available = await isSubdomainAvailable(subdomain);
    if (!available) {
      return res.status(400).json({ error: 'Этот поддомен уже занят' });
    }

    // Создание DNS записи в Cloudflare
    const dnsResult = await createShopDNS(subdomain);
    if (!dnsResult.success) {
      return res.status(400).json({ error: dnsResult.error || 'Не удалось создать DNS запись' });
    }

    // Создание магазина в базе данных
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
      message: `Магазин успешно создан! Он будет доступен через 2-3 минуты по адресу: https://${shop.subdomain}.x-bro.com`
    });
  } catch (error) {
    console.error('Error registering shop:', error);
    res.status(500).json({ error: error.message || 'Ошибка создания магазина' });
  }
});

// Получить все магазины (только для супер-админа)
app.get('/api/admin/shops', authenticateToken, async (req, res) => {
  try {
    const { status, orderBy, order } = req.query;
    const shops = await getAllShops({ status, orderBy, order });

    // Маскируем токены для безопасности
    const shopsForDisplay = shops.map(shop => ({
      ...shop,
      botToken: undefined,
      botTokenMasked: shop.botTokenMasked,
    }));

    res.json({ success: true, shops: shopsForDisplay });
  } catch (error) {
    console.error('Error getting shops:', error);
    res.status(500).json({ error: 'Ошибка получения списка магазинов' });
  }
});

// Получить магазин по ID (только для супер-админа)
app.get('/api/admin/shops/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await getShopById(parseInt(id));

    if (!shop) {
      return res.status(404).json({ error: 'Магазин не найден' });
    }

    res.json({ success: true, shop });
  } catch (error) {
    console.error('Error getting shop:', error);
    res.status(500).json({ error: 'Ошибка получения магазина' });
  }
});

// Обновить магазин (только для супер-админа)
app.put('/api/admin/shops/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const shop = await updateShop(parseInt(id), updates);

    res.json({ success: true, shop });
  } catch (error) {
    console.error('Error updating shop:', error);
    res.status(500).json({ error: error.message || 'Ошибка обновления магазина' });
  }
});

// Изменить статус магазина (только для супер-админа)
app.put('/api/admin/shops/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Статус обязателен' });
    }

    const shop = await updateShopStatus(parseInt(id), status);

    res.json({ success: true, shop });
  } catch (error) {
    console.error('Error updating shop status:', error);
    res.status(500).json({ error: error.message || 'Ошибка обновления статуса' });
  }
});

// Удалить магазин (только для супер-админа)
app.delete('/api/admin/shops/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Получаем информацию о магазине
    const shop = await getShopById(parseInt(id));
    if (!shop) {
      return res.status(404).json({ error: 'Магазин не найден' });
    }

    // Удаляем DNS запись
    await deleteShopDNS(shop.subdomain);

    // Удаляем из базы данных
    await deleteShop(parseInt(id));

    res.json({ success: true, message: 'Магазин успешно удалён' });
  } catch (error) {
    console.error('Error deleting shop:', error);
    res.status(500).json({ error: error.message || 'Ошибка удаления магазина' });
  }
});

// ===========================================
// STOREFRONT (Tenant-aware shop pages)
// ===========================================
// Обслуживает публичную витрину магазина
// Использует req.tenantSlug и req.db (настроены middleware выше)
const storefrontRouter = require('./server/src/storefront/router');

// Применяем storefront только для tenant requests (не для admin/API)
app.use((req, res, next) => {
  // Пропускаем служебные URL
  if (req.path.startsWith('/api/') ||
      req.path.startsWith('/admin/') ||
      req.path.startsWith('/superadmin/') ||
      req.path.startsWith('/assets/')) {
    return next();
  }

  // Если есть tenant - обслуживаем через storefront
  if (req.context && req.context.tenant) {
    return storefrontRouter(req, res, next);
  }

  // Нет tenant - идём в SPA fallback
  next();
});

// Статика dist только для non-tenant requests (админка)
app.use(express.static('dist'));

// SPA fallback - все неизвестные маршруты возвращают index.html
// (только для запросов без tenant context - админка, главная и т.д.)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Initialize settings on startup
(async () => {
  try {
    await initializeSettings();
  } catch (error) {
    console.error('Failed to initialize settings:', error);
  }
})();

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown handler
function gracefulShutdown(signal) {
  console.log(`\n⚠️  Received ${signal}, starting graceful shutdown...`);

  server.close(() => {
    console.log('✅ HTTP server closed');

    // Close database connections
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
