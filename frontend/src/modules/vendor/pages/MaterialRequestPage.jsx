import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { materialApi, b2bOrderApi } from '../../../lib/api';

const MaterialRequestPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [materials, setMaterials] = useState([]);
    const [cart, setCart] = useState({});

    useEffect(() => {
        const fetchSupplies = async () => {
            try {
                setLoading(true);
                const data = await materialApi.getAll();
                setMaterials(data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching supplies:', err);
                setLoading(false);
            }
        };
        fetchSupplies();
    }, []);

    const updateQuantity = (id, delta) => {
        setCart(prev => ({
            ...prev,
            [id]: Math.max(0, (prev[id] || 0) + delta)
        }));
    };

    const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);

    return (
        <div className="bg-[#F8FAFC] min-h-screen pb-32 font-body">
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div 
                        key="spinzyt-loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center gap-8"
                    >
                        <motion.div 
                            animate={{ 
                                scale: [1, 1.1, 1],
                                opacity: [0.8, 1, 0.8]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="flex flex-col items-center"
                        >
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter text-center">SPINZYT</h1>
                            <div className="flex items-center gap-2 mt-4 bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Material Broadcast</span>
                            </div>
                        </motion.div>
                        
                        <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ x: '-100%' }}
                                animate={{ x: '100%' }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                className="w-1/2 h-full bg-primary rounded-full"
                            />
                        </div>
                        
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Admin Catalog...</p>
                    </motion.div>
                ) : (
                    <motion.div key="main-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {/* Header */}
                        <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-50 px-6 py-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                                    <span className="material-symbols-outlined text-primary">arrow_back</span>
                                </motion.button>
                                <div>
                                    <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none mb-1">Material Catalog</h1>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Admin Approved Supplies</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-400">inventory</span>
                            </div>
                        </header>

                        <main className="max-w-xl mx-auto px-6 pt-8">
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                {/* Categories Filter */}
                                <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                                    {['All Supplies', ...new Set(materials.map(m => m.category))].map((cat, i) => (
                                        <button key={i} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 ${i === 0 ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-primary/20'}`}>
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                {/* Catalog Grid */}
                                <div className="grid grid-cols-1 gap-4">
                                    {materials.map((item) => (
                                        <motion.div 
                                            key={item._id}
                                            layout
                                            className="bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5 hover:border-primary/20 transition-all group"
                                        >
                                            <div className="w-24 h-24 rounded-3xl bg-slate-50 overflow-hidden shrink-0 border border-slate-50 shadow-inner flex items-center justify-center">
                                                {item.image ? (
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-4xl text-slate-200">inventory_2</span>
                                                )}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[8px] font-black text-primary uppercase bg-primary/5 px-2 py-0.5 rounded-full">{item.category}</span>
                                                    {item.stock === 'Limited' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>}
                                                </div>
                                                <h3 className="text-sm font-black text-slate-900 truncate tracking-tight">{item.name}</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{item.stock}</p>
                                                
                                                <div className="flex items-center justify-between mt-3">
                                                    <p className="text-base font-black text-slate-900">₹{item.price}</p>
                                                    
                                                    <div className="flex items-center bg-slate-50 rounded-xl p-1 gap-3 border border-slate-100">
                                                        <button 
                                                            onClick={() => updateQuantity(item._id, -1)}
                                                            className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">remove</span>
                                                        </button>
                                                        <span className="text-xs font-black text-slate-900 w-4 text-center tabular-nums">
                                                            {cart[item._id] || 0}
                                                        </span>
                                                        <button 
                                                            onClick={() => updateQuantity(item._id, 1)}
                                                            className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/10 hover:bg-primary transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">add</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        </main>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer Order Action */}
            <AnimatePresence>
                {totalItems > 0 && (
                    <motion.div 
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="fixed bottom-8 left-6 right-6 z-50"
                    >
                        <div className="max-w-md mx-auto bg-slate-900 p-4 rounded-[2rem] shadow-2xl shadow-slate-900/40 flex items-center justify-between gap-6">
                            <div className="pl-2">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Total Request</p>
                                <p className="text-xl font-black text-white tracking-tight">{totalItems} Items</p>
                            </div>
                            <button 
                                onClick={async () => {
                                    try {
                                        const vendorDataRaw = localStorage.getItem('vendorData') || localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
                                        const vendorData = JSON.parse(vendorDataRaw);
                                        const vendorId = vendorData._id || vendorData.id || vendorData.user?._id || vendorData.user?.id;
                                        
                                        // Find more info if missing
                                        const city = vendorData.shopDetails?.city || vendorData.city || 'Unknown';
                                        const pincode = vendorData.shopDetails?.pincode || vendorData.pincode || '';

                                        const orderItems = Object.entries(cart)
                                            .filter(([_, qty]) => qty > 0)
                                            .map(([id, qty]) => {
                                                const material = materials.find(m => m._id === id);
                                                return {
                                                    materialId: id,
                                                    name: material.name,
                                                    quantity: qty,
                                                    price: material.price
                                                };
                                            });

                                        const totalAmount = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

                                        const payload = {
                                            vendorId,
                                            items: orderItems,
                                            totalAmount,
                                            city,
                                            pincode,
                                            shippingAddress: `${city}, ${pincode}`
                                        };

                                        await b2bOrderApi.placeOrder(payload);
                                        alert('Request submitted to Material Pool! Nearby suppliers will be notified.');
                                        navigate('/vendor/dashboard');
                                    } catch (err) {
                                        console.error('Submission Error:', err);
                                        alert(err.message || 'Failed to place request');
                                    }
                                }}
                                className="flex-1 h-14 bg-primary text-white rounded-[1.4rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:bg-white hover:text-primary transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                Submit Request
                                <span className="material-symbols-outlined text-lg">send</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MaterialRequestPage;
