import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { StoreSettings } from '@/types/admin';
import { useAdminAuthStore } from '../auth/store';

interface SettingsResponse {
  success: boolean;
  settings: StoreSettings;
}

function getAuthHeaders() {
  const token = useAdminAuthStore.getState().getToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

// Get store settings
export function useStoreSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const response = await apiClient<SettingsResponse>('/admin/settings', {
        headers: getAuthHeaders(),
      });
      return response.settings;
    },
  });
}

// Update store settings
export function useUpdateStoreSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<StoreSettings>) => {
      const response = await apiClient<SettingsResponse>('/admin/settings', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });
      return response.settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
    onError: (error: any) => {
      console.error('Error updating settings:', error);
      alert(`❌ Ошибка обновления настроек\n\n${error.message || 'Неизвестная ошибка'}`);
    },
  });
}
