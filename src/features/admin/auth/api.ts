import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { AdminLoginRequest, AdminLoginResponse } from '@/types/admin';
import { useAdminAuthStore } from './store';

export function useAdminLogin() {
  const setAuth = useAdminAuthStore(state => state.setAuth);

  return useMutation({
    mutationFn: async (credentials: AdminLoginRequest) => {
      const data = await apiClient<AdminLoginResponse>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      if (!data.success || !data.token || !data.expiresIn) {
        throw new Error(data.message || 'Ошибка аутентификации');
      }

      return data;
    },
    onSuccess: data => {
      if (data.token && data.expiresIn) {
        setAuth(data.token, data.expiresIn);
      }
    },
  });
}

export function useAdminLogout() {
  const clearAuth = useAdminAuthStore(state => state.clearAuth);

  return () => {
    clearAuth();
  };
}
