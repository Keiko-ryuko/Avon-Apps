import React, { useState, useEffect, useRef } from 'react';
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
  User as UserIcon,
  Sparkles,
  Instagram,
  Facebook,
  MessageCircle,
  Clock,
  Image as ImageIcon,
  Camera,
  Calendar as CalendarIcon,
  Heart,
  Bookmark,
  Send,
  Upload,
  Filter,
  FileUp,
  FileDown,
  Zap,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
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
import { GoogleGenAI } from "@google/genai";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { api } from './services/api';
import { Product, Customer, Sale, DashboardData, Notification, User, PerformanceReport, SocialPost } from './types';
import { useAuth } from './components/auth/FirebaseProvider';
import { LoginForm } from './components/auth/LoginForm';
import { auth } from './lib/firebase';
import { fileToBase64 } from './lib/utils';

const getGenAI = () => {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'DUMMY_KEY' });
};

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
  const icons = {
    default: null,
    success: <CheckCircle2 size={10} className="mr-1 inline" />,
    warning: <AlertTriangle size={10} className="mr-1 inline" />,
    danger: <X size={10} className="mr-1 inline" />,
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider", variants[variant])}>
      {icons[variant]}
      {children}
    </span>
  );
};

const SocialShareModal = ({ product, isOpen, onClose }: { product: Product; isOpen: boolean; onClose: () => void }) => {
  const [vibe, setVibe] = useState<'exciting' | 'urgent' | 'professional'>('exciting');
  const [caption, setCaption] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [platform, setPlatform] = useState<'whatsapp' | 'facebook' | 'instagram'>('whatsapp');
  const [includeImage, setIncludeImage] = useState(true);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const price = `$${product.selling_price.toFixed(2)}`;
      const brand = product.brand;
      const name = product.name;

      const templates = {
        exciting: `✨ JUST ARRIVED! ✨\n\nElevate your beauty routine with the all-new ${brand} ${name}! 💄\n\nAvailable now for only ${price}. Don't miss out on this glow-up essential! 💖\n\nOrder yours now! 📲`,
        urgent: `🔥 LIMITED STOCK ALERT! 🔥\n\nOur best-selling ${brand} ${name} is running low! 😱\n\nGrab yours for ${price} before it's gone. Once it's out, it's out! ⏳\n\nDM to secure yours! 🏃‍♀️💨`,
        professional: `SmartStock Beauty Update: ${brand} ${name}\n\nWe are pleased to announce that ${name} is currently in stock and available for purchase.\n\nPrice: ${price}\nCategory: ${product.category}\n\nContact us for orders and inquiries. 📩`
      };
      setCaption(templates[vibe]);
    }
  }, [isOpen, vibe, product]);

  const generateAICaption = async () => {
    setIsGenerating(true);
    try {
      const isLowStock = product.quantity <= product.low_stock_threshold;
      const prompt = `Generate a catchy social media caption for a beauty product.
      Product: ${product.name}
      Brand: ${product.brand}
      Price: $${product.selling_price}
      Status: ${isLowStock ? 'Running low on stock' : 'New arrival'}
      Vibe: ${vibe}
      Keep it short, use emojis, and include a call to action.`;

      const response = await getGenAI().models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      if (response.text) {
        setCaption(response.text.trim());
      }
    } catch (error) {
      console.error("AI Generation failed:", error);
      alert("AI generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (showScheduler && (!scheduleDate || !scheduleTime)) {
      alert("Please select date and time for scheduling.");
      return;
    }

    if (showScheduler) {
      const scheduledAt = `${scheduleDate}T${scheduleTime}`;
      await api.createSocialPost({
        product_id: product.id,
        platform,
        caption,
        scheduled_at: scheduledAt,
        status: 'scheduled'
      });
      alert(`Post scheduled for ${scheduledAt} on ${platform}`);
      onClose();
      return;
    }

    // Immediate share logic
    await api.createSocialPost({
      product_id: product.id,
      platform,
      caption,
      status: 'posted'
    });

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, '_blank');
    } else {
      navigator.clipboard.writeText(caption);
      alert(`Caption copied! Opening ${platform}...`);
      const urls = {
        facebook: 'https://www.facebook.com',
        instagram: 'https://www.instagram.com'
      };
      window.open(urls[platform], '_blank');
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] p-4 flex items-end sm:items-center justify-center overflow-y-auto"
        >
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="bg-white w-full max-w-2xl rounded-3xl p-6 space-y-6 my-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Share2 size={24} className="text-indigo-600" /> ✨ Promote Product
              </h2>
              <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Controls */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Platform</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'whatsapp', icon: MessageCircle, color: 'bg-emerald-500' },
                      { id: 'facebook', icon: Facebook, color: 'bg-blue-600' },
                      { id: 'instagram', icon: Instagram, color: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPlatform(p.id as any)}
                        className={cn(
                          "flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all border-2",
                          platform === p.id ? "border-slate-900 bg-slate-50" : "border-transparent bg-slate-100"
                        )}
                      >
                        <p.icon size={20} className={platform === p.id ? "text-slate-900" : "text-slate-400"} />
                        <span className="text-[10px] font-bold capitalize">{p.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Caption</label>
                    <button 
                      onClick={generateAICaption}
                      disabled={isGenerating}
                      className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 hover:underline disabled:opacity-50"
                    >
                      <Sparkles size={12} /> {isGenerating ? 'Generating...' : 'AI Magic'}
                    </button>
                  </div>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full h-32 p-4 bg-slate-50 rounded-2xl border border-black/5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={18} className="text-slate-400" />
                    <span className="text-xs font-bold">Include Product Image</span>
                  </div>
                  <button 
                    onClick={() => setIncludeImage(!includeImage)}
                    className={cn(
                      "w-10 h-6 rounded-full transition-all relative",
                      includeImage ? "bg-indigo-600" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      includeImage ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => setShowScheduler(!showScheduler)}
                    className="text-xs font-bold text-slate-500 flex items-center gap-2"
                  >
                    <Clock size={14} /> {showScheduler ? 'Cancel Scheduling' : 'Schedule for later'}
                  </button>
                  {showScheduler && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2">
                      <input 
                        type="date" 
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="p-3 bg-slate-50 rounded-xl border border-black/5 text-xs"
                      />
                      <input 
                        type="time" 
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="p-3 bg-slate-50 rounded-xl border border-black/5 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Preview</label>
                <div className={cn(
                  "border border-black/5 rounded-3xl overflow-hidden shadow-sm bg-white transition-all duration-500",
                  platform === 'instagram' ? "max-w-[300px] mx-auto" : ""
                )}>
                  {/* Platform Header */}
                  <div className="p-3 border-b border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-white",
                        platform === 'whatsapp' ? "bg-emerald-500" : 
                        platform === 'facebook' ? "bg-blue-600" : 
                        "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600"
                      )}>
                        {platform === 'whatsapp' ? <MessageCircle size={16} /> : 
                         platform === 'facebook' ? <Facebook size={16} /> : 
                         <Instagram size={16} />}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold">SmartStock Beauty</p>
                        <p className="text-[8px] text-slate-400">{platform === 'whatsapp' ? 'Online' : 'Sponsored'}</p>
                      </div>
                    </div>
                    {platform === 'instagram' && <div className="flex gap-0.5"><div className="w-1 h-1 bg-slate-300 rounded-full"/><div className="w-1 h-1 bg-slate-300 rounded-full"/><div className="w-1 h-1 bg-slate-300 rounded-full"/></div>}
                  </div>
                  {/* Image */}
                  {includeImage && (
                    <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                      {product.image_url ? (
                        <img src={product.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <ImageIcon size={48} className="text-slate-200" />
                      )}
                    </div>
                  )}
                  {/* Actions */}
                  {platform !== 'whatsapp' && (
                    <div className="p-3 flex justify-between">
                      <div className="flex gap-3">
                        <Heart size={18} className="text-slate-400" />
                        <MessageCircle size={18} className="text-slate-400" />
                        <Send size={18} className="text-slate-400" />
                      </div>
                      <Bookmark size={18} className="text-slate-400" />
                    </div>
                  )}
                  {/* Caption */}
                  <div className={cn(
                    "px-3 pb-4 space-y-1",
                    platform === 'whatsapp' ? "bg-[#e5ddd5] pt-3" : ""
                  )}>
                    {platform === 'whatsapp' ? (
                      <div className="bg-white p-2 rounded-lg rounded-tl-none shadow-sm relative">
                        <div className="absolute -left-2 top-0 w-0 h-0 border-t-[8px] border-t-white border-l-[8px] border-l-transparent" />
                        <p className="text-[10px] text-slate-800 whitespace-pre-wrap">{caption}</p>
                        <p className="text-[8px] text-slate-400 text-right mt-1">12:00 PM</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-[10px] font-bold">SmartStock Beauty</p>
                        <p className="text-[10px] text-slate-600 line-clamp-3 whitespace-pre-wrap">{caption}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleShare}
              className={cn(
                "w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95",
                platform === 'whatsapp' ? "bg-emerald-500" : 
                platform === 'facebook' ? "bg-blue-600" : 
                "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600"
              )}
            >
              {showScheduler ? 'Schedule Post' : `Post to ${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const SocialPostsView = () => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getSocialPosts().then(data => {
      setPosts(data);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading history...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-2xl font-black">✨ Social History</h2>
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
          <Share2 size={20} />
        </div>
      </div>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Share2 size={32} />
            </div>
            <p className="text-slate-500 font-medium">No posts shared yet.</p>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-xl text-white",
                    post.platform === 'whatsapp' ? "bg-emerald-500" : 
                    post.platform === 'facebook' ? "bg-blue-600" : 
                    "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600"
                  )}>
                    {post.platform === 'whatsapp' ? <MessageCircle size={16} /> : 
                     post.platform === 'facebook' ? <Facebook size={16} /> : 
                     <Instagram size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-black">{post.product_name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{post.product_brand}</p>
                  </div>
                </div>
                <Badge variant={post.status === 'scheduled' ? 'warning' : 'success'}>
                  {post.status}
                </Badge>
              </div>
              
              <p className="text-xs text-slate-600 line-clamp-2 italic bg-slate-50 p-2 rounded-lg border border-black/5">
                "{post.caption}"
              </p>

              <div className="flex justify-between items-center pt-2 border-t border-black/5">
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                  <CalendarIcon size={12} />
                  {new Date(post.created_at).toLocaleDateString()}
                </div>
                {post.scheduled_at && (
                  <div className="flex items-center gap-1 text-[10px] text-indigo-500 font-bold">
                    <Clock size={12} />
                    Scheduled: {new Date(post.scheduled_at).toLocaleString()}
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

const ReceiptModal = ({ sale, customer, items, products, onClose }: { 
  sale: any; 
  customer: Customer | undefined; 
  items: { product_id: string; quantity: number }[]; 
  products: Product[];
  onClose: () => void;
}) => {
  const total = items.reduce((sum, item) => {
    const p = products.find(p => p.id === item.product_id);
    return sum + (p ? (Number(p.selling_price) || 0) * item.quantity : 0);
  }, 0);

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] p-4 flex items-center justify-center"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        >
          <div className="bg-slate-900 p-6 text-center text-white space-y-2">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-black tracking-tight">🎉 Sale Complete!</h2>
            <p className="text-slate-400 text-xs">Transaction ID: #{sale.id || 'N/A'}</p>
          </div>

          <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[60vh]">
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Customer</p>
                  <p className="text-sm font-bold">{customer?.name || 'Walk-in Customer'}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Date</p>
                  <p className="text-sm font-bold">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Items</p>
                {items.map((item, i) => {
                  const p = products.find(prod => prod.id === item.product_id);
                  return (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium">
                        {p?.name} <span className="text-slate-400 text-xs">x{item.quantity}</span>
                      </span>
                      <span className="font-bold">${((p?.selling_price || 0) * item.quantity).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Payment Method</span>
                  <span className="font-bold">{sale.payment_method || 'Cash'}</span>
                </div>
                <div className="flex justify-between text-lg font-black pt-2">
                  <span>Total Paid</span>
                  <span className="text-emerald-600">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl text-center space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">✨ Thank you for shopping!</p>
              <p className="text-[10px] text-slate-500">SmartStock Beauty Tracker</p>
            </div>
          </div>

          <div className="p-6 pt-0">
            <button 
              onClick={onClose}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const EditProductModal = ({ product, isOpen, onClose, onUpdate }: { product: Product; isOpen: boolean; onClose: () => void; onUpdate: () => void }) => {
  const [formData, setFormData] = useState(product);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const base64 = await fileToBase64(file);
      setFormData({ ...formData, image_url: base64 });
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to process image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.updateProduct(product.id, {
      ...formData,
      quantity: Number(formData.quantity) || 0,
      buying_price: Number(formData.buying_price) || 0,
      selling_price: Number(formData.selling_price) || 0,
      low_stock_threshold: Number(formData.low_stock_threshold) || 0,
    } as any);
    onUpdate();
    onClose();
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
            className="bg-white w-full max-w-md rounded-3xl p-6 space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">✏️ Edit Product</h2>
              <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Product Image</label>
                <div className="flex gap-2">
                  <input 
                    value={formData.image_url || ''} 
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="Image URL or upload from gallery" 
                    className="flex-1 p-3 bg-slate-50 border border-black/5 rounded-xl text-sm" 
                  />
                  <label className="p-3 bg-slate-100 rounded-xl text-slate-600 cursor-pointer hover:bg-slate-200 transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    {isUploading ? <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <Upload size={20} />}
                  </label>
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, image_url: `https://picsum.photos/seed/${Math.random()}/400/400` })}
                    className="p-3 bg-slate-100 rounded-xl text-slate-600"
                  >
                    <Camera size={20} />
                  </button>
                </div>
                {formData.image_url && (
                  <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-black/5">
                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Brand</label>
                  <select 
                    value={formData.brand} 
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm"
                  >
                    <option>Avon</option>
                    <option>Inuka</option>
                    <option>Avroy Shlain</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</label>
                  <input 
                    value={formData.category} 
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Perfume" 
                    className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm" 
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Product Name</label>
                <input 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required 
                  placeholder="Enter name" 
                  className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm" 
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Qty</label>
                  <input 
                    value={formData.quantity || 0} 
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) || 0 })}
                    type="number" 
                    className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Buy $</label>
                  <input 
                    value={formData.buying_price || 0} 
                    onChange={(e) => setFormData({ ...formData, buying_price: Number(e.target.value) || 0 })}
                    type="number" 
                    step="0.01" 
                    className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sell $</label>
                  <input 
                    value={formData.selling_price || 0} 
                    onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) || 0 })}
                    type="number" 
                    step="0.01" 
                    className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Batch #</label>
                  <input 
                    value={formData.batch_number || ''} 
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Threshold</label>
                  <input 
                    value={formData.low_stock_threshold || 0} 
                    onChange={(e) => setFormData({ ...formData, low_stock_threshold: Number(e.target.value) || 0 })}
                    type="number" 
                    className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm" 
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-200">
                Update Product
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- Views ---

const DashboardView = ({ 
  data, 
  onAction, 
  onAddProduct, 
  onAddCustomer 
}: { 
  data: DashboardData | null; 
  onAction: (tab: string) => void;
  onAddProduct: () => void;
  onAddCustomer: () => void;
}) => {
  if (!data) return <div className="p-8 text-center text-slate-400">Loading dashboard...</div>;

  const stats = [
    { label: '💰 Total Sales', value: `$${(Number(data.stats.totalSales) || 0).toFixed(2)}`, icon: TrendingUp, color: 'text-emerald-600' },
    { label: '📈 Total Profit', value: `$${(Number(data.stats.totalProfit) || 0).toFixed(2)}`, icon: BarChart3, color: 'text-indigo-600' },
    { label: '⚠️ Low Stock', value: Number(data.stats.lowStock) || 0, icon: AlertTriangle, color: 'text-amber-600' },
    { label: '🚫 Out of Stock', value: Number(data.stats.outOfStock) || 0, icon: X, color: 'text-rose-600' },
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
        <h3 className="text-sm font-semibold px-1">⚡ Quick Actions</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '🛍️ New Sale', icon: ShoppingCart, color: 'bg-emerald-500', onClick: () => onAction('sales') },
            { label: '📦 Add Stock', icon: Plus, color: 'bg-indigo-500', onClick: onAddProduct },
            { label: '👥 New User', icon: Users, color: 'bg-amber-500', onClick: onAddCustomer },
            { label: '📊 Reports', icon: BarChart3, color: 'bg-slate-800', onClick: () => onAction('reports') },
            { label: '✨ Social', icon: Share2, color: 'bg-indigo-400', onClick: () => onAction('social') },
            { label: '📜 Logs', icon: History, color: 'bg-slate-500', onClick: () => onAction('logs') },
          ].map((action, i) => (
            <button 
              key={i} 
              onClick={action.onClick}
              className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl border border-black/5 shadow-sm active:scale-95 transition-transform"
            >
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
  const [filter, setFilter] = useState<'All' | 'Avon' | 'Inuka' | 'Avroy Shlain'>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
  const [stockLevel, setStockLevel] = useState<'All' | 'Low' | 'Out'>('All');
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sharingProduct, setSharingProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (confirm(`Delete ${selectedIds.length} products?`)) {
      for (const id of selectedIds) {
        await api.deleteProduct(id);
      }
      setSelectedIds([]);
      onUpdate();
    }
  };

  const filtered = products.filter(p => {
    const matchesBrand = filter === 'All' || p.brand === filter;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    const matchesPrice = p.selling_price >= priceRange.min && p.selling_price <= priceRange.max;
    const matchesStock = stockLevel === 'All' || 
                        (stockLevel === 'Low' && p.quantity <= p.low_stock_threshold && p.quantity > 0) ||
                        (stockLevel === 'Out' && p.quantity === 0);
    return matchesBrand && matchesSearch && matchesPrice && matchesStock;
  });

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const newProducts = results.data.map((row: any) => ({
            name: row.name || 'Unnamed Product',
            brand: row.brand || 'Inuka',
            category: row.category || 'General',
            quantity: Number(row.quantity) || 0,
            buying_price: Number(row.buying_price) || 0,
            selling_price: Number(row.selling_price) || 0,
            low_stock_threshold: Number(row.low_stock_threshold) || 5,
            supplier_name: row.supplier_name || '',
            batch_number: row.batch_number || '',
            image_url: row.image_url || '',
          }));

          for (const p of newProducts) {
            await api.createProduct(p);
          }
          alert(`Successfully imported ${newProducts.length} products!`);
          onUpdate();
        } catch (err) {
          console.error(err);
          alert('Failed to import products. Check console for details.');
        } finally {
          setIsImporting(false);
        }
      }
    });
  };

  const handleShare = (product: Product) => {
    setSharingProduct(product);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await api.deleteProduct(id);
      onUpdate();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-black tracking-tight">📦 Inventory</h2>
        <button 
          onClick={onAddProduct}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
        >
          <Plus size={18} /> Add New
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
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
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "p-2 rounded-xl border border-black/5 transition-colors",
            showFilters ? "bg-slate-800 text-white" : "bg-white text-slate-600"
          )}
        >
          <Filter size={20} />
        </button>
        <label className="p-2 bg-white border border-black/5 rounded-xl text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors">
          <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} disabled={isImporting} />
          <FileUp size={20} className={isImporting ? "animate-bounce" : ""} />
        </label>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-4 bg-slate-50 border-none space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Price Min ($)</label>
                  <input 
                    type="number" 
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: Number(e.target.value) }))}
                    className="w-full p-2 bg-white rounded-lg text-xs border border-black/5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Price Max ($)</label>
                  <input 
                    type="number" 
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: Number(e.target.value) }))}
                    className="w-full p-2 bg-white rounded-lg text-xs border border-black/5"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stock Availability</label>
                <div className="flex gap-2">
                  {['All', 'Low', 'Out'].map((l) => (
                    <button
                      key={l}
                      onClick={() => setStockLevel(l as any)}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors",
                        stockLevel === l ? "bg-indigo-600 text-white" : "bg-white text-slate-500 border border-black/5"
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['All', 'Avon', 'Inuka', 'Avroy Shlain'].map((f) => (
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
        {filtered.map((product) => {
          const isSelected = selectedIds.includes(product.id);
          return (
            <Card 
              key={product.id} 
              className={cn(
                "p-3 flex items-center gap-3 transition-colors relative",
                isSelected ? "border-indigo-600 bg-indigo-50/30" : ""
              )}
            >
              <button 
                onClick={() => toggleSelect(product.id)}
                className={cn(
                  "w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0",
                  isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                )}
              >
                {isSelected && <CheckCircle2 size={12} />}
              </button>
              <div 
                className="w-14 h-14 bg-slate-100 rounded-xl flex-shrink-0 overflow-hidden cursor-pointer"
                onClick={() => isSelected ? toggleSelect(product.id) : setSelectedProduct(product)}
              >
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Package size={24} />
                  </div>
                )}
              </div>
              <div 
                className="flex-1 min-w-0 cursor-pointer" 
                onClick={() => isSelected ? toggleSelect(product.id) : setSelectedProduct(product)}
              >
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
                <button 
                  onClick={() => {
                    setEditingProduct(product);
                  }} 
                  className="p-1.5 text-slate-400 hover:text-amber-600"
                >
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(product.id)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={16} /></button>
              </div>
            </Card>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 z-[65]"
          >
            <Card className="p-4 bg-slate-900 border-none shadow-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                  {selectedIds.length}
                </div>
                <span className="text-white text-sm font-bold">Items selected</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSelectedIds([])}
                  className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                >
                  Clear
                </button>
                <div className="h-4 w-px bg-slate-700 mx-1" />
                <button 
                  onClick={() => setShowBulkActions(true)}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-900/50"
                >
                  Actions
                </button>
                <button 
                  onClick={handleBulkDelete}
                  className="p-2 text-rose-400 hover:text-rose-300 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkActions && (
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
              className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black">⚡ Bulk Actions</h3>
                <button onClick={() => setShowBulkActions(false)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Update Brand</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Avon', 'Inuka', 'Avroy Shlain'].map(b => (
                      <button
                        key={b}
                        onClick={async () => {
                          for (const id of selectedIds) {
                            await api.updateProduct(id, { brand: b as any });
                          }
                          setSelectedIds([]);
                          setShowBulkActions(false);
                          onUpdate();
                        }}
                        className="p-2 bg-slate-50 hover:bg-indigo-50 border border-black/5 rounded-xl text-[10px] font-bold transition-colors"
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Stock Adjustment</label>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={async () => {
                        const amount = Number(prompt('Add how many units to each?', '5'));
                        if (amount) {
                          for (const id of selectedIds) {
                            const p = products.find(x => x.id === id);
                            if (p) {
                              await api.updateProduct(id, { quantity: p.quantity + amount });
                            }
                          }
                          setSelectedIds([]);
                          setShowBulkActions(false);
                          onUpdate();
                        }
                      }}
                      className="flex-1 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100"
                    >
                      + Add Stock
                    </button>
                    <button 
                      onClick={async () => {
                        const amount = Number(prompt('Deduct how many units from each?', '1'));
                        if (amount) {
                          for (const id of selectedIds) {
                            const p = products.find(x => x.id === id);
                            if (p && p.quantity >= amount) {
                              await api.updateProduct(id, { quantity: p.quantity - amount });
                            }
                          }
                          setSelectedIds([]);
                          setShowBulkActions(false);
                          onUpdate();
                        }
                      }}
                      className="flex-1 py-2 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold border border-rose-100"
                    >
                      - Subtract
                    </button>
                  </div>
                </div>
                
                <button 
                  onClick={() => setShowBulkActions(false)}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    <p className="text-[10px] font-bold text-slate-400 uppercase">💰 Selling Price</p>
                    <p className="text-lg font-black text-indigo-600">${selectedProduct.selling_price.toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">📦 Current Stock</p>
                    <p className="text-lg font-black text-slate-900">{selectedProduct.quantity}</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between"><span>💵 Buying Price</span><span className="font-bold">${selectedProduct.buying_price.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>🏢 Supplier</span><span className="font-bold">{selectedProduct.supplier_name || 'N/A'}</span></div>
                  <div className="flex justify-between"><span>🔢 Batch Number</span><span className="font-bold">{selectedProduct.batch_number}</span></div>
                  <div className="flex justify-between"><span>📅 Arrival Date</span><span className="font-bold">{selectedProduct.arrival_date}</span></div>
                  <div className="flex justify-between"><span>⌛ Expiry Date</span><span className="font-bold text-rose-500">{selectedProduct.expiry_date}</span></div>
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
                      setEditingProduct(selectedProduct);
                      setSelectedProduct(null);
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

      {editingProduct && (
        <EditProductModal 
          product={editingProduct}
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          onUpdate={onUpdate}
        />
      )}

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
  const [cart, setCart] = useState<{ product_id: string; quantity: number }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [search, setSearch] = useState('');
  const [completedSale, setCompletedSale] = useState<any | null>(null);

  const addToCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === productId);
      if (existing) {
        return prev.map(item => item.product_id === productId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product_id: productId, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
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
      const totalAmount = cart.reduce((sum, item) => {
        const p = products.find(prod => prod.id === item.product_id);
        return sum + (p ? (Number(p.selling_price) || 0) * item.quantity : 0);
      }, 0);

      const totalProfit = cart.reduce((sum, item) => {
        const p = products.find(prod => prod.id === item.product_id);
        const profit = p ? ((Number(p.selling_price) || 0) - (Number(p.buying_price) || 0)) * item.quantity : 0;
        return sum + profit;
      }, 0);

      const result = await api.createSale({
        customer_id: selectedCustomerId,
        items: cart,
        total_amount: totalAmount,
        total_profit: totalProfit,
        payment_method: paymentMethod,
        assistant_id: "1" // Mocked for now
      });
      
      // Store current cart and customer for receipt before clearing
      const saleData = {
        id: result.id,
        payment_method: paymentMethod,
        items: [...cart],
        customer_id: selectedCustomerId
      };
      
      setCompletedSale(saleData);
      setCart([]);
      setSelectedCustomerId('');
      onSaleComplete();
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
          onChange={(e) => setSelectedCustomerId(e.target.value)}
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

      {completedSale && (
        <ReceiptModal 
          sale={completedSale}
          customer={customers.find(c => c.id === completedSale.customer_id)}
          items={completedSale.items}
          products={products}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </div>
  );
};

const ReportsView = ({ sales }: { sales: Sale[] }) => {
  const [performance, setPerformance] = useState<PerformanceReport | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ type: 'daily', email: '' });

  useEffect(() => {
    api.getPerformanceReport().then(setPerformance);
    api.getReportSchedules().then(setSchedules);
  }, []);

  const handleAddSchedule = async () => {
    if (!newSchedule.email) return;
    await api.createReportSchedule(newSchedule);
    api.getReportSchedules().then(setSchedules);
    setShowScheduleForm(false);
    setNewSchedule({ type: 'daily', email: '' });
  };

  const handleDeleteSchedule = async (id: string) => {
    await api.deleteReportSchedule(id);
    api.getReportSchedules().then(setSchedules);
  };

  const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
  const totalProfit = sales.reduce((sum, s) => sum + (Number(s.total_profit) || 0), 0);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleShareReceipt = (sale: Sale) => {
    const saleDate = sale.sale_date?.toDate ? sale.sale_date.toDate() : new Date(sale.sale_date);
    const text = `🧾 RECEIPT - SmartStock Beauty Tracker\n\nCustomer: ${sale.customer_name || 'Walk-in'}\nDate: ${saleDate.toLocaleString()}\n\nTotal Paid: $${(Number(sale.total_amount) || 0).toFixed(2)}\nPayment: ${sale.payment_method}\n\nThank you for shopping with us! ✨`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black px-1">📊 Reports</h2>
        <button 
          onClick={() => setShowScheduleForm(!showScheduleForm)}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          <CalendarIcon size={14} /> Schedule
        </button>
      </div>

      <AnimatePresence>
        {showScheduleForm && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-4 bg-indigo-50 border-none space-y-3">
              <h4 className="text-xs font-black uppercase text-indigo-600">New Email Schedule</h4>
              <div className="flex gap-2">
                <select 
                  className="flex-1 p-2 rounded-lg text-xs border border-black/5"
                  value={newSchedule.type}
                  onChange={(e) => setNewSchedule(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <input 
                  type="email" 
                  placeholder="admin@example.com"
                  className="flex-[2] p-2 rounded-lg text-xs border border-black/5"
                  value={newSchedule.email}
                  onChange={(e) => setNewSchedule(prev => ({ ...prev, email: e.target.value }))}
                />
                <button 
                  onClick={handleAddSchedule}
                  className="px-4 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                >
                  Save
                </button>
              </div>
              <div className="space-y-1">
                {schedules.map(s => (
                  <div key={s.id} className="flex items-center justify-between bg-white/50 p-2 rounded-lg text-[10px]">
                    <span className="font-bold uppercase text-slate-500">{s.type}</span>
                    <span className="text-slate-600 truncate px-2">{s.email}</span>
                    <button onClick={() => handleDeleteSchedule(s.id)} className="text-rose-500 hover:scale-110 active:scale-90 transition-transform"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

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
              <BarChart3 size={16} /> 📈 Brand Performance
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
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">🏆 Top Categories</h3>
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
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">🔥 Best Sellers</h3>
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
        <h3 className="text-sm font-bold px-1">📜 Recent Transactions</h3>
        <div className="space-y-2">
          {sales.map(sale => {
            const saleDate = sale.sale_date?.toDate ? sale.sale_date.toDate() : new Date(sale.sale_date);
            return (
              <Card key={sale.id} className="p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{sale.customer_name || 'Walk-in Customer'}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{saleDate.toLocaleDateString()} • {sale.payment_method}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-black text-sm text-slate-900">${(Number(sale.total_amount) || 0).toFixed(2)}</p>
                    <p className="text-[10px] text-emerald-600 font-bold">Profit: ${(Number(sale.total_profit) || 0).toFixed(2)}</p>
                  </div>
                  <button 
                    onClick={() => handleShareReceipt(sale)}
                    className="p-2 text-slate-300 hover:text-emerald-600 transition-colors"
                  >
                    <Share2 size={18} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CustomersView = ({ customers, onAddCustomer, onUpdate }: { customers: Customer[]; onAddCustomer: () => void; onUpdate: () => void }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Loyalty' | 'New'>('All');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const filtered = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchesFilter = filter === 'All' || 
                         (filter === 'Loyalty' && (Number(c.loyalty_points) || 0) > 100) ||
                         (filter === 'New' && !c.total_spent);
    return matchesSearch && matchesFilter;
  });

  const fetchHistory = async (id: string) => {
    const data = await api.getCustomerHistory(id);
    setHistory(data);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      await api.deleteCustomer(id);
      onUpdate();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-black tracking-tight">👥 Customers</h2>
        <button 
          onClick={onAddCustomer}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
        >
          <Plus size={18} /> Add New
        </button>
      </div>

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
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['All', 'Loyalty', 'New'].map((f) => (
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
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                  <Sparkles size={10} /> {Number(customer.loyalty_points) || 0} pts
                </div>
                <div className="text-[8px] font-bold text-slate-400 uppercase">
                  Spent: ${(Number(customer.total_spent) || 0).toFixed(2)}
                </div>
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

const StockLogsView = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getStockLogs().then(data => {
      setLogs(data);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading logs...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
        <History size={20} /> Stock Adjustment Log
      </h2>
      
      <div className="space-y-2">
        {logs.map(log => {
          const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
          return (
            <Card key={log.id} className="p-3">
              <div className="flex justify-between items-start mb-1">
                <span className={cn(
                  "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                  log.type === 'addition' ? "bg-emerald-100 text-emerald-700" : 
                  log.type === 'subtraction' ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                )}>
                  {log.type}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{date.toLocaleString()}</span>
              </div>
              <h4 className="text-sm font-bold">{log.product_name}</h4>
              <div className="flex justify-between items-end mt-1">
                <div className="text-[10px] text-slate-500">
                  <span className="font-bold">{log.previous_quantity}</span> → <span className="font-bold text-slate-900">{log.new_quantity}</span>
                  <p className="mt-0.5 italic">By: {log.user_name}</p>
                </div>
                <div className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold">
                  {log.reason}
                </div>
              </div>
            </Card>
          );
        })}
        {logs.length === 0 && <div className="p-8 text-center text-slate-400">No logs found</div>}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  console.log('App component rendering...');
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'sales' | 'customers' | 'reports' | 'social' | 'logs'>('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newProductImageUrl, setNewProductImageUrl] = useState('');

  const fetchData = async () => {
    if (!user) return;
    try {
      const [dbData, prod, cust, sls, notifs] = await Promise.all([
        api.getDashboardData(),
        api.getProducts(),
        api.getCustomers(),
        api.getSalesReport(),
        api.getNotifications()
      ]);
      setDashboardData(dbData);
      setProducts(prod);
      setCustomers(cust);
      setSales(sls);
      setNotifications(notifs);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const base64 = await fileToBase64(file);
      setNewProductImageUrl(base64);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to process image');
    } finally {
      setIsUploading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return (
        <DashboardView 
          data={dashboardData} 
          onAction={setActiveTab} 
          onAddProduct={() => { setActiveTab('inventory'); setShowAddProduct(true); }}
          onAddCustomer={() => { setActiveTab('customers'); setShowAddCustomer(true); }}
        />
      );
      case 'inventory': return <InventoryView products={products} onAddProduct={() => setShowAddProduct(true)} onUpdate={fetchData} />;
      case 'sales': return <SalesView products={products} customers={customers} onSaleComplete={fetchData} />;
      case 'customers': return <CustomersView customers={customers} onAddCustomer={() => setShowAddCustomer(true)} onUpdate={fetchData} />;
      case 'reports': return <ReportsView sales={sales} />;
      case 'social': return <SocialPostsView />;
      case 'logs': return <StockLogsView />;
      default: return <div className="p-8 text-center text-slate-400">Coming Soon</div>;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
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
              onClick={() => auth.signOut()}
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
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs uppercase">
              {user.email?.charAt(0)}
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
            { id: 'dashboard', icon: LayoutDashboard, label: '🏠 Home' },
            { id: 'inventory', icon: Package, label: '📦 Stock' },
            { id: 'sales', icon: ShoppingCart, label: '🛍️ Sell' },
            { id: 'customers', icon: Users, label: '👥 Users' },
            { id: 'logs', icon: History, label: '📜 Logs' },
            { id: 'reports', icon: BarChart3, label: '📊 Stats' },
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
              className="bg-white w-full max-w-md rounded-3xl p-6 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">📦 Add New Product</h2>
                <button onClick={() => setShowAddProduct(false)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
              </div>
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData.entries());
                await api.createProduct({
                  ...data,
                  image_url: newProductImageUrl || (data.image_url as string),
                  quantity: Number(data.quantity) || 0,
                  buying_price: Number(data.buying_price) || 0,
                  selling_price: Number(data.selling_price) || 0,
                  low_stock_threshold: Number(data.low_stock_threshold) || 0,
                } as any);
                setShowAddProduct(false);
                setNewProductImageUrl('');
                fetchData();
              }}>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Product Image</label>
                  <div className="flex gap-2">
                    <input 
                      name="image_url" 
                      value={newProductImageUrl}
                      onChange={(e) => setNewProductImageUrl(e.target.value)}
                      placeholder="Image URL or upload from gallery" 
                      className="flex-1 p-3 bg-slate-50 border border-black/5 rounded-xl text-sm" 
                    />
                    <label className="p-3 bg-slate-100 rounded-xl text-slate-600 cursor-pointer hover:bg-slate-200 transition-colors">
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                      {isUploading ? <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <Upload size={20} />}
                    </label>
                    <button 
                      type="button"
                      onClick={() => setNewProductImageUrl(`https://picsum.photos/seed/${Math.random()}/400/400`)}
                      className="p-3 bg-slate-100 rounded-xl text-slate-600"
                    >
                      <Camera size={20} />
                    </button>
                  </div>
                  {newProductImageUrl && (
                    <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-black/5">
                      <img src={newProductImageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Brand</label>
                    <select name="brand" className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl text-sm">
                      <option>Avon</option>
                      <option>Inuka</option>
                      <option>Avroy Shlain</option>
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
              className="bg-white w-full max-w-md rounded-3xl p-6 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">👥 Add New Customer</h2>
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
