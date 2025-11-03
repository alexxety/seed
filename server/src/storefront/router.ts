import express, { Request, Response, NextFunction, Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRobotsContent, getSitemapUrls } from '../db/database-tenant.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router: Router = express.Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // In bundled dist/server.js, __dirname points to dist/
    // So we need dist/public/index.html
    const __dirname_dist = path.dirname(__filename);  // dist/
    const indexPath = path.join(__dirname_dist, 'public', 'index.html');
    res.sendFile(indexPath);
  } catch (error) {
    console.error('Home page error:', error);
    next(error);
  }
});

router.get('/robots.txt', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = (req as any).context?.tenant;
    const db = (req as any).db;

    const protocol = req.protocol || 'https';
    const host = req.get('host') || 'localhost';
    const origin = `${protocol}://${host}`;

    res.type('text/plain; charset=utf-8');

    // If tenant exists, return tenant-specific robots.txt
    if (tenant && db) {
      const robotsContent = await getRobotsContent(db, origin);
      res.send(robotsContent);
    } else {
      // Infrastructure domain - restrictive robots.txt
      res.send(`User-agent: *
Disallow: /

# Infrastructure domain
`);
    }
  } catch (error) {
    console.error('robots.txt error:', error);
    next(error);
  }
});

router.get('/sitemap.xml', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = (req as any).context?.tenant;
    const db = (req as any).db;

    const protocol = req.protocol || 'https';
    const host = req.get('host') || 'localhost';
    const origin = `${protocol}://${host}`;

    res.type('application/xml; charset=utf-8');

    // If no tenant, return empty sitemap for infrastructure domains
    if (!tenant || !db) {
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Infrastructure domain - no public URLs -->
</urlset>`);
      return;
    }

    const urls = await getSitemapUrls(db, origin);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    xml += `  <!-- Tenant: ${tenant.slug} -->\n`;

    urls.forEach((url: { loc: string; lastmod: string; priority: number }) => {
      xml += '  <url>\n';
      xml += `    <loc>${url.loc}</loc>\n`;
      xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
      xml += `    <priority>${url.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    res.send(xml);
  } catch (error) {
    console.error('Sitemap error:', error);
    next(error);
  }
});

export default router;
