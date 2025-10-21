const Database = require('better-sqlite3');
const path = require('path');

// Создаем или открываем базу данных
const db = new Database(path.join(__dirname, 'orders.db'));

// Создаем таблицу заказов, если её нет
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    delivery_type TEXT NOT NULL,
    delivery_details TEXT NOT NULL,
    items TEXT NOT NULL,
    total INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'new'
  )
`);

// Функция для создания номера заказа
function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const todayPrefix = `${year}${month}${day}`;

  // Получаем общее количество ВСЕХ заказов (сквозная нумерация)
  const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get();
  const orderCount = totalOrders.count + 1;

  // Формат: YYYYMMDD-NNNN где NNNN - сквозной номер по всем заказам
  const orderNumber = `${todayPrefix}-${String(orderCount).padStart(4, '0')}`;

  return orderNumber;
}

// Функция для создания нового заказа
function createOrder(customer, items, total) {
  const orderNumber = generateOrderNumber();

  const stmt = db.prepare(`
    INSERT INTO orders (order_number, full_name, phone, delivery_type, delivery_details, items, total)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    orderNumber,
    customer.fullName,
    customer.phone,
    customer.deliveryType,
    customer.deliveryDetails,
    JSON.stringify(items),
    total
  );

  return {
    id: result.lastInsertRowid,
    orderNumber
  };
}

// Функция для получения заказа по номеру
function getOrderByNumber(orderNumber) {
  const stmt = db.prepare('SELECT * FROM orders WHERE order_number = ?');
  const order = stmt.get(orderNumber);

  if (order) {
    order.items = JSON.parse(order.items);
  }

  return order;
}

// Функция для получения заказа по ID
function getOrderById(id) {
  const stmt = db.prepare('SELECT * FROM orders WHERE id = ?');
  const order = stmt.get(id);

  if (order) {
    order.items = JSON.parse(order.items);
  }

  return order;
}

// Функция для получения всех заказов
function getAllOrders(limit = 100) {
  const stmt = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?');
  const orders = stmt.all(limit);

  return orders.map(order => {
    order.items = JSON.parse(order.items);
    return order;
  });
}

module.exports = {
  db,
  createOrder,
  getOrderByNumber,
  getOrderById,
  getAllOrders
};
