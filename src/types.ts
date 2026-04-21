export interface Product {
  id: string;
  name: string;
  brand: 'Avon' | 'Inuka' | 'Avroy Shlain';
  category: string;
  quantity: number;
  buying_price: number;
  selling_price: number;
  supplier_name: string;
  batch_number: string;
  expiry_date: string;
  arrival_date: string;
  image_url: string;
  low_stock_threshold: number;
}

export interface SocialPost {
  id: string;
  product_id: string;
  product_name?: string;
  product_brand?: string;
  platform: string;
  caption: string;
  scheduled_at: string | null;
  status: 'posted' | 'scheduled';
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  category: string;
  loyalty_points: number;
  total_spent: number;
}

export interface StockLog {
  id: string;
  product_id: string;
  product_name: string;
  type: 'addition' | 'subtraction' | 'edit';
  quantity_changed: number;
  previous_quantity: number;
  new_quantity: number;
  user_id: string;
  user_name: string;
  timestamp: any;
  reason?: string;
}

export interface ReportSchedule {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  email: string;
  last_sent?: any;
  created_at: any;
  uid: string;
}

export interface Sale {
  id: string;
  customer_id: string;
  customer_name?: string;
  total_amount: number;
  total_profit: number;
  payment_method: string;
  assistant_id: string;
  sale_date: any;
  items?: { product_id: string; quantity: number }[];
  points_earned?: number;
  points_redeemed?: number;
}

export interface DashboardData {
  stats: {
    totalProducts: number;
    lowStock: number;
    outOfStock: number;
    totalSales: number;
    totalProfit: number;
  };
  salesByDay: { date: string; amount: number }[];
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  is_read: number;
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'assistant' | 'viewer';
}

export interface PerformanceReport {
  brandPerformance: { brand: string; revenue: number; profit: number }[];
  categoryPerformance: { category: string; revenue: number }[];
  topProducts: { name: string; total_sold: number; revenue: number }[];
}
