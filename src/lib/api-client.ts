/**
 * Standard-2025 Compliant API Client
 *
 * Features:
 * - Unified apiFetch() with auto-injected Authorization
 * - Redirect guard (prevents infinite loops)
 * - Storage isolation by host
 * - Path-aware admin detection
 * - No exceptions before request
 * - Proper 401/204 handling
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================================================
// REDIRECT GUARD — Prevents infinite redirect loops
// ============================================================================
let isRedirecting = false;

// ============================================================================
// STORAGE KEY HELPER — Per-host isolation
// ============================================================================
const getStorageKey = (): string => {
  if (typeof window === 'undefined') return 'admin-auth-storage:default';
  return `admin-auth-storage:${window.location.host}`;
};

// ============================================================================
// PATH HELPER — Distinguish /admin/* from /superadmin/*
// ============================================================================
const isAdminPath = (url: string): boolean => {
  return url.startsWith('/admin/') || url.startsWith('/api/admin/');
};

// ============================================================================
// UNIFIED API CLIENT — Standard-2025 compliant
// ============================================================================
export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  // Prepare headers (use Record<string, string> for dynamic assignment)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  // Auto-inject Authorization header for admin paths
  if (typeof window !== 'undefined' && isAdminPath(url)) {
    const storageKey = getStorageKey();
    const storage = localStorage.getItem(storageKey);

    if (storage) {
      try {
        const { state } = JSON.parse(storage);
        if (state?.token) {
          headers['Authorization'] = `Bearer ${state.token}`;
        }
      } catch (error) {
        console.error('[apiFetch] Failed to parse storage:', error);
      }
    }
  }

  // Execute fetch (NO exceptions before this point)
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized with redirect guard
  if (response.status === 401 && typeof window !== 'undefined' && isAdminPath(url)) {
    if (!isRedirecting) {
      isRedirecting = true;

      // Clear storage
      const storageKey = getStorageKey();
      localStorage.removeItem(storageKey);

      // Redirect with ?next= parameter
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/admin/login')) {
        window.location.href = `/admin/login?next=${encodeURIComponent(currentPath)}`;
      }
    }

    // Throw error after redirect initiated
    throw new ApiError(401, 'Unauthorized', { error: 'Unauthorized' });
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  // Parse response body
  const contentType = response.headers.get('content-type');
  let data: any;

  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else if (contentType?.includes('text/')) {
    data = await response.text();
  } else {
    // Fallback: try JSON, then text
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }
  }

  // Handle errors
  if (!response.ok) {
    const errorMessage =
      data?.message || data?.error || `HTTP error! status: ${response.status}`;
    throw new ApiError(response.status, errorMessage, data);
  }

  return data;
}

// ============================================================================
// LEGACY ALIAS — Backward compatibility (will be removed in future)
// ============================================================================
export const apiClient = apiFetch;
