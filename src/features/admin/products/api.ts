import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Product, ProductFormData } from '@/types/admin';
import { useAdminAuthStore } from '../auth/store';

interface ProductsResponse {
  success: boolean;
  products: Product[];
}

interface ProductResponse {
  success: boolean;
  product: Product;
}

function getAuthHeaders() {
  const token = useAdminAuthStore.getState().getToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function useAdminProducts() {
  return useQuery({
    queryKey: ['admin', 'products'],
    queryFn: async () => {
      const data = await apiClient<ProductsResponse>('/admin/products', {
        headers: getAuthHeaders(),
      });
      return data.products;
    },
  });
}

export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: ['admin', 'products', id],
    queryFn: async () => {
      const data = await apiClient<ProductResponse>(`/admin/products/${id}`, {
        headers: getAuthHeaders(),
      });
      return data.product;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await apiClient<ProductResponse>('/admin/products', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          vendor: data.vendor,
          category: data.category,
          tags: data.tags,
          is_active: data.is_active,
        }),
      });
      return response.product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductFormData }) => {
      const response = await apiClient<ProductResponse>(`/admin/products/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          vendor: data.vendor,
          category: data.category,
          tags: data.tags,
          is_active: data.is_active,
        }),
      });
      return response.product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient<{ success: boolean }>(`/admin/products/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}
