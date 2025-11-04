import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { DashboardStats } from '@/types/admin';

interface DashboardResponse {
  success: boolean;
  stats: DashboardStats;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const response = await apiFetch<DashboardResponse>('/admin/dashboard');
      return response.stats;
    },
    staleTime: 1000 * 60, // Cache for 1 minute
  });
}
