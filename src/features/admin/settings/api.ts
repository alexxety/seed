import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAdminAuthStore } from '../auth/store'

export interface Setting {
  id: number
  key: string
  value: string
  label: string
  description?: string
  type: 'text' | 'number' | 'secret' | 'textarea'
  category: 'telegram' | 'bot' | 'system' | 'general'
  isRequired: boolean
  isEncrypted: boolean
  updatedAt: string
  createdAt: string
  displayValue?: string
}

export interface SettingUpdate {
  key: string
  value: string
}

function getAuthHeaders() {
  const token = useAdminAuthStore.getState().getToken()
  return {
    Authorization: `Bearer ${token}`,
  }
}

// Get all settings
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await apiClient<{ success: boolean; settings: Setting[] }>(
        '/api/admin/settings',
        {
          headers: getAuthHeaders(),
        }
      )
      return response.settings
    },
  })
}

// Get settings by category
export function useSettingsByCategory(category: string) {
  return useQuery({
    queryKey: ['settings', 'category', category],
    queryFn: async () => {
      const response = await apiClient<{ success: boolean; settings: Setting[] }>(
        `/api/admin/settings/category/${category}`,
        {
          headers: getAuthHeaders(),
        }
      )
      return response.settings
    },
  })
}

// Update single setting
export function useUpdateSetting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ key, value }: SettingUpdate) => {
      const response = await apiClient<{ success: boolean; setting: Setting }>(
        `/api/admin/settings/${key}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ value }),
        }
      )
      return response.setting
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (error: any) => {
      console.error('Error updating setting:', error)
      alert(`❌ Ошибка обновления настройки\n\n${error.message || 'Неизвестная ошибка'}`)
    },
  })
}

// Update multiple settings
export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: SettingUpdate[]) => {
      const response = await apiClient<{
        success: boolean
        results: any[]
        message: string
      }>('/api/admin/settings', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ settings }),
      })
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (error: any) => {
      console.error('Error updating settings:', error)
      alert(`❌ Ошибка обновления настроек\n\n${error.message || 'Неизвестная ошибка'}`)
    },
  })
}
