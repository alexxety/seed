import { apiClient } from '@/lib/api-client'

export interface Shop {
  id: number
  subdomain: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string | null
  chatId: string
  adminTelegramId: string
  status: 'active' | 'blocked' | 'pending'
  plan: 'free' | 'basic' | 'pro'
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  botTokenMasked?: string
}

export interface ShopsResponse {
  success: boolean
  shops: Shop[]
}

export interface ShopResponse {
  success: boolean
  shop: Shop
}

export interface UpdateShopData {
  ownerName?: string
  ownerEmail?: string
  ownerPhone?: string
  botToken?: string
  chatId?: string
  adminTelegramId?: string
  status?: string
  plan?: string
}

/**
 * Get all shops (requires super-admin auth)
 */
export async function getAllShops(token: string): Promise<Shop[]> {
  const data = await apiClient<ShopsResponse>('/api/admin/shops', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return data.shops
}

/**
 * Get single shop by ID (requires super-admin auth)
 */
export async function getShopById(id: number, token: string): Promise<Shop> {
  const data = await apiClient<ShopResponse>(`/api/admin/shops/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return data.shop
}

/**
 * Update shop (requires super-admin auth)
 */
export async function updateShop(
  id: number,
  updates: UpdateShopData,
  token: string
): Promise<Shop> {
  const data = await apiClient<ShopResponse>(`/api/admin/shops/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  })
  return data.shop
}

/**
 * Update shop status (requires super-admin auth)
 */
export async function updateShopStatus(
  id: number,
  status: 'active' | 'blocked' | 'pending',
  token: string
): Promise<Shop> {
  const data = await apiClient<ShopResponse>(`/api/admin/shops/${id}/status`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  })
  return data.shop
}

/**
 * Delete shop (requires super-admin auth)
 */
export async function deleteShop(id: number, token: string): Promise<void> {
  await apiClient(`/api/admin/shops/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}
