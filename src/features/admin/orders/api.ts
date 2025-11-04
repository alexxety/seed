import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { Order, UpdateOrderStatusRequest } from '@/types/admin';

interface OrdersResponse {
  success: boolean;
  orders: Order[];
}

interface OrderDetailsResponse {
  success: boolean;
  order: Order;
}

export function useAdminOrders() {
  return useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: async () => {
      const data = await apiFetch<OrdersResponse>('/admin/api/orders');
      return data.orders;
    },
    staleTime: 1000 * 30, // 30 секунд
  });
}

export function useAdminOrder(id: string) {
  return useQuery({
    queryKey: ['admin', 'orders', id],
    queryFn: async () => {
      const data = await apiFetch<OrderDetailsResponse>(`/admin/api/orders/${id}`);
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
      const data = await apiFetch<{ success: boolean; order: Order }>(
        `/admin/api/orders/${id}/status`,
        {
          method: 'PATCH',
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
