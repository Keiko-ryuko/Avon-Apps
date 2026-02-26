import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Bell, 
  Plus, 
  Search,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Menu,
  X,
  PlusCircle,
  MinusCircle,
  Trash2,
  LogOut,
  Share2,
  Edit,
  History,
  Lock,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { api } from './services/api';
import { Product, Customer, Sale, DashboardData, Notification, User, PerformanceReport } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => (
  <div className={cn("bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden", className)} {...props}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-rose-100 text-rose-700',
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider", variants[variant])}>
      {children}
    </span>
  );
};

const LoginView = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await api.login({ username, password });
      onLogin(user);
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl">
            <Package size={32} />
          </div>
          <h1 className="text-2xl font-black tracking-tight">SmartStock</h1>
          <p className="text-slate-500 text-sm">Sign in to manage your beauty business</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-black/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Enter username"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-black/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Enter password"
                />
              </div>
            </div>
            {error && <p className="text-rose-500 text-xs font-medium text-center">{error}</p>}
            <button 
              type="submit"
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-200 active:scale-[0.98] transition-all"
            >
              Sign In
            </button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

const SocialShareModal = ({ product, isOpen, onClose }: { product: Product; isOpen: boolean; onClose: () => void }) => {
  const [vibe, setVibe] = useState<'exciting' | 'urgent' | 'professional'>('exciting');

  const getCaption = () => {
    const price = `$${product.selling_price.toFixed(2)}`;
    const brand = product.brand;
    const name = product.name;

    const templates = {
      exciting: `✨ JUST ARRIVED! ✨\n\nElevate your beauty routine with the all-new ${brand} ${name}! 💄\n\nAvailable now for only ${price}. Don't miss out on this glow-up essential! 💖\n\nOrder yours now! 📲`,
      urgent: `🔥 LIMITED STOCK ALERT! 🔥\n\nOur best-selling ${brand} ${name} is running low! 😱\n\nGrab yours for ${price} before it's gone. Once it's out, it's out! ⏳\n\nDM to secure yours! 🏃‍♀️💨`,
      professional: `SmartStock Beauty Update: ${brand} ${name}\n\nWe are pleased to announce that ${name} is currently in stock and available for purchase.\n\nPrice: ${price}\nCategory: ${product.category}\n\nContact us for orders and inquiries. 📩`
    };
    return templates[vibe];
  };

  const handleShare = (platform: 'whatsapp' | 'facebook' | 'instagram' | 'system') => {
    const text = getCaption();
    
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else if (platform === 'facebook') {
      // Facebook doesn't allow pre-filling text via URL anymore, but we can copy it
      navigator.clipboard.writeText(text);
      alert('Caption copied! Opening Facebook...');
      window.open('https://www.facebook.com', '_blank');
    } else if (platform === 'instagram') {
      navigator.clipboard.writeText(text);
      alert('Caption copied! Opening Instagram...');
      window.open('https://www.instagram.com', '_blank');
    } else if (platform === 'system' && navigator.share) {
      navigator.share({
        title: `New Arrival: ${product.name}`,
        text: text,
      }).catch(console.error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] p-4 flex items-end sm:items-center justify-center"
        >
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="bg-white w-full max-w-md rounded-3xl p-6 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Promote Product</h2>
              <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Choose Vibe</label>
              <div className="flex gap-2">
                {(['exciting', 'urgent', 'professional'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVibe(v)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all",
                      vibe === v ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-black/5">
              <p className="text-xs text-slate-600 whitespace-pre-wrap italic leading-relaxed">
                "{getCaption()}"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleShare('whatsapp')}
                className="py-3 bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm"
              >
                WhatsApp
              </button>
              <button 
                onClick={() => handleShare('facebook')}
                className="py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm"
              >
                Facebook
              </button>
              <button 
                onClick={() => handleShare('instagram')}
                className="py-3 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm"
              >
                Instagram
              </button>
              <button 
                onClick={() => handleShare('system')}
                className="py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm"
              >
                More Options
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- Views ---

const DashboardView = ({ data }: { data: DashboardData | null }) => {
  if (!data) return <div className="p-8 text-center text-slate-400">Loading dashboard...</div>;

  const stats = [
    { label: 'Total Sales', value: `$${data.stats.totalSales.toFixed(2)}`, icon: TrendingUp, color: 'text-emerald-600' },
    { label: 'Total Profit', value: `$${data.stats.totalProfit.toFixed(2)}`, icon: BarChart3, color: 'text-indigo-600' },
    { label: 'Low Stock', value: data.stats.lowStock, icon: AlertTriangle, color: 'text-amber-600' },
    { label: 'Out of Stock', value: data.stats.outOfStock, icon: X, color: 'text-rose-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="p-4">
            <div className="flex flex-col gap-1">
              <stat.icon size={18} className={stat.color} />
              <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
              <span className="text-xl font-bold tracking-tight">{stat.value}</span>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <TrendingUp size={16} /> Sales Trend (Last 7 Days)
        </h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.salesByDay}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={(val) => val.split('-').slice(1).join('/')}
              />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                labelStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#10b981" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold px-1">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'New Sale', icon: ShoppingCart, color: 'bg-emerald-500' },
            { label: 'Add Stock', icon: Plus, color: 'bg-indigo-500' },
            { label: 'Reports', icon: BarChart3, color: 'bg-slate-800' },
          ].map((action, i) => (
            <button key={i} className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl border border-black/5 shadow-sm active:scale-95 transition-transform">
              <div className={cn("p-2 rounded-xl text-white", action.color)}>
                <action.icon size={20} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const InventoryView = ({ products, onAddProduct, onUpdate }: { products: Product[]; onAddProduct: () => void; onUpdate: () => void }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Avon' | 'Inuka'>('All');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sharingProduct, setSharingProduct] = useState<Product | null>(null);

  const filtered = products.filter(p => 
    (filter === 'All' || p.brand === filter) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
  );

  const handleShare = (product: Product) => {
    setSharingProduct(product);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await api.deleteProduct(id);
      onUpdate();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search products..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-black/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button 
          onClick={onAddProduct}
          className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['All', 'Avon', 'Inuka'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
              filter === f ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-black/5"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {filtered.map((product) => (
          <Card key={product.id} className="p-3 flex items-center gap-3">
            <div 
              className="w-14 h-14 bg-slate-100 rounded-xl flex-shrink-0 overflow-hidden cursor-pointer"
              onClick={() => setSelectedProduct(product)}
            >
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <Package size={24} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedProduct(product)}>
              <div className="flex items-center justify-between mb-0.5">
                <h4 className="font-bold text-sm truncate">{product.name}</h4>
                <Badge variant={product.quantity === 0 ? 'danger' : product.quantity <= product.low_stock_threshold ? 'warning' : 'success'}>
                  {product.quantity} in stock
                </Badge>
              </div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                {product.brand} • {product.category}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-indigo-600 font-bold text-sm">${product.selling_price.toFixed(2)}</span>
                <span className="text-[10px] text-slate-400 font-medium">Batch: {product.batch_number}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => handleShare(product)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Share2 size={16} /></button>
              <button onClick={() => handleDelete(product.id)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={16} /></button>
            </div>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {selectedProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] p-4 flex items-center justify-center"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="h-48 bg-slate-100 relative">
                {selectedProduct.image_url ? (
                  <img src={selectedProduct.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={64} /></div>
                )}
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur rounded-full shadow-lg"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <Badge variant="default">{selectedProduct.brand}</Badge>
                  <h3 className="text-xl font-black mt-1">{selectedProduct.name}</h3>
                  <p className="text-slate-500 text-sm">{selectedProduct.category}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Selling Price</p>
                    <p className="text-lg font-black text-indigo-600">${selectedProduct.selling_price.toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Current Stock</p>
                    <p className="text-lg font-black text-slate-900">{selectedProduct.quantity}</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between"><span>Buying Price</span><span className="font-bold">${selectedProduct.buying_price.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Supplier</span><span className="font-bold">{selectedProduct.supplier_name || 'N/A'}</span></div>
                  <div className="flex justify-between"><span>Batch Number</span><span className="font-bold">{selectedProduct.batch_number}</span></div>
                  <div className="flex justify-between"><span>Arrival Date</span><span className="font-bold">{selectedProduct.arrival_date}</span></div>
                  <div className="flex justify-between"><span>Expiry Date</span><span className="font-bold text-rose-500">{selectedProduct.expiry_date}</span></div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setSharingProduct(selectedProduct)}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <Share2 size={18} /> Share
                  </button>
                  <button 
                    onClick={() => {
                      // Logic for edit could go here
                      alert('Edit feature coming soon!');
                    }}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <Edit size={18} /> Edit
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {sharingProduct && (
        <SocialShareModal 
          product={sharingProduct} 
          isOpen={!!sharingProduct} 
          onClose={() => setSharingProduct(null)} 
        />
      )}
    </div>
  );
};

const SalesView = ({ products, customers, onSaleComplete }: { products: Product[]; customers: Customer[]; onSaleComplete: () => void }) => {
  const [cart, setCart] = useState<{ product_id: number; quantity: number }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [search, setSearch] = useState('');

  const addToCart = (productId: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === productId);
      if (existing) {
        return prev.map(item => item.product_id === productId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product_id: productId, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product_id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((sum, item) => {
    const p = products.find(p => p.id === item.product_id);
    return sum + (p ? p.selling_price * item.quantity : 0);
  }, 0);

  const handleCheckout = async () => {
    if (!selectedCustomerId || cart.length === 0) return;
    try {
      await api.createSale({
        customer_id: Number(selectedCustomerId),
        items: cart,
        payment_method: paymentMethod,
        assistant_id: 1 // Mocked for now
      });
      setCart([]);
      setSelectedCustomerId('');
      onSaleComplete();
      alert('Sale completed successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 pb-32">
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer</label>
        <select 
          className="w-full p-3 bg-white border border-black/5 rounded-xl text-sm focus:outline-none"
          value={selectedCustomerId}
          onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
        >
          <option value="">Select Customer</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Add Products</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search to add..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-black/5 rounded-xl text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="grid gap-2 max-h-48 overflow-y-auto">
          {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) && p.quantity > 0).slice(0, 5).map(p => (
            <button 
              key={p.id}
              onClick={() => addToCart(p.id)}
              className="p-2 bg-white border border-black/5 rounded-xl flex items-center justify-between text-sm active:bg-slate-50"
            >
              <span>{p.name}</span>
              <span className="font-bold text-indigo-600">${p.selling_price.toFixed(2)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Cart ({cart.length})</label>
        <div className="space-y-2">
          {cart.map(item => {
            const p = products.find(p => p.id === item.product_id);
            if (!p) return null;
            return (
              <div key={item.product_id} className="p-3 bg-white border border-black/5 rounded-xl flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-sm truncate">{p.name}</h5>
                  <p className="text-xs text-slate-500">${p.selling_price.toFixed(2)} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQuantity(item.product_id, -1)} className="text-slate-400"><MinusCircle size={20} /></button>
                  <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product_id, 1)} className="text-indigo-600"><PlusCircle size={20} /></button>
                  <button onClick={() => removeFromCart(item.product_id)} className="ml-2 text-rose-500"><Trash2 size={18} /></button>
                </div>
              </div>
            );
          })}
          {cart.length === 0 && <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">Cart is empty</div>}
        </div>
      </div>

      <div className="fixed bottom-20 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-black/5 z-40">
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Total Amount</span>
            <span className="text-2xl font-black text-slate-900">${total.toFixed(2)}</span>
          </div>
          <button 
            disabled={!selectedCustomerId || cart.length === 0}
            onClick={handleCheckout}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
          >
            Complete Sale
          </button>
        </div>
      </div>
    </div>
  );
};

const ReportsView = ({ sales }: { sales: Sale[] }) => {
  const [performance, setPerformance] = useState<PerformanceReport | null>(null);

  useEffect(() => {
    api.getPerformanceReport().then(setPerformance);
  }, []);

  const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalProfit = sales.reduce((sum, s) => sum + s.total_profit, 0);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleShareReceipt = (sale: Sale) => {
    const text = `🧾 RECEIPT - SmartStock Beauty Tracker\n\nCustomer: ${sale.customer_name || 'Walk-in'}\nDate: ${new Date(sale.sale_date).toLocaleString()}\n\nTotal Paid: $${sale.total_amount.toFixed(2)}\nPayment: ${sale.payment_method}\n\nThank you for shopping with us! ✨`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-indigo-600 text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Revenue</p>
          <p className="text-xl font-black">${totalRevenue.toFixed(2)}</p>
        </Card>
        <Card className="p-4 bg-emerald-600 text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Profit</p>
          <p className="text-xl font-black">${totalProfit.toFixed(2)}</p>
        </Card>
      </div>

      {performance && (
        <div className="space-y-6">
          <Card className="p-4">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <BarChart3 size={16} /> Brand Performance
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performance.brandPerformance}>
                  <XAxis dataKey="brand" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {performance.brandPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Top Categories</h3>
              <div className="space-y-2">
                {performance.categoryPerformance.map((cat, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-xs font-medium truncate pr-2">{cat.category}</span>
                    <span className="text-xs font-bold text-indigo-600">${cat.revenue.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Best Sellers</h3>
              <div className="space-y-2">
                {performance.topProducts.map((prod, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-xs font-medium truncate pr-2">{prod.name}</span>
                    <span className="text-xs font-bold text-emerald-600">{prod.total_sold}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-bold px-1">Recent Transactions</h3>
        <div className="space-y-2">
          {sales.map(sale => (
            <Card key={sale.id} className="p-3 flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{sale.customer_name || 'Walk-in Customer'}</p>
                <p className="text-[10px] text-slate-400 font-medium">{new Date(sale.sale_date).toLocaleDateString()} • {sale.payment_method}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-black text-sm text-slate-900">${sale.total_amount.toFixed(2)}</p>
                  <p className="text-[10px] text-emerald-600 font-bold">Profit: ${sale.total_profit.toFixed(2)}</p>
                </div>
                <button 
                  onClick={() => handleShareReceipt(sale)}
                  className="p-2 text-slate-300 hover:text-emerald-600 transition-colors"
                >
                  <Share2 size={18} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

const CustomersView = ({ customers, onAddCustomer, onUpdate }: { customers: Customer[]; onAddCustomer: () => void; onUpdate: () => void }) => {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  const fetchHistory = async (id: number) => {
    const data = await api.getCustomerHistory(id);
    setHistory(data);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      await api.deleteCustomer(id);
      onUpdate();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search customers..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-black/5 rounded-xl text-sm focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button 
          onClick={onAddCustomer}
          className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="grid gap-3">
        {filtered.map((customer) => (
          <Card key={customer.id} className="p-4 flex items-center gap-4">
            <div 
              className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg cursor-pointer"
              onClick={() => {
                setSelectedCustomer(customer);
                fetchHistory(customer.id);
              }}
            >
              {customer.name.charAt(0)}
            </div>
            <div 
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => {
                setSelectedCustomer(customer);
                fetchHistory(customer.id);
              }}
            >
              <h4 className="font-bold text-sm truncate">{customer.name}</h4>
              <p className="text-xs text-slate-500">{customer.phone}</p>
              <div className="mt-1">
                <Badge variant={customer.category === 'VIP' ? 'success' : 'default'}>
                  {customer.category}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(customer.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors">
                <Trash2 size={18} />
              </button>
              <button 
                onClick={() => {
                  setSelectedCustomer(customer);
                  fetchHistory(customer.id);
                }}
                className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <div className="p-8 text-center text-slate-400">No customers found</div>}
      </div>

      <AnimatePresence>
        {selectedCustomer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] p-4 flex items-center justify-center"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="p-6 border-b border-black/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-black">{selectedCustomer.name}</h3>
                    <p className="text-xs text-slate-500">{selectedCustomer.phone} • {selectedCustomer.category}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total Purchases</p>
                    <p className="text-lg font-black text-slate-900">{history.length}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total Spent</p>
                    <p className="text-lg font-black text-emerald-600">${history.reduce((sum, s) => sum + s.total_amount, 0).toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <History size={14} /> Purchase History
                  </h4>
                  <div className="space-y-2">
                    {history.map(sale => (
                      <div key={sale.id} className="p-3 bg-white border border-black/5 rounded-xl">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold">{new Date(sale.sale_date).toLocaleDateString()}</span>
                          <span className="text-sm font-black text-slate-900">${sale.total_amount.toFixed(2)}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 italic truncate">{sale.items_summary}</p>
                      </div>
                    ))}
                    {history.length === 0 && <p className="text-center text-slate-400 text-sm py-4">No purchase history</p>}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-black/5 flex gap-3">
                <button className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                  <Edit size={18} /> Edit Profile
                </button>
                <button 
                  onClick={() => {
                    const msg = `Hello ${selectedCustomer.name}! We have new stock at SmartStock Beauty Tracker. Come check it out!`;
                    window.open(`https://wa.me/${selectedCustomer.phone}?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <Share2 size={18} /> WhatsApp
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'sales' | 'customers' | 'reports'>('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchData = async () => {
    try {
      const [db, prod, cust, sls, notifs] = await Promise.all([
        api.getDashboardData(),
        api.getProducts(),
        api.getCustomers(),
        api.getSalesReport(),
        api.getNotifications()
      ]);
      setDashboardData(db);
      setProducts(prod);
      setCustomers(cust);
      setSales(sls);
      setNotifications(notifs);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView data={dashboardData} />;
      case 'inventory': return <InventoryView products={products} onAddProduct={() => setShowAddProduct(true)} onUpdate={fetchData} />;
      case 'sales': return <SalesView products={products} customers={customers} onSaleComplete={fetchData} />;
      case 'customers': return <CustomersView customers={customers} onAddCustomer={() => setShowAddCustomer(true)} onUpdate={fetchData} />;
      case 'reports': return <ReportsView sales={sales} />;
      default: return <div className="p-8 text-center text-slate-400">Coming Soon</div>;
    }
  };

  if (!user) {
    return <LoginView onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
              <Package size={18} />
            </div>
            <h1 className="font-black text-lg tracking-tight">SmartStock</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setUser(null)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <LogOut size={20} />
            </button>
            <button 
              onClick={() => setShowNotifications(true)}
              className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
              )}
            </button>
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">
              AD
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto p-4 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-black/5 px-4 py-2 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
            { id: 'inventory', icon: Package, label: 'Stock' },
            { id: 'sales', icon: ShoppingCart, label: 'Sell' },
            { id: 'customers', icon: Users, label: 'Users' },
            { id: 'reports', icon: BarChart3, label: 'Stats' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all",
                activeTab === tab.id ? "text-indigo-600" : "text-slate-400"
              )}
            >
              <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Add Product Modal (Simplified) */}
      <AnimatePresence>
        {showAddProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] p-4 flex items-end sm:items-center justify-center"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-3xl p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">Add New Product</h2>
                <button onClick={() => setShowAddProduct(false)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
              </div>
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData.entries());
                await api.createProduct({
                  ...data,
                  quantity: Number(data.quantity),
                  buying_price: Number(data.buying_price),
                  selling_price: Number(data.selling_price),
                  low_stock_threshold: Number(data.low_stock_threshold),
                } as any);
                setShowAddProduct(false);
                fetchData();
              }}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Brand</label>
                    <select name="brand" className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm">
                      <option>Avon</option>
                      <option>Inuka</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</label>
                    <input name="category" placeholder="e.g. Perfume" className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Product Name</label>
                  <input name="name" required placeholder="Enter name" className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Qty</label>
                    <input name="quantity" type="number" defaultValue="0" className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Buy $</label>
                    <input name="buying_price" type="number" step="0.01" className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sell $</label>
                    <input name="selling_price" type="number" step="0.01" className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Batch #</label>
                    <input name="batch_number" className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Threshold</label>
                    <input name="low_stock_threshold" type="number" defaultValue="5" className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm" />
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-200">
                  Save Product
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Customer Modal */}
      <AnimatePresence>
        {showAddCustomer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] p-4 flex items-end sm:items-center justify-center"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-3xl p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">Add New Customer</h2>
                <button onClick={() => setShowAddCustomer(false)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
              </div>
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData.entries());
                await api.createCustomer(data as any);
                setShowAddCustomer(false);
                fetchData();
              }}>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Full Name</label>
                  <input name="name" required placeholder="Enter name" className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</label>
                    <input name="phone" placeholder="Phone number" className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</label>
                    <select name="category" className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm">
                      <option>Regular</option>
                      <option>VIP</option>
                      <option>Wholesale</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email (Optional)</label>
                  <input name="email" type="email" placeholder="Email address" className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm" />
                </div>
                <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-200">
                  Save Customer
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Modal */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] p-4 flex items-start justify-center"
          >
            <motion.div 
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              exit={{ y: -20 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 mt-12 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">Notifications</h2>
                <button onClick={() => setShowNotifications(false)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                    <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-amber-900">{n.message}</p>
                      <p className="text-[10px] text-amber-600 font-medium">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="p-8 text-center text-slate-400">
                    <CheckCircle2 size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-medium">All caught up!</p>
                  </div>
                )}
              </div>
              {notifications.length > 0 && (
                <button 
                  onClick={async () => {
                    await api.markNotificationsRead();
                    fetchData();
                    setShowNotifications(false);
                  }}
                  className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm"
                >
                  Clear All
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
