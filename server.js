const express = require('express');
const https = require('https');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { createOrder, getOrderByNumber, getOrderById, getAllOrders } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_TOKEN = '8437447234:AAFTwhCAl7kgRPy8NVmxGBdhiZCWTypPxZY';
const CHAT_ID = '-4869379501';

// JWT Secret - в продакшене должен быть в переменных окружения
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-2025';

// Admin credentials (в продакшене лучше хранить в БД с bcrypt)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('seed2025', 10);

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
app.use(express.static('dist'));

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

function sendTelegramMessage(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: CHAT_ID,
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
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Требуется логин и пароль' });
    }

    // Проверяем учетные данные
    if (username !== ADMIN_USERNAME) {
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
    const order = createOrder(customer, items, total);

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

    const message = `🛒 <b>НОВЫЙ ЗАКАЗ #${order.orderNumber}</b>

👤 <b>ФИО:</b> ${customer.fullName}
📱 <b>Телефон:</b> ${customer.phone}${telegramInfo}
🚚 <b>Доставка:</b> ${deliveryLabel}
<b>${deliveryDetailsLabel}:</b> ${customer.deliveryDetails}

📦 <b>Товары:</b>
${itemsList}

💰 <b>Итого:</b> ${total.toLocaleString('ru-RU')} ₽`;

    await sendTelegramMessage(message);

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
app.get('/api/order/:orderNumber', (req, res) => {
  try {
    const { orderNumber } = req.params;
    const order = getOrderByNumber(orderNumber);

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
app.get('/api/orders', authenticateToken, apiLimiter, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const orders = getAllOrders(limit);

    res.json({
      success: true,
      count: orders.length,
      orders: orders.map(order => ({
        id: order.id,
        orderNumber: order.order_number,
        fullName: order.full_name,
        phone: order.phone,
        deliveryType: order.delivery_type,
        deliveryDetails: order.delivery_details,
        items: order.items,
        total: order.total,
        createdAt: order.created_at,
        status: order.status
      }))
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
  }
});

// Статические файлы обслуживаются nginx, поэтому этот роут не нужен
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'dist', 'index.html'));
// });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
