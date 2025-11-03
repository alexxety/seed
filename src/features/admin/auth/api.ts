import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { AdminLoginRequest, AdminLoginResponse } from '@/types/admin';
import { useAdminAuthStore } from './store';

// JWT default expiration is 1 hour (3600 seconds)
const JWT_EXPIRATION_SECONDS = 3600;

export function useAdminLogin() {
  const setAuth = useAdminAuthStore(state => state.setAuth);

  return useMutation({
    mutationFn: async (credentials: AdminLoginRequest) => {
      const data = await apiClient<AdminLoginResponse>('/admin/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      if (!data.success || !data.token) {
        throw new Error(data.message || 'Ошибка аутентификации');
      }

      return data;
    },
    onSuccess: data => {
      if (data.token) {
        setAuth(data.token, JWT_EXPIRATION_SECONDS, data.admin, data.tenant);
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
