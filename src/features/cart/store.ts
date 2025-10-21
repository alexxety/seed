import { create } from 'zustand'
import type { Product, CartItem } from '@/types'

interface CartStore {
  items: CartItem[]
  addItem: (product: Product, quantity?: number) => void
  updateQuantity: (id: number, quantity: number) => void
  removeItem: (id: number) => void
  clearCart: () => void
  total: number
  itemsCount: number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (product, quantity = 1) => {
    set((state) => {
      const existing = state.items.find((i) => i.id === product.id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === product.id
              ? { ...i, quantity: i.quantity + quantity }
              : i
          ),
        }
      }
      return { items: [...state.items, { ...product, quantity }] }
    })
  },

  updateQuantity: (id, quantity) => {
    if (quantity <= 0) {
      get().removeItem(id)
      return
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, quantity } : i
      ),
    }))
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    }))
  },

  clearCart: () => set({ items: [] }),

  get total() {
    return get().items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )
  },

  get itemsCount() {
    return get().items.reduce((sum, item) => sum + item.quantity, 0)
  },
}))
