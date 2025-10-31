const { PrismaClient } = require('@prisma/client');

/**
 * Middleware для установки search_path перед запросами к БД
 *
 * Использование:
 * await setSearchPath(req);
 * // Теперь все запросы идут в схему tenant
 * const products = await prisma.$queryRaw`SELECT * FROM products`;
 */
async function setSearchPath(req, prisma = null) {
  const client = prisma || new PrismaClient();

  // Если есть tenant context - устанавливаем search_path
  if (req.context && req.context.tenant) {
    const schema = req.context.tenant.schema;

    console.log(`🔧 Установка search_path: ${schema}, public`);

    await client.$executeRawUnsafe(
      `SET search_path TO "${schema}", public`
    );

    return client;
  }

  // Если нет tenant - используем только public
  console.log(`🔧 Установка search_path: public (без tenant)`);
  await client.$executeRawUnsafe(`SET search_path TO public`);

  return client;
}

/**
 * Express middleware для автоматической установки search_path
 * Используется для tenant-scoped роутов
 */
function autoSetSearchPath(req, res, next) {
  // Сохраняем функцию в req для использования в обработчиках
  req.setSearchPath = async () => {
    return await setSearchPath(req);
  };

  next();
}

/**
 * Создать изолированный Prisma клиент для tenant
 */
async function createTenantPrismaClient(tenantSchema) {
  const prisma = new PrismaClient();

  await prisma.$executeRawUnsafe(
    `SET search_path TO "${tenantSchema}", public`
  );

  return prisma;
}

module.exports = {
  setSearchPath,
  autoSetSearchPath,
  createTenantPrismaClient
};
