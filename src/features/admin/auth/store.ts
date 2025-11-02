import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminAuthStore {
  token: string | null;
  expiresAt: number | null;
  lastActivity: number;

  setAuth: (token: string, expiresIn: number) => void;
  clearAuth: () => void;
  updateActivity: () => void;
  isAuthenticated: () => boolean;
  isTokenExpired: () => boolean;
  getToken: () => string | null;
}

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 час в миллисекундах

export const useAdminAuthStore = create<AdminAuthStore>()(
  persist(
    (set, get) => ({
      token: null,
      expiresAt: null,
      lastActivity: Date.now(),

      setAuth: (token: string, expiresIn: number) => {
        const expiresAt = Date.now() + expiresIn * 1000;
        set({ token, expiresAt, lastActivity: Date.now() });
      },

      clearAuth: () => {
        set({ token: null, expiresAt: null, lastActivity: Date.now() });
      },

      updateActivity: () => {
        set({ lastActivity: Date.now() });
      },

      isAuthenticated: () => {
        const state = get();
        if (!state.token || !state.expiresAt) return false;

        // Проверяем истечение токена
        if (state.isTokenExpired()) {
          state.clearAuth();
          return false;
        }

        // Проверяем неактивность
        const inactive = Date.now() - state.lastActivity > INACTIVITY_TIMEOUT;
        if (inactive) {
          state.clearAuth();
          return false;
        }

        return true;
      },

      isTokenExpired: () => {
        const state = get();
        if (!state.expiresAt) return true;
        return Date.now() >= state.expiresAt;
      },

      getToken: () => {
        const state = get();
        if (state.isAuthenticated()) {
          state.updateActivity();
          return state.token;
        }
        return null;
      },
    }),
    {
      name: 'admin-auth-storage',
      partialize: state => ({
        token: state.token,
        expiresAt: state.expiresAt,
        lastActivity: state.lastActivity,
      }),
    }
  )
);
