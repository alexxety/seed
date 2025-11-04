import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { Product, ProductFormData } from '@/types/admin';

interface ProductsResponse {
  success: boolean;
  products: Product[];
}

interface ProductResponse {
  success: boolean;
  product: Product;
}

export function useAdminProducts() {
  return useQuery({
    queryKey: ['admin', 'products'],
    queryFn: async () => {
      const data = await apiFetch<ProductsResponse>('/admin/api/products');
      return data.products;
    },
  });
}

export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: ['admin', 'products', id],
    queryFn: async () => {
      const data = await apiFetch<ProductResponse>(`/admin/api/products/${id}`);
      return data.product;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await apiFetch<ProductResponse>('/admin/api/products', {
        method: 'POST',
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
      const response = await apiFetch<ProductResponse>(`/admin/api/products/${id}`, {
        method: 'PUT',
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
      await apiFetch<{ success: boolean }>(`/admin/api/products/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}
