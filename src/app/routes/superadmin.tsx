import { createFileRoute, redirect } from '@tanstack/react-router'
import { useSuperAdminAuthStore } from '@/features/superadmin/store'

export const Route = createFileRoute('/superadmin')({
  beforeLoad: () => {
    const isAuthenticated = useSuperAdminAuthStore.getState().isAuthenticated()
    if (isAuthenticated) {
      throw redirect({ to: '/superadmin/shops' })
    } else {
      throw redirect({ to: '/superadmin/login' })
    }
  },
})
