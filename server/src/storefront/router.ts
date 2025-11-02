import express, { Request, Response, NextFunction, Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSitemap } from './service';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router: Router = express.Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const __dirname_root = path.resolve(__dirname, '../../..');
    res.sendFile(path.join(__dirname_root, 'dist', 'index.html'));
  } catch (error) {
    console.error('Home page error:', error);
    next(error);
  }
});

router.get('/robots.txt', (req: Request, res: Response) => {
  if (!(req as any).context || !(req as any).context.tenant) {
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

router.get('/sitemap.xml', async (req: Request, res: Response, next: NextFunction) => {
  try {
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

export default router;
