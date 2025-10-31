const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Создать Prisma клиент с установленным search_path для tenant
 * Использует SET LOCAL внутри транзакции для безопасности пула соединений
 *
 * @param {object} req - Express request с req.context.tenant
 * @returns {Promise<PrismaClient>} - Prisma client готовый к использованию
 */
async function getTenantDB(req) {
  if (!req.context || !req.context.tenant) {
    // Если нет tenant - возвращаем обычный prisma для public схемы
    return prisma;
  }

  const schema = req.context.tenant.schema;

  // Создаём интерактивную транзакцию с SET LOCAL
  // SET LOCAL действует только внутри текущей транзакции
  const tenantPrisma = prisma.$extends({
    query: {
      async $allOperations({ operation, model, args, query }) {
        // Устанавливаем search_path для этого запроса
        const [, result] = await prisma.$transaction([
          prisma.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}", public`),
          query(args),
        ]);
        return result;
      },
    },
  });

  return tenantPrisma;
}

/**
 * Express middleware для создания req.db
 *
 * Использование в роутах:
 * app.get('/api/tenant/products', async (req, res) => {
 *   const products = await req.db.product.findMany();
 *   res.json({ products });
 * });
 */
async function attachTenantDB(req, res, next) {
  try {
    // Создаём req.db для использования в хэндлерах
    req.db = await getTenantDB(req);

    if (req.context && req.context.tenant) {
      console.log(`🗄️  DB context: ${req.context.tenant.schema}`);
    } else {
      console.log('🗄️  DB context: public (без tenant)');
    }

    next();
  } catch (error) {
    console.error(`❌ Ошибка создания DB context: ${error.message}`);
    return res.status(500).json({
      error: 'Ошибка подключения к БД',
      message: error.message
    });
  }
}

/**
 * Выполнить запрос с SET LOCAL search_path внутри транзакции
 * Для использования в скриптах и утилитах
 *
 * @param {string} schema - имя схемы (например, "t_abc_123")
 * @param {function} callback - async функция которая получает prisma клиент
 */
async function withTenantSchema(schema, callback) {
  return await prisma.$transaction(async (tx) => {
    // Устанавливаем search_path для этой транзакции
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}", public`);

    // Выполняем callback с транзакцией
    return await callback(tx);
  });
}

/**
 * LEGACY: старая функция для обратной совместимости
 * Не рекомендуется использовать - используйте req.db вместо этого
 * @deprecated
 */
async function setSearchPath(req, prismaClient = null) {
  console.warn('⚠️  setSearchPath() deprecated - используйте req.db');

  const client = prismaClient || prisma;

  if (req.context && req.context.tenant) {
    const schema = req.context.tenant.schema;
    await client.$executeRawUnsafe(`SET search_path TO "${schema}", public`);
    return client;
  }

  await client.$executeRawUnsafe(`SET search_path TO public`);
  return client;
}

/**
 * LEGACY: старый middleware
 * @deprecated
 */
function autoSetSearchPath(req, res, next) {
  // Больше ничего не делаем - используем attachTenantDB вместо этого
  next();
}

module.exports = {
  getTenantDB,
  attachTenantDB,
  withTenantSchema,
  // Legacy exports
  setSearchPath,
  autoSetSearchPath,
};
