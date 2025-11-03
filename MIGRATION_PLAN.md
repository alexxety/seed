# План миграции на TypeScript + TanStack Router + TanStack Query + Tailwind CSS

## 📋 Обзор задачи

**Цель:** Мигрировать клиентскую часть Telegram Mini App с JavaScript на современный стек 2025 года.

**Текущий стек:**

- React 18.2 (JavaScript)
- Vite 5.0
- Обычный CSS
- Ручной роутинг через state (page переменная)
- Ручные fetch запросы
- useState для cart

**Целевой стек:**

- React 18.2 (TypeScript)
- Vite 5.0
- Tailwind CSS
- TanStack Router (file-based routing)
- TanStack Query (серверное состояние)
- Zustand (клиентское состояние - корзина)

**Важно:** Админка НЕ трогается! Остается как есть в `public/*.html`

---

## 🎯 Текущая структура проекта

```
src/
├── App.jsx                  # Главный компонент с ручным роутингом
├── App.css
├── main.jsx
├── index.css
├── components/
│   ├── Cart.jsx
│   ├── CategoryFilter.jsx
│   ├── Header.jsx
│   └── ProductCard.jsx
├── pages/
│   ├── ProductList.jsx
│   ├── ProductPage.jsx
│   ├── CartPage.jsx
│   ├── CheckoutPage.jsx
│   └── OrderSuccessPage.jsx
└── data/
```

---

## 🎯 Целевая структура проекта

```
src/
├── app/
│   ├── routes/
│   │   ├── __root.tsx           # Root layout с providers
│   │   ├── index.tsx            # / - главная (список товаров)
│   │   ├── product.$id.tsx      # /product/:id - страница товара
│   │   ├── cart.tsx             # /cart - корзина
│   │   ├── checkout.tsx         # /checkout - оформление
│   │   └── success.$orderNumber.tsx  # /success/:orderNumber
│   └── routeTree.gen.ts         # Auto-generated
│
├── components/
│   ├── ui/                      # UI компоненты
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── input.tsx
│   ├── ProductCard.tsx
│   ├── CategoryFilter.tsx
│   └── Header.tsx
│
├── features/
│   ├── products/
│   │   ├── api.ts              # React Query hooks
│   │   └── types.ts
│   ├── cart/
│   │   ├── store.ts            # Zustand store
│   │   └── types.ts
│   └── orders/
│       ├── api.ts
│       └── types.ts
│
├── lib/
│   ├── api-client.ts           # Fetch wrapper
│   ├── telegram.ts             # Telegram SDK hooks
│   └── utils.ts                # cn() для tailwind
│
├── types/
│   ├── index.ts                # Экспорт всех типов
│   ├── product.ts
│   ├── category.ts
│   └── order.ts
│
├── main.tsx                     # Entry point
└── styles.css                   # Tailwind imports
```

---

## 📝 Пошаговый план выполнения

### Шаг 1: Подготовка

**Команды:**

```bash
cd /home/user/seed
git checkout -b feature/migrate-to-typescript-stack
```

**Проверить:**

- ✅ Новая ветка создана
- ✅ Текущая ветка: `feature/migrate-to-typescript-stack`

---

### Шаг 2: Установка зависимостей

**Команды:**

```bash
# TypeScript
npm install -D typescript @types/react @types/react-dom @types/node

# Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# TanStack Router
npm install @tanstack/react-router
npm install -D @tanstack/router-vite-plugin @tanstack/router-devtools

# TanStack Query
npm install @tanstack/react-query
npm install -D @tanstack/react-query-devtools

# Zustand
npm install zustand

# Utility для Tailwind
npm install clsx tailwind-merge
```

**Проверить:**

- ✅ Все пакеты установлены
- ✅ package.json обновлен
- ✅ tailwind.config.js создан
- ✅ postcss.config.js создан

---

### Шаг 3: Конфигурация TypeScript

**Создать файл:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Paths */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Создать файл:** `tsconfig.node.json`

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

**Проверить:**

- ✅ tsconfig.json создан
- ✅ tsconfig.node.json создан

---

### Шаг 4: Конфигурация Tailwind CSS

**Обновить файл:** `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'tg-bg': 'var(--tg-theme-bg-color, #ffffff)',
        'tg-text': 'var(--tg-theme-text-color, #000000)',
        'tg-hint': 'var(--tg-theme-hint-color, #999999)',
        'tg-button': 'var(--tg-theme-button-color, #3390ec)',
        'tg-button-text': 'var(--tg-theme-button-text-color, #ffffff)',
      },
    },
  },
  plugins: [],
};
```

**Создать файл:** `src/styles.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* CSS переменные для Telegram */
:root {
  --tg-theme-bg-color: #ffffff;
  --tg-theme-text-color: #000000;
  --tg-theme-hint-color: #999999;
  --tg-theme-button-color: #3390ec;
  --tg-theme-button-text-color: #ffffff;
}
```

**Проверить:**

- ✅ tailwind.config.js обновлен
- ✅ src/styles.css создан

---

### Шаг 5: Конфигурация Vite

**Обновить файл:** `vite.config.js` → `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import path from 'path';

export default defineConfig({
  plugins: [react(), TanStackRouterVite()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
```

**Проверить:**

- ✅ vite.config.ts создан
- ✅ vite.config.js удален

---

### Шаг 6: Создать структуру директорий

**Команды:**

```bash
cd /home/user/seed/src

# Создать директории
mkdir -p app/routes
mkdir -p components/ui
mkdir -p features/products
mkdir -p features/cart
mkdir -p features/orders
mkdir -p lib
mkdir -p types
```

**Проверить:**

- ✅ Все директории созданы

---

### Шаг 7: TypeScript типы

**Создать файл:** `src/types/product.ts`

```typescript
export interface Product {
  id: number;
  name: string;
  price: number;
  category: number;
  image: string;
  description: string;
}
```

**Создать файл:** `src/types/category.ts`

```typescript
export interface Category {
  id: number;
  name: string;
  icon: string;
}
```

**Создать файл:** `src/types/order.ts`

```typescript
import type { Product } from './product';

export interface CartItem extends Product {
  quantity: number;
}

export interface Customer {
  fullName: string;
  phone: string;
  deliveryType: 'address' | 'cdek';
  deliveryDetails: string;
  telegramUsername?: string;
  telegramId?: number;
  telegramFirstName?: string;
  telegramLastName?: string;
}

export interface Order {
  customer: Customer;
  items: CartItem[];
  total: number;
}

export interface OrderResponse {
  success: boolean;
  orderNumber: string;
  orderId: number;
}
```

**Создать файл:** `src/types/index.ts`

```typescript
export * from './product';
export * from './category';
export * from './order';
```

**Проверить:**

- ✅ Все файлы типов созданы

---

### Шаг 8: Утилиты

**Создать файл:** `src/lib/utils.ts`

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Создать файл:** `src/lib/api-client.ts`

```typescript
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `HTTP error! status: ${response.status}`);
  }

  return response.json();
}
```

**Создать файл:** `src/lib/telegram.ts`

```typescript
import { useEffect } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          button_color?: string;
          button_text_color?: string;
        };
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
          };
        };
      };
    };
  }
}

export function useTelegram() {
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, [tg]);

  return {
    tg,
    user: tg?.initDataUnsafe?.user,
    themeParams: tg?.themeParams,
  };
}

export function useTelegramTheme() {
  const { themeParams } = useTelegram();

  useEffect(() => {
    if (themeParams) {
      const root = document.documentElement;
      if (themeParams.bg_color) {
        root.style.setProperty('--tg-theme-bg-color', themeParams.bg_color);
      }
      if (themeParams.text_color) {
        root.style.setProperty('--tg-theme-text-color', themeParams.text_color);
      }
      if (themeParams.hint_color) {
        root.style.setProperty('--tg-theme-hint-color', themeParams.hint_color);
      }
      if (themeParams.button_color) {
        root.style.setProperty('--tg-theme-button-color', themeParams.button_color);
      }
      if (themeParams.button_text_color) {
        root.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color);
      }
    }
  }, [themeParams]);
}
```

**Проверить:**

- ✅ Все утилиты созданы

---

### Шаг 9: API слой (TanStack Query)

**Создать файл:** `src/features/products/api.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Product, Category } from '@/types';

interface ProductsResponse {
  success: boolean;
  products: Array<{
    id: number;
    name: string;
    price: number;
    category_id: number;
    image: string;
    description: string;
  }>;
}

interface CategoriesResponse {
  success: boolean;
  categories: Category[];
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const data = await apiClient<ProductsResponse>('/api/products');
      // Трансформируем данные из API в формат приложения
      return data.products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category_id,
        image: p.image,
        description: p.description,
      })) as Product[];
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const data = await apiClient<CategoriesResponse>('/api/categories');
      return data.categories;
    },
  });
}

export function useProduct(id: number) {
  const { data: products } = useProducts();
  return products?.find(p => p.id === id);
}
```

**Создать файл:** `src/features/orders/api.ts`

```typescript
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Order, OrderResponse } from '@/types';

export function useCreateOrder() {
  return useMutation({
    mutationFn: async (order: Order) => {
      return apiClient<OrderResponse>('/api/send-order', {
        method: 'POST',
        body: JSON.stringify(order),
      });
    },
  });
}
```

**Проверить:**

- ✅ API слои созданы

---

### Шаг 10: Zustand Store для корзины

**Создать файл:** `src/features/cart/store.ts`

```typescript
import { create } from 'zustand';
import type { Product, CartItem } from '@/types';

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  total: number;
  itemsCount: number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (product, quantity = 1) => {
    set(state => {
      const existing = state.items.find(i => i.id === product.id);
      if (existing) {
        return {
          items: state.items.map(i =>
            i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
          ),
        };
      }
      return { items: [...state.items, { ...product, quantity }] };
    });
  },

  updateQuantity: (id, quantity) => {
    if (quantity <= 0) {
      get().removeItem(id);
      return;
    }
    set(state => ({
      items: state.items.map(i => (i.id === id ? { ...i, quantity } : i)),
    }));
  },

  removeItem: id => {
    set(state => ({
      items: state.items.filter(i => i.id !== id),
    }));
  },

  clearCart: () => set({ items: [] }),

  get total() {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  get itemsCount() {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));
```

**Проверить:**

- ✅ Zustand store создан

---

### Шаг 11: UI компоненты

**Создать файл:** `src/components/ui/button.tsx`

```typescript
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
          'disabled:opacity-50 disabled:pointer-events-none',
          {
            'bg-tg-button text-tg-button-text hover:opacity-90': variant === 'primary',
            'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
            'border-2 border-tg-button text-tg-button hover:bg-tg-button hover:text-white': variant === 'outline',
          },
          {
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4 text-base': size === 'md',
            'h-12 px-6 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
```

**Создать файл:** `src/components/ui/card.tsx`

```typescript
import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border bg-white shadow-sm',
          className
        )}
        {...props}
      />
    )
  }
)

Card.displayName = 'Card'
```

**Создать файл:** `src/components/ui/input.tsx`

```typescript
import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm',
          'placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-tg-button focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
```

**Проверить:**

- ✅ UI компоненты созданы

---

### Шаг 12: Роутинг - Root Layout

**Создать файл:** `src/app/routes/__root.tsx`

```typescript
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useTelegram, useTelegramTheme } from '@/lib/telegram'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 минут
      retry: 1,
    },
  },
})

function RootComponent() {
  useTelegram()
  useTelegramTheme()

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-tg-bg text-tg-text">
        <Outlet />
      </div>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})
```

**Проверить:**

- ✅ Root layout создан

---

### Шаг 13: Компоненты - мигрировать на TypeScript

**Создать файл:** `src/components/ProductCard.tsx`

```typescript
import { Link } from '@tanstack/react-router'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
  onAddToCart?: (product: Product) => void
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <Card className="overflow-hidden">
      <Link
        to="/product/$id"
        params={{ id: product.id.toString() }}
        className="block"
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-48 object-cover"
        />
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-2xl font-bold text-tg-button">
            {product.price.toLocaleString('ru-RU')} ₽
          </p>
        </div>
      </Link>
      {onAddToCart && (
        <div className="px-4 pb-4">
          <Button
            onClick={() => onAddToCart(product)}
            className="w-full"
          >
            В корзину
          </Button>
        </div>
      )}
    </Card>
  )
}
```

**Создать файл:** `src/components/CategoryFilter.tsx`

```typescript
import type { Category } from '@/types'
import { cn } from '@/lib/utils'

interface CategoryFilterProps {
  categories?: Category[]
  selectedCategory: number | null
  onSelectCategory: (categoryId: number | null) => void
}

export function CategoryFilter({
  categories = [],
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <button
        onClick={() => onSelectCategory(null)}
        className={cn(
          'px-4 py-2 rounded-full whitespace-nowrap transition-colors',
          selectedCategory === null
            ? 'bg-tg-button text-tg-button-text'
            : 'bg-gray-200 text-gray-700'
        )}
      >
        Все
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={cn(
            'px-4 py-2 rounded-full whitespace-nowrap transition-colors',
            selectedCategory === category.id
              ? 'bg-tg-button text-tg-button-text'
              : 'bg-gray-200 text-gray-700'
          )}
        >
          {category.icon} {category.name}
        </button>
      ))}
    </div>
  )
}
```

**Создать файл:** `src/components/Header.tsx`

```typescript
import { Link } from '@tanstack/react-router'
import { useCartStore } from '@/features/cart/store'

interface HeaderProps {
  title?: string
  showCart?: boolean
  onBack?: () => void
}

export function Header({ title, showCart = false, onBack }: HeaderProps) {
  const itemsCount = useCartStore((state) => state.itemsCount)

  return (
    <header className="sticky top-0 z-10 bg-tg-bg border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="text-tg-button text-xl">
              ←
            </button>
          )}
          {title && <h1 className="text-xl font-semibold">{title}</h1>}
        </div>
        {showCart && (
          <Link
            to="/cart"
            className="relative text-tg-button text-2xl"
          >
            🛒
            {itemsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {itemsCount}
              </span>
            )}
          </Link>
        )}
      </div>
    </header>
  )
}
```

**Проверить:**

- ✅ Компоненты мигрированы

---

### Шаг 14: Роуты - Главная страница

**Создать файл:** `src/app/routes/index.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useProducts, useCategories } from '@/features/products/api'
import { useCartStore } from '@/features/cart/store'
import { ProductCard } from '@/components/ProductCard'
import { CategoryFilter } from '@/components/CategoryFilter'
import { Header } from '@/components/Header'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const { data: products, isLoading, error } = useProducts()
  const { data: categories } = useCategories()
  const addItem = useCartStore((state) => state.addItem)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4">
        <div className="text-5xl">⏳</div>
        <div className="text-lg text-tg-hint">Загрузка товаров...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4 px-4">
        <div className="text-5xl">❌</div>
        <div className="text-lg text-red-600 text-center">
          Ошибка загрузки: {error.message}
        </div>
      </div>
    )
  }

  const filteredProducts = selectedCategory
    ? products?.filter((p) => p.category === selectedCategory)
    : products

  return (
    <div className="min-h-screen pb-20">
      <Header title="Каталог" showCart />
      <div className="p-4 space-y-4">
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts?.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={(p) => addItem(p, 1)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Проверить:**

- ✅ Главная страница создана

---

### Шаг 15: Роуты - Страница товара

**Создать файл:** `src/app/routes/product.$id.tsx`

```typescript
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useProduct } from '@/features/products/api'
import { useCartStore } from '@/features/cart/store'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/product/$id')({
  component: ProductPage,
})

function ProductPage() {
  const navigate = useNavigate()
  const { id } = Route.useParams()
  const product = useProduct(Number(id))
  const addItem = useCartStore((state) => state.addItem)
  const [quantity, setQuantity] = useState(1)

  if (!product) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4">
        <div className="text-5xl">❌</div>
        <div className="text-lg">Товар не найден</div>
      </div>
    )
  }

  const handleAddToCart = () => {
    addItem(product, quantity)
    navigate({ to: '/' })
  }

  return (
    <div className="min-h-screen">
      <Header onBack={() => navigate({ to: '/' })} showCart />
      <div className="p-4">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-80 object-cover rounded-lg mb-4"
        />
        <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
        <p className="text-tg-hint mb-4">{product.description}</p>
        <div className="text-3xl font-bold text-tg-button mb-6">
          {product.price.toLocaleString('ru-RU')} ₽
        </div>

        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-10 h-10 rounded-full bg-gray-200 text-xl"
          >
            -
          </button>
          <span className="text-xl font-semibold">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="w-10 h-10 rounded-full bg-gray-200 text-xl"
          >
            +
          </button>
        </div>

        <Button onClick={handleAddToCart} className="w-full" size="lg">
          Добавить в корзину
        </Button>
      </div>
    </div>
  )
}
```

**Проверить:**

- ✅ Страница товара создана

---

### Шаг 16: Роуты - Корзина

**Создать файл:** `src/app/routes/cart.tsx`

```typescript
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCartStore } from '@/features/cart/store'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export const Route = createFileRoute('/cart')({
  component: CartPage,
})

function CartPage() {
  const navigate = useNavigate()
  const { items, total, updateQuantity, removeItem } = useCartStore()

  if (items.length === 0) {
    return (
      <div className="min-h-screen">
        <Header title="Корзина" onBack={() => navigate({ to: '/' })} />
        <div className="flex items-center justify-center h-[80vh] flex-col gap-4">
          <div className="text-6xl">🛒</div>
          <div className="text-xl text-tg-hint">Корзина пуста</div>
          <Button onClick={() => navigate({ to: '/' })}>
            Перейти к покупкам
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-32">
      <Header title="Корзина" onBack={() => navigate({ to: '/' })} />
      <div className="p-4 space-y-4">
        {items.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex gap-4">
              <img
                src={item.image}
                alt={item.name}
                className="w-20 h-20 object-cover rounded"
              />
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{item.name}</h3>
                <p className="text-tg-button font-bold">
                  {item.price.toLocaleString('ru-RU')} ₽
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 rounded-full bg-gray-200 text-sm"
                  >
                    -
                  </button>
                  <span className="font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 rounded-full bg-gray-200 text-sm"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="ml-auto text-red-500"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold">Итого:</span>
          <span className="text-2xl font-bold text-tg-button">
            {total.toLocaleString('ru-RU')} ₽
          </span>
        </div>
        <Button
          onClick={() => navigate({ to: '/checkout' })}
          className="w-full"
          size="lg"
        >
          Оформить заказ
        </Button>
      </div>
    </div>
  )
}
```

**Проверить:**

- ✅ Страница корзины создана

---

### Шаг 17: Роуты - Оформление заказа

**Создать файл:** `src/app/routes/checkout.tsx`

```typescript
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, FormEvent } from 'react'
import { useCartStore } from '@/features/cart/store'
import { useCreateOrder } from '@/features/orders/api'
import { useTelegram } from '@/lib/telegram'
import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export const Route = createFileRoute('/checkout')({
  component: CheckoutPage,
})

function CheckoutPage() {
  const navigate = useNavigate()
  const { items, total, clearCart } = useCartStore()
  const { user } = useTelegram()
  const createOrder = useCreateOrder()

  const [formData, setFormData] = useState({
    fullName: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '',
    phone: '',
    deliveryType: 'address' as 'address' | 'cdek',
    deliveryDetails: '',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    try {
      const result = await createOrder.mutateAsync({
        customer: {
          ...formData,
          telegramUsername: user?.username,
          telegramId: user?.id,
          telegramFirstName: user?.first_name,
          telegramLastName: user?.last_name,
        },
        items,
        total,
      })

      clearCart()
      navigate({
        to: '/success/$orderNumber',
        params: { orderNumber: result.orderNumber },
      })
    } catch (error) {
      alert('Ошибка при оформлении заказа')
    }
  }

  if (items.length === 0) {
    navigate({ to: '/' })
    return null
  }

  return (
    <div className="min-h-screen pb-32">
      <Header title="Оформление заказа" onBack={() => navigate({ to: '/cart' })} />
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <Card className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">ФИО</label>
            <Input
              required
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              placeholder="Иван Иванов"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Телефон</label>
            <Input
              required
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Доставка</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, deliveryType: 'address' })
                }
                className={`flex-1 py-2 px-4 rounded-lg border-2 ${
                  formData.deliveryType === 'address'
                    ? 'border-tg-button bg-blue-50'
                    : 'border-gray-300'
                }`}
              >
                По адресу
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, deliveryType: 'cdek' })
                }
                className={`flex-1 py-2 px-4 rounded-lg border-2 ${
                  formData.deliveryType === 'cdek'
                    ? 'border-tg-button bg-blue-50'
                    : 'border-gray-300'
                }`}
              >
                СДЕК ПВЗ
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {formData.deliveryType === 'address' ? 'Адрес' : 'Номер ПВЗ'}
            </label>
            <Input
              required
              value={formData.deliveryDetails}
              onChange={(e) =>
                setFormData({ ...formData, deliveryDetails: e.target.value })
              }
              placeholder={
                formData.deliveryType === 'address'
                  ? 'ул. Ленина, д. 1, кв. 1'
                  : 'MSK123'
              }
            />
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Ваш заказ</h3>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span className="font-semibold">
                  {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                </span>
              </div>
            ))}
          </div>
          <div className="border-t mt-3 pt-3 flex justify-between items-center">
            <span className="font-semibold text-lg">Итого:</span>
            <span className="text-2xl font-bold text-tg-button">
              {total.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </Card>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={createOrder.isPending}
        >
          {createOrder.isPending ? 'Отправка...' : 'Подтвердить заказ'}
        </Button>
      </form>
    </div>
  )
}
```

**Проверить:**

- ✅ Страница оформления создана

---

### Шаг 18: Роуты - Успешный заказ

**Создать файл:** `src/app/routes/success.$orderNumber.tsx`

```typescript
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export const Route = createFileRoute('/success/$orderNumber')({
  component: SuccessPage,
})

function SuccessPage() {
  const navigate = useNavigate()
  const { orderNumber } = Route.useParams()

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center">
        <div className="text-7xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-2">Заказ оформлен!</h1>
        <p className="text-tg-hint mb-6">
          Номер заказа: <span className="font-semibold">#{orderNumber}</span>
        </p>
        <p className="mb-6">
          Спасибо за заказ! Мы свяжемся с вами в ближайшее время.
        </p>
        <Button onClick={() => navigate({ to: '/' })} className="w-full">
          Вернуться на главную
        </Button>
      </Card>
    </div>
  )
}
```

**Проверить:**

- ✅ Страница успеха создана

---

### Шаг 19: Обновить main.tsx

**Создать файл:** `src/main.tsx` (переименовать из main.jsx)

```typescript
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './styles.css'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
```

**Проверить:**

- ✅ main.tsx создан
- ✅ main.jsx удален (после проверки)

---

### Шаг 20: Очистка старых файлов

**Удалить файлы:**

```bash
rm src/App.jsx
rm src/App.css
rm src/index.css
rm -rf src/pages
rm -rf src/data
```

**НЕ удалять:**

- `src/components/Cart.jsx` - может быть использован как референс
- Старые файлы можно оставить в отдельной папке `src/__old__` для справки

**Проверить:**

- ✅ Старые файлы удалены или перемещены

---

### Шаг 21: Тестирование

**Запустить dev сервер:**

```bash
npm run dev
```

**Проверить в браузере:**

1. ✅ Главная страница загружается
2. ✅ Категории фильтруют товары
3. ✅ Клик по товару → открывается страница товара
4. ✅ Добавление в корзину работает
5. ✅ Корзина отображает товары
6. ✅ Изменение количества работает
7. ✅ Удаление из корзины работает
8. ✅ Оформление заказа работает
9. ✅ Страница успеха показывается
10. ✅ Telegram theme применяется

**Проверить TypeScript:**

```bash
npx tsc --noEmit
```

**Проверить сборку:**

```bash
npm run build
```

---

### Шаг 22: Коммит и пуш

**Команды:**

```bash
git add .
git commit -m "Migrate to TypeScript + TanStack Router + TanStack Query + Tailwind

- Add TypeScript with strict mode
- Add TanStack Router for file-based routing
- Add TanStack Query for server state management
- Add Zustand for cart state
- Add Tailwind CSS for styling
- Migrate all components to TypeScript
- Create feature-based architecture
- Add Telegram WebApp SDK hooks
- Keep admin panel as-is in public/ folder

🤖 Generated with Claude Code"

git push -u origin feature/migrate-to-typescript-stack
```

---

### Шаг 23: Проверка на production

**После мержа в main:**

1. GitHub Actions автоматически соберет и задеплоит
2. Проверить https://seed.xrednode.com
3. Проверить в Telegram Mini App

---

## ✅ Чеклист готовности

### Перед началом:

- [ ] Создана ветка `feature/migrate-to-typescript-stack`
- [ ] Все зависимости установлены
- [ ] Конфигурации созданы (tsconfig, tailwind, vite)

### Во время:

- [ ] Типы созданы
- [ ] API слой с TanStack Query работает
- [ ] Zustand store для корзины работает
- [ ] Telegram SDK hooks работают
- [ ] Все роуты созданы
- [ ] UI компоненты созданы
- [ ] Старые файлы удалены

### После:

- [ ] `npm run dev` работает
- [ ] `npx tsc --noEmit` без ошибок
- [ ] `npm run build` успешен
- [ ] Все функции работают в браузере
- [ ] Коммит и пуш выполнены
- [ ] Деплой на production прошел успешно

---

## 🚨 Важные примечания

1. **Админка НЕ трогается!** Все файлы в `public/*.html` остаются без изменений
2. **Backend не меняется!** Все API endpoints остаются прежними
3. **GitHub Actions не меняется!** Деплой работает как прежде
4. **Nginx конфиг не меняется!** Все настройки остаются
5. **Telegram SDK** - используется существующий скрипт в `index.html`

---

## 📚 Полезные команды

```bash
# Разработка
npm run dev

# Проверка типов
npx tsc --noEmit

# Сборка
npm run build

# Preview сборки
npm run preview

# Проверка TanStack Router
npx tsx node_modules/@tanstack/router-vite-plugin/dist/cli.mjs watch
```

---

## 🎯 Ожидаемый результат

После выполнения всех шагов вы получите:

✅ Современный TypeScript кодbase
✅ Type-safe роутинг с TanStack Router
✅ Автоматическое кеширование и refetching с TanStack Query
✅ Простое управление состоянием с Zustand
✅ Современные стили с Tailwind CSS
✅ Feature-based архитектура
✅ Полная обратная совместимость с существующим backend
✅ Работающая админка без изменений
✅ Автоматический деплой через GitHub Actions

---

**Время выполнения:** 2-4 дня
**Сложность:** Средняя
**Риски:** Низкие (можно откатиться на ветку main)
