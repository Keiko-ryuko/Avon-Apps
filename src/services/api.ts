import { Product, Customer, Sale, DashboardData, Notification, User, PerformanceReport } from '../types';

const API_BASE = '/api';

export const api = {
  // Auth
  login: async (credentials: any): Promise<User> => {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) throw new Error('Invalid credentials');
    return res.json();
  },

  // Products
  getProducts: async (): Promise<Product[]> => {
    const res = await fetch(`${API_BASE}/products`);
    return res.json();
  },
  createProduct: async (product: Partial<Product>) => {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    return res.json();
  },
  updateProduct: async (id: number, product: Partial<Product>) => {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    return res.json();
  },
  deleteProduct: async (id: number) => {
    const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Customers
  getCustomers: async (): Promise<Customer[]> => {
    const res = await fetch(`${API_BASE}/customers`);
    return res.json();
  },
  createCustomer: async (customer: Partial<Customer>) => {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
    return res.json();
  },
  updateCustomer: async (id: number, customer: Partial<Customer>) => {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
    return res.json();
  },
  deleteCustomer: async (id: number) => {
    const res = await fetch(`${API_BASE}/customers/${id}`, { method: 'DELETE' });
    return res.json();
  },
  getCustomerHistory: async (id: number): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/customers/${id}/history`);
    return res.json();
  },

  // Sales
  createSale: async (saleData: { customer_id: number; items: { product_id: number; quantity: number }[]; payment_method: string; assistant_id: number }) => {
    const res = await fetch(`${API_BASE}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create sale');
    }
    return res.json();
  },

  // Reports
  getDashboardData: async (): Promise<DashboardData> => {
    const res = await fetch(`${API_BASE}/reports/dashboard`);
    return res.json();
  },
  getSalesReport: async (): Promise<Sale[]> => {
    const res = await fetch(`${API_BASE}/reports/sales`);
    return res.json();
  },
  getPerformanceReport: async (): Promise<PerformanceReport> => {
    const res = await fetch(`${API_BASE}/reports/performance`);
    return res.json();
  },

  // Notifications
  getNotifications: async (): Promise<Notification[]> => {
    const res = await fetch(`${API_BASE}/notifications`);
    return res.json();
  },
  markNotificationsRead: async () => {
    const res = await fetch(`${API_BASE}/notifications/read`, { method: 'POST' });
    return res.json();
  }
};
