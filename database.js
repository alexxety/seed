// Database layer using Prisma ORM with PostgreSQL
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
};
