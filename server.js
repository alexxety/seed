const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_TOKEN = '8437447234:AAFTwhCAl7kgRPy8NVmxGBdhiZCWTypPxZY';
const CHAT_ID = '-4869379501';

app.use(express.json());
app.use(express.static('dist'));

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

app.post('/api/send-order', async (req, res) => {
  try {
    const { customer, items, total } = req.body;

    if (!customer || !items || !total) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Формируем список товаров
    const itemsList = items.map(item =>
      `• ${item.name} - ${item.quantity} шт. × ${item.price} ₽ = ${(item.price * item.quantity).toLocaleString('ru-RU')} ₽`
    ).join('\n');

    const deliveryLabel = customer.deliveryType === 'address' ? '📍 По адресу' : '📦 СДЕК ПВЗ';
    const deliveryDetailsLabel = customer.deliveryType === 'address' ? 'Адрес' : 'Номер ПВЗ';

    const message = `🛒 <b>НОВЫЙ ЗАКАЗ!</b>

👤 <b>ФИО:</b> ${customer.fullName}
📱 <b>Телефон:</b> ${customer.phone}
🚚 <b>Доставка:</b> ${deliveryLabel}
<b>${deliveryDetailsLabel}:</b> ${customer.deliveryDetails}

📦 <b>Товары:</b>
${itemsList}

💰 <b>Итого:</b> ${total.toLocaleString('ru-RU')} ₽`;

    await sendTelegramMessage(message);

    res.json({ success: true, message: 'Order sent successfully' });
  } catch (error) {
    console.error('Error sending order:', error);
    res.status(500).json({ error: 'Failed to send order', details: error.message });
  }
});

// Статические файлы обслуживаются nginx, поэтому этот роут не нужен
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'dist', 'index.html'));
// });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
