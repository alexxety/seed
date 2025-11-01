/**
 * Storefront Router
 * Обрабатывает запросы к витрине магазина (tenant-aware)
 */

const express = require('express');
const path = require('path');
const {
  getTenantTheme,
  listProducts,
  getProduct,
  generateSitemap
} = require('./service');

const router = express.Router();

/**
 * Middleware для рендеринга с layout
 */
function renderWithLayout(view) {
  return async (req, res, next) => {
    try {
      // Получаем настройки темы
      const settings = await getTenantTheme(req);

      // Сохраняем оригинальный render
      const originalRender = res.render.bind(res);

      // Переопределяем render для автоматического использования layout
      res.render = (viewName, data = {}) => {
        const body = req.app.get('view engine') === 'ejs'
          ? res.app.render(viewName, { ...data, settings }, (err, html) => {
              if (err) throw err;
              return html;
            })
          : '';

        // Для EJS используем асинхронный рендеринг
        res.app.render(viewName, { ...data, settings }, (err, bodyHtml) => {
          if (err) return next(err);

          res.app.render('layout', {
            settings,
            body: bodyHtml,
            ...data
          }, (err, html) => {
            if (err) return next(err);
            res.send(html);
          });
        });
      };

      next();
    } catch (error) {
      console.error('Layout middleware error:', error);
      next(error);
    }
  };
}

/**
 * GET / - Главная страница
 */
router.get('/', async (req, res, next) => {
  try {
    const settings = await getTenantTheme(req);

    // Получаем 4 товара для главной
    const { products } = await listProducts(req, { page: 1, size: 4 });

    res.app.render('home', { products, settings }, (err, bodyHtml) => {
      if (err) return next(err);

      res.app.render('layout', {
        settings,
        body: bodyHtml,
        products
      }, (err, html) => {
        if (err) return next(err);
        res.send(html);
      });
    });
  } catch (error) {
    console.error('Home page error:', error);
    next(error);
  }
});

/**
 * GET /products - Каталог товаров
 */
router.get('/products', async (req, res, next) => {
  try {
    const settings = await getTenantTheme(req);
    const page = parseInt(req.query.page) || 1;

    const { products, total, totalPages } = await listProducts(req, { page, size: 20 });

    res.app.render('products', {
      products,
      settings,
      currentPage: page,
      totalPages,
      total
    }, (err, bodyHtml) => {
      if (err) return next(err);

      res.app.render('layout', {
        settings,
        body: bodyHtml,
        products,
        currentPage: page,
        totalPages,
        total
      }, (err, html) => {
        if (err) return next(err);
        res.send(html);
      });
    });
  } catch (error) {
    console.error('Products page error:', error);
    next(error);
  }
});

/**
 * GET /product/:id - Карточка товара
 */
router.get('/product/:id', async (req, res, next) => {
  try {
    const settings = await getTenantTheme(req);
    const product = await getProduct(req, req.params.id);

    if (!product) {
      // Render 404 в теме tenant
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Product Not Found - ${settings.title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f9fafb;
              color: #333;
            }
            .error-container {
              text-align: center;
              padding: 2rem;
            }
            h1 {
              font-size: 3rem;
              color: ${settings.brand_color};
              margin-bottom: 1rem;
            }
            p {
              font-size: 1.25rem;
              color: #666;
              margin-bottom: 2rem;
            }
            a {
              display: inline-block;
              padding: 0.75rem 1.5rem;
              background: ${settings.brand_color};
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>404</h1>
            <p>Product not found</p>
            <a href="/products">Back to ${settings.title}</a>
          </div>
        </body>
        </html>
      `);
    }

    res.app.render('product', {
      product,
      settings
    }, (err, bodyHtml) => {
      if (err) return next(err);

      res.app.render('layout', {
        settings,
        body: bodyHtml,
        product
      }, (err, html) => {
        if (err) return next(err);
        res.send(html);
      });
    });
  } catch (error) {
    console.error('Product page error:', error);
    next(error);
  }
});

/**
 * GET /robots.txt - Robots.txt с tenant-specific правилами
 */
router.get('/robots.txt', (req, res) => {
  // Проверяем наличие tenant context
  if (!req.context || !req.context.tenant) {
    return res.status(404).send('Not Found');
  }

  const protocol = req.protocol || 'https';
  const host = req.get('host') || 'localhost';
  const origin = `${protocol}://${host}`;

  res.type('text/plain; charset=utf-8');
  res.send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: ${origin}/sitemap.xml
`);
});

/**
 * GET /sitemap.xml - XML Sitemap
 */
router.get('/sitemap.xml', async (req, res, next) => {
  try {
    // Формируем динамический origin
    const protocol = req.protocol || 'https';
    const host = req.get('host') || 'localhost';
    const origin = `${protocol}://${host}`;

    const urls = await generateSitemap(req, origin);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    urls.forEach(url => {
      xml += '  <url>\n';
      xml += `    <loc>${url.loc}</loc>\n`;
      xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
      xml += `    <priority>${url.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    res.type('application/xml; charset=utf-8');
    res.send(xml);
  } catch (error) {
    console.error('Sitemap error:', error);
    next(error);
  }
});

module.exports = router;
