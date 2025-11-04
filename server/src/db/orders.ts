import { PrismaClient } from '@prisma/client';

/**
 * Generate unique order number in format: YYYYMMDD-NNNN
 */
async function generateOrderNumber(db: PrismaClient): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const todayPrefix = `${year}${month}${day}`;

  let counter = await db.orderCounter.findUnique({
    where: { id: 1 },
  });

  if (!counter) {
    counter = await db.orderCounter.create({
      data: { id: 1, counter: 0 },
    });
  }

  counter = await db.orderCounter.update({
    where: { id: 1 },
    data: { counter: { increment: 1 } },
  });

  const orderNumber = `${todayPrefix}-${String(counter.counter).padStart(4, '0')}`;
  return orderNumber;
}

/**
 * Create new order (tenant-scoped)
 */
export async function createOrder(db: PrismaClient, customer: any, items: any, total: number) {
  const orderNumber = await generateOrderNumber(db);

  const order = await db.order.create({
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

/**
 * Get order by order number
 */
export async function getOrderByNumber(db: PrismaClient, orderNumber: string) {
  return await db.order.findUnique({
    where: { orderNumber },
  });
}

/**
 * Get order by ID
 */
export async function getOrderById(db: PrismaClient, id: number) {
  return await db.order.findUnique({
    where: { id },
  });
}

/**
 * Get all orders with limit
 */
export async function getAllOrders(db: PrismaClient, limit = 100) {
  return await db.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Update order status
 */
export async function updateOrderStatus(db: PrismaClient, id: number, status: string) {
  const validStatuses = ['new', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid order status');
  }

  return await db.order.update({
    where: { id },
    data: { status },
  });
}

/**
 * Delete order
 */
export async function deleteOrder(db: PrismaClient, id: number) {
  await db.order.delete({
    where: { id },
  });
  return { success: true };
}
