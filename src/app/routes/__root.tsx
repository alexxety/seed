import { createRootRoute, Outlet } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTelegram, useTelegramTheme } from '@/lib/telegram'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 минут
      retry: 1,
    },
  },
})

function RootComponent() {
  console.log('🎨 RootComponent rendering')

  // Отключаем Telegram хуки для тестирования
  // useTelegram()
  // useTelegramTheme()

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-900 text-white">
        <Outlet />
      </div>
    </QueryClientProvider>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})
