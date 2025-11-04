import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Category, CategoryFormData } from '@/types';
import { useAdminAuthStore } from '../auth/store';

function getAuthHeaders() {
  const token = useAdminAuthStore.getState().getToken();
  if (!token) {
    throw new Error('No authentication token available');
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const response = await apiClient<{ success: boolean; category: Category }>(
        '/api/admin/categories',
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }
      );
      return response.category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any) => {
      console.error('Error creating category:', error);
      alert(`❌ Ошибка создания категории\n\n${error.message || 'Неизвестная ошибка'}`);
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CategoryFormData }) => {
      const response = await apiClient<{ success: boolean; category: Category }>(
        `/api/admin/categories/${id}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }
      );
      return response.category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any) => {
      console.error('Error updating category:', error);
      alert(`❌ Ошибка обновления категории\n\n${error.message || 'Неизвестная ошибка'}`);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient<{ success: boolean }>(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any) => {
      // Показываем ошибку пользователю
      if (error.message) {
        alert(error.message);
      }
    },
  });
}
