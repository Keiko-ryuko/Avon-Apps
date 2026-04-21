import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  getDoc,
  limit
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Product, Customer, Sale, DashboardData, Notification, User, PerformanceReport, SocialPost } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const api = {
  // Products
  getProducts: async (): Promise<Product[]> => {
    const path = 'products';
    try {
      const q = query(collection(db, path), where('uid', '==', auth.currentUser?.uid));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          quantity: Number(data.quantity) || 0,
          buying_price: Number(data.buying_price) || 0,
          selling_price: Number(data.selling_price) || 0,
          low_stock_threshold: Number(data.low_stock_threshold) || 0,
        } as any;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },
  createProduct: async (product: Partial<Product>) => {
    const path = 'products';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...product,
        uid: auth.currentUser?.uid,
        created_at: serverTimestamp(),
      });
      
      // Log initial stock
      await api.createStockLog({
        product_id: docRef.id,
        product_name: product.name,
        type: 'addition',
        quantity_changed: product.quantity,
        previous_quantity: 0,
        new_quantity: product.quantity,
        user_id: auth.currentUser?.uid,
        user_name: auth.currentUser?.displayName || 'Unknown',
        reason: 'Initial Product Creation'
      });

      return { id: docRef.id, ...product };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  updateProduct: async (id: string, product: Partial<Product>) => {
    const path = `products/${id}`;
    try {
      const docRef = doc(db, 'products', id);
      
      // Get current quantity if we are updating quantity
      if ('quantity' in product) {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const oldQty = Number(snap.data().quantity) || 0;
          const newQty = Number(product.quantity) || 0;
          if (oldQty !== newQty) {
            await api.createStockLog({
              product_id: id,
              product_name: product.name || snap.data().name,
              type: newQty > oldQty ? 'addition' : 'subtraction',
              quantity_changed: Math.abs(newQty - oldQty),
              previous_quantity: oldQty,
              new_quantity: newQty,
              user_id: auth.currentUser?.uid,
              user_name: auth.currentUser?.displayName || 'Unknown',
              reason: 'Manual Inventory Update'
            });
          }
        }
      }

      await updateDoc(docRef, {
        ...product,
        updated_at: serverTimestamp(),
      });
      return { id, ...product };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  deleteProduct: async (id: string) => {
    const path = `products/${id}`;
    try {
      const docRef = doc(db, 'products', id);
      await deleteDoc(docRef);
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Customers
  getCustomers: async (): Promise<Customer[]> => {
    const path = 'customers';
    try {
      const q = query(collection(db, path), where('uid', '==', auth.currentUser?.uid));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          loyalty_points: Number(data.loyalty_points) || 0,
          total_spent: Number(data.total_spent) || 0,
        } as any;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },
  createCustomer: async (customer: Partial<Customer>) => {
    const path = 'customers';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...customer,
        loyalty_points: 0,
        total_spent: 0,
        uid: auth.currentUser?.uid,
        created_at: serverTimestamp(),
      });
      return { id: docRef.id, ...customer };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  updateCustomer: async (id: string, customer: Partial<Customer>) => {
    const path = `customers/${id}`;
    try {
      const docRef = doc(db, 'customers', id);
      await updateDoc(docRef, {
        ...customer,
        updated_at: serverTimestamp(),
      });
      return { id, ...customer };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  deleteCustomer: async (id: string) => {
    const path = `customers/${id}`;
    try {
      const docRef = doc(db, 'customers', id);
      await deleteDoc(docRef);
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Sales
  createSale: async (saleData: any) => {
    const path = 'sales';
    try {
      // Award points: 1 point per $1 spent
      const pointsEarned = Math.floor(Number(saleData.total_amount) || 0);
      
      const docRef = await addDoc(collection(db, path), {
        ...saleData,
        points_earned: pointsEarned,
        uid: auth.currentUser?.uid,
        sale_date: serverTimestamp(),
      });

      // Update customer loyalty and spending
      if (saleData.customer_id) {
        const customerRef = doc(db, 'customers', saleData.customer_id);
        const customerSnap = await getDoc(customerRef);
        if (customerSnap.exists()) {
          const currentData = customerSnap.data();
          await updateDoc(customerRef, {
            loyalty_points: (Number(currentData.loyalty_points) || 0) + pointsEarned - (Number(saleData.points_redeemed) || 0),
            total_spent: (Number(currentData.total_spent) || 0) + (Number(saleData.total_amount) || 0),
            updated_at: serverTimestamp()
          });
        }
      }

      // Decrement stock for each item
      if (saleData.items) {
        for (const item of saleData.items) {
          const productRef = doc(db, 'products', item.product_id);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const currentQty = Number(productSnap.data().quantity) || 0;
            const newQty = currentQty - (Number(item.quantity) || 0);
            await updateDoc(productRef, { quantity: newQty });
            
            // Log stock adjustment
            await api.createStockLog({
              product_id: item.product_id,
              product_name: productSnap.data().name,
              type: 'subtraction',
              quantity_changed: item.quantity,
              previous_quantity: currentQty,
              new_quantity: newQty,
              user_id: auth.currentUser?.uid,
              user_name: auth.currentUser?.displayName || 'Unknown',
              reason: 'Sale Transaction'
            });
          }
        }
      }

      return { id: docRef.id, ...saleData };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  getSalesReport: async (): Promise<Sale[]> => {
    const path = 'sales';
    try {
      const q = query(collection(db, path), where('uid', '==', auth.currentUser?.uid), orderBy('sale_date', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          total_amount: Number(data.total_amount) || 0,
          total_profit: Number(data.total_profit) || 0,
        } as any;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },
  getCustomerHistory: async (customerId: string): Promise<Sale[]> => {
    const path = 'sales';
    try {
      const q = query(collection(db, path), where('uid', '==', auth.currentUser?.uid), where('customer_id', '==', customerId), orderBy('sale_date', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          total_amount: Number(data.total_amount) || 0,
          total_profit: Number(data.total_profit) || 0,
        } as any;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  // Reports (Simplified for Firestore)
  getDashboardData: async (): Promise<DashboardData> => {
    const products = await api.getProducts();
    const sales = await api.getSalesReport();
    
    const lowStock = products.filter(p => p.quantity <= p.low_stock_threshold).length;
    const outOfStock = products.filter(p => p.quantity === 0).length;
    
    const totalSales = sales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
    const totalProfit = sales.reduce((sum, s) => sum + (Number(s.total_profit) || 0), 0);
    
    // Group sales by day for the last 7 days
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();
    
    const salesByDay = last7Days.map(date => {
      const daySales = sales.filter(s => {
        let sDate = '';
        if (s.sale_date && typeof s.sale_date.toDate === 'function') {
          sDate = s.sale_date.toDate().toISOString().split('T')[0];
        } else if (s.sale_date instanceof Date) {
          sDate = s.sale_date.toISOString().split('T')[0];
        } else if (typeof s.sale_date === 'string') {
          sDate = s.sale_date.split('T')[0];
        }
        return sDate === date;
      });
      return {
        date,
        amount: daySales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0)
      };
    });
    
    return {
      stats: {
        totalProducts: products.length,
        lowStock,
        outOfStock,
        totalSales,
        totalProfit,
      },
      salesByDay,
    };
  },
  getPerformanceReport: async (): Promise<PerformanceReport> => {
    const sales = await api.getSalesReport();
    const products = await api.getProducts();
    
    // Brand Performance
    const brandMap: Record<string, { revenue: number; profit: number }> = {};
    sales.forEach(sale => {
      // Note: In a real app, we'd need to know which products were in the sale to get the brand.
      // For now, we'll use the customer category or mock it if we don't have item-level brand info.
      // Since our sales data is simplified, let's just use the sales totals for a general report.
    });

    // Let's try to get more detail if items are available
    const brandPerf: Record<string, { revenue: number; profit: number }> = {};
    sales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach((item: any) => {
          const p = products.find(prod => prod.id === item.product_id);
          if (p) {
            const rev = (Number(p.selling_price) || 0) * (Number(item.quantity) || 0);
            const prof = rev - ((Number(p.buying_price) || 0) * (Number(item.quantity) || 0));
            brandPerf[p.brand] = {
              revenue: (brandPerf[p.brand]?.revenue || 0) + rev,
              profit: (brandPerf[p.brand]?.profit || 0) + prof
            };
          }
        });
      }
    });

    const brandPerformance = Object.entries(brandPerf).map(([brand, stats]) => ({
      brand,
      revenue: stats.revenue,
      profit: stats.profit
    }));

    // Category Performance
    const catPerf: Record<string, number> = {};
    sales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach((item: any) => {
          const p = products.find(prod => prod.id === item.product_id);
          if (p) {
            const rev = (Number(p.selling_price) || 0) * (Number(item.quantity) || 0);
            catPerf[p.category] = (catPerf[p.category] || 0) + rev;
          }
        });
      }
    });

    const categoryPerformance = Object.entries(catPerf).map(([category, revenue]) => ({
      category,
      revenue
    })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Top Products
    const prodPerf: Record<string, { name: string; total_sold: number; revenue: number }> = {};
    sales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach((item: any) => {
          const p = products.find(prod => prod.id === item.product_id);
          if (p) {
            const qty = Number(item.quantity) || 0;
            const rev = (Number(p.selling_price) || 0) * qty;
            prodPerf[p.id] = {
              name: p.name,
              total_sold: (prodPerf[p.id]?.total_sold || 0) + qty,
              revenue: (prodPerf[p.id]?.revenue || 0) + rev
            };
          }
        });
      }
    });

    const topProducts = Object.values(prodPerf)
      .sort((a, b) => b.total_sold - a.total_sold)
      .slice(0, 5);

    return {
      brandPerformance,
      categoryPerformance,
      topProducts,
    };
  },

  // Social Posts
  getSocialPosts: async (): Promise<SocialPost[]> => {
    const path = 'social_posts';
    try {
      const q = query(collection(db, path), where('uid', '==', auth.currentUser?.uid), orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },
  createSocialPost: async (post: Partial<SocialPost>) => {
    const path = 'social_posts';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...post,
        uid: auth.currentUser?.uid,
        created_at: serverTimestamp(),
      });
      return { id: docRef.id, ...post };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Notifications
  getNotifications: async (): Promise<Notification[]> => {
    const path = 'notifications';
    try {
      const q = query(collection(db, path), where('uid', '==', auth.currentUser?.uid), orderBy('created_at', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },
  markNotificationsRead: async () => {
    const path = 'notifications';
    try {
      const q = query(collection(db, path), where('uid', '==', auth.currentUser?.uid), where('is_read', '==', 0));
      const snapshot = await getDocs(q);
      const batch = snapshot.docs.map(d => updateDoc(doc(db, path, d.id), { is_read: 1 }));
      await Promise.all(batch);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Stock Logs
  getStockLogs: async (): Promise<any[]> => {
    const path = 'stock_logs';
    try {
      const q = query(collection(db, path), where('uid', '==', auth.currentUser?.uid), orderBy('timestamp', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },
  createStockLog: async (log: any) => {
    const path = 'stock_logs';
    try {
      await addDoc(collection(db, path), {
        ...log,
        uid: auth.currentUser?.uid,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Report Schedules
  getReportSchedules: async (): Promise<any[]> => {
    const path = 'report_schedules';
    try {
      const q = query(collection(db, path), where('uid', '==', auth.currentUser?.uid));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },
  createReportSchedule: async (schedule: any) => {
    const path = 'report_schedules';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...schedule,
        uid: auth.currentUser?.uid,
        created_at: serverTimestamp(),
      });
      return { id: docRef.id, ...schedule };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  deleteReportSchedule: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'report_schedules', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `report_schedules/${id}`);
    }
  }
};
