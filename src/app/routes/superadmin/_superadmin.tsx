import { createFileRoute, Outlet, redirect, Link } from '@tanstack/react-router'
import { useSuperAdminAuthStore } from '@/features/superadmin/store'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/superadmin/_superadmin')({
  beforeLoad: () => {
    const isAuthenticated = useSuperAdminAuthStore.getState().isAuthenticated()
    if (!isAuthenticated) {
      throw redirect({ to: '/superadmin/login' })
    }
  },
  component: SuperAdminLayout,
})

function SuperAdminLayout() {
  const clearAuth = useSuperAdminAuthStore((state) => state.clearAuth)

  const handleLogout = () => {
    clearAuth()
    window.location.href = '/superadmin/login'
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">🔐</span>
                Супер-Админ Панель
              </h1>
              <nav className="flex gap-2">
                <Link
                  to="/superadmin/shops"
                  className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  activeProps={{
                    className: 'bg-blue-600 text-white hover:bg-blue-700',
                  }}
                >
                  Магазины
                </Link>
              </nav>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Выйти
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
