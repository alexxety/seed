import { createRootRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useTelegram, useTelegramTheme } from '@/lib/telegram'
import { useEffect } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 минут
      retry: 1,
    },
  },
})

function RootComponent() {
  useTelegram()
  useTelegramTheme()
  const navigate = useNavigate()

  // Автоматический роутинг по домену
  useEffect(() => {
    const hostname = window.location.hostname
    const pathname = window.location.pathname

    // Не редиректим на localhost для разработки
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return
    }

    // Супер-админ домены
    if (hostname === 'admin.x-bro.com' || hostname === 'dev-admin.x-bro.com') {
      if (!pathname.startsWith('/superadmin')) {
        console.log('Redirecting to super-admin panel...')
        navigate({ to: '/superadmin/login' })
      }
      return
    }

    // Главная страница с регистрацией
    if (hostname === 'x-bro.com' || hostname === 'dev.x-bro.com') {
      if (pathname === '/') {
        console.log('Redirecting to registration page...')
        navigate({ to: '/register' })
      }
      return
    }

    // Все остальные домены - обычный магазин (deva.x-bro.com, seed.x-bro.com, пользовательские)
    // Показываем каталог по умолчанию
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-tg-bg text-tg-text">
        <Outlet />
      </div>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})
