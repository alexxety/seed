import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Order, OrderResponse } from '@/types';

export function useCreateOrder() {
  return useMutation({
    mutationFn: async (order: Order) => {
      return apiClient<OrderResponse>('/api/send-order', {
        method: 'POST',
        body: JSON.stringify(order),
      });
    },
  });
}
