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
  total: 0,
  itemsCount: 0,

  addItem: (product, quantity = 1) => {
    set(state => {
      const existing = state.items.find(i => i.id === product.id);
      let newItems;
      if (existing) {
        newItems = state.items.map(i =>
          i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      } else {
        newItems = [...state.items, { ...product, quantity }];
      }

      return {
        items: newItems,
        total: newItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
        itemsCount: newItems.reduce((sum, item) => sum + item.quantity, 0),
      };
    });
  },

  updateQuantity: (id, quantity) => {
    if (quantity <= 0) {
      get().removeItem(id);
      return;
    }
    set(state => {
      const newItems = state.items.map(i => (i.id === id ? { ...i, quantity } : i));
      return {
        items: newItems,
        total: newItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
        itemsCount: newItems.reduce((sum, item) => sum + item.quantity, 0),
      };
    });
  },

  removeItem: id => {
    set(state => {
      const newItems = state.items.filter(i => i.id !== id);
      return {
        items: newItems,
        total: newItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
        itemsCount: newItems.reduce((sum, item) => sum + item.quantity, 0),
      };
    });
  },

  clearCart: () => set({ items: [], total: 0, itemsCount: 0 }),
}));
