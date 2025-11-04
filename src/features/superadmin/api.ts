import { apiClient } from '@/lib/api-client';

export interface Shop {
  id: string; // UUID only (Standard-2025)
  subdomain: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string | null;
  chatId?: string; // Optional for new tenants
  adminTelegramId: string;
  status: 'active' | 'blocked' | 'pending';
  plan: 'free' | 'basic' | 'pro';
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  botTokenMasked?: string;
  // New tenant fields
  name?: string;
  slug?: string;
  schema?: string;
  domain?: string;
}

export interface ShopsResponse {
  success: boolean;
  shops: Shop[];
}

export interface ShopResponse {
  success: boolean;
  shop: Shop;
}

export interface UpdateShopData {
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  botToken?: string;
  chatId?: string;
  adminTelegramId?: string;
  status?: string;
  plan?: string;
}

/**
 * Get all shops (requires super-admin auth)
 * Superadmin API: /admin/api/tenants (Standard-2025)
 */
export async function getAllShops(token: string): Promise<Shop[]> {
  const data = await apiClient<ShopsResponse>('/admin/api/tenants', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data.shops;
}

/**
 * Get single tenant by ID (requires super-admin auth)
 * Superadmin API: /admin/api/tenants/:id
 */
export async function getShopById(id: string, token: string): Promise<Shop> {
  const data = await apiClient<ShopResponse>(`/admin/api/tenants/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data.shop;
}

/**
 * Update tenant (requires super-admin auth)
 * Superadmin API: /admin/api/tenants/:id
 */
export async function updateShop(
  id: string,
  updates: UpdateShopData,
  token: string
): Promise<Shop> {
  const data = await apiClient<ShopResponse>(`/admin/api/tenants/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  return data.shop;
}

/**
 * Update tenant status (requires super-admin auth)
 * Superadmin API: /admin/api/tenants/:id/status
 */
export async function updateShopStatus(
  id: string,
  status: 'active' | 'blocked' | 'pending',
  token: string
): Promise<Shop> {
  const data = await apiClient<ShopResponse>(`/admin/api/tenants/${id}/status`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  return data.shop;
}

/**
 * Delete tenant (requires super-admin auth)
 * Superadmin API: /admin/api/tenants/:id
 */
export async function deleteShop(id: string, token: string): Promise<void> {
  await apiClient(`/admin/api/tenants/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
