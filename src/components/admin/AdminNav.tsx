import { Link } from '@tanstack/react-router'
import { useAdminLogout } from '@/features/admin/auth/api'
import { Button } from '@/components/ui/button'

export function AdminNav() {
  const logout = useAdminLogout()

  const handleLogout = () => {
    logout()
    window.location.href = '/admin/login'
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex gap-4">
          <Link
            to="/admin/orders"
            className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
            activeProps={{ className: 'bg-tg-button text-white' }}
          >
            Заказы
          </Link>
          <Link
            to="/admin/products"
            className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
            activeProps={{ className: 'bg-tg-button text-white' }}
          >
            Товары
          </Link>
          <Link
            to="/admin/categories"
            className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
            activeProps={{ className: 'bg-tg-button text-white' }}
          >
            Категории
          </Link>
          <Link
            to="/admin/settings"
            className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
            activeProps={{ className: 'bg-tg-button text-white' }}
          >
            Настройки
          </Link>
        </div>
        <Button onClick={handleLogout} variant="outline" size="sm">
          Выйти
        </Button>
      </div>
    </nav>
  )
}
