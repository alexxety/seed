import { apiClient } from '@/lib/api-client';

export interface CheckSubdomainResponse {
  available: boolean;
  error?: string;
}

export interface RegisterShopData {
  subdomain: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  botToken: string;
  chatId: string;
  adminTelegramId: string;
}

export interface RegisterShopResponse {
  success: boolean;
  shop?: {
    id: number;
    subdomain: string;
    url: string;
    status: string;
  };
  message?: string;
  error?: string;
}

/**
 * Check if subdomain is available
 */
export async function checkSubdomainAvailability(
  subdomain: string
): Promise<CheckSubdomainResponse> {
  return apiClient<CheckSubdomainResponse>(`/api/shops/check/${subdomain}`);
}

/**
 * Register a new shop
 */
export async function registerShop(data: RegisterShopData): Promise<RegisterShopResponse> {
  return apiClient<RegisterShopResponse>('/api/shops/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
