/**
 * TENANT-SCOPED DATABASE FUNCTIONS (Standard-2025)
 *
 * All functions use req.db for tenant isolation.
 * Each tenant has isolated schema: t_{uuid}
 *
 * CRITICAL:
 * - NEVER use global prisma instance
 * - ALWAYS pass db: PrismaClient as first parameter
 * - search_path is already set by middleware
 */

import { PrismaClient } from '@prisma/client';

// ============================================================================
// STOREFRONT - PRODUCTS
// ============================================================================

export async function getStorefrontProducts(db: PrismaClient) {
  const result = await db.$queryRaw<any[]>`
    SELECT
      id, name, description, vendor, category, tags,
      is_active, created_at, updated_at
    FROM products
    WHERE is_active = true
    ORDER BY created_at DESC
  `;
  return result;
}

/**
 * Get all products with prices (legacy API format)
 * Returns products in old format for backward compatibility
 */
export async function getAllProductsWithPrices(db: PrismaClient) {
  const result = await db.$queryRaw<any[]>`
    SELECT
      p.id::text,
      p.name,
      p.description,
      p.category as category_name,
      p.category,
      pv.image_url as image,
      pr.amount as price,
      p.is_active,
      p.created_at,
      p.updated_at
    FROM products p
    INNER JOIN product_variants pv ON pv.product_id = p.id AND pv.position = 1
    INNER JOIN prices pr ON pr.variant_id = pv.id AND pr.is_active = true
    WHERE p.is_active = true
    ORDER BY p.created_at DESC
  `;

  return result;
}

export async function getProductBySlug(db: PrismaClient, slug: string) {
  // Note: current schema doesn't have slug field, using name as fallback
  const result = await db.$queryRaw<any[]>`
    SELECT
      p.id, p.name, p.description, p.vendor, p.category, p.tags,
      p.is_active, p.created_at, p.updated_at,
      json_agg(
        json_build_object(
          'id', pv.id,
          'sku', pv.sku,
          'title', pv.title,
          'option1', pv.option1,
          'option2', pv.option2,
          'option3', pv.option3,
          'image_url', pv.image_url,
          'position', pv.position,
          'is_active', pv.is_active
        ) ORDER BY pv.position
      ) FILTER (WHERE pv.id IS NOT NULL) as variants,
      json_agg(
        json_build_object(
          'id', pr.id,
          'variant_id', pr.variant_id,
          'amount', pr.amount,
          'currency', pr.currency
        ) ORDER BY pr.created_at
      ) FILTER (WHERE pr.id IS NOT NULL) as prices
    FROM products p
    LEFT JOIN product_variants pv ON pv.product_id = p.id
    LEFT JOIN prices pr ON pr.variant_id = pv.id
    WHERE p.name = ${slug} AND p.is_active = true
    GROUP BY p.id
  `;

  return result[0] || null;
}

// ============================================================================
// STOREFRONT - STORE SETTINGS
// ============================================================================

export async function getStoreSettings(db: PrismaClient) {
  const result = await db.$queryRaw<any[]>`
    SELECT * FROM store_settings LIMIT 1
  `;

  return result[0] || null;
}

// ============================================================================
// STOREFRONT - ORDERS
// ============================================================================

interface CreateOrderInput {
  orderNumber: string;
  customer: {
    email?: string;
    phone?: string;
    fullName?: string;
    telegramId?: string;
    telegramUsername?: string;
  };
  items: Array<{
    variantId?: string;
    productName: string;
    variantTitle?: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  currency?: string;
  deliveryType?: string;
  deliveryDetails?: string;
}

export async function createOrder(db: PrismaClient, input: CreateOrderInput) {
  return await db.$transaction(async (tx) => {
    // Find or create customer
    let customerId: string | null = null;

    if (input.customer.telegramId) {
      const existing = await tx.$queryRaw<any[]>`
        SELECT id FROM customers WHERE telegram_id = ${input.customer.telegramId} LIMIT 1
      `;
      if (existing.length > 0) {
        customerId = existing[0].id;
      }
    }

    if (!customerId && input.customer.phone) {
      const existing = await tx.$queryRaw<any[]>`
        SELECT id FROM customers WHERE phone = ${input.customer.phone} LIMIT 1
      `;
      if (existing.length > 0) {
        customerId = existing[0].id;
      }
    }

    if (!customerId) {
      const customerResult = await tx.$queryRaw<any[]>`
        INSERT INTO customers (
          email, phone, full_name, telegram_id, telegram_username
        )
        VALUES (
          ${input.customer.email || null},
          ${input.customer.phone || null},
          ${input.customer.fullName || null},
          ${input.customer.telegramId || null},
          ${input.customer.telegramUsername || null}
        )
        RETURNING id
      `;
      customerId = customerResult[0].id;
    }

    // Create order
    const orderResult = await tx.$queryRaw<any[]>`
      INSERT INTO orders (
        order_number, customer_id, total, currency, status,
        delivery_type, delivery_details, paid
      )
      VALUES (
        ${input.orderNumber},
        ${customerId}::uuid,
        ${input.total},
        ${input.currency || 'USD'},
        'pending',
        ${input.deliveryType || null},
        ${input.deliveryDetails || null},
        false
      )
      RETURNING id, order_number
    `;

    const order = orderResult[0];

    // Create order items
    for (const item of input.items) {
      await tx.$queryRaw`
        INSERT INTO order_items (
          order_id, variant_id, product_name, variant_title,
          quantity, price, total
        )
        VALUES (
          ${order.id}::uuid,
          ${item.variantId || null}::uuid,
          ${item.productName},
          ${item.variantTitle || null},
          ${item.quantity},
          ${item.price},
          ${item.price * item.quantity}
        )
      `;
    }

    return {
      id: order.id,
      orderNumber: order.order_number,
    };
  });
}

export async function getTenantOrderByNumber(db: PrismaClient, orderNumber: string) {
  const result = await db.$queryRaw<any[]>`
    SELECT
      o.id, o.order_number, o.total, o.currency, o.status,
      o.delivery_type, o.delivery_details, o.paid, o.paid_at,
      o.metadata, o.created_at, o.updated_at,
      json_build_object(
        'id', c.id,
        'email', c.email,
        'phone', c.phone,
        'full_name', c.full_name,
        'telegram_id', c.telegram_id,
        'telegram_username', c.telegram_username
      ) as customer,
      (
        SELECT json_agg(
          json_build_object(
            'id', oi.id,
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
    WHERE o.order_number = ${orderNumber}
  `;

  return result[0] || null;
}

// ============================================================================
// SEO
// ============================================================================

export async function getRobotsContent(db: PrismaClient, origin: string) {
  // Get tenant-specific robots.txt rules
  const settings = await getStoreSettings(db);

  return `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /superadmin/

Sitemap: ${origin}/sitemap.xml

# Store: ${settings?.title || 'Seed Shop'}
`;
}

export async function getSitemapUrls(db: PrismaClient, origin: string) {
  const products = await getStorefrontProducts(db);
  const settings = await getStoreSettings(db);

  const urls = [
    {
      loc: origin,
      lastmod: new Date().toISOString().split('T')[0],
      priority: 1.0,
    },
  ];

  // Add product URLs
  for (const product of products) {
    urls.push({
      loc: `${origin}/product/${encodeURIComponent(product.name)}`,
      lastmod: product.updated_at?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      priority: 0.8,
    });
  }

  return urls;
}
