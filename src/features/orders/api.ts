import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CreateOrderRequest, OrderResponse } from '@/types';

export function useCreateOrder() {
  return useMutation({
    mutationFn: async (order: CreateOrderRequest) => {
      return apiClient<OrderResponse>('/api/send-order', {
        method: 'POST',
        body: JSON.stringify(order),
      });
    },
  });
}
