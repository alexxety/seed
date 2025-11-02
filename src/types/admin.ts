export interface Admin {
  id: number;
  username: string;
  email: string;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  token?: string;
  expiresIn?: number;
  message?: string;
}

export type OrderStatus = 'new' | 'in_progress' | 'completed' | 'cancelled';

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  product_name?: string;
  product_image?: string;
}

export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_type: 'address' | 'pvz';
  delivery_details: string;
  telegram_username?: string;
  telegram_id?: number;
  telegram_first_name?: string;
  telegram_last_name?: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

export interface ProductFormData {
  name: string;
  price: number;
  category: number;
  image: string;
  description: string;
}

export interface CategoryFormData {
  name: string;
  emoji?: string;
  icon: string;
}
