import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Product, ProductFormData } from '@/types'
import { useAdminAuthStore } from '../auth/store'

function getAuthHeaders() {
  const token = useAdminAuthStore.getState().getToken()
  return {
    Authorization: `Bearer ${token}`,
  }
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await apiClient<{ success: boolean; product: any }>(
        '/api/admin/products',
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }
      )
      return response.product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProductFormData }) => {
      const response = await apiClient<{ success: boolean; product: any }>(
        `/api/admin/products/${id}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }
      )
      return response.product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient<{ success: boolean }>(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
