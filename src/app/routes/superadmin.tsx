import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';
import { useSuperAdminAuthStore } from '@/features/superadmin/store';

export const Route = createFileRoute('/superadmin')({
  component: () => <Outlet />,
  beforeLoad: ({ location }) => {
    // Только для точного пути /superadmin (не дочерних маршрутов)
    if (location.pathname === '/superadmin') {
      const isAuthenticated = useSuperAdminAuthStore.getState().isAuthenticated();
      if (isAuthenticated) {
        throw redirect({ to: '/superadmin/shops' });
      } else {
        throw redirect({ to: '/superadmin/login' });
      }
    }
  },
});
