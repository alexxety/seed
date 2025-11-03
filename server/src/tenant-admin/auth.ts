/**
 * TENANT ADMIN AUTHENTICATION
 *
 * JWT-based authentication for tenant-scoped admins.
 * Each tenant has isolated admin accounts stored in tenant_admins table.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

interface TenantAdmin {
  id: string;
  username: string;
  email: string | null;
  full_name: string | null;
  role: string;
  is_active: boolean;
}

interface TokenPayload {
  adminId: string;
  tenantId: string;
  tenantSlug: string;
  username: string;
  role: string;
}

/**
 * Authenticate tenant admin and generate JWT token
 */
export async function authenticateTenantAdmin(
  db: PrismaClient,
  tenantId: string,
  tenantSlug: string,
  username: string,
  password: string
): Promise<{ token: string; admin: TenantAdmin } | null> {
  console.log(`[TenantAdminAuth] Attempting login for user: ${username} in tenant: ${tenantSlug}`);

  // Query admin from tenant-scoped database
  const result = await db.$queryRaw<any[]>`
    SELECT id, username, password_hash, email, full_name, role, is_active
    FROM tenant_admins
    WHERE username = ${username}
    LIMIT 1
  `;

  if (result.length === 0) {
    console.log(`[TenantAdminAuth] User not found: ${username}`);
    return null;
  }

  const admin = result[0];

  if (!admin.is_active) {
    console.log(`[TenantAdminAuth] User is inactive: ${username}`);
    return null;
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(password, admin.password_hash);
  if (!passwordMatch) {
    console.log(`[TenantAdminAuth] Invalid password for user: ${username}`);
    return null;
  }

  // Generate JWT token
  const payload: TokenPayload = {
    adminId: admin.id,
    tenantId,
    tenantSlug,
    username: admin.username,
    role: admin.role,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  console.log(`[TenantAdminAuth] Login successful for user: ${username}`);

  return {
    token,
    admin: {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      full_name: admin.full_name,
      role: admin.role,
      is_active: admin.is_active,
    },
  };
}

/**
 * Verify JWT token and extract payload
 */
export function verifyTenantAdminToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return payload;
  } catch (error) {
    console.error('[TenantAdminAuth] Invalid token:', error);
    return null;
  }
}

/**
 * Create new tenant admin (for management purposes)
 */
export async function createTenantAdmin(
  db: PrismaClient,
  username: string,
  password: string,
  email?: string,
  fullName?: string,
  role: string = 'admin'
): Promise<TenantAdmin> {
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await db.$queryRaw<any[]>`
    INSERT INTO tenant_admins (username, password_hash, email, full_name, role, is_active)
    VALUES (${username}, ${passwordHash}, ${email || null}, ${fullName || null}, ${role}, true)
    RETURNING id, username, email, full_name, role, is_active
  `;

  return result[0];
}
