import { Request } from 'express';

export async function getTenantTheme(req: Request) {
  if (!(req as any).db) {
    throw new Error('req.db не инициализирован (нет tenant context)');
  }

  try {
    const settings = await (req as any).db.$queryRaw`
      SELECT * FROM store_settings LIMIT 1
    `;

    if (settings && Array.isArray(settings) && settings.length > 0) {
      return settings[0];
    }

    const tenantSlug = (req as any).context?.tenant?.slug || 'shop';

    const defaultThemes: Record<string, any> = {
      demo: {
        title: 'Demo Shop',
        brand_color: '#0ea5e9',
        logo_path: '/assets/placeholder-logo.svg',
        currency: 'USD',
      },
      testshop: {
        title: 'Test Shop',
        brand_color: '#16a34a',
        logo_path: '/assets/placeholder-logo.svg',
        currency: 'USD',
      },
    };

    return (
      defaultThemes[tenantSlug] || {
        title: tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1),
        brand_color: '#6366f1',
        logo_path: '/assets/placeholder-logo.svg',
        currency: 'USD',
      }
    );
  } catch (error) {
    console.error('Error getting theme:', error);
    return {
      title: (req as any).tenantSlug || 'Shop',
      brand_color: '#6366f1',
      logo_path: '/assets/placeholder-logo.svg',
      currency: 'USD',
    };
  }
}

export async function listProducts(req: Request, options: any = {}) {
  const tenantSlug = (req as any).context?.tenant?.slug || 'unknown';

  if (!(req as any).db) {
    console.error(`[listProducts] [${tenantSlug}] req.db не инициализирован`);
    throw new Error('req.db не инициализирован (нет tenant context)');
  }

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
  let page = clamp(parseInt(options.page) || 1, 1, 100000);
  let size = clamp(parseInt(options.size) || 20, 1, 100);

  const offset = (page - 1) * size;

  console.log(`[listProducts] [${tenantSlug}] page=${page}, size=${size}, offset=${offset}`);

  try {
    const products = await (req as any).db.$queryRaw`
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

    const countResult = await (req as any).db.$queryRaw`
      SELECT COUNT(*) as count FROM products WHERE is_active = true
    `;

    const total = parseInt((countResult as any)[0]?.count || 0);
    const totalPages = Math.ceil(total / size);

    return {
      products: (products as any[]).map(p => ({
        ...p,
        price: parseFloat(p.price) || 0,
      })),
      total,
      page,
      totalPages,
    };
  } catch (error: any) {
    const errorId = Date.now().toString(36);
    console.error(`[listProducts] [${tenantSlug}] Error [${errorId}]:`, error.message);
    return {
      products: [],
      total: 0,
      page: 1,
      totalPages: 0,
    };
  }
}

export async function getProduct(req: Request, productId: string) {
  const tenantSlug = (req as any).context?.tenant?.slug || 'unknown';

  if (!(req as any).db) {
    console.error(`[getProduct] [${tenantSlug}] req.db не инициализирован`);
    throw new Error('req.db не инициализирован (нет tenant context)');
  }

  console.log(`[getProduct] [${tenantSlug}] productId=${productId}`);

  try {
    const products = await (req as any).db.$queryRaw`
      SELECT
        p.*,
        COALESCE(MIN(pr.amount), 0) as price
      FROM products p
      LEFT JOIN product_variants pv ON pv.product_id = p.id
      LEFT JOIN prices pr ON pr.variant_id = pv.id AND pr.is_active = true
      WHERE p.id = ${productId}::uuid
      GROUP BY p.id
    `;

    if (products && Array.isArray(products) && products.length > 0) {
      return {
        ...products[0],
        price: parseFloat(products[0].price) || 0,
      };
    }

    return null;
  } catch (error: any) {
    const errorId = Date.now().toString(36);
    console.error(`[getProduct] [${tenantSlug}] Error [${errorId}]:`, error.message);
    return null;
  }
}

export async function generateSitemap(req: Request, origin: string) {
  if (!(req as any).db) {
    return [];
  }

  try {
    const products = await (req as any).db.$queryRaw`
      SELECT id, updated_at FROM products WHERE is_active = true LIMIT 1000
    `;

    const urls = [
      {
        loc: `${origin}/`,
        lastmod: new Date().toISOString().split('T')[0],
        priority: 1.0,
      },
      {
        loc: `${origin}/products`,
        lastmod: new Date().toISOString().split('T')[0],
        priority: 0.9,
      },
    ];

    (products as any[]).forEach(product => {
      urls.push({
        loc: `${origin}/product/${product.id}`,
        lastmod: product.updated_at
          ? new Date(product.updated_at).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        priority: 0.8,
      });
    });

    return urls;
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return [];
  }
}
