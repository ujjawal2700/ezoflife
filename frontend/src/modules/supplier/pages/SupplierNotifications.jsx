import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trash2, CheckCircle2, MessageSquare, Send, X, Inbox } from 'lucide-react';
import useNotificationStore from '../../../shared/stores/notificationStore';
import { BASE_URL } from '../../../lib/api';
import toast from 'react-hot-toast';

const SupplierNotifications = () => {
    const navigate = useNavigate();
    const { notifications, fetchNotifications, markAsRead, clearAll } = useNotificationStore();
    const messagesEndRef = useRef(null);

    // Chat modal states
    const [chatOpen, setChatOpen] = useState(false);
    const [chatPayload, setChatPayload] = useState(null); // { vendorId, supplierId, productId, b2bOrderId }
    const [chatMessages, setChatMessages] = useState([]);
    const [replyMessage, setReplyMessage] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [sendingReply, setSendingReply] = useState(false);
    const [vendorName, setVendorName] = useState('Vendor');

    const supplierUserRaw = localStorage.getItem('supplierData') || localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
    const supplierUser = JSON.parse(supplierUserRaw);
    const supplierId = supplierUser?._id || supplierUser?.id;

    // Load supplier notifications
    useEffect(() => {
        if (supplierId) {
            fetchNotifications(supplierId, 'supplier');
        }
    }, [supplierId]);

    // Filter notifications for 'supplier'
    const supplierNotifications = useMemo(() => 
        notifications.filter(n => n.persona === 'supplier'), 
    [notifications]);

    // Fetch B2B chat history
    const fetchChatHistory = async (payload) => {
        if (!payload) return;
        setChatLoading(true);
        try {
            const { vendorId, supplierId, productId } = payload;
            const res = await fetch(`${BASE_URL}/vendor-product-queries/chat/${vendorId}/${supplierId}?productId=${productId}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setChatMessages(data);
            }
        } catch (err) {
            console.error('Failed to load chat history:', err);
            toast.error('Failed to load conversation history');
        } finally {
            setChatLoading(false);
        }
    };

    // Auto-scroll chat body
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, chatOpen]);

    // Handle clicking a notification
    const handleNotificationClick = async (notif) => {
        // Mark as read
        if (!notif.read) {
            await markAsRead(notif.id);
        }

        // If it's a B2B query chat notification
        if (notif.type === 'b2b_chat' && notif.payload) {
            const { vendorId, supplierId: notifSupplierId, productId, b2bOrderId } = notif.payload;
            const payload = { 
                vendorId, 
                supplierId: notifSupplierId || supplierId, 
                productId, 
                b2bOrderId 
            };
            setChatPayload(payload);
            setVendorName(notif.title?.replace('New Message from ', '') || 'Vendor');
            setChatOpen(true);
            fetchChatHistory(payload);
        }
    };

    // Send reply message
    const handleSendReply = async () => {
        if (!replyMessage.trim() || !chatPayload) return;
        setSendingReply(true);
        try {
            const { vendorId, supplierId: plSupplierId, productId, b2bOrderId } = chatPayload;
            
            const res = await fetch(`${BASE_URL}/vendor-product-queries/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vendorId,
                    supplierId: plSupplierId || supplierId,
                    productId,
                    b2bOrderId,
                    message: replyMessage.trim(),
                    sender: 'Supplier'
                })
            });

            if (res.ok) {
                setReplyMessage('');
                await fetchChatHistory(chatPayload);
            } else {
                toast.error('Failed to send message');
            }
        } catch (err) {
            console.error('Send reply error:', err);
            toast.error('Error sending message');
        } finally {
            setSendingReply(false);
        }
    };

    const handleClearAll = () => {
        if (supplierId) {
            clearAll(supplierId, 'supplier');
            toast.success('Notifications cleared');
        }
    };

    return (
        <div className="text-slate-900 min-h-screen pb-32 bg-slate-50/50 font-sans text-left">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/supplier/dashboard')}
                        className="p-2 hover:bg-slate-50 rounded-xl transition-all border border-slate-200"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h2 className="text-base font-black uppercase tracking-widest text-slate-900 leading-none">Notifications</h2>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 block">Supplier Alerts Feed</span>
                    </div>
                </div>
                {supplierNotifications.length > 0 && (
                    <button 
                        onClick={handleClearAll}
                        className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 hover:bg-rose-100 transition-all flex items-center gap-1.5"
                        title="Clear all alerts"
                    >
                        <Trash2 size={13} />
                        <span className="text-[8px] font-black uppercase tracking-wider">Clear All</span>
                    </button>
                )}
            </div>

            {/* Main Content */}
            <motion.main 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-xl mx-auto px-6 py-8 space-y-4"
            >
                {supplierNotifications.length > 0 ? (
                    supplierNotifications.map((notif, i) => (
                        <motion.div 
                            key={notif.id}
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => handleNotificationClick(notif)}
                            className={`flex items-start gap-4 p-4.5 rounded-3xl border transition-all cursor-pointer ${
                                !notif.read 
                                ? 'bg-white border-indigo-150 shadow-md shadow-indigo-600/5' 
                                : 'bg-white/80 border-slate-100 opacity-75 hover:opacity-100 shadow-sm'
                            }`}
                        >
                            {/* Icon Wrapper */}
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                                notif.type === 'b2b_chat'
                                ? 'bg-indigo-50 border-indigo-100 text-indigo-600'
                                : 'bg-slate-50 border-slate-100 text-slate-500'
                            }`}>
                                {notif.type === 'b2b_chat' ? (
                                    <MessageSquare size={16} />
                                ) : (
                                    <span className="material-symbols-outlined text-[18px]">notifications</span>
                                )}
                            </div>

                            {/* Alert Details */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                    <h4 className={`text-xs font-black uppercase tracking-tight leading-none mt-1 ${
                                        !notif.read ? 'text-slate-900' : 'text-slate-700'
                                    }`}>
                                        {notif.title}
                                    </h4>
                                    {!notif.read && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1 shrink-0 animate-pulse"></span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                                    {notif.message}
                                </p>
                                <div className="flex items-center gap-1.5 mt-3">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                        {notif.type?.replace('_', ' ')}
                                    </span>
                                    <span className="text-[8px] text-slate-300 font-bold">·</span>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                        {notif.timestamp}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 border-dashed text-center max-w-md mx-auto mt-12">
                        <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <Inbox className="text-slate-350" size={24} />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">No Alerts</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 max-w-[200px] mx-auto leading-relaxed">
                            We will notify you here when vendors send queries or orders.
                        </p>
                    </div>
                )}
            </motion.main>

            {/* Chat Conversation Overlay Modal */}
            <AnimatePresence>
                {chatOpen && chatPayload && (
                    <div className="fixed inset-0 z-[150] flex items-end justify-center sm:items-center p-0 sm:p-6">
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setChatOpen(false)}
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                        />

                        {/* Modal Container */}
                        <motion.div 
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col h-[85vh] sm:h-[75vh] overflow-hidden border border-slate-100"
                        >
                            {/* Header */}
                            <div className="bg-white px-6 py-4 flex items-center gap-3 border-b border-slate-100">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                                    <MessageSquare size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-sm text-slate-900 truncate tracking-tight">{vendorName}</h3>
                                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                                    </span>
                                </div>
                                <button 
                                    onClick={() => setChatOpen(false)}
                                    className="p-2 hover:bg-slate-50 rounded-full border border-slate-200 shadow-sm"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Messages Body */}
                            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
                                {chatLoading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                    </div>
                                ) : (
                                    chatMessages.map((msg, idx) => {
                                        const isSupplier = msg.sender === 'Supplier';
                                        return (
                                            <div key={msg._id || idx} className={`flex ${isSupplier ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`p-4 rounded-[1.8rem] shadow-sm max-w-[85%] relative ${
                                                    isSupplier 
                                                    ? 'bg-slate-900 text-white rounded-tr-sm shadow-slate-900/10' 
                                                    : 'bg-white text-slate-900 rounded-tl-sm border border-slate-100'
                                                }`}>
                                                    {/* Header item detail for first message */}
                                                    {idx === 0 && msg.productId && (
                                                        <div className={`mb-3 pb-3 border-b flex items-center gap-2 ${
                                                            isSupplier ? 'border-white/10' : 'border-slate-150'
                                                        }`}>
                                                            <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                                                                isSupplier ? 'bg-white/10' : 'bg-slate-50'
                                                            }`}>
                                                                <span className="material-symbols-outlined text-[12px]">inventory_2</span>
                                                            </div>
                                                            <p className="text-[10px] font-black truncate uppercase">
                                                                {msg.productId.materialName || msg.productId.name}
                                                            </p>
                                                        </div>
                                                    )}
                                                    <p className="text-[13px] leading-relaxed pr-10 font-bold whitespace-pre-wrap">{msg.message}</p>
                                                    <div className="absolute bottom-2 right-3">
                                                        <span className={`text-[8px] font-black tracking-widest ${isSupplier ? 'text-white/40' : 'text-slate-450'}`}>
                                                            {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Reply Input Area */}
                            <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3">
                                <input 
                                    type="text" 
                                    placeholder="Type your reply..." 
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && replyMessage.trim()) {
                                            handleSendReply();
                                        }
                                    }}
                                    className="flex-1 bg-slate-50 p-4 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-indigo-600 transition-all"
                                />
                                <button 
                                    onClick={handleSendReply}
                                    disabled={!replyMessage.trim() || sendingReply}
                                    className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-indigo-600 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-slate-900/10 shrink-0"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SupplierNotifications;
