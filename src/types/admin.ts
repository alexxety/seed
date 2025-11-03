export interface Admin {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
}

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  token: string;
  admin: Admin;
  tenant: Tenant;
  message?: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Customer {
  id: string;
  email?: string;
  phone?: string;
  full_name?: string;
  telegram_id?: string;
  telegram_username?: string;
}

export interface OrderItem {
  id: string;
  product_name: string;
  variant_title?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  id: string;
  order_number: string;
  total: number;
  currency: string;
  status: OrderStatus;
  paid: boolean;
  paid_at?: string;
  delivery_type?: string;
  delivery_details?: any;
  metadata?: any;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  items?: OrderItem[];
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  paid?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  vendor?: string;
  category?: string;
  tags?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  variants_count?: number;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  sku?: string;
  title?: string;
  option1?: string;
  option2?: string;
  option3?: string;
  image_url?: string;
  position: number;
  is_active: boolean;
  price?: number;
  currency?: string;
  compare_at_amount?: number;
  inventory?: number;
}

export interface ProductFormData {
  name: string;
  description?: string;
  vendor?: string;
  category?: string;
  tags?: string[];
  is_active?: boolean;
}

export interface StoreSettings {
  title?: string;
  brand_color?: string;
  logo_path?: string;
  currency?: string;
  updated_at?: string;
}

export interface DashboardStats {
  products: number;
  orders: number;
  customers: number;
  revenue: {
    total: number;
    paid: number;
    paidOrdersCount: number;
  };
}
