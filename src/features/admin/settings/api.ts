import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { StoreSettings } from '@/types/admin';

interface SettingsResponse {
  success: boolean;
  settings: StoreSettings;
}

// Get store settings
export function useStoreSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const response = await apiFetch<SettingsResponse>('/admin/api/settings');
      return response.settings;
    },
  });
}

// Update store settings
export function useUpdateStoreSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<StoreSettings>) => {
      const response = await apiFetch<SettingsResponse>('/admin/api/settings', {
        method: 'PUT',
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
