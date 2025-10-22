import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Order, UpdateOrderStatusRequest } from '@/types/admin'
import { useAdminAuthStore } from '../auth/store'

interface OrdersResponse {
  success: boolean
  orders: Order[]
}

interface OrderDetailsResponse {
  success: boolean
  order: Order
}

function getAuthHeaders() {
  const token = useAdminAuthStore.getState().getToken()
  return {
    Authorization: `Bearer ${token}`,
  }
}

export function useAdminOrders() {
  return useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: async () => {
      const data = await apiClient<OrdersResponse>('/api/orders', {
        headers: getAuthHeaders(),
      })
      return data.orders
    },
    staleTime: 1000 * 30, // 30 секунд
  })
}

export function useAdminOrder(id: number) {
  return useQuery({
    queryKey: ['admin', 'orders', id],
    queryFn: async () => {
      const data = await apiClient<OrderDetailsResponse>(`/api/orders/${id}`, {
        headers: getAuthHeaders(),
      })
      return data.order
    },
    enabled: !!id,
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: UpdateOrderStatusRequest['status'] }) => {
      const data = await apiClient<{ success: boolean; order: Order }>(
        `/api/orders/${id}`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status }),
        }
      )
      return data.order
    },
    onSuccess: (updatedOrder) => {
      // Обновляем кэш списка заказов
      queryClient.setQueryData<Order[]>(['admin', 'orders'], (old) =>
        old?.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
      )
      // Обновляем кэш конкретного заказа
      queryClient.setQueryData(['admin', 'orders', updatedOrder.id], updatedOrder)
    },
  })
}

export function useDeleteOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient<{ success: boolean; message: string }>(
        `/api/orders/${id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      )
      return id
    },
    onSuccess: (deletedId) => {
      // Удаляем заказ из кэша списка заказов
      queryClient.setQueryData<Order[]>(['admin', 'orders'], (old) =>
        old?.filter((order) => order.id !== deletedId)
      )
      // Удаляем кэш конкретного заказа
      queryClient.removeQueries({ queryKey: ['admin', 'orders', deletedId] })
    },
  })
}
