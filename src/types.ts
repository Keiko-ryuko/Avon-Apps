export interface Product {
  id: number;
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
  id: number;
  product_id: number;
  product_name?: string;
  product_brand?: string;
  platform: string;
  caption: string;
  scheduled_at: string | null;
  status: 'posted' | 'scheduled';
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  category: string;
}

export interface Sale {
  id: number;
  customer_id: number;
  customer_name?: string;
  total_amount: number;
  total_profit: number;
  payment_method: string;
  assistant_id: number;
  sale_date: string;
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
  id: number;
  type: string;
  message: string;
  is_read: number;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'assistant' | 'viewer';
}

export interface PerformanceReport {
  brandPerformance: { brand: string; revenue: number; profit: number }[];
  categoryPerformance: { category: string; revenue: number }[];
  topProducts: { name: string; total_sold: number; revenue: number }[];
}
