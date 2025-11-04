import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Admin, Tenant } from '@/types/admin';

interface AdminAuthStore {
  token: string | null;
  expiresAt: number | null;
  lastActivity: number;
  admin: Admin | null;
  tenant: Tenant | null;

  setAuth: (token: string, expiresIn: number, admin: Admin, tenant: Tenant) => void;
  clearAuth: () => void;
  updateActivity: () => void;
  isAuthenticated: () => boolean;
  isTokenExpired: () => boolean;
  getToken: () => string | null;
  getAdmin: () => Admin | null;
  getTenant: () => Tenant | null;
}

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 час в миллисекундах

// ============================================================================
// STORAGE KEY HELPER — Per-host isolation (Standard-2025)
// ============================================================================
const getStorageKey = (): string => {
  if (typeof window === 'undefined') return 'admin-auth-storage:default';
  return `admin-auth-storage:${window.location.host}`;
};

export const useAdminAuthStore = create<AdminAuthStore>()(
  persist(
    (set, get) => ({
      token: null,
      expiresAt: null,
      lastActivity: Date.now(),
      admin: null,
      tenant: null,

      setAuth: (token: string, expiresIn: number, admin: Admin, tenant: Tenant) => {
        const expiresAt = Date.now() + expiresIn * 1000;
        set({ token, expiresAt, lastActivity: Date.now(), admin, tenant });
      },

      clearAuth: () => {
        set({ token: null, expiresAt: null, lastActivity: Date.now(), admin: null, tenant: null });
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

        // Проверяем неактивность (только если токен не истёк)
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

      getAdmin: () => {
        const state = get();
        return state.isAuthenticated() ? state.admin : null;
      },

      getTenant: () => {
        const state = get();
        return state.isAuthenticated() ? state.tenant : null;
      },
    }),
    {
      name: getStorageKey(),
      partialize: state => ({
        token: state.token,
        expiresAt: state.expiresAt,
        lastActivity: state.lastActivity,
        admin: state.admin,
        tenant: state.tenant,
      }),
      // Обновляем lastActivity при загрузке из localStorage
      onRehydrateStorage: () => state => {
        if (state && state.token && state.expiresAt) {
          // Проверяем, не истёк ли токен
          const isExpired = Date.now() >= state.expiresAt;
          if (isExpired) {
            // Токен истёк - очищаем всё
            state.clearAuth();
          } else {
            // Токен валиден - обновляем lastActivity на текущее время
            state.updateActivity();
          }
        }
      },
    }
  )
);
