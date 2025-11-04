/**
 * TENANT ADMIN ROUTER
 *
 * All admin routes are tenant-scoped and require authentication.
 * Routes: /admin/*
 */

import express, { Request, Response, Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateTenantAdmin } from './auth.js';
import { requireTenantAdmin } from './middleware.js';
import {
  getAllProductsForAdmin,
  getProductByIdForAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllOrdersForAdmin,
  getOrderByIdForAdmin,
  updateOrderStatus,
  getStoreSettingsForAdmin,
  updateStoreSettings,
  getDashboardStats,
} from '../db/database-tenant-admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router: Router = express.Router();

// ============================================================================
// PUBLIC ROUTES (no auth required)
// ============================================================================

/**
 * GET /admin
 * Serve admin UI (SPA)
 */
router.get('/', async (req: Request, res: Response) => {
  console.log('[TenantAdmin GET /] Request received');
  try {
    // Standard-2025: Use path.resolve with already-defined __dirname
    const indexPath = path.resolve(__dirname, 'public/index.html');
    console.log('[TenantAdmin GET /] Serving:', indexPath);
    res.sendFile(indexPath);
  } catch (error) {
    console.error('Admin page error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to load admin page',
    });
  }
});

/**
 * POST /admin/login
 * Authenticate tenant admin and get JWT token
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Username and password are required',
      });
    }

    const tenant = (req as any).context?.tenant;
    const db = (req as any).db;

    if (!tenant || !db) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No tenant context found',
      });
    }

    const result = await authenticateTenantAdmin(db, tenant.id, tenant.slug, username, password);

    if (!result) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid username or password',
      });
    }

    res.json({
      success: true,
      token: result.token,
      admin: result.admin,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      },
    });
  } catch (error: any) {
    console.error('[TenantAdmin] Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

// ============================================================================
// SPA FALLBACK (MUST BE BEFORE AUTH MIDDLEWARE)
// ============================================================================

/**
 * GET /admin/*
 * SPA fallback - serve index.html for all non-API GET requests
 *
 * Standard-2025: PATH-based routing (no Accept header check)
 * - GET /admin/* → index.html (SPA, no auth required for serving HTML)
 * - GET /admin/api/* → skip to API routes below (with auth)
 *
 * Why before auth middleware:
 * - Allows /admin/login page to load without 401
 * - Allows F5 refresh on any /admin/* page
 * - API routes still protected by middleware below
 */
router.get('*', (req: Request, res: Response, next) => {
  // If API request (/admin/api/*), skip to protected routes
  if (req.path.startsWith('/api/')) {
    return next();
  }

  // Serve SPA for all other GET requests
  try {
    const indexPath = path.resolve(__dirname, 'public/index.html');
    console.log('[TenantAdmin SPA Fallback] Serving:', indexPath, 'for path:', req.path);
    res.sendFile(indexPath);
  } catch (error) {
    console.error('[TenantAdmin] SPA fallback error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to load page' });
  }
});

// ============================================================================
// PROTECTED API ROUTES (require auth)
// ============================================================================

// Apply authentication middleware to all routes below
router.use(requireTenantAdmin);

/**
 * GET /admin/api/me
 * Get current admin info
 */
router.get('/api/me', async (req: Request, res: Response) => {
  const admin = (req as any).admin;
  const tenant = (req as any).context?.tenant;

  res.json({
    success: true,
    admin,
    tenant,
  });
});

/**
 * GET /admin/api/dashboard
 * Get dashboard statistics
 */
router.get('/api/dashboard', async (req: Request, res: Response) => {
  try {
    const db = (req as any).db;
    const stats = await getDashboardStats(db);

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('[TenantAdmin] Dashboard error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

// ============================================================================
// PRODUCTS MANAGEMENT
// ============================================================================

/**
 * GET /admin/api/products
 * List all products for this tenant
 */
router.get('/api/products', async (req: Request, res: Response) => {
  try {
    const db = (req as any).db;
    const products = await getAllProductsForAdmin(db);

    res.json({
      success: true,
      products,
    });
  } catch (error: any) {
    console.error('[TenantAdmin] Get products error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * GET /admin/api/products/:id
 * Get product by ID with full details
 */
router.get('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const db = (req as any).db;
    const { id } = req.params;

    const product = await getProductByIdForAdmin(db, id);

    if (!product) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      product,
    });
  } catch (error: any) {
    console.error('[TenantAdmin] Get product error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * POST /admin/api/products
 * Create new product
 */
router.post('/api/products', async (req: Request, res: Response) => {
  try {
    const db = (req as any).db;
    const { name, description, vendor, category, tags, is_active } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Product name is required',
      });
    }

    const product = await createProduct(db, {
      name,
      description,
      vendor,
      category,
      tags,
      is_active,
    });

    res.json({
      success: true,
      product,
    });
  } catch (error: any) {
    console.error('[TenantAdmin] Create product error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * PUT /admin/api/products/:id
 * Update product
 */
router.put('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const db = (req as any).db;
    const { id } = req.params;
    const { name, description, vendor, category, tags, is_active } = req.body;

    const product = await updateProduct(db, id, {
      name,
      description,
      vendor,
      category,
      tags,
      is_active,
    });

    if (!product) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      product,
    });
  } catch (error: any) {
    console.error('[TenantAdmin] Update product error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * DELETE /admin/api/products/:id
 * Delete product
 */
router.delete('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const db = (req as any).db;
    const { id } = req.params;

    await deleteProduct(db, id);

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error: any) {
    console.error('[TenantAdmin] Delete product error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

// ============================================================================
// ORDERS MANAGEMENT
// ============================================================================

/**
 * GET /admin/api/orders
 * List all orders for this tenant
 */
router.get('/api/orders', async (req: Request, res: Response) => {
  try {
    const db = (req as any).db;
    const limit = parseInt(req.query.limit as string) || 50;

    const orders = await getAllOrdersForAdmin(db, limit);

    res.json({
      success: true,
      orders,
    });
  } catch (error: any) {
    console.error('[TenantAdmin] Get orders error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * GET /admin/api/orders/:id
 * Get order by ID with full details
 */
router.get('/api/orders/:id', async (req: Request, res: Response) => {
  try {
    const db = (req as any).db;
    const { id } = req.params;

    const order = await getOrderByIdForAdmin(db, id);

    if (!order) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Order not found',
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error('[TenantAdmin] Get order error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * PATCH /admin/api/orders/:id/status
 * Update order status
 */
router.patch('/api/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const db = (req as any).db;
    const { id } = req.params;
    const { status, paid } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Status is required',
      });
    }

    const order = await updateOrderStatus(db, id, status, paid);

    if (!order) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Order not found',
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error('[TenantAdmin] Update order status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

// ============================================================================
// STORE SETTINGS
// ============================================================================

/**
 * GET /admin/api/settings
 * Get store settings
 */
router.get('/api/settings', async (req: Request, res: Response) => {
  try {
    const db = (req as any).db;
    const settings = await getStoreSettingsForAdmin(db);

    res.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error('[TenantAdmin] Get settings error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * PUT /admin/api/settings
 * Update store settings
 */
router.put('/api/settings', async (req: Request, res: Response) => {
  try {
    const db = (req as any).db;
    const { title, brand_color, logo_path, currency } = req.body;

    const settings = await updateStoreSettings(db, {
      title,
      brand_color,
      logo_path,
      currency,
    });

    res.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error('[TenantAdmin] Update settings error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

export default router;
