import { useEffect, useState } from 'react';
import { useAdminAuthStore } from '@/features/admin/auth/store';
import { useAdminLogout } from '@/features/admin/auth/api';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export function SessionTimer() {
  const { lastActivity, expiresAt } = useAdminAuthStore();
  const logout = useAdminLogout();
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!expiresAt) return null;

  // Validate dates
  if (!Number.isFinite(expiresAt) || !Number.isFinite(lastActivity)) {
    logout();
    return null;
  }

  const timeLeft = expiresAt - Date.now();
  const inactiveTime = Date.now() - lastActivity;

  if (timeLeft <= 0 || inactiveTime > 60 * 60 * 1000) {
    logout();
    return null;
  }

  try {
    return (
      <div className="text-sm text-tg-hint">
        Сессия истекает {formatDistanceToNow(expiresAt, { addSuffix: true, locale: ru })}
      </div>
    );
  } catch (error) {
    console.error('Invalid date in SessionTimer:', error);
    logout();
    return null;
  }
}
