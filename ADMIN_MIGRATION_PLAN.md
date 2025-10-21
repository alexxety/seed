# План миграции админ-панели на TypeScript + React Stack

## 📋 Обзор задачи

**Цель:** Интегрировать админ-панель в основное React приложение, мигрировав с отдельных HTML страниц на современный стек.

**Текущее состояние:**
- Отдельные HTML файлы в `public/`
- Vanilla JavaScript
- Инлайновый CSS
- Ручная работа с JWT токенами
- Ручные fetch запросы

**Целевое состояние:**
- Интегрировано в основное React приложение
- TypeScript с типизацией
- TanStack Router для роутинга
- TanStack Query для API
- React Hook Form + Zod для форм
- Zustand для глобального состояния (auth)
- Tailwind CSS для стилей
- Защищенные роуты с middleware

---

## 🎯 Текущая структура админки

```
public/
├── login.html          # Страница входа (270 строк)
├── admin.html          # Список заказов (565 строк)
├── products.html       # Управление товарами (752 строк)
└── categories.html     # Управление категориями (666 строк)
```

**Функциональность:**
- JWT авторизация с проверкой токена
- Таймер сессии (1 час)
- Автовыход по неактивности
- CRUD для заказов (просмотр)
- CRUD для товаров
- CRUD для категорий
- Поиск и фильтрация
- Статистика

---

## 🎯 Целевая структура

```
src/
├── features/
│   ├── admin/
│   │   ├── auth/
│   │   │   ├── store.ts              # Zustand store для auth
│   │   │   ├── api.ts                # TanStack Query hooks
│   │   │   ├── types.ts
│   │   │   └── middleware.ts         # Protected route middleware
│   │   │
│   │   ├── orders/
│   │   │   ├── api.ts                # TanStack Query hooks
│   │   │   ├── types.ts
│   │   │   ├── OrdersTable.tsx
│   │   │   └── OrderStats.tsx
│   │   │
│   │   ├── products/
│   │   │   ├── api.ts                # CRUD hooks
│   │   │   ├── types.ts
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductModal.tsx
│   │   │   └── ProductForm.tsx
│   │   │
│   │   └── categories/
│   │       ├── api.ts                # CRUD hooks
│   │       ├── types.ts
│   │       ├── CategoryCard.tsx
│   │       ├── CategoryModal.tsx
│   │       └── EmojiPicker.tsx
│   │
├── app/routes/
│   ├── admin/
│   │   ├── _layout.tsx              # Admin layout с auth middleware
│   │   ├── login.tsx                # /admin/login
│   │   ├── index.tsx                # /admin - заказы
│   │   ├── products.tsx             # /admin/products
│   │   └── categories.tsx           # /admin/categories
│   │
├── components/
│   └── admin/
│       ├── AdminNav.tsx             # Навигация между разделами
│       ├── SessionTimer.tsx         # Таймер сессии
│       └── ProtectedRoute.tsx       # HOC для защиты роутов
│
└── lib/
    └── auth.ts                      # JWT utilities
```

---

## 📝 Пошаговый план выполнения

### Шаг 1: Установка дополнительных зависимостей

**Команды:**
```bash
cd /home/user/seed

# Формы и валидация
npm install react-hook-form zod @hookform/resolvers

# Даты (для таймера сессии)
npm install date-fns
```

**Проверить:**
- ✅ Все пакеты установлены
- ✅ package.json обновлен

---

### Шаг 2: TypeScript типы для админки

**Создать файл:** `src/types/admin.ts`

```typescript
// Auth types
export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  success: boolean
  token: string
  expiresIn: number
}

export interface AuthUser {
  username: string
  role: 'admin'
}

// Order types
export interface AdminOrder {
  id: number
  orderNumber: string
  fullName: string
  phone: string
  deliveryType: 'address' | 'cdek'
  deliveryDetails: string
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  total: number
  telegramUsername?: string
  telegramId?: number
  telegramFirstName?: string
  telegramLastName?: string
  createdAt: string
  status: string
}

export interface OrdersResponse {
  success: boolean
  count: number
  orders: AdminOrder[]
}

// Product types (для админки)
export interface AdminProduct {
  id: number
  name: string
  price: number
  category_id: number
  image: string
  description: string
  is_active: number
  category_name?: string
  category_icon?: string
}

export interface ProductFormData {
  name: string
  category_id: number
  price: number
  image: string
  description: string
}

// Category types
export interface AdminCategory {
  id: number
  name: string
  icon: string
  created_at?: string
}

export interface CategoryFormData {
  name: string
  icon: string
}
```

**Создать файл:** `src/types/index.ts` (обновить)

```typescript
export * from './product'
export * from './category'
export * from './order'
export * from './admin'  // Добавить эту строку
```

**Проверить:**
- ✅ Типы созданы

---

### Шаг 3: Zustand Store для аутентификации

**Создать файл:** `src/features/admin/auth/store.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  tokenExpiry: number | null
  user: { username: string; role: string } | null
  isAuthenticated: boolean

  setAuth: (token: string, expiresIn: number, user: { username: string; role: string }) => void
  clearAuth: () => void
  checkExpiry: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      tokenExpiry: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, expiresIn, user) => {
        const tokenExpiry = Date.now() + expiresIn * 1000
        set({
          token,
          tokenExpiry,
          user,
          isAuthenticated: true,
        })
      },

      clearAuth: () => {
        set({
          token: null,
          tokenExpiry: null,
          user: null,
          isAuthenticated: false,
        })
      },

      checkExpiry: () => {
        const { tokenExpiry } = get()
        if (!tokenExpiry || Date.now() >= tokenExpiry) {
          get().clearAuth()
          return false
        }
        return true
      },
    }),
    {
      name: 'admin-auth-storage',
    }
  )
)
```

**Проверить:**
- ✅ Auth store создан

---

### Шаг 4: API слой для админки (TanStack Query)

**Создать файл:** `src/features/admin/auth/api.ts`

```typescript
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { LoginCredentials, LoginResponse, AuthUser } from '@/types/admin'
import { useAuthStore } from './store'

export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth)

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      return apiClient<LoginResponse>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      })
    },
    onSuccess: (data) => {
      setAuth(data.token, data.expiresIn, { username: 'admin', role: 'admin' })
    },
  })
}

export function useVerifyToken() {
  const token = useAuthStore((state) => state.token)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  return useQuery({
    queryKey: ['verify-token'],
    queryFn: async () => {
      if (!token) throw new Error('No token')

      return apiClient<{ success: boolean; user: AuthUser }>('/api/admin/verify', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    },
    enabled: !!token,
    retry: false,
    onError: () => {
      clearAuth()
    },
  })
}

export function useLogout() {
  const token = useAuthStore((state) => state.token)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  return useMutation({
    mutationFn: async () => {
      if (!token) return

      await apiClient('/api/admin/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    },
    onSettled: () => {
      clearAuth()
    },
  })
}
```

**Создать файл:** `src/features/admin/orders/api.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { OrdersResponse } from '@/types/admin'
import { useAuthStore } from '../auth/store'

export function useOrders(limit = 100) {
  const token = useAuthStore((state) => state.token)

  return useQuery({
    queryKey: ['admin-orders', limit],
    queryFn: async () => {
      if (!token) throw new Error('Not authenticated')

      return apiClient<OrdersResponse>(`/api/orders?limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    },
    enabled: !!token,
    refetchInterval: 30000, // Автообновление каждые 30 секунд
  })
}
```

**Создать файл:** `src/features/admin/products/api.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { AdminProduct, ProductFormData } from '@/types/admin'
import { useAuthStore } from '../auth/store'

export function useAdminProducts() {
  return useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const data = await apiClient<{ success: boolean; products: AdminProduct[] }>('/api/products')
      return data.products
    },
  })
}

export function useCreateProduct() {
  const token = useAuthStore((state) => state.token)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (product: ProductFormData) => {
      return apiClient('/api/admin/products', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(product),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] }) // Клиентский кэш
    },
  })
}

export function useUpdateProduct() {
  const token = useAuthStore((state) => state.token)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, product }: { id: number; product: ProductFormData }) => {
      return apiClient(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(product),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteProduct() {
  const token = useAuthStore((state) => state.token)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      return apiClient(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
```

**Создать файл:** `src/features/admin/categories/api.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { AdminCategory, CategoryFormData } from '@/types/admin'
import { useAuthStore } from '../auth/store'

export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const data = await apiClient<{ success: boolean; categories: AdminCategory[] }>('/api/categories')
      return data.categories
    },
  })
}

export function useCreateCategory() {
  const token = useAuthStore((state) => state.token)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (category: CategoryFormData) => {
      return apiClient('/api/admin/categories', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(category),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useUpdateCategory() {
  const token = useAuthStore((state) => state.token)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, category }: { id: number; category: CategoryFormData }) => {
      return apiClient(`/api/admin/categories/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(category),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useDeleteCategory() {
  const token = useAuthStore((state) => state.token)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      return apiClient(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}
```

**Проверить:**
- ✅ Все API слои созданы

---

### Шаг 5: Компоненты админки

**Создать файл:** `src/components/admin/SessionTimer.tsx`

```typescript
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/features/admin/auth/store'
import { useLogout } from '@/features/admin/auth/api'

export function SessionTimer() {
  const tokenExpiry = useAuthStore((state) => state.tokenExpiry)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const logout = useLogout()

  useEffect(() => {
    if (!tokenExpiry) return

    const interval = setInterval(() => {
      const remaining = tokenExpiry - Date.now()

      if (remaining <= 0) {
        logout.mutate()
        return
      }

      const minutes = Math.floor(remaining / 60000)
      const seconds = Math.floor((remaining % 60000) / 1000)
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }, 1000)

    return () => clearInterval(interval)
  }, [tokenExpiry, logout])

  if (!timeLeft) return null

  return (
    <div className="text-sm text-gray-600">
      ⏱ Автовыход через: {timeLeft}
    </div>
  )
}
```

**Создать файл:** `src/components/admin/AdminNav.tsx`

```typescript
import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/admin', label: '📋 Заказы' },
  { to: '/admin/products', label: '📦 Товары' },
  { to: '/admin/categories', label: '🏷️ Категории' },
]

export function AdminNav() {
  const router = useRouterState()
  const currentPath = router.location.pathname

  return (
    <nav className="bg-white rounded-xl p-3 shadow-sm mb-6">
      <div className="flex gap-3">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'flex-1 py-3 px-5 rounded-lg font-semibold text-center transition-colors',
              currentPath === item.to
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
```

**Создать файл:** `src/features/admin/orders/OrderStats.tsx`

```typescript
import type { AdminOrder } from '@/types/admin'

interface OrderStatsProps {
  orders: AdminOrder[]
}

export function OrderStats({ orders }: OrderStatsProps) {
  const totalOrders = orders.length
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)
  const averageOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

  const stats = [
    { label: 'Всего заказов', value: totalOrders },
    { label: 'Общая выручка', value: `${totalRevenue.toLocaleString('ru-RU')} ₽` },
    { label: 'Средний чек', value: `${averageOrder.toLocaleString('ru-RU')} ₽` },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-gray-600 mb-2">{stat.label}</div>
          <div className="text-3xl font-bold text-blue-500">{stat.value}</div>
        </div>
      ))}
    </div>
  )
}
```

**Создать файл:** `src/features/admin/categories/EmojiPicker.tsx`

```typescript
import { cn } from '@/lib/utils'

const EMOJIS = [
  '🌱', '🌿', '🍃', '🌾', '🌲', '🌳', '🌴', '🌵',
  '🌷', '🌸', '🌺', '🌻', '🌼', '🌽', '🍀', '🍁',
  '🍂', '🍄', '🎋', '🎍', '💐', '🌹', '🥀', '🏵️',
  '🌏', '🌍', '🌎', '🪴',
]

interface EmojiPickerProps {
  selected: string
  onSelect: (emoji: string) => void
}

export function EmojiPicker({ selected, onSelect }: EmojiPickerProps) {
  return (
    <div className="grid grid-cols-8 gap-2 p-3 bg-gray-50 rounded-lg max-h-52 overflow-y-auto">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className={cn(
            'text-2xl p-2 rounded-lg border-2 transition-all hover:scale-110',
            selected === emoji
              ? 'border-blue-500 bg-blue-50'
              : 'border-transparent bg-white hover:border-blue-500'
          )}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}
```

**Проверить:**
- ✅ Компоненты созданы

---

### Шаг 6: Роутинг - Admin Layout

**Создать файл:** `src/app/routes/admin/_layout.tsx`

```typescript
import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuthStore } from '@/features/admin/auth/store'
import { useLogout } from '@/features/admin/auth/api'
import { AdminNav } from '@/components/admin/AdminNav'
import { SessionTimer } from '@/components/admin/SessionTimer'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/admin/_layout')({
  beforeLoad: ({ location }) => {
    const { isAuthenticated, checkExpiry } = useAuthStore.getState()

    // Проверяем истечение токена
    const isValid = checkExpiry()

    if (!isAuthenticated || !isValid) {
      throw redirect({
        to: '/admin/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: AdminLayout,
})

function AdminLayout() {
  const navigate = useNavigate()
  const logout = useLogout()
  const checkExpiry = useAuthStore((state) => state.checkExpiry)

  // Автопроверка истечения токена
  useEffect(() => {
    const interval = setInterval(() => {
      if (!checkExpiry()) {
        navigate({ to: '/admin/login' })
      }
    }, 5000) // Проверяем каждые 5 секунд

    return () => clearInterval(interval)
  }, [checkExpiry, navigate])

  // Отслеживание активности для автовыхода
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout

    const resetTimer = () => {
      clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(() => {
        alert('Сессия истекла из-за неактивности')
        logout.mutate()
      }, 60 * 60 * 1000) // 1 час
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach((event) => {
      document.addEventListener(event, resetTimer, true)
    })

    resetTimer()

    return () => {
      clearTimeout(inactivityTimer)
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer, true)
      })
    }
  }, [logout])

  const handleLogout = () => {
    logout.mutate()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-5">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🛒 Админ-панель</h1>
            <SessionTimer />
          </div>
          <Button onClick={handleLogout} variant="outline" className="text-red-600">
            🚪 Выход
          </Button>
        </div>

        {/* Navigation */}
        <AdminNav />

        {/* Content */}
        <Outlet />
      </div>
    </div>
  )
}
```

**Проверить:**
- ✅ Admin layout создан

---

### Шаг 7: Роут - Login

**Создать файл:** `src/app/routes/admin/login.tsx`

```typescript
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLogin } from '@/features/admin/auth/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

const loginSchema = z.object({
  username: z.string().min(1, 'Введите логин'),
  password: z.string().min(1, 'Введите пароль'),
})

type LoginForm = z.infer<typeof loginSchema>

export const Route = createFileRoute('/admin/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      await login.mutateAsync(data)
      navigate({ to: '/admin' })
    } catch (error) {
      // Ошибка уже обработана в mutation
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-purple-600 to-blue-600">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">🛒 Админ-панель</h1>
          <p className="text-gray-600">Магазин семян</p>
        </div>

        {login.isError && (
          <div className="mb-5 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {login.error?.message || 'Ошибка авторизации'}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2">Логин</label>
            <Input
              {...register('username')}
              type="text"
              autoComplete="username"
              className={errors.username ? 'border-red-500' : ''}
            />
            {errors.username && (
              <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Пароль</label>
            <Input
              {...register('password')}
              type="password"
              autoComplete="current-password"
              className={errors.password ? 'border-red-500' : ''}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? 'Вход...' : 'Войти'}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
          <h3 className="font-semibold mb-2">🔒 Защита по стандартам 2025:</h3>
          <ul className="space-y-1">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              JWT токены с истечением
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Bcrypt хэширование паролей
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Rate limiting (защита от брутфорса)
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Автовыход через 1 час неактивности
            </li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
```

**Проверить:**
- ✅ Login страница создана

---

### Шаг 8: Роут - Заказы (Admin Index)

**Создать файл:** `src/app/routes/admin/index.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useOrders } from '@/features/admin/orders/api'
import { OrderStats } from '@/features/admin/orders/OrderStats'
import { Input } from '@/components/ui/input'
import type { AdminOrder } from '@/types/admin'

export const Route = createFileRoute('/admin/')({
  component: OrdersPage,
})

function OrdersPage() {
  const { data, isLoading, error } = useOrders()
  const [searchTerm, setSearchTerm] = useState('')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <div className="text-lg text-gray-600">Загрузка заказов...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-5 rounded-xl">
        ❌ Ошибка загрузки заказов: {error.message}
      </div>
    )
  }

  const orders = data?.orders || []

  // Фильтрация заказов
  const filteredOrders = orders.filter((order) => {
    const term = searchTerm.toLowerCase()
    return (
      order.orderNumber.toLowerCase().includes(term) ||
      order.fullName.toLowerCase().includes(term) ||
      order.phone.includes(term) ||
      order.telegramUsername?.toLowerCase().includes(term) ||
      order.deliveryDetails.toLowerCase().includes(term)
    )
  })

  return (
    <div>
      <OrderStats orders={orders} />

      {/* Поиск */}
      <div className="bg-white p-5 rounded-xl shadow-sm mb-6">
        <Input
          type="text"
          placeholder="🔍 Поиск по номеру заказа, имени, телефону..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Таблица заказов */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-500 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">№ Заказа</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Дата</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Клиент</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Телефон</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Telegram</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Доставка</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Товары</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Сумма</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                    Заказов не найдено
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => <OrderRow key={order.id} order={order} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function OrderRow({ order }: { order: AdminOrder }) {
  const date = new Date(order.createdAt).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const deliveryLabel = order.deliveryType === 'address' ? '📍 Адрес' : '📦 ПВЗ'

  let telegramInfo = '-'
  if (order.telegramUsername) {
    telegramInfo = `@${order.telegramUsername}`
  } else if (order.telegramFirstName || order.telegramLastName) {
    telegramInfo = [order.telegramFirstName, order.telegramLastName].filter(Boolean).join(' ')
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <span className="font-mono font-semibold text-blue-500">{order.orderNumber}</span>
      </td>
      <td className="px-4 py-3 text-sm">{date}</td>
      <td className="px-4 py-3">{order.fullName}</td>
      <td className="px-4 py-3 font-mono text-sm">{order.phone}</td>
      <td className="px-4 py-3 text-sm">
        <div>{telegramInfo}</div>
        {order.telegramId && <div className="text-xs text-gray-500">ID: {order.telegramId}</div>}
      </td>
      <td className="px-4 py-3">
        <div className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
          {deliveryLabel}
        </div>
        <div className="text-xs text-gray-600 mt-1">{order.deliveryDetails}</div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {order.items.map((item, i) => (
          <div key={i}>
            {item.name} x{item.quantity}
          </div>
        ))}
      </td>
      <td className="px-4 py-3 font-bold text-green-600">
        {order.total.toLocaleString('ru-RU')} ₽
      </td>
      <td className="px-4 py-3">
        <span className="inline-block px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
          {order.status}
        </span>
      </td>
    </tr>
  )
}
```

**Проверить:**
- ✅ Страница заказов создана

---

### Шаг 9: Роут - Товары (требует форму)

**Создать файл:** `src/features/admin/products/ProductForm.tsx`

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ProductFormData, AdminProduct } from '@/types/admin'

const productSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  category_id: z.number().min(1, 'Выберите категорию'),
  price: z.number().min(1, 'Введите цену'),
  image: z.string().url('Введите корректный URL'),
  description: z.string().min(1, 'Введите описание'),
})

interface ProductFormProps {
  product?: AdminProduct
  categories: Array<{ id: number; name: string; icon: string }>
  onSubmit: (data: ProductFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export function ProductForm({ product, categories, onSubmit, onCancel, isSubmitting }: ProductFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name,
          category_id: product.category_id,
          price: product.price,
          image: product.image,
          description: product.description,
        }
      : undefined,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold mb-2">Название товара *</label>
        <Input {...register('name')} className={errors.name ? 'border-red-500' : ''} />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Категория *</label>
        <select
          {...register('category_id', { valueAsNumber: true })}
          className={`w-full px-3 py-2 border rounded-lg ${errors.category_id ? 'border-red-500' : 'border-gray-300'}`}
        >
          <option value="">Выберите категорию</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
        {errors.category_id && <p className="text-red-500 text-sm mt-1">{errors.category_id.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Цена (₽) *</label>
        <Input
          {...register('price', { valueAsNumber: true })}
          type="number"
          min="0"
          step="1"
          className={errors.price ? 'border-red-500' : ''}
        />
        {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">URL изображения *</label>
        <Input
          {...register('image')}
          type="url"
          placeholder="https://example.com/image.jpg"
          className={errors.image ? 'border-red-500' : ''}
        />
        {errors.image && <p className="text-red-500 text-sm mt-1">{errors.image.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Описание *</label>
        <textarea
          {...register('description')}
          rows={4}
          className={`w-full px-3 py-2 border rounded-lg resize-y ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" onClick={onCancel} variant="outline">
          Отмена
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>
    </form>
  )
}
```

**Создать файл:** `src/app/routes/admin/products.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  useAdminProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '@/features/admin/products/api'
import { useAdminCategories } from '@/features/admin/categories/api'
import { ProductForm } from '@/features/admin/products/ProductForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import type { AdminProduct, ProductFormData } from '@/types/admin'

export const Route = createFileRoute('/admin/products')({
  component: ProductsPage,
})

function ProductsPage() {
  const { data: products, isLoading } = useAdminProducts()
  const { data: categories } = useAdminCategories()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null)

  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()

  const handleSubmit = async (data: ProductFormData) => {
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, product: data })
      } else {
        await createProduct.mutateAsync(data)
      }
      setModalOpen(false)
      setEditingProduct(null)
    } catch (error) {
      alert('Ошибка при сохранении товара')
    }
  }

  const handleDelete = async (product: AdminProduct) => {
    if (!confirm(`Вы уверены, что хотите удалить товар "${product.name}"?`)) return

    try {
      await deleteProduct.mutateAsync(product.id)
    } catch (error) {
      alert('Ошибка при удалении товара')
    }
  }

  if (isLoading) {
    return <div className="text-center py-20">Загрузка товаров...</div>
  }

  const filteredProducts = (products || []).filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoryFilter || p.category_id === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div>
      {/* Фильтры */}
      <div className="bg-white p-5 rounded-xl shadow-sm mb-6 flex gap-4">
        <Input
          type="text"
          placeholder="🔍 Поиск по названию..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-2 border border-gray-300 rounded-lg min-w-[200px]"
        >
          <option value="">Все категории</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
        <Button
          onClick={() => {
            setEditingProduct(null)
            setModalOpen(true)
          }}
        >
          + Добавить товар
        </Button>
      </div>

      {/* Grid товаров */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-48 object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/280x200?text=No+Image'
              }}
            />
            <div className="p-4">
              <div className="text-xs text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded mb-2">
                {product.category_icon} {product.category_name}
              </div>
              <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
              <div className="text-2xl font-bold text-green-600 mb-3">
                {product.price.toLocaleString('ru-RU')} ₽
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingProduct(product)
                    setModalOpen(true)
                  }}
                  className="flex-1"
                >
                  ✏️ Изменить
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(product)} className="flex-1">
                  🗑️ Удалить
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-50">
          <Card className="max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingProduct ? 'Редактировать товар' : 'Добавить товар'}
            </h2>
            <ProductForm
              product={editingProduct || undefined}
              categories={categories || []}
              onSubmit={handleSubmit}
              onCancel={() => {
                setModalOpen(false)
                setEditingProduct(null)
              }}
              isSubmitting={createProduct.isPending || updateProduct.isPending}
            />
          </Card>
        </div>
      )}
    </div>
  )
}
```

**Проверить:**
- ✅ Страница товаров создана

---

### Шаг 10: Роут - Категории

**Создать файл:** `src/app/routes/admin/categories.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/features/admin/categories/api'
import { useAdminProducts } from '@/features/admin/products/api'
import { EmojiPicker } from '@/features/admin/categories/EmojiPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import type { AdminCategory, CategoryFormData } from '@/types/admin'

const categorySchema = z.object({
  name: z.string().min(1, 'Введите название'),
  icon: z.string().min(1, 'Выберите иконку'),
})

export const Route = createFileRoute('/admin/categories')({
  component: CategoriesPage,
})

function CategoriesPage() {
  const { data: categories, isLoading } = useAdminCategories()
  const { data: products } = useAdminProducts()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null)

  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: editingCategory || { name: '', icon: '' },
  })

  const selectedIcon = watch('icon')

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, category: data })
      } else {
        await createCategory.mutateAsync(data)
      }
      setModalOpen(false)
      setEditingCategory(null)
      reset()
    } catch (error) {
      alert('Ошибка при сохранении категории')
    }
  }

  const handleDelete = async (category: AdminCategory) => {
    const count = products?.filter((p) => p.category_id === category.id).length || 0
    if (count > 0) {
      alert(
        `Невозможно удалить категорию "${category.name}"!\n\nВ этой категории находится товаров: ${count}\n\nСначала удалите все товары из этой категории.`
      )
      return
    }

    if (!confirm(`Вы уверены, что хотите удалить категорию "${category.name}"?`)) return

    try {
      await deleteCategory.mutateAsync(category.id)
    } catch (error) {
      alert('Ошибка при удалении категории')
    }
  }

  const openModal = (category?: AdminCategory) => {
    if (category) {
      setEditingCategory(category)
      reset(category)
    } else {
      setEditingCategory(null)
      reset({ name: '', icon: '' })
    }
    setModalOpen(true)
  }

  if (isLoading) {
    return <div className="text-center py-20">Загрузка категорий...</div>
  }

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Button onClick={() => openModal()}>+ Добавить категорию</Button>
      </div>

      {/* Grid категорий */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {categories?.map((category) => {
          const count = products?.filter((p) => p.category_id === category.id).length || 0
          return (
            <Card key={category.id} className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-3">{category.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{category.name}</h3>
              <div className="text-sm text-gray-600 mb-4">Товаров: {count}</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openModal(category)} className="flex-1">
                  ✏️ Изменить
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(category)} className="flex-1">
                  🗑️ Удалить
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-50">
          <Card className="max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold mb-6">
              {editingCategory ? 'Редактировать категорию' : 'Добавить категорию'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2">Иконка (эмодзи) *</label>
                <EmojiPicker selected={selectedIcon} onSelect={(emoji) => setValue('icon', emoji)} />
                <Input {...register('icon')} readOnly className={`mt-2 ${errors.icon ? 'border-red-500' : ''}`} />
                {errors.icon && <p className="text-red-500 text-sm mt-1">{errors.icon.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Название категории *</label>
                <Input
                  {...register('name')}
                  placeholder="Например: Автоцветы"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setModalOpen(false)
                    setEditingCategory(null)
                    reset()
                  }}
                  variant="outline"
                >
                  Отмена
                </Button>
                <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending}>
                  {createCategory.isPending || updateCategory.isPending ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
```

**Проверить:**
- ✅ Страница категорий создана

---

### Шаг 11: Удаление старых HTML файлов

**После проверки, что всё работает:**

```bash
cd /home/user/seed
rm public/login.html
rm public/admin.html
rm public/products.html
rm public/categories.html
```

**Или переместить в архив:**
```bash
mkdir -p public/__old_admin__
mv public/*.html public/__old_admin__/
```

**Проверить:**
- ✅ Старые HTML файлы удалены или заархивированы

---

### Шаг 12: Тестирование

**Локальное тестирование:**
```bash
npm run dev
```

**Проверить в браузере:**
1. ✅ `/admin/login` - страница входа работает
2. ✅ Вход с admin/seed2025 работает
3. ✅ Редирект на `/admin` после входа
4. ✅ Таймер сессии отображается
5. ✅ Навигация между разделами работает
6. ✅ Список заказов загружается
7. ✅ Поиск заказов работает
8. ✅ CRUD товаров работает
9. ✅ CRUD категорий работает
10. ✅ Выход работает
11. ✅ Автовыход по истечению токена
12. ✅ Защита роутов работает (редирект на login)

**Проверить TypeScript:**
```bash
npx tsc --noEmit
```

**Проверить сборку:**
```bash
npm run build
```

---

### Шаг 13: Коммит и деплой

**Команды:**
```bash
git add .
git commit -m "Migrate admin panel to React + TypeScript

- Integrate admin panel into main React app
- Add admin routes: /admin/login, /admin, /admin/products, /admin/categories
- Implement JWT auth with Zustand store
- Add protected routes with middleware
- Add TanStack Query for all admin API calls
- Add React Hook Form + Zod for forms
- Add session timer and auto-logout
- Migrate all admin HTML pages to React components
- Remove old HTML admin files

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push
```

**Проверить:**
- ✅ Коммит создан
- ✅ Изменения запушены
- ✅ GitHub Actions запущен
- ✅ Деплой прошел успешно
- ✅ Проверка на production

---

## ✅ Чеклист готовности

### Перед началом:
- [ ] Клиентская миграция (MIGRATION_PLAN.md) завершена
- [ ] Все зависимости установлены
- [ ] TypeScript настроен

### Во время:
- [ ] Типы для админки созданы
- [ ] Auth store с Zustand работает
- [ ] API слой с TanStack Query работает
- [ ] Все компоненты созданы
- [ ] Admin layout с middleware работает
- [ ] Все роуты созданы и работают
- [ ] Формы с валидацией работают
- [ ] Старые HTML файлы удалены

### После:
- [ ] `npm run dev` работает
- [ ] `npx tsc --noEmit` без ошибок
- [ ] `npm run build` успешен
- [ ] Вход в админку работает
- [ ] Все CRUD операции работают
- [ ] Таймер сессии работает
- [ ] Автовыход работает
- [ ] Защита роутов работает
- [ ] Деплой на production прошел успешно

---

## 🚨 Важные примечания

1. **Порядок миграции:** Сначала клиентская часть (MIGRATION_PLAN.md), потом админка
2. **Backend не меняется:** Все API endpoints остаются прежними
3. **Роуты админки:** `/admin/login`, `/admin`, `/admin/products`, `/admin/categories`
4. **Доступ к админке:** Через основное приложение, НЕ отдельный домен
5. **Сессия:** 1 час с автовыходом по неактивности
6. **Защита:** Middleware проверяет JWT токен на каждом роуте

---

## 📚 Полезные ресурсы

- **React Hook Form:** https://react-hook-form.com/
- **Zod:** https://zod.dev/
- **TanStack Router Protected Routes:** https://tanstack.com/router/latest/docs/guide/navigation
- **Zustand Persist:** https://docs.pmnd.rs/zustand/integrations/persisting-store-data

---

## 🎯 Ожидаемый результат

После выполнения всех шагов:

✅ Админка полностью интегрирована в React приложение
✅ Единая кодовая база для клиента и админки
✅ Type-safe роутинг и API
✅ Формы с автоматической валидацией
✅ Защищенные роуты с middleware
✅ Таймер сессии и автовыход
✅ Современный UI на Tailwind CSS
✅ Полная обратная совместимость с backend
✅ Работающий автодеплой

---

**Время выполнения:** 1-2 дня (после клиентской миграции)
**Сложность:** Средняя
**Риски:** Низкие (можно откатиться)
