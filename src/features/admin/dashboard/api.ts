import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { DashboardStats } from '@/types/admin';
import { useAdminAuthStore } from '../auth/store';

interface DashboardResponse {
  success: boolean;
  stats: DashboardStats;
}

function getAuthHeaders() {
  const token = useAdminAuthStore.getState().getToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const response = await apiClient<DashboardResponse>('/admin/dashboard', {
        headers: getAuthHeaders(),
      });
      return response.stats;
    },
    staleTime: 1000 * 60, // Cache for 1 minute
  });
}
