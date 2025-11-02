import { PrismaClient } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

let globalPrisma: PrismaClient | null = null;

export function getGlobalPrisma(): PrismaClient {
  if (!globalPrisma) {
    globalPrisma = new PrismaClient();
  }
  return globalPrisma;
}

export async function getTenantDB(req: Request) {
  const context = (req as any).context;

  if (!context || !context.tenant) {
    return getGlobalPrisma();
  }

  const schema = context.tenant.schema;
  const basePrisma = getGlobalPrisma();

  const tenantPrisma = basePrisma.$extends({
    query: {
      async $allOperations({ args, query }: any) {
        const [, result] = await basePrisma.$transaction([
          basePrisma.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}", public`),
          query(args),
        ]);
        return result;
      },
    },
  });

  return tenantPrisma;
}

export async function attachTenantDB(req: Request, res: Response, next: NextFunction) {
  try {
    (req as any).db = await getTenantDB(req);

    if ((req as any).context && (req as any).context.tenant) {
      console.log(`🗄️  DB context: ${(req as any).context.tenant.schema}`);
    } else {
      console.log('🗄️  DB context: public (без tenant)');
    }

    next();
  } catch (error: any) {
    console.error(`❌ Ошибка создания DB context: ${error.message}`);
    return res.status(500).json({
      error: 'Ошибка подключения к БД',
      message: error.message,
    });
  }
}

export async function withTenantSchema(schema: string, callback: any) {
  const prisma = getGlobalPrisma();
  return await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}", public`);
    return await callback(tx);
  });
}
