/**
 * Storefront Service
 * Работа с данными витрины (через req.db - tenant-scoped Prisma)
 */

/**
 * Получить настройки темы магазина
 * @param {Object} req - Express request с req.db и req.tenantSlug
 * @returns {Promise<Object>} настройки темы
 */
async function getTenantTheme(req) {
  if (!req.db) {
    throw new Error('req.db не инициализирован (нет tenant context)');
  }

  try {
    // Пытаемся получить настройки из store_settings
    const settings = await req.db.$queryRaw`
      SELECT * FROM store_settings LIMIT 1
    `;

    if (settings && settings.length > 0) {
      return settings[0];
    }

    // Если настроек нет - возвращаем дефолтные с разной палитрой для каждого slug
    const tenantSlug = req.context?.tenant?.slug || 'shop';

    const defaultThemes = {
      demo: {
        title: 'Demo Shop',
        brand_color: '#0ea5e9', // Sky blue
        logo_path: '/assets/tenants/demo/logo.png',
        currency: 'USD'
      },
      testshop: {
        title: 'Test Shop',
        brand_color: '#16a34a', // Green
        logo_path: '/assets/tenants/testshop/logo.png',
        currency: 'USD'
      }
    };

    return defaultThemes[tenantSlug] || {
      title: tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1),
      brand_color: '#6366f1', // Indigo (дефолт)
      logo_path: null,
      currency: 'USD'
    };
  } catch (error) {
    console.error('Error getting theme:', error);
    // Возвращаем минимальные настройки
    return {
      title: req.tenantSlug || 'Shop',
      brand_color: '#6366f1',
      logo_path: null,
      currency: 'USD'
    };
  }
}

/**
 * Получить список товаров с пагинацией
 * @param {Object} req - Express request с req.db
 * @param {Object} options - { page, size }
 * @returns {Promise<{products: Array, total: number, page: number, totalPages: number}>}
 */
async function listProducts(req, options = {}) {
  const tenantSlug = req.context?.tenant?.slug || 'unknown';

  if (!req.db) {
    console.error(`[listProducts] [${tenantSlug}] req.db не инициализирован`);
    throw new Error('req.db не инициализирован (нет tenant context)');
  }

  // Нормализация пагинации с clamp
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  let page = clamp(parseInt(options.page) || 1, 1, 100000);
  let size = clamp(parseInt(options.size) || 20, 1, 100);

  const offset = (page - 1) * size;

  console.log(`[listProducts] [${tenantSlug}] page=${page}, size=${size}, offset=${offset}`);

  try {
    // Получаем товары с ценами через JOIN
    // Используем LEFT JOIN с product_variants и prices для получения базовой цены
    const products = await req.db.$queryRaw`
      SELECT
        p.id,
        p.name,
        p.description,
        p.category,
        p.tags,
        p.is_active,
        p.created_at,
        COALESCE(MIN(pr.amount), 0) as price
      FROM products p
      LEFT JOIN product_variants pv ON pv.product_id = p.id
      LEFT JOIN prices pr ON pr.variant_id = pv.id AND pr.is_active = true
      WHERE p.is_active = true
      GROUP BY p.id, p.name, p.description, p.category, p.tags, p.is_active, p.created_at
      ORDER BY p.created_at DESC
      LIMIT ${size} OFFSET ${offset}
    `;

    // Получаем общее количество активных товаров
    const countResult = await req.db.$queryRaw`
      SELECT COUNT(*) as count FROM products WHERE is_active = true
    `;

    const total = parseInt(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / size);

    return {
      products: products.map(p => ({
        ...p,
        price: parseFloat(p.price) || 0
      })),
      total,
      page,
      totalPages
    };
  } catch (error) {
    const errorId = Date.now().toString(36);
    console.error(`[listProducts] [${tenantSlug}] Error [${errorId}]:`, error.message);
    return {
      products: [],
      total: 0,
      page: 1,
      totalPages: 0
    };
  }
}

/**
 * Получить товар по ID
 * @param {Object} req - Express request с req.db
 * @param {string} productId - UUID товара
 * @returns {Promise<Object|null>}
 */
async function getProduct(req, productId) {
  const tenantSlug = req.context?.tenant?.slug || 'unknown';

  if (!req.db) {
    console.error(`[getProduct] [${tenantSlug}] req.db не инициализирован`);
    throw new Error('req.db не инициализирован (нет tenant context)');
  }

  console.log(`[getProduct] [${tenantSlug}] productId=${productId}`);

  try {
    const products = await req.db.$queryRaw`
      SELECT
        p.*,
        COALESCE(MIN(pr.amount), 0) as price
      FROM products p
      LEFT JOIN product_variants pv ON pv.product_id = p.id
      LEFT JOIN prices pr ON pr.variant_id = pv.id AND pr.is_active = true
      WHERE p.id = ${productId}::uuid
      GROUP BY p.id
    `;

    if (products && products.length > 0) {
      return {
        ...products[0],
        price: parseFloat(products[0].price) || 0
      };
    }

    return null;
  } catch (error) {
    const errorId = Date.now().toString(36);
    console.error(`[getProduct] [${tenantSlug}] Error [${errorId}]:`, error.message);
    return null;
  }
}

/**
 * Генерация sitemap для tenant
 * @param {Object} req - Express request с req.db
 * @param {string} origin - origin URL (например, https://demo.x-bro.com)
 * @returns {Promise<Array>} массив URL для sitemap
 */
async function generateSitemap(req, origin) {
  if (!req.db) {
    return [];
  }

  try {
    // Получаем до 1000 активных товаров для sitemap
    const products = await req.db.$queryRaw`
      SELECT id, updated_at FROM products WHERE is_active = true LIMIT 1000
    `;

    const urls = [
      {
        loc: `${origin}/`,
        lastmod: new Date().toISOString().split('T')[0],
        priority: 1.0
      },
      {
        loc: `${origin}/products`,
        lastmod: new Date().toISOString().split('T')[0],
        priority: 0.9
      }
    ];

    // Добавляем URLs товаров
    products.forEach(product => {
      urls.push({
        loc: `${origin}/product/${product.id}`,
        lastmod: product.updated_at ? new Date(product.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        priority: 0.8
      });
    });

    return urls;
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return [];
  }
}

module.exports = {
  getTenantTheme,
  listProducts,
  getProduct,
  generateSitemap
};
