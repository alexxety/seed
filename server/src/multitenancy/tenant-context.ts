import { Request, Response, NextFunction } from 'express';
import { getTenantBySlug } from '../db/tenants.js';
import { getGlobalPrisma } from './middleware.js';

export async function resolveTenant(req: Request) {
  const db = getGlobalPrisma();

  // Priority 1: X-Tenant header (for testing/API)
  const tenantHeader = req.headers['x-tenant'] as string | undefined;
  if (tenantHeader) {
    const tenant = await getTenantBySlug(db, tenantHeader);
    if (!tenant) {
      throw new Error(`Tenant "${tenantHeader}" не найден`);
    }
    return tenant;
  }

  // Priority 2: Extract from hostname based on BASE_DOMAIN
  const host = req.headers.host || '';
  const baseDomain = process.env.BASE_DOMAIN || 'x-bro.com';

  // Infrastructure subdomains (same for PROD and DEV)
  const infraDomains = ['www', 'admin', 'seed'];

  // Parse hostname: demo.dev.x-bro.com or demo.x-bro.com
  // Remove port if present (e.g., localhost:3000)
  const hostname = host.split(':')[0];

  // Check if hostname matches pattern: {slug}.{BASE_DOMAIN}
  // Example: demo.dev.x-bro.com → slug="demo" (when BASE_DOMAIN=dev.x-bro.com)
  // Example: demo.x-bro.com → slug="demo" (when BASE_DOMAIN=x-bro.com)
  const domainRegex = new RegExp(`^([^.]+)\\.${baseDomain.replace(/\./g, '\\.')}$`);
  const match = hostname.match(domainRegex);

  if (match) {
    const subdomain = match[1];

    // Skip infrastructure domains
    if (infraDomains.includes(subdomain)) {
      return null;
    }

    // Resolve tenant by slug
    const tenant = await getTenantBySlug(db, subdomain);
    if (!tenant) {
      throw new Error(`Tenant для поддомена "${subdomain}" не найден`);
    }
    return tenant;
  }

  return null;
}

export async function setTenantContext(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant = await resolveTenant(req);

    (req as any).context = (req as any).context || {};

    if (tenant) {
      (req as any).context.tenant = {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        schema: `t_${tenant.id.replace(/-/g, '_')}`,
      };
      console.log(`🏪 Tenant context: ${tenant.slug} (${tenant.id})`);
    } else {
      (req as any).context.tenant = null;
      console.log('🌐 Запрос к инфраструктуре (без tenant)');
    }

    next();
  } catch (error: any) {
    // If there's an error (e.g., database unavailable), set tenant to null and continue
    // This allows infrastructure subdomains and localhost to work even if DB is down
    console.error(`⚠️  Ошибка определения tenant (продолжаем без tenant): ${error.message}`);
    (req as any).context = (req as any).context || {};
    (req as any).context.tenant = null;
    next();
  }
}

export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).context || !(req as any).context.tenant) {
    return res.status(403).json({
      error: 'Доступ запрещён',
      message: 'Этот эндпоинт требует tenant context (поддомен или X-Tenant заголовок)',
    });
  }
  next();
}
