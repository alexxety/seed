import { createFileRoute, redirect } from '@tanstack/react-router';
import { useAdminAuthStore } from '@/features/admin/auth/store';

export const Route = createFileRoute('/admin/')({
  beforeLoad: () => {
    const isAuthenticated = useAdminAuthStore.getState().isAuthenticated();
    if (isAuthenticated) {
      throw redirect({ to: '/admin/products' });
    }
    throw redirect({ to: '/admin/login' });
  },
});
