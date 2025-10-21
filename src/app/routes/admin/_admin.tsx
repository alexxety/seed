import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAdminAuthStore } from '@/features/admin/auth/store'
import { AdminNav } from '@/components/admin/AdminNav'
import { SessionTimer } from '@/components/admin/SessionTimer'

export const Route = createFileRoute('/admin/_admin')({
  beforeLoad: () => {
    const isAuthenticated = useAdminAuthStore.getState().isAuthenticated()
    if (!isAuthenticated) {
      throw redirect({ to: '/admin/login' })
    }
  },
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-4 flex justify-end">
          <SessionTimer />
        </div>
        <Outlet />
      </div>
    </div>
  )
}
