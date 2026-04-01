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
      return snapshot.docs.map(doc => ({ id: doc.id as any, ...doc.data() } as any));
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
      return { id: docRef.id, ...product };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  updateProduct: async (id: string | number, product: Partial<Product>) => {
    const path = `products/${id}`;
    try {
      const docRef = doc(db, 'products', String(id));
      await updateDoc(docRef, {
        ...product,
        updated_at: serverTimestamp(),
      });
      return { id, ...product };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  deleteProduct: async (id: string | number) => {
    const path = `products/${id}`;
    try {
      const docRef = doc(db, 'products', String(id));
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
      return snapshot.docs.map(doc => ({ id: doc.id as any, ...doc.data() } as any));
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
        uid: auth.currentUser?.uid,
        created_at: serverTimestamp(),
      });
      return { id: docRef.id, ...customer };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
  deleteCustomer: async (id: string | number) => {
    const path = `customers/${id}`;
    try {
      const docRef = doc(db, 'customers', String(id));
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
      const docRef = await addDoc(collection(db, path), {
        ...saleData,
        uid: auth.currentUser?.uid,
        sale_date: serverTimestamp(),
      });
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
      return snapshot.docs.map(doc => ({ id: doc.id as any, ...doc.data() } as any));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },
  getCustomerHistory: async (customerId: string | number): Promise<Sale[]> => {
    const path = 'sales';
    try {
      const q = query(collection(db, path), where('uid', '==', auth.currentUser?.uid), where('customer_id', '==', customerId), orderBy('sale_date', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id as any, ...doc.data() } as any));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  // Reports (Simplified for Firestore)
  getDashboardData: async (): Promise<DashboardData> => {
    const products = await api.getProducts();
    const lowStock = products.filter(p => p.quantity <= p.low_stock_threshold).length;
    const outOfStock = products.filter(p => p.quantity === 0).length;
    
    return {
      stats: {
        totalProducts: products.length,
        lowStock,
        outOfStock,
        totalSales: 0, // Would need to fetch sales
        totalProfit: 0,
      },
      salesByDay: [],
    };
  },
  getPerformanceReport: async (): Promise<PerformanceReport> => {
    return {
      brandPerformance: [],
      categoryPerformance: [],
      topProducts: [],
    };
  },

  // Social Posts
  getSocialPosts: async (): Promise<SocialPost[]> => {
    const path = 'social_posts';
    try {
      const q = query(collection(db, path), where('uid', '==', auth.currentUser?.uid), orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id as any, ...doc.data() } as any));
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
      return snapshot.docs.map(doc => ({ id: doc.id as any, ...doc.data() } as any));
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
  }
};
