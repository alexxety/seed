const Database = require('better-sqlite3');
const path = require('path');

// Создаем или открываем базу данных
const db = new Database(path.join(__dirname, 'orders.db'));

// Создаем таблицу категорий
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Создаем таблицу товаров
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    image TEXT NOT NULL,
    description TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )
`);

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
    telegram_username TEXT,
    telegram_id INTEGER,
    telegram_first_name TEXT,
    telegram_last_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'new'
  )
`);

// Создаем таблицу для счетчика заказов
db.exec(`
  CREATE TABLE IF NOT EXISTS order_counter (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    counter INTEGER NOT NULL DEFAULT 0
  )
`);

// Инициализируем счетчик если его нет
const counterExists = db.prepare('SELECT counter FROM order_counter WHERE id = 1').get();
if (!counterExists) {
  // Находим максимальный номер среди существующих заказов
  const allOrders = db.prepare('SELECT order_number FROM orders').all();
  let maxNumber = 0;
  if (allOrders && allOrders.length > 0) {
    for (const order of allOrders) {
      const orderNum = parseInt(order.order_number.split('-')[1]);
      if (orderNum > maxNumber) {
        maxNumber = orderNum;
      }
    }
  }
  db.prepare('INSERT INTO order_counter (id, counter) VALUES (1, ?)').run(maxNumber);
}

// Функция для создания номера заказа
function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const todayPrefix = `${year}${month}${day}`;

  // Получаем текущий счетчик и увеличиваем его
  const updateStmt = db.prepare('UPDATE order_counter SET counter = counter + 1 WHERE id = 1');
  updateStmt.run();

  const counterRow = db.prepare('SELECT counter FROM order_counter WHERE id = 1').get();
  const orderCount = counterRow.counter;

  // Формат: YYYYMMDD-NNNN где NNNN - сквозной номер по всем заказам
  const orderNumber = `${todayPrefix}-${String(orderCount).padStart(4, '0')}`;

  return orderNumber;
}

// Функция для создания нового заказа
function createOrder(customer, items, total) {
  const orderNumber = generateOrderNumber();

  const stmt = db.prepare(`
    INSERT INTO orders (
      order_number, full_name, phone, delivery_type, delivery_details, items, total,
      telegram_username, telegram_id, telegram_first_name, telegram_last_name
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    orderNumber,
    customer.fullName,
    customer.phone,
    customer.deliveryType,
    customer.deliveryDetails,
    JSON.stringify(items),
    total,
    customer.telegramUsername || null,
    customer.telegramId || null,
    customer.telegramFirstName || null,
    customer.telegramLastName || null
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

// ==================== КАТЕГОРИИ ====================

function getAllCategories() {
  const stmt = db.prepare('SELECT * FROM categories ORDER BY id');
  return stmt.all();
}

function createCategory(name, icon) {
  const stmt = db.prepare('INSERT INTO categories (name, icon) VALUES (?, ?)');
  const result = stmt.run(name, icon);
  return { id: result.lastInsertRowid, name, icon };
}

function updateCategory(id, name, icon) {
  const stmt = db.prepare('UPDATE categories SET name = ?, icon = ? WHERE id = ?');
  stmt.run(name, icon, id);
  return { id, name, icon };
}

function deleteCategory(id) {
  // Проверяем, есть ли товары в этой категории
  const checkStmt = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ? AND is_active = 1');
  const result = checkStmt.get(id);

  if (result.count > 0) {
    throw new Error(`Cannot delete category with ${result.count} products. Please move or delete products first.`);
  }

  const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
  stmt.run(id);
}

// ==================== ТОВАРЫ ====================

function getAllProducts() {
  const stmt = db.prepare(`
    SELECT p.*, c.name as category_name, c.icon as category_icon
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
    ORDER BY p.id
  `);
  const products = stmt.all();
  // Переименовываем category_id в category для совместимости с фронтендом
  return products.map(p => ({
    ...p,
    category: p.category_id
  }));
}

function getProductById(id) {
  const stmt = db.prepare('SELECT * FROM products WHERE id = ?');
  return stmt.get(id);
}

function createProduct(product) {
  const stmt = db.prepare(`
    INSERT INTO products (name, price, category_id, image, description)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    product.name,
    product.price,
    product.category_id,
    product.image,
    product.description
  );
  return { id: result.lastInsertRowid, ...product };
}

function updateProduct(id, product) {
  const stmt = db.prepare(`
    UPDATE products
    SET name = ?, price = ?, category_id = ?, image = ?, description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(
    product.name,
    product.price,
    product.category_id,
    product.image,
    product.description,
    id
  );
  return { id, ...product };
}

function deleteProduct(id) {
  // Мягкое удаление - просто помечаем как неактивный
  const stmt = db.prepare('UPDATE products SET is_active = 0 WHERE id = ?');
  stmt.run(id);
}

function updateOrderStatus(id, status) {
  const validStatuses = ['new', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid order status');
  }

  const stmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
  stmt.run(status, id);

  return getOrderById(id);
}

function deleteOrder(id) {
  // Удаляем заказ (items хранятся в JSON внутри orders, отдельной таблицы нет)
  const deleteOrderStmt = db.prepare('DELETE FROM orders WHERE id = ?');
  const result = deleteOrderStmt.run(id);

  if (result.changes === 0) {
    throw new Error('Order not found');
  }

  return { success: true };
}

module.exports = {
  db,
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
  deleteProduct
};
