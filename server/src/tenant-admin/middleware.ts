/**
 * TENANT ADMIN MIDDLEWARE
 *
 * Protects admin routes and ensures tenant isolation.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyTenantAdminToken } from './auth.js';

/**
 * Require tenant admin authentication
 *
 * Validates JWT token and ensures admin is accessing their own tenant.
 */
export function requireTenantAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header',
    });
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  const payload = verifyTenantAdminToken(token);

  if (!payload) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }

  // Verify tenant matches
  const requestTenant = (req as any).context?.tenant;

  if (!requestTenant) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'No tenant context found',
    });
  }

  if (requestTenant.id !== payload.tenantId) {
    console.error(
      `[TenantAdminAuth] Tenant mismatch! Token tenant: ${payload.tenantId}, Request tenant: ${requestTenant.id}`
    );
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Token tenant does not match request tenant',
    });
  }

  // Attach admin info to request
  (req as any).admin = {
    id: payload.adminId,
    username: payload.username,
    role: payload.role,
    tenantId: payload.tenantId,
    tenantSlug: payload.tenantSlug,
  };

  console.log(`[TenantAdminAuth] Authenticated: ${payload.username} @ ${payload.tenantSlug}`);
  next();
}
