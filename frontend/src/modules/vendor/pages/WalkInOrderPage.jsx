import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { serviceApi, orderApi, authApi, masterServiceApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const WalkInOrderPage = () => {
    const navigate = useNavigate();
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [showNameModal, setShowNameModal] = useState(false);
    const [tempName, setTempName] = useState('');
    const [selectedService, setSelectedService] = useState(null);
    const [items, setItems] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [liveServices, setLiveServices] = useState([]);
    const [showInvoice, setShowInvoice] = useState(false);
    const [createdOrder, setCreatedOrder] = useState(null);
    const [deliveryTime, setDeliveryTime] = useState('Tomorrow, 6:00 PM');
    const [quantity, setQuantity] = useState(1);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [deliveryMethod, setDeliveryMethod] = useState('self');
    const [deliveryAddress, setDeliveryAddress] = useState('');

    const vendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
    const getVendorId = () => {
        const keys = ['user', 'vendorData', 'userData', 'auth_user', 'vendor'];
        for (const key of keys) {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) continue;
                const data = JSON.parse(raw);
                const id = data?._id || data?.id || data?.user?._id || data?.user?.id || data?.uid;
                if (id) return id;
            } catch (e) { continue; }
        }
        return null;
    };

    const vendorId = getVendorId();

    const fetchServices = async () => {
        if (!vendorId) {
            console.warn('WalkInHub: No vendorId found, skipping service fetch.');
            return;
        }
        try {
            // Fetch custom services, vendor profile, and master services list
            const [masterRes, profileRes, masterServices] = await Promise.all([
                serviceApi.getAll({ vendorId }),
                authApi.getProfile(vendorId),
                masterServiceApi.getAll({ limit: 10000 })
            ]);
            
            const registrationServices = profileRes.shopDetails?.services || [];
            
            // Filter only approved registration services
            const approvedRegistrationServices = registrationServices.filter(s => s.status === 'approved');
            
            // Build a lookup map for master services to resolve categories/subcategories
            const masterMap = new Map();
            if (Array.isArray(masterServices)) {
                masterServices.forEach(ms => {
                    masterMap.set(ms._id, ms);
                });
            }
            
            const mergedMap = new Map();

            // Add approved registration services to map
            approvedRegistrationServices.forEach(s => {
                const id = s.id || s._id;
                const master = masterMap.get(id);
                mergedMap.set(id, {
                    ...s,
                    id: id,
                    _id: id,
                    name: s.name || master?.itemName || master?.name || 'Unnamed Service',
                    isFromRegistration: true,
                    approvalStatus: 'Approved',
                    active: s.active ?? true,
                    basePrice: s.basePrice || s.vendorRate || 0,
                    mainCategory: master?.categoryId?.mainCategory || 'Dry Cleaning',
                    subCategory: master?.categoryId?.subCategory || 'General'
                });
            });

            // Add custom services to map (overwriting/merging duplicates)
            masterRes.forEach(s => {
                const id = s._id || s.id;
                const master = masterMap.get(id);
                mergedMap.set(id, {
                    ...s,
                    id: id,
                    _id: id,
                    name: s.name || master?.itemName || master?.name || 'Unnamed Service',
                    isFromRegistration: false,
                    approvalStatus: s.approvalStatus || 'Pending',
                    active: s.status === 'Active',
                    basePrice: s.basePrice || 0,
                    mainCategory: s.category || master?.categoryId?.mainCategory || 'Custom',
                    subCategory: master?.categoryId?.subCategory || 'General'
                });
            });

            setLiveServices(Array.from(mergedMap.values()));
        } catch (error) {
            console.error('Fetch Services Error:', error);
        }
    };

    useEffect(() => {
        if (vendorId) {
            fetchServices();
        }
    }, [vendorId]);

    const services = useMemo(() => {
        return liveServices
            .filter(s => s.active && s.approvalStatus === 'Approved')
            .map(s => ({
                serviceId: s._id || s.id,
                title: s.name,
                price: s.basePrice || 0,
                icon: s.icon || 'local_laundry_service',
                category: s.mainCategory || 'Custom',
                subCategory: s.subCategory || 'General'
            }));
    }, [liveServices]);

    const handlePhoneChange = async (val) => {
        const cleanVal = val.replace(/\D/g, '');
        if (cleanVal.length <= 10) {
            setCustomerPhone(cleanVal);
            if (cleanVal.length === 10) {
                setTempName('');
                setShowNameModal(true);
                try {
                    const lookupRes = await authApi.lookupPhone(cleanVal);
                    if (lookupRes && lookupRes.displayName) {
                        setTempName(lookupRes.displayName);
                        toast.success(`Welcome back, ${lookupRes.displayName}!`);
                    }
                } catch (err) {
                    console.log('Customer not previously registered under this phone.');
                }
            }
        }
    };

    const handleConfirmName = () => {
        if (!tempName.trim()) {
            toast.error('Please enter customer name');
            return;
        }
        setCustomerName(tempName.trim());
        setShowNameModal(false);
        toast.success(`Customer name set: ${tempName.trim()}`);
    };

    const addItem = () => {
        if (!selectedService) return;
        const newItem = { 
            ...selectedService, 
            id: Date.now(), 
            quantity: quantity,
            tag: `T-${Math.floor(1000 + Math.random() * 9000)}` 
        };
        setItems([...items, newItem]);
        toast.success(`${quantity}x ${selectedService.title} added!`);
        setQuantity(1); // Reset quantity
    };

    const removeItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleCollectAndPrint = async () => {
        if (!customerPhone || items.length === 0) return;
        
        const isShiprocket = deliveryMethod === 'shiprocket';
        if (isShiprocket && !deliveryAddress.trim()) {
            toast.error('Please enter customer delivery address');
            return;
        }
        
        setIsProcessing(true);
        try {
            const orderData = {
                customerPhone,
                customerName,
                vendorId,
                orderType: 'Walk-In',
                riderDropOff: isShiprocket,
                dropAddress: isShiprocket ? deliveryAddress.trim() : 'Self Delivery / Customer',
                deliveryTime,
                items: items.map(i => ({
                    serviceId: i.serviceId,
                    name: i.title,
                    price: i.price,
                    quantity: i.quantity
                })),
                totalAmount: total,
                status: 'In Progress'
            };

            const response = await orderApi.createWalkInOrder(orderData);
            setCreatedOrder(response);
            setShowDeliveryModal(false);
            setShowInvoice(true);
            
            toast.success('Walk-In Order Created!');
            setTimeout(() => {
                window.print();
            }, 600);
        } catch (err) {
            console.error('Walk-In Creation Failure:', err);
            toast.error('Failed to generate order');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="text-slate-900 min-h-[100dvh] pb-64 flex flex-col overflow-x-hidden font-sans">
            <header className="px-6 pt-4 flex items-center gap-4 mb-8">
                <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate(-1)}
                    className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-900 border border-slate-200"
                >
                    <span className="material-symbols-outlined text-xl">arrow_back</span>
                </motion.button>
                <div>
                    <h1 className="text-2xl font-black tracking-tighter leading-none">Walk-In Hub</h1>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-40 mt-1">Direct Offline Order Entry</p>
                </div>
            </header>

            <main className="px-6 space-y-8 flex-1">
                {/* Customer Section */}
                <section className="space-y-4">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3D5AFE] ml-2">Customer Identification</h2>
                    <div className="flex gap-3">
                        <div className="relative flex-1 group">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">phone_iphone</span>
                            <input 
                                type="tel"
                                placeholder="Enter Customer Mobile Number"
                                value={customerPhone}
                                onChange={(e) => handlePhoneChange(e.target.value)}
                                maxLength={10}
                                className="w-full bg-white rounded-[2rem] pl-14 pr-6 py-5 text-sm font-bold border border-slate-200 shadow-sm focus:ring-4 focus:ring-[#3D5AFE]/10 transition-all outline-none"
                            />
                        </div>
                        {customerPhone.length === 10 && (
                            <motion.button 
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    setTempName(customerName);
                                    setShowNameModal(true);
                                }}
                                className="px-6 bg-slate-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
                            >
                                <span className="material-symbols-outlined text-sm">person</span>
                                {customerName ? customerName : 'Add Name'}
                            </motion.button>
                        )}
                    </div>

                    {/* Delivery method toggle removed from main view */}
                </section>

                {/* Service Selection */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3D5AFE]">Select Service</h2>
                    </div>
                    
                    {/* Vertical list of service rows */}
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {services.length > 0 ? services.map(s => (
                            <motion.button
                                key={s.serviceId}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedService(s)}
                                className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all text-left ${selectedService?.serviceId === s.serviceId ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10' : 'bg-white border-slate-100 text-slate-700 hover:border-slate-300 shadow-sm'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedService?.serviceId === s.serviceId ? 'bg-[#73e0c9]/20 text-[#73e0c9]' : 'bg-slate-50 text-slate-400'}`}>
                                        <span className="material-symbols-outlined text-xl">{s.icon}</span>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black tracking-tight uppercase leading-tight mb-1">{s.title}</h4>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                            {s.category} <span className="opacity-45">•</span> {s.subCategory}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-black">₹{s.price}</span>
                                </div>
                            </motion.button>
                        )) : (
                            <div className="w-full py-10 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Services...</div>
                        )}
                    </div>

                    {selectedService && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm space-y-4"
                        >
                            {/* Row 1: Item Name and Quantity Select */}
                            <div className="flex items-center justify-between gap-4">
                                <h3 className="text-xs font-black uppercase tracking-tight text-slate-900 truncate leading-none">{selectedService.title}</h3>
                                <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl">
                                    <button 
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-900 font-bold text-sm"
                                    >
                                        -
                                    </button>
                                    <span className="text-sm font-black w-6 text-center">{quantity}</span>
                                    <button 
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-900 font-bold text-sm"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Row 2: Delivery commitment in a single horizontal row */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                                {['Today, 8 PM', 'Tomorrow, 6 PM', 'In 2 Days', 'Custom Time'].map(time => (
                                    <button 
                                        key={time}
                                        onClick={() => setDeliveryTime(time)}
                                        className={`py-3 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${deliveryTime === time ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-400 border-slate-100'}`}
                                    >
                                        {time}
                                    </button>
                                ))}
                            </div>

                            {/* Row 3: Add button only with "ADD" text */}
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={addItem}
                                className="w-full py-3.5 bg-slate-950 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md flex items-center justify-center hover:bg-slate-900 transition-colors"
                            >
                                Add
                            </motion.button>
                        </motion.div>
                    )}
                </section>

                {/* Item List / Tagging */}
                <section className="space-y-4">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3D5AFE] ml-2">Active Order Queue ({items.length})</h2>
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {items.length > 0 ? items.map((item, idx) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 font-black text-xs">
                                            #{idx + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-800 leading-none mb-1">{item.quantity}x {item.title}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-bold text-[#3D5AFE] uppercase tracking-widest">Tag: {item.tag}</span>
                                                <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">₹{item.price} ea.</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => removeItem(item.id)}
                                        className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                                    >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                </motion.div>
                            )) : (
                                <div className="py-16 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center opacity-40">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                                        <span className="material-symbols-outlined text-3xl">add_shopping_cart</span>
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest">Add items above to start</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>
            </main>

            {/* Sticky Order Action */}
            <div className="fixed bottom-16 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-[50]">
                <div className="max-w-2xl mx-auto flex items-center justify-between gap-6">
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Billable</p>
                        <p className="text-xl font-black text-slate-900 tracking-tight leading-none">₹{total.toFixed(2)}</p>
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        disabled={items.length === 0 || !customerPhone || isProcessing}
                        onClick={() => setShowDeliveryModal(true)}
                        className={`px-8 py-3.5 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md ${items.length > 0 && customerPhone ? 'bg-slate-950 text-white shadow-slate-900/10' : 'bg-slate-100 text-slate-300 opacity-50 grayscale cursor-not-allowed'}`}
                    >
                        {isProcessing ? (
                            <motion.span 
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                className="material-symbols-outlined text-[16px]"
                            >
                                autorenew
                            </motion.span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[16px]">payments</span>
                                <span className="whitespace-nowrap">Collect</span>
                            </>
                        )}
                    </motion.button>
                </div>
            </div>

            {/* Customer Name Modal */}
            <AnimatePresence>
                {showNameModal && (
                    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-slate-100"
                        >
                            <div className="h-2 bg-[#3D5AFE]"></div>
                            <div className="p-8 space-y-6">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black tracking-tighter uppercase text-slate-950 font-headline">Customer Name</h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Phone: +91 {customerPhone}</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-[#3D5AFE] uppercase tracking-widest ml-1">Full Name</label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. John Doe"
                                        value={tempName}
                                        onChange={(e) => setTempName(e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-50 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white border-2 border-transparent focus:border-slate-100 transition-all outline-none"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleConfirmName();
                                        }}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setShowNameModal(false)}
                                        className="flex-1 py-4 bg-slate-100 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleConfirmName}
                                        className="flex-1 py-4 bg-[#3D5AFE] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#3D5AFE]/20 hover:bg-[#3D5AFE]/95 transition-all"
                                    >
                                        Confirm
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delivery Method Modal */}
            <AnimatePresence>
                {showDeliveryModal && (
                    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-slate-100"
                        >
                            <div className="h-2 bg-[#3D5AFE]"></div>
                            <div className="p-8 space-y-6">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black tracking-tighter uppercase text-slate-950">Delivery Mode</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select how this order will be delivered</p>
                                </div>

                                <div className="space-y-3">
                                    {/* Option 1: Self / Direct */}
                                    <button 
                                        onClick={() => setDeliveryMethod('self')}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${deliveryMethod === 'self' ? 'border-[#3D5AFE] bg-[#3D5AFE]/5 text-slate-900' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${deliveryMethod === 'self' ? 'bg-[#3D5AFE]/20 text-[#3D5AFE]' : 'bg-slate-50 text-slate-400'}`}>
                                            <span className="material-symbols-outlined text-lg">storefront</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black uppercase tracking-wider">Customer / Ourself</p>
                                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">Self-pickup or direct delivery by store staff</p>
                                        </div>
                                    </button>

                                    {/* Option 2: Shiprocket */}
                                    <button 
                                        onClick={() => setDeliveryMethod('shiprocket')}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${deliveryMethod === 'shiprocket' ? 'border-[#3D5AFE] bg-[#3D5AFE]/5 text-slate-900' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${deliveryMethod === 'shiprocket' ? 'bg-[#3D5AFE]/20 text-[#3D5AFE]' : 'bg-slate-50 text-slate-400'}`}>
                                            <span className="material-symbols-outlined text-lg">local_shipping</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black uppercase tracking-wider">Delivery by Shiprocket</p>
                                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">Automated courier shipment via Shiprocket</p>
                                        </div>
                                    </button>
                                </div>

                                {deliveryMethod === 'shiprocket' && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-2"
                                    >
                                        <label className="text-[8px] font-black text-[#3D5AFE] uppercase tracking-widest ml-1">Shipping Address</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-sm">location_on</span>
                                            <input 
                                                type="text"
                                                placeholder="Enter Delivery Address"
                                                value={deliveryAddress}
                                                onChange={(e) => setDeliveryAddress(e.target.value)}
                                                className="w-full pl-11 pr-5 py-4 bg-slate-50 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white border-2 border-transparent focus:border-slate-100 transition-all outline-none"
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button 
                                        onClick={() => setShowDeliveryModal(false)}
                                        className="flex-1 py-4 bg-slate-100 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleCollectAndPrint}
                                        disabled={isProcessing}
                                        className="flex-1 py-4 bg-[#3D5AFE] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#3D5AFE]/20 hover:bg-[#3D5AFE]/95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isProcessing ? (
                                            <motion.span 
                                                animate={{ rotate: 360 }}
                                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                                className="material-symbols-outlined text-[14px]"
                                            >
                                                autorenew
                                            </motion.span>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[14px]">print</span>
                                                <span>Print</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Invoice Modal */}
            <AnimatePresence>
                {showInvoice && createdOrder && (
                    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/90 backdrop-blur-md">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden relative"
                        >
                            {/* Blue Header Accent */}
                            <div className="h-2 bg-[#3D5AFE]"></div>

                            <div className="p-8 space-y-8">
                                {/* Brand & Title */}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tighter uppercase text-slate-950">Spinzyt</h3>
                                        <p className="text-[10px] font-black text-[#3D5AFE] uppercase tracking-widest">Hub Invoice</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ref ID</p>
                                        <p className="text-sm font-black text-slate-900">{createdOrder.orderId}</p>
                                    </div>
                                </div>

                                {/* Customer & Store Info */}
                                <div className="grid grid-cols-2 gap-4 pb-6 border-b border-slate-100">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</p>
                                        <p className="text-sm font-bold text-slate-800 tracking-tight leading-tight">
                                            {customerName ? `${customerName}` : `+91 ${customerPhone}`}
                                        </p>
                                        {customerName && (
                                            <p className="text-[10px] font-bold text-slate-400">+91 {customerPhone}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Store Entity</p>
                                        <p className="text-sm font-bold text-slate-800 tracking-tight truncate">{vendorData.displayName || 'Official Hub'}</p>
                                    </div>
                                    <div className="space-y-1 col-span-2 border-t border-slate-100 pt-3">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Delivery Mode</p>
                                        <p className="text-sm font-bold text-slate-800 tracking-tight text-wrap">
                                            {createdOrder.riderDropOff ? `Shiprocket Delivery (Address: ${createdOrder.dropAddress})` : 'Self Delivery / Customer'}
                                        </p>
                                    </div>
                                </div>

                                {/* Billing Table */}
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Itemized Billing</p>
                                    <div className="space-y-3">
                                        {items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-slate-50 px-5 py-3 rounded-2xl">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black text-[#3D5AFE]">{idx + 1}</span>
                                                    <div>
                                                        <p className="text-[11px] font-bold text-slate-800">{item.title}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.tag}</p>
                                                    </div>
                                                </div>
                                                <span className="text-[11px] font-black text-slate-900">₹{item.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Final Total Card */}
                                <div className="bg-slate-900 rounded-3xl p-6 text-white flex justify-between items-center shadow-lg">
                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-black text-[#73e0c9] uppercase tracking-[0.2em] leading-none mb-1">Net Payable</p>
                                        <p className="text-xs font-bold text-slate-400 leading-none">Status: Success (Paid)</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-black tracking-tighter">₹{total.toFixed(2)}</p>
                                    </div>
                                </div>

                                {/* Footer & Action */}
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Thank you for your visit!</p>
                                    </div>
                                    <div className="flex gap-3 print:hidden">
                                        <button 
                                            onClick={() => window.print()}
                                            className="flex-1 py-4 bg-slate-100 text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">print</span>
                                            Print Slip
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setShowInvoice(false);
                                                setItems([]);
                                                setCustomerPhone('');
                                                setCustomerName('');
                                                navigate('/vendor/dashboard');
                                            }}
                                            className="flex-1 py-4 bg-[#3D5AFE] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#3D5AFE]/20 flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">home</span>
                                            Dashboard
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Hidden Professional Print Area */}
                            <div className="hidden print:block fixed inset-0 bg-white p-10 font-mono text-slate-900 leading-tight">
                                <div className="max-w-[400px] mx-auto border-2 border-slate-900 p-6 space-y-6">
                                    <div className="text-center border-b-2 border-slate-900 pb-4">
                                        <h2 className="text-3xl font-black tracking-tighter uppercase mb-1">Spinzyt Laundry</h2>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Professional Care Network</p>
                                        <p className="text-xs font-bold mt-2">{vendorData.displayName || 'Authorized Hub'}</p>
                                    </div>

                                    <div className="flex justify-between text-[11px] font-bold border-b border-slate-200 pb-4">
                                        <div className="space-y-1">
                                            <p>ORDER: {createdOrder.orderId}</p>
                                            <p>DATE: {new Date().toLocaleDateString()}</p>
                                            <p>TIME: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                        <div className="text-right space-y-1">
                                            {customerName && <p>NAME: {customerName.toUpperCase()}</p>}
                                            <p>CUST: +91 {customerPhone}</p>
                                            <p>TYPE: WALK-IN</p>
                                            <p>STATUS: PAID</p>
                                        </div>
                                    </div>

                                    <div className="text-[10px] font-mono border-b border-slate-200 pb-4 space-y-0.5">
                                        <p>DELIVERY MODE: {createdOrder.riderDropOff ? 'SHIPROCKET DELIVERY' : 'SELF / CUSTOMER'}</p>
                                        {createdOrder.riderDropOff && (
                                            <p className="break-all whitespace-normal">DELIVERY ADDR: {createdOrder.dropAddress}</p>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <table className="w-full text-xs font-bold">
                                            <thead>
                                                <tr className="border-b-2 border-slate-900 text-left">
                                                    <th className="py-1">DESCRIPTION</th>
                                                    <th className="py-1 text-right">TAG</th>
                                                    <th className="py-1 text-right">PRICE</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map((item, i) => (
                                                    <tr key={i} className="border-b border-slate-100">
                                                        <td className="py-2">{item.title}</td>
                                                        <td className="py-2 text-right">{item.tag}</td>
                                                        <td className="py-2 text-right">₹{item.price}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex justify-between items-center bg-slate-100 p-3 rounded-lg">
                                        <p className="text-sm font-black uppercase tracking-widest">Grand Total</p>
                                        <p className="text-xl font-black underline decoration-2">₹{total.toFixed(2)}</p>
                                    </div>

                                    <div className="flex justify-between items-end pt-4 border-t-2 border-slate-900 border-dashed">
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <p className="text-[8px] font-black uppercase tracking-widest leading-none mb-1">Authorized Scan</p>
                                                <div className="w-16 h-16 bg-white border-2 border-slate-900 p-1">
                                                    <div className="w-full h-full bg-slate-950 flex flex-wrap gap-[2px] p-[2px]">
                                                        {Array.from({length: 36}).map((_, i) => (
                                                            <div key={i} className={`w-[6px] h-[6px] ${Math.random() > 0.5 ? 'bg-white' : 'bg-transparent'}`}></div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[7px] font-bold uppercase tracking-tighter opacity-70">1. Not responsible for color bleed.</p>
                                                <p className="text-[7px] font-bold uppercase tracking-tighter opacity-70">2. Deliver within 48 hours.</p>
                                                <p className="text-[7px] font-bold uppercase tracking-tighter opacity-70">3. Non-refundable item check.</p>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="w-24 h-8 border-b border-slate-500 mb-1"></div>
                                            <p className="text-[7px] font-bold uppercase opacity-50">Store Manager</p>
                                        </div>
                                    </div>

                                    <div className="text-center pt-2">
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">*** Thank You for choosing Spinzyt ***</p>
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

export default WalkInOrderPage;
