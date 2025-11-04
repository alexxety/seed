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

export async function apiClient<T>(url: string, options?: Parameters<typeof fetch>[1]): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: `HTTP error! status: ${response.status}` };
    }

    const errorMessage = errorData?.message || errorData?.error || `HTTP error! status: ${response.status}`;

    // Если 401 Unauthorized, перенаправляем на логин
    if (response.status === 401 && url.startsWith('/admin/')) {
      // Очищаем localStorage
      localStorage.removeItem('admin-auth-storage');

      // Редирект на логин
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }

    throw new ApiError(response.status, errorMessage, errorData);
  }

  return response.json();
}
