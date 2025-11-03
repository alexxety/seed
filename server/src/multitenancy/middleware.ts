import { PrismaClient } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

/**
 * Global PrismaClient for infrastructure endpoints (no tenant context)
 * Used only for: tenant lookups, superadmin, shared tables in public schema
 */
let globalPrisma: PrismaClient | null = null;

export function getGlobalPrisma(): PrismaClient {
  if (!globalPrisma) {
    globalPrisma = new PrismaClient();
  }
  return globalPrisma;
}

/**
 * Standard-2025: Attach tenant-scoped PrismaClient to req.db
 *
 * Creates one PrismaClient per request with search_path set to tenant schema.
 * Client is automatically closed on response finish.
 *
 * NO global clients for tenant requests.
 * NO search_path in functions - only here in middleware.
 */
export async function attachTenantDB(req: Request, res: Response, next: NextFunction) {
  try {
    const context = (req as any).context;

    // Infrastructure request: use shared global client
    if (!context || !context.tenant) {
      (req as any).db = getGlobalPrisma();
      console.log('🗄️  DB context: public (infrastructure)');
      return next();
    }

    // Tenant request: create dedicated PrismaClient with search_path
    const schema = context.tenant.schema;
    const tenantClient = new PrismaClient();

    // Set search_path immediately after connection
    await tenantClient.$executeRawUnsafe(`SET search_path TO "${schema}", public`);

    (req as any).db = tenantClient;
    console.log(`🗄️  DB context: ${schema}`);

    // Close client when response finishes
    res.on('finish', async () => {
      try {
        await tenantClient.$disconnect();
      } catch (error) {
        console.error('Error disconnecting tenant DB:', error);
      }
    });

    next();
  } catch (error: any) {
    console.error(`❌ Ошибка создания DB context: ${error.message}`);
    return res.status(500).json({
      error: 'Ошибка подключения к БД',
      message: error.message,
    });
  }
}
