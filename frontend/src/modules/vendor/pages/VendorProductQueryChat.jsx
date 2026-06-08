import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BASE_URL } from '../../../lib/api';

const VendorProductQueryChat = () => {
    const navigate = useNavigate();
    const { supplierId } = useParams();
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const vendorDataRaw = localStorage.getItem('vendorData') || localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
    const vendorData = JSON.parse(vendorDataRaw);
    const vendorId = vendorData._id || vendorData.id || vendorData.user?._id || vendorData.user?.id;
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchChats();
    }, [vendorId, supplierId]);

    const fetchChats = async () => {
        try {
            if (!vendorId) return;
            const res = await fetch(`${BASE_URL}/vendor-product-queries/chat/${vendorId}/${supplierId}`);
            const data = await res.json();
            if (res.ok) {
                setQueries(data);
                // We no longer auto-select a product here
            }
        } catch (err) {
            console.error("Failed to fetch chats", err);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (selectedProduct) {
            scrollToBottom();
        }
    }, [queries, selectedProduct]);

    // Group queries by product
    const groupedQueries = useMemo(() => {
        const groups = {};
        queries.forEach(q => {
            if (!q.productId) return;
            const pid = q.productId._id;
            if (!groups[pid]) {
                groups[pid] = {
                    product: q.productId,
                    messages: []
                };
            }
            groups[pid].messages.push(q);
        });
        return groups;
    }, [queries]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedProduct) return;
        
        try {
            const productGroup = groupedQueries[selectedProduct];
            const lastMessage = productGroup?.messages[productGroup.messages.length - 1];
            
            const res = await fetch(`${BASE_URL}/vendor-product-queries/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vendorId,
                    supplierId,
                    productId: selectedProduct,
                    b2bOrderId: lastMessage?.b2bOrderId?._id, // Attach the last order context if available
                    message: newMessage,
                    sender: 'Vendor'
                })
            });

            if (res.ok) {
                setNewMessage('');
                fetchChats(); // refresh
            }
        } catch (error) {
            console.error("Failed to send", error);
        }
    };

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return `${d.toLocaleDateString('en-GB', {day: '2-digit', month: 'short'})}, ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    };

    if (!selectedProduct) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans pb-20">
                {/* Header */}
                <div className="bg-white border-b border-slate-100 sticky top-0 z-20">
                    <div className="max-w-md mx-auto px-6 py-4 flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-all active:scale-95 shrink-0">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">Select Product</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Choose a product to view chat</p>
                        </div>
                    </div>
                </div>

                <main className="max-w-md mx-auto p-6 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                        </div>
                    ) : Object.keys(groupedQueries).length === 0 ? (
                        <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm shadow-slate-200/50">
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-3xl text-slate-400">inventory_2</span>
                            </div>
                            <h3 className="text-base font-bold text-slate-900 mb-1">No Products Found</h3>
                            <p className="text-xs text-slate-500 font-medium">You don't have any queries for this supplier.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {Object.values(groupedQueries).map(group => {
                                const lastMsg = group.messages[group.messages.length - 1];
                                return (
                                    <motion.button
                                        key={group.product._id}
                                        onClick={() => setSelectedProduct(group.product._id)}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full bg-white p-5 rounded-3xl border border-slate-100 shadow-sm shadow-slate-200/50 flex items-center gap-4 text-left group hover:border-slate-300 transition-all"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-900 transition-colors">inventory_2</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-sm text-slate-900 truncate mb-1">{group.product.materialName || group.product.name}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 truncate">{lastMsg?.message}</p>
                                        </div>
                                        <div className="shrink-0 flex flex-col items-end gap-2">
                                            <span className="text-[9px] font-bold text-slate-400">{formatDate(lastMsg?.createdAt).split(',')[0]}</span>
                                            <span className="material-symbols-outlined text-slate-300 group-hover:text-slate-900 transition-colors">chevron_right</span>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
        );
    }

    const activeMessages = groupedQueries[selectedProduct]?.messages || [];

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col h-screen overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 z-20 shrink-0">
                <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedProduct(null)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-all active:scale-95 shrink-0">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none mb-1 truncate">{groupedQueries[selectedProduct]?.product.materialName || groupedQueries[selectedProduct]?.product.name}</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product Chat</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <main className="flex-1 max-w-md mx-auto w-full overflow-y-auto p-4 space-y-4">
                {activeMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">chat_bubble</span>
                        <p className="text-sm font-bold text-slate-400">No messages found.</p>
                    </div>
                ) : (
                    activeMessages.map((msg, idx) => {
                        const isVendor = msg.sender === 'Vendor';
                        return (
                            <div key={msg._id || idx} className={`flex ${isVendor ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-[1.5rem] p-4 relative shadow-sm ${
                                    isVendor 
                                    ? 'bg-slate-900 text-white rounded-tr-sm shadow-slate-900/10' 
                                    : 'bg-white text-slate-900 rounded-tl-sm border border-slate-100'
                                }`}>
                                    {msg.b2bOrderId && (
                                        <div className={`mb-2 pb-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 border-b ${
                                            isVendor ? 'text-white/50 border-white/10' : 'text-slate-400 border-slate-100'
                                        }`}>
                                            <span className="material-symbols-outlined text-[12px]">receipt_long</span>
                                            Order: {msg.b2bOrderId.b2bOrderId}
                                        </div>
                                    )}
                                    <p className="text-[13px] leading-relaxed font-medium pr-12 pb-3">{msg.message}</p>
                                    <div className="absolute bottom-3 right-4 flex items-center">
                                        <span className={`text-[9px] font-bold ${isVendor ? 'text-white/40' : 'text-slate-400'}`}>
                                            {formatDate(msg.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </main>

            {/* Input Footer */}
            <div className="bg-white p-4 border-t border-slate-100 shrink-0">
                <div className="max-w-md mx-auto flex items-center gap-3 bg-slate-50 border border-slate-200 p-1.5 rounded-[1.5rem] focus-within:border-slate-900 focus-within:bg-white focus-within:shadow-md transition-all">
                    <div className="flex-1 px-4 py-2 flex items-center">
                        <input 
                            type="text" 
                            placeholder="Type a follow-up message..." 
                            className="w-full bg-transparent outline-none text-[13px] font-medium text-slate-900"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                    </div>
                    <button 
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="w-10 h-10 rounded-[1rem] bg-slate-900 text-white flex items-center justify-center shadow-lg hover:shadow-xl active:scale-95 transition-all shrink-0 disabled:opacity-50 disabled:active:scale-100"
                    >
                        <span className="material-symbols-outlined text-[18px]">send</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VendorProductQueryChat;
