import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useSuperAdminAuthStore } from '@/features/superadmin/store'
import { apiClient } from '@/lib/api-client'

export const Route = createFileRoute('/superadmin/login')({
  component: SuperAdminLoginPage,
})

const loginSchema = z.object({
  email: z.string().min(1, 'Требуется логин или email'),
  password: z.string().min(6, 'Минимум 6 символов'),
})

type LoginForm = z.infer<typeof loginSchema>

interface LoginResponse {
  success: boolean
  token: string
  expiresIn: number
}

function SuperAdminLoginPage() {
  const navigate = useNavigate()
  const setAuth = useSuperAdminAuthStore((state) => state.setAuth)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginForm) => {
      return await apiClient<LoginResponse>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      })
    },
    onSuccess: (data) => {
      setAuth(data.token, data.expiresIn)
      navigate({ to: '/superadmin/shops' })
    },
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      await loginMutation.mutateAsync(data)
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <Card className="w-full max-w-md p-8 bg-gray-800 border-gray-700">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔐</div>
          <h1 className="text-2xl font-bold text-white">Супер-Админ Панель</h1>
          <p className="text-gray-400 text-sm mt-2">Управление всеми магазинами</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Логин или Email
            </label>
            <Input
              type="text"
              {...register('email')}
              className={`bg-gray-700 border-gray-600 text-white ${
                errors.email ? 'border-red-500' : ''
              }`}
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Пароль</label>
            <Input
              type="password"
              {...register('password')}
              className={`bg-gray-700 border-gray-600 text-white ${
                errors.password ? 'border-red-500' : ''
              }`}
            />
            {errors.password && (
              <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          {loginMutation.isError && (
            <div className="bg-red-900/30 border border-red-700 rounded p-3">
              <p className="text-red-400 text-sm">
                ❌ Ошибка входа. Проверьте учётные данные.
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Вход...' : 'Войти'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-xs text-gray-500 text-center">
            Доступ только для суперадминистраторов системы
          </p>
        </div>
      </Card>
    </div>
  )
}
