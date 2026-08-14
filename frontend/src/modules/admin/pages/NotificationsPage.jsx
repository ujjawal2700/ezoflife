import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Bell, 
  Trash2, 
  CheckCheck, 
  Clock, 
  Shield, 
  Globe, 
  ArrowRight, 
  Zap, 
  Info, 
  AlertTriangle, 
  CheckCircle2,
  Send,
  Users,
  Smartphone,
  Gift,
  Construction,
  CreditCard
} from 'lucide-react';
import { notificationApi } from '../../../lib/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '../components/common/PageHeader';

export default function NotificationsPage() {
    const [searchParams] = useSearchParams();
    const activeType = searchParams.get('type') || 'offers';
    
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [targetAudience, setTargetAudience] = useState('All Customers');

    const typeConfig = {
        offers: { label: 'Special Offers', icon: Gift, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        maintenance: { label: 'Maintenance Alert', icon: Construction, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
        payment: { label: 'Payment Reminder', icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' }
    };

    const currentConfig = useMemo(() => typeConfig[activeType] || typeConfig.offers, [activeType]);

    useEffect(() => {
        // Pre-fill based on type
        if (activeType === 'maintenance') {
            setTitle('SCHEDULED MAINTENANCE ALERT');
            setMessage('Dear User, we will be performing scheduled maintenance on [DATE] from [TIME]. Some services may be briefly unavailable.');
        } else if (activeType === 'payment') {
            setTitle('PAYMENT DUE REMINDER');
            setMessage('Friendly reminder: You have an outstanding payment for Order #XXXX. Please complete it to avoid service delays.');
        } else {
            setTitle('EXCLUSIVE OFFER FOR YOU');
            setMessage('Get flat 20% OFF on your next dry cleaning order! Use code: FRESH20');
        }
    }, [activeType]);

    const fetchNotifications = async () => {
        try {
            const adminRaw = localStorage.getItem('adminData') || localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
            const adminData = JSON.parse(adminRaw);
            const adminId = adminData._id || adminData.id || adminData.user?._id || adminData.user?.id;
            
            if (!adminId) return;

            const data = await notificationApi.getNotifications(adminId, 'admin');
            if (Array.isArray(data)) {
                setNotifications(data);
            }
        } catch (error) {
            console.error('Fetch Notif Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!title || !message) return;
        
        try {
            setIsSending(true);
            // Integration note: Here we would call the actual push notification service
            // For now we simulate success
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast.success(`${currentConfig.label} broadcasted successfully!`);
            fetchNotifications();
        } catch (err) {
            toast.error('Failed to send notification');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
            <PageHeader 
                title="Send Push Notifications" 
                actions={[
                    { label: 'View History', icon: Clock, variant: 'secondary' }
                ]}
            />

            <div className="p-8 grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-[1600px] mx-auto w-full">
                
                {/* Compose Form */}
                <div className="xl:col-span-2 space-y-8">
                    <form onSubmit={handleSend} className="bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm">
                        <div className={`p-8 border-b ${currentConfig.border} ${currentConfig.bg} flex items-center justify-between`}>
                            <div className="flex items-center gap-5">
                                <div className={`w-14 h-14 rounded-sm bg-white shadow-sm flex items-center justify-center ${currentConfig.color}`}>
                                    <currentConfig.icon size={28} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">{currentConfig.label}</h2>
                                    <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${currentConfig.color}`}>Broadcast Protocol Active</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-white/50 px-4 py-2 rounded-full border border-white">
                                <Users size={14} className="text-slate-400" />
                                <select 
                                    value={targetAudience}
                                    onChange={(e) => setTargetAudience(e.target.value)}
                                    className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none cursor-pointer"
                                >
                                    <option>All Customers</option>
                                    <option>Active Vendors</option>
                                    <option>Premium Members</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-10 space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Notification Title</label>
                                <input 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter compelling headline..."
                                    className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-sm text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Push Message Body</label>
                                <textarea 
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={5}
                                    placeholder="Enter notification content..."
                                    className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-sm text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none resize-none"
                                />
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Recommended: Max 120 chars for visibility</span>
                                    <span className="text-[9px] font-black text-slate-900 tabular-nums">{message.length}/200</span>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-50 flex gap-4">
                                <button 
                                    type="submit"
                                    disabled={isSending}
                                    className="flex-1 py-5 bg-slate-950 text-white text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-2xl shadow-slate-950/20"
                                >
                                    {isSending ? <Zap size={16} className="animate-pulse" /> : <Send size={16} />}
                                    {isSending ? 'Transmitting...' : 'Broadcast Notification'}
                                </button>
                                <button 
                                    type="button"
                                    className="px-10 py-5 bg-white border border-slate-200 text-slate-400 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                                >
                                    Save Draft
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Preview Section */}
                    <div className="bg-slate-900 rounded-sm p-10 text-white relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl" />
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                            <div className="w-64 h-[480px] bg-slate-800 rounded-[2.5rem] border-[6px] border-slate-700 relative overflow-hidden shrink-0 shadow-2xl">
                                <div className="absolute top-0 w-full h-8 flex justify-center pt-2">
                                    <div className="w-16 h-4 bg-slate-700 rounded-full" />
                                </div>
                                <div className="p-4 pt-16 space-y-4">
                                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 animate-bounce">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center border border-white/20">
                                                <Bell size={14} className="text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-white/40">EZ Of Life · Now</p>
                                                <p className="text-[10px] font-black text-white truncate">{title || 'Your Title Here'}</p>
                                            </div>
                                        </div>
                                        <p className="text-[9px] font-bold text-white/60 leading-tight line-clamp-2 uppercase tracking-wide">
                                            {message || 'Your push notification content will appear here on customer devices...'}
                                        </p>
                                    </div>
                                </div>
                                <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                                    <div className="w-12 h-1 bg-white/20 rounded-full" />
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 text-emerald-400">
                                    <Smartphone size={24} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Device Preview Index</span>
                                </div>
                                <h3 className="text-3xl font-black tracking-tighter italic leading-none">Global Synchronization</h3>
                                <p className="text-white/40 text-[10px] font-bold leading-relaxed uppercase tracking-widest max-w-sm">
                                    This is how your broadcast will appear on iOS and Android devices. Ensure the message is punchy and action-oriented for higher conversion rates.
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white/5 border border-white/10 rounded-sm">
                                        <p className="text-xs font-black text-white">12.4K</p>
                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">Recipients</p>
                                    </div>
                                    <div className="p-4 bg-white/5 border border-white/10 rounded-sm">
                                        <p className="text-xs font-black text-white">~4s</p>
                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">Latency</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Broadcasts */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Recent Broadcasts</h3>
                        <span className="px-2 py-0.5 bg-slate-900 text-white text-[8px] font-black rounded-sm">LOG</span>
                    </div>
                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="p-10 text-center opacity-40">
                                <Clock size={24} className="animate-spin mx-auto mb-4" />
                                <p className="text-[9px] font-black uppercase tracking-widest">Polling Feed...</p>
                            </div>
                        ) : notifications.slice(0, 5).map((n, i) => (
                            <div key={i} className="p-5 bg-white border border-slate-200 rounded-sm hover:border-slate-900 transition-all cursor-pointer group">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{new Date(n.createdAt).toLocaleDateString()}</span>
                                    <span className="px-1.5 py-0.5 bg-slate-50 text-slate-400 text-[7px] font-black uppercase rounded-sm border border-slate-100 group-hover:bg-slate-950 group-hover:text-white group-hover:border-slate-950 transition-all">Sent</span>
                                </div>
                                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate">{n.title}</h4>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 line-clamp-1">{n.message}</p>
                            </div>
                        ))}
                    </div>
                    <button className="w-full py-4 border border-dashed border-slate-200 text-slate-400 text-[9px] font-black uppercase tracking-widest hover:border-slate-900 hover:text-slate-900 transition-all">
                        View Full History Archive
                    </button>
                </div>

            </div>
        </div>
    );
}
