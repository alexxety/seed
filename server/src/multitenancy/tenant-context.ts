import { Request, Response, NextFunction } from 'express';
import { getTenantBySlug } from '../db/tenants.js';
import { getGlobalPrisma } from './middleware.js';

export async function resolveTenant(req: Request) {
  const db = getGlobalPrisma();

  const tenantHeader = req.headers['x-tenant'] as string | undefined;
  if (tenantHeader) {
    const tenant = await getTenantBySlug(db, tenantHeader);
    if (!tenant) {
      throw new Error(`Tenant "${tenantHeader}" не найден`);
    }
    return tenant;
  }

  const host = req.headers.host || '';
  const parts = host.split('.');

  const infraDomains = ['www', 'admin', 'seed', 'dev', 'dev-admin', 'deva'];

  if (parts.length >= 3) {
    const subdomain = parts[0];

    if (infraDomains.includes(subdomain)) {
      return null;
    }

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
