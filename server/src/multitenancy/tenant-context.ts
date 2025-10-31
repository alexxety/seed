const { getTenantBySlug } = require('../db/tenants');

/**
 * Определить tenant по поддомену или заголовку X-Tenant
 * Примеры:
 * - Host: myshop.x-bro.com → slug="myshop"
 * - Header: X-Tenant: myshop → slug="myshop"
 */
async function resolveTenant(req) {
  // Приоритет 1: заголовок X-Tenant (для тестирования и API)
  const tenantHeader = req.headers['x-tenant'];
  if (tenantHeader) {
    const tenant = await getTenantBySlug(tenantHeader);
    if (!tenant) {
      throw new Error(`Tenant "${tenantHeader}" не найден`);
    }
    return tenant;
  }

  // Приоритет 2: поддомен из Host
  const host = req.headers.host || '';
  const parts = host.split('.');

  // Пропускаем инфраструктурные домены
  const infraDomains = ['www', 'admin', 'seed', 'dev', 'dev-admin', 'deva'];

  if (parts.length >= 3) {
    const subdomain = parts[0];

    // Игнорируем инфраструктурные поддомены
    if (infraDomains.includes(subdomain)) {
      return null;
    }

    // Ищем tenant по slug
    const tenant = await getTenantBySlug(subdomain);
    if (!tenant) {
      throw new Error(`Tenant для поддомена "${subdomain}" не найден`);
    }
    return tenant;
  }

  // Нет tenant - это запрос к инфраструктуре (супер-админ, главная и т.д.)
  return null;
}

/**
 * Middleware для установки tenant context в req.context
 */
async function setTenantContext(req, res, next) {
  try {
    const tenant = await resolveTenant(req);

    req.context = req.context || {};

    if (tenant) {
      req.context.tenant = {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        schema: `t_${tenant.id.replace(/-/g, '_')}`
      };
      console.log(`🏪 Tenant context: ${tenant.slug} (${tenant.id})`);
    } else {
      req.context.tenant = null;
      console.log('🌐 Запрос к инфраструктуре (без tenant)');
    }

    next();
  } catch (error) {
    console.error(`❌ Ошибка определения tenant: ${error.message}`);
    return res.status(404).json({
      error: 'Tenant не найден',
      message: error.message
    });
  }
}

/**
 * Middleware: требуется tenant (403 если нет)
 */
function requireTenant(req, res, next) {
  if (!req.context || !req.context.tenant) {
    return res.status(403).json({
      error: 'Доступ запрещён',
      message: 'Этот эндпоинт требует tenant context (поддомен или X-Tenant заголовок)'
    });
  }
  next();
}

module.exports = {
  resolveTenant,
  setTenantContext,
  requireTenant
};
