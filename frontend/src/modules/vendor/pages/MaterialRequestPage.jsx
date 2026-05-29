import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { materialApi, b2bOrderApi, adminApi } from '../../../lib/api';
import B2BInvoicePrint from '../components/B2BInvoicePrint';
import { Printer, X, FileText } from 'lucide-react';

const MaterialRequestPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [materials, setMaterials] = useState([]);
    const [vendorOrders, setVendorOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' or 'requests'
    const [cart, setCart] = useState({});
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedSubCategory, setSelectedSubCategory] = useState('');
    
    const [showInvoice, setShowInvoice] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [invoiceSettings, setInvoiceSettings] = useState({});
    const [scale, setScale] = useState(1);

    const calculateScale = () => {
        const width = window.innerWidth;
        if (width < 850) {
            setScale((width - 40) / 850);
        } else {
            setScale(1);
        }
    };

    useEffect(() => {
        calculateScale();
        window.addEventListener('resize', calculateScale);
        return () => window.removeEventListener('resize', calculateScale);
    }, []);

    const vendorDataRaw = localStorage.getItem('vendorData') || localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
    const vendorData = JSON.parse(vendorDataRaw);
    const vendorId = vendorData._id || vendorData.id || vendorData.user?._id || vendorData.user?.id;

    const uniqueCategories = Array.from(new Set(materials.map(m => m.category).filter(Boolean)));
    const activeCategory = selectedCategory || uniqueCategories[0] || '';

    const uniqueSubCategories = Array.from(
        new Set(
            materials
                .filter(m => m.category === activeCategory)
                .map(m => m.subCategory)
                .filter(Boolean)
        )
    );
    const activeSubCategory = selectedSubCategory || uniqueSubCategories[0] || '';

    const filteredMaterials = materials.filter(item => {
        return item.category === activeCategory && item.subCategory === activeSubCategory;
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [materialData, orderData] = await Promise.all([
                    vendorId ? materialApi.getLiveCatalog(vendorId) : [],
                    vendorId ? b2bOrderApi.getVendorOrders(vendorId) : []
                ]);
                setMaterials(materialData);
                setVendorOrders(orderData);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching data:', err);
                setLoading(false);
            }
        };
        fetchData();
        fetchInvoiceSettings();
    }, [vendorId]);

    const fetchInvoiceSettings = async () => {
        try {
            const configs = await adminApi.getConfig();
            const config = configs.find(c => c.key === 'invoice_settings');
            if (config) setInvoiceSettings(config.value);
        } catch (err) {
            console.error('Failed to fetch invoice settings:', err);
        }
    };

    const handlePrint = () => {
        const printContent = document.getElementById('b2b-invoice-content');
        const WindowPnt = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
        WindowPnt.document.write('<html><head><title>B2B Invoice</title>');
        WindowPnt.document.write('<script src="https://cdn.tailwindcss.com"></script>');
        WindowPnt.document.write('</head><body>');
        WindowPnt.document.write(printContent.innerHTML);
        WindowPnt.document.write('</body></html>');
        WindowPnt.document.close();
        setTimeout(() => {
            WindowPnt.focus();
            WindowPnt.print();
            WindowPnt.close();
        }, 500);
    };

    const openInvoice = (order) => {
        setSelectedOrder(order);
        setShowInvoice(true);
    };

    const updateQuantity = (id, delta) => {
        setCart(prev => ({
            ...prev,
            [id]: Math.max(0, (prev[id] || 0) + delta)
        }));
    };

    const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Accepted': return 'bg-emerald-500 text-white';
            case 'Open': return 'bg-sky-500 text-white';
            case 'Locked': return 'bg-amber-500 text-white';
            case 'Delivered': return 'bg-indigo-500 text-white';
            default: return 'bg-slate-500 text-white';
        }
    };

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
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter text-center uppercase">SPINZYT</h1>
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
                        <header className="bg-white/80 backdrop-blur-xl sticky top-16 z-50 px-6 py-3 border-b border-slate-100 flex items-center gap-4">
                            <motion.button 
                                whileTap={{ scale: 0.9 }} 
                                onClick={() => navigate(-1)} 
                                className="p-2 hover:bg-slate-50 rounded-full transition-colors shrink-0"
                            >
                                <span className="material-symbols-outlined text-primary">arrow_back</span>
                            </motion.button>

                            {/* Tab Switcher */}
                            <div className="flex-1 flex bg-slate-100 p-1 rounded-2xl">
                                <button 
                                    onClick={() => setActiveTab('catalog')}
                                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'catalog' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                                >
                                    Catalog
                                </button>
                                <button 
                                    onClick={() => setActiveTab('requests')}
                                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'requests' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                                >
                                    My Requests
                                </button>
                            </div>
                        </header>

                        <main className="max-w-xl mx-auto px-6 pt-2">
                            {activeTab === 'catalog' ? (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-6"
                                >
                                    {/* Categories & Subcategories Filter */}
                                    <div className="space-y-4 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Category</span>
                                            </div>
                                            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                                {uniqueCategories.map((cat) => (
                                                    <button 
                                                        key={cat} 
                                                        onClick={() => { 
                                                            setSelectedCategory(cat); 
                                                            setSelectedSubCategory(''); 
                                                        }}
                                                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 ${activeCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'}`}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Sub Category</span>
                                            </div>
                                            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                                {uniqueSubCategories.map((sub) => (
                                                    <button 
                                                        key={sub} 
                                                        onClick={() => setSelectedSubCategory(sub)}
                                                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 ${activeSubCategory === sub ? 'bg-primary text-white border-primary shadow-lg shadow-primary/10' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'}`}
                                                    >
                                                        {sub}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Catalog Grid */}
                                    <div className="grid grid-cols-1 gap-4">
                                        {filteredMaterials.length === 0 ? (
                                            <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 text-center space-y-3">
                                                <span className="material-symbols-outlined text-4xl text-slate-300">inventory_2</span>
                                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">No supplies found matching filters</p>
                                            </div>
                                        ) : (
                                            filteredMaterials.map((item) => (
                                                <motion.div 
                                                    key={item._id}
                                                    layout
                                                    className="bg-white p-3 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 hover:border-primary/20 transition-all group"
                                                >
                                                    {/* Small Image */}
                                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 overflow-hidden shrink-0 border border-slate-50 shadow-inner flex items-center justify-center">
                                                        {item.image ? (
                                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-2xl text-slate-200">inventory_2</span>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Row containing Name, Supplier and Price/Counter */}
                                                    <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                                                        {/* Left: Name and Supplier Details */}
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="text-xs font-black text-slate-900 truncate tracking-tight">{item.name}</h3>
                                                            {/* Supplier Info */}
                                                            <div className="flex items-center gap-1 mt-0.5 text-slate-400">
                                                                <span className="material-symbols-outlined text-[12px]">store</span>
                                                                <span className="text-[9px] font-bold uppercase tracking-wider truncate">{item.supplierFacilityName}</span>
                                                            </div>
                                                            <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{item.stock} • {item.quantity}</p>
                                                        </div>

                                                        {/* Right: Price and Counter Button */}
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <p className="text-sm font-black text-slate-900">₹{item.price}</p>
                                                            
                                                            <div className="flex items-center bg-slate-50 rounded-xl p-0.5 gap-2 border border-slate-100">
                                                                <button 
                                                                    onClick={() => updateQuantity(item._id, -1)}
                                                                    className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary transition-colors"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">remove</span>
                                                                </button>
                                                                <span className="text-xs font-black text-slate-900 w-3 text-center tabular-nums">
                                                                    {cart[item._id] || 0}
                                                                </span>
                                                                <button 
                                                                    onClick={() => updateQuantity(item._id, 1)}
                                                                    className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/10 hover:bg-primary transition-colors"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">add</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-2"
                                >
                                    {vendorOrders.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                <span className="material-symbols-outlined text-3xl text-slate-300">receipt_long</span>
                                            </div>
                                            <h3 className="text-lg font-black text-slate-900">No requests yet</h3>
                                            <p className="text-xs font-bold text-slate-400 max-w-[200px] mt-2">Your supply requests will appear here once you place them.</p>
                                        </div>
                                    ) : (                                        vendorOrders.map((order) => (
                                            <div key={order._id} className="bg-white p-4 rounded-[1.8rem] border border-slate-100 shadow-sm space-y-3">
                                                {/* Header Row: ID, Status, Actions */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-xs font-black text-slate-900 tracking-tight">#{order.b2bOrderId}</h4>
                                                        <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${getStatusColor(order.status)}`}>
                                                            {order.status}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1.5">
                                                        {order.supplier && (
                                                            <button 
                                                                onClick={() => window.open(`tel:${order.supplier.phone}`)}
                                                                className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all"
                                                                title="Call Supplier"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">call</span>
                                                            </button>
                                                        )}
                                                        {order.status === 'Delivered' && (
                                                            <button 
                                                                onClick={() => openInvoice(order)}
                                                                className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"
                                                                title="View Invoice"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">description</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Items and Total Row */}
                                                <div className="flex items-center justify-between py-2 border-y border-slate-50">
                                                    <div className="flex-1 min-w-0 pr-4">
                                                        <p className="text-[10px] font-bold text-slate-600 truncate">
                                                            {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                                        </p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-[11px] font-black text-slate-900">₹{order.totalAmount}</p>
                                                    </div>
                                                </div>

                                                {/* Supplier Info (Small) */}
                                                {order.supplier && (
                                                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl">
                                                        <span className="material-symbols-outlined text-[14px] text-slate-400">person</span>
                                                        <p className="text-[9px] font-black text-slate-900 truncate">
                                                            Supplier: {order.supplier.displayName}
                                                        </p>
                                                    </div>
                                                )}

                                                {!order.supplier && (
                                                    <div className="flex items-center gap-1.5 px-1">
                                                        <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
                                                        <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Searching...</p>
                                                    </div>
                                                )}
                                                
                                                {/* Date Row */}
                                                <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest opacity-60">
                                                    <p>Placed: {new Date(order.createdAt).toLocaleDateString()}</p>
                                                    <p className="text-primary text-right">Delivery: {new Date(order.deliveryDate).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </motion.div>
                            )}
                        </main>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer Order Action */}
            <AnimatePresence>
                {activeTab === 'catalog' && totalItems > 0 && (
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
                                        // Robust location detection
                                        const city = vendorData.shopDetails?.city || vendorData.address_city || vendorData.city || '';
                                        const pincode = vendorData.shopDetails?.pincode || vendorData.address_pincode || vendorData.pincode || '';

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
                                            city: city === 'Unknown' ? '' : city,
                                            pincode: pincode,
                                            shippingAddress: `${city}, ${pincode}`
                                        };

                                        await b2bOrderApi.placeOrder(payload);
                                        alert('Request submitted to Material Pool! Nearby suppliers will be notified.');
                                        setCart({});
                                        setActiveTab('requests'); // Switch to requests tab to see the new order
                                        // Refresh orders
                                        const newOrders = await b2bOrderApi.getVendorOrders(vendorId);
                                        setVendorOrders(newOrders);
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
            <AnimatePresence>
                {showInvoice && selectedOrder && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowInvoice(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-4xl h-[90vh] rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 leading-none">B2B Material Invoice</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Batch ID: {selectedOrder._id.slice(-8).toUpperCase()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={handlePrint}
                                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
                                    >
                                        <Printer size={16} /> Print / Download
                                    </button>
                                    <button 
                                        onClick={() => setShowInvoice(false)}
                                        className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-0 bg-slate-50 relative">
                                <div className="min-h-full w-full flex flex-col items-center">
                                    <div 
                                        style={{ 
                                            transform: `scale(${scale})`,
                                            transformOrigin: 'top center',
                                            width: '850px',
                                            marginTop: '2rem',
                                            marginBottom: `${(1100 * scale) - 1100 + 40}px` 
                                        }}
                                        className="bg-white shadow-2xl shrink-0"
                                    >
                                        <B2BInvoicePrint order={selectedOrder} settings={invoiceSettings} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MaterialRequestPage;
