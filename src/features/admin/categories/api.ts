import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { Category, CategoryFormData } from '@/types';

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const response = await apiFetch<{ success: boolean; category: Category }>(
        '/api/admin/categories',
        {
          method: 'POST',
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
      const response = await apiFetch<{ success: boolean; category: Category }>(
        `/api/admin/categories/${id}`,
        {
          method: 'PUT',
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
      await apiFetch<{ success: boolean }>(`/api/admin/categories/${id}`, {
        method: 'DELETE',
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
