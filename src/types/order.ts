import type { Product } from './product'

export interface CartItem extends Product {
  quantity: number
}

export interface Customer {
  fullName: string
  phone: string
  deliveryType: 'address' | 'pvz'
  deliveryDetails: string
  telegramUsername?: string
  telegramId?: number
  telegramFirstName?: string
  telegramLastName?: string
}

export interface Order {
  customer: Customer
  items: CartItem[]
  total: number
}

export interface OrderResponse {
  success: boolean
  orderNumber: string
  orderId: number
}
