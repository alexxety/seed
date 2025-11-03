/**
 * TENANT ADMIN DATABASE FUNCTIONS
 *
 * All functions use req.db for tenant isolation.
 * Admin can only access data within their tenant schema.
 */

import { PrismaClient } from '@prisma/client';

// ============================================================================
// PRODUCTS MANAGEMENT
// ============================================================================

export async function getAllProductsForAdmin(db: PrismaClient) {
  const result = await db.$queryRaw<any[]>`
    SELECT
      p.id::text,
      p.name,
      p.description,
      p.vendor,
      p.category,
      p.tags,
      p.is_active,
      p.created_at,
      p.updated_at,
      COUNT(pv.id)::integer as variants_count
    FROM products p
    LEFT JOIN product_variants pv ON pv.product_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;

  return result;
}

export async function getProductByIdForAdmin(db: PrismaClient, productId: string) {
  const result = await db.$queryRaw<any[]>`
    SELECT
      p.id::text,
      p.name,
      p.description,
      p.vendor,
      p.category,
      p.tags,
      p.is_active,
      p.created_at,
      p.updated_at,
      json_agg(
        json_build_object(
          'id', pv.id::text,
          'sku', pv.sku,
          'title', pv.title,
          'option1', pv.option1,
          'option2', pv.option2,
          'option3', pv.option3,
          'image_url', pv.image_url,
          'position', pv.position,
          'is_active', pv.is_active,
          'price', pr.amount,
          'currency', pr.currency,
          'compare_at_amount', pr.compare_at_amount,
          'inventory', inv.quantity
        ) ORDER BY pv.position
      ) FILTER (WHERE pv.id IS NOT NULL) as variants
    FROM products p
    LEFT JOIN product_variants pv ON pv.product_id = p.id
    LEFT JOIN prices pr ON pr.variant_id = pv.id AND pr.is_active = true
    LEFT JOIN inventory inv ON inv.variant_id = pv.id
    WHERE p.id = ${productId}::uuid
    GROUP BY p.id
  `;

  return result[0] || null;
}

interface CreateProductInput {
  name: string;
  description?: string;
  vendor?: string;
  category?: string;
  tags?: string[];
  is_active?: boolean;
}

export async function createProduct(db: PrismaClient, input: CreateProductInput) {
  const result = await db.$queryRaw<any[]>`
    INSERT INTO products (name, description, vendor, category, tags, is_active)
    VALUES (
      ${input.name},
      ${input.description || null},
      ${input.vendor || 'Default Vendor'},
      ${input.category || 'General'},
      ${input.tags || []}::text[],
      ${input.is_active !== false}
    )
    RETURNING id::text, name, description, vendor, category, tags, is_active, created_at, updated_at
  `;

  return result[0];
}

interface UpdateProductInput {
  name?: string;
  description?: string;
  vendor?: string;
  category?: string;
  tags?: string[];
  is_active?: boolean;
}

export async function updateProduct(
  db: PrismaClient,
  productId: string,
  input: UpdateProductInput
) {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(input.description);
  }
  if (input.vendor !== undefined) {
    updates.push(`vendor = $${paramIndex++}`);
    values.push(input.vendor);
  }
  if (input.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    values.push(input.category);
  }
  if (input.tags !== undefined) {
    updates.push(`tags = $${paramIndex++}::text[]`);
    values.push(input.tags);
  }
  if (input.is_active !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(input.is_active);
  }

  updates.push('updated_at = NOW()');

  if (updates.length === 1) {
    // Only updated_at changed, nothing to do
    return await getProductByIdForAdmin(db, productId);
  }

  values.push(productId);

  const result = await db.$queryRawUnsafe(
    `
    UPDATE products
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}::uuid
    RETURNING id::text, name, description, vendor, category, tags, is_active, created_at, updated_at
  `,
    ...values
  );

  return (result as any[])[0] || null;
}

export async function deleteProduct(db: PrismaClient, productId: string) {
  await db.$queryRaw`
    DELETE FROM products WHERE id = ${productId}::uuid
  `;
  return { success: true };
}

// ============================================================================
// ORDERS MANAGEMENT
// ============================================================================

export async function getAllOrdersForAdmin(db: PrismaClient, limit: number = 50) {
  const result = await db.$queryRaw<any[]>`
    SELECT
      o.id::text,
      o.order_number,
      o.total,
      o.currency,
      o.status,
      o.paid,
      o.paid_at,
      o.delivery_type,
      o.created_at,
      o.updated_at,
      json_build_object(
        'id', c.id::text,
        'email', c.email,
        'phone', c.phone,
        'full_name', c.full_name,
        'telegram_id', c.telegram_id,
        'telegram_username', c.telegram_username
      ) as customer
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    ORDER BY o.created_at DESC
    LIMIT ${limit}
  `;

  return result;
}

export async function getOrderByIdForAdmin(db: PrismaClient, orderId: string) {
  const result = await db.$queryRaw<any[]>`
    SELECT
      o.id::text,
      o.order_number,
      o.total,
      o.currency,
      o.status,
      o.paid,
      o.paid_at,
      o.delivery_type,
      o.delivery_details,
      o.metadata,
      o.created_at,
      o.updated_at,
      json_build_object(
        'id', c.id::text,
        'email', c.email,
        'phone', c.phone,
        'full_name', c.full_name,
        'telegram_id', c.telegram_id,
        'telegram_username', c.telegram_username
      ) as customer,
      (
        SELECT json_agg(
          json_build_object(
            'id', oi.id::text,
            'product_name', oi.product_name,
            'variant_title', oi.variant_title,
            'quantity', oi.quantity,
            'price', oi.price,
            'total', oi.total
          )
        )
        FROM order_items oi
        WHERE oi.order_id = o.id
      ) as items
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.id = ${orderId}::uuid
  `;

  return result[0] || null;
}

export async function updateOrderStatus(
  db: PrismaClient,
  orderId: string,
  status: string,
  paid?: boolean
) {
  const result = await db.$queryRaw<any[]>`
    UPDATE orders
    SET
      status = ${status},
      paid = COALESCE(${paid}, paid),
      paid_at = CASE WHEN ${paid} = true AND paid_at IS NULL THEN NOW() ELSE paid_at END,
      updated_at = NOW()
    WHERE id = ${orderId}::uuid
    RETURNING id::text, order_number, status, paid, paid_at, updated_at
  `;

  return result[0] || null;
}

// ============================================================================
// STORE SETTINGS
// ============================================================================

export async function getStoreSettingsForAdmin(db: PrismaClient) {
  const result = await db.$queryRaw<any[]>`
    SELECT * FROM store_settings LIMIT 1
  `;

  return result[0] || null;
}

export async function updateStoreSettings(
  db: PrismaClient,
  settings: {
    title?: string;
    brand_color?: string;
    logo_path?: string;
    currency?: string;
  }
) {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (settings.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(settings.title);
  }
  if (settings.brand_color !== undefined) {
    updates.push(`brand_color = $${paramIndex++}`);
    values.push(settings.brand_color);
  }
  if (settings.logo_path !== undefined) {
    updates.push(`logo_path = $${paramIndex++}`);
    values.push(settings.logo_path);
  }
  if (settings.currency !== undefined) {
    updates.push(`currency = $${paramIndex++}`);
    values.push(settings.currency);
  }

  updates.push('updated_at = NOW()');

  const result = await db.$queryRawUnsafe(
    `
    UPDATE store_settings
    SET ${updates.join(', ')}
    RETURNING *
  `,
    ...values
  );

  return (result as any[])[0] || null;
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

export async function getDashboardStats(db: PrismaClient) {
  const productsCount = await db.$queryRaw<any[]>`
    SELECT COUNT(*) as count FROM products WHERE is_active = true
  `;

  const ordersCount = await db.$queryRaw<any[]>`
    SELECT COUNT(*) as count FROM orders
  `;

  const customersCount = await db.$queryRaw<any[]>`
    SELECT COUNT(*) as count FROM customers
  `;

  const revenueStats = await db.$queryRaw<any[]>`
    SELECT
      COALESCE(SUM(total), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN paid = true THEN total ELSE 0 END), 0) as paid_revenue,
      COALESCE(COUNT(CASE WHEN paid = true THEN 1 END), 0) as paid_orders_count
    FROM orders
  `;

  return {
    products: Number(productsCount[0].count),
    orders: Number(ordersCount[0].count),
    customers: Number(customersCount[0].count),
    revenue: {
      total: Number(revenueStats[0].total_revenue),
      paid: Number(revenueStats[0].paid_revenue),
      paidOrdersCount: Number(revenueStats[0].paid_orders_count),
    },
  };
}
