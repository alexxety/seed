import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Order, UpdateOrderStatusRequest } from '@/types/admin';
import { useAdminAuthStore } from '../auth/store';

interface OrdersResponse {
  success: boolean;
  orders: Order[];
}

interface OrderDetailsResponse {
  success: boolean;
  order: Order;
}

function getAuthHeaders() {
  const token = useAdminAuthStore.getState().getToken();
  if (!token) {
    throw new Error('No authentication token available');
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function useAdminOrders() {
  return useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: async () => {
      const data = await apiClient<OrdersResponse>('/admin/orders', {
        headers: getAuthHeaders(),
      });
      return data.orders;
    },
    staleTime: 1000 * 30, // 30 секунд
  });
}

export function useAdminOrder(id: string) {
  return useQuery({
    queryKey: ['admin', 'orders', id],
    queryFn: async () => {
      const data = await apiClient<OrderDetailsResponse>(`/admin/orders/${id}`, {
        headers: getAuthHeaders(),
      });
      return data.order;
    },
    enabled: !!id,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      paid,
    }: {
      id: string;
      status: UpdateOrderStatusRequest['status'];
      paid?: boolean;
    }) => {
      const data = await apiClient<{ success: boolean; order: Order }>(
        `/admin/orders/${id}/status`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status, paid }),
        }
      );
      return data.order;
    },
    onSuccess: updatedOrder => {
      // Обновляем кэш списка заказов
      queryClient.setQueryData<Order[]>(['admin', 'orders'], old =>
        old?.map(order => (order.id === updatedOrder.id ? updatedOrder : order))
      );
      // Обновляем кэш конкретного заказа
      queryClient.setQueryData(['admin', 'orders', updatedOrder.id], updatedOrder);
    },
  });
}
