import { createRootRoute, Outlet } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
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
  useTelegram()
  useTelegramTheme()

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
