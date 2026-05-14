import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { serviceApi, orderApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const WalkInOrderPage = () => {
    const navigate = useNavigate();
    const [customerPhone, setCustomerPhone] = useState('');
    const [selectedService, setSelectedService] = useState(null);
    const [items, setItems] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [liveServices, setLiveServices] = useState([]);
    const [showInvoice, setShowInvoice] = useState(false);
    const [createdOrder, setCreatedOrder] = useState(null);
    const [deliveryTime, setDeliveryTime] = useState('Tomorrow, 6:00 PM');
    const [quantity, setQuantity] = useState(1);

    const vendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
    const vendorId = vendorData?._id || vendorData?.id;

    const fetchServices = async () => {
        if (!vendorId) {
            console.warn('WalkInHub: No vendorId found, skipping service fetch.');
            return;
        }
        try {
            // Fetch only vendor's approved services
            const data = await serviceApi.getAll({ vendorId });
            setLiveServices(data);
        } catch (error) {
            console.error('Fetch Services Error:', error);
        }
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const services = useMemo(() => liveServices.map(s => ({
        serviceId: s._id,
        title: s.name,
        price: s.basePrice || 0,
        icon: s.icon || 'local_laundry_service'
    })), [liveServices]);

    const handlePhoneChange = (val) => {
        const cleanVal = val.replace(/\D/g, '');
        if (cleanVal.length <= 10) {
            setCustomerPhone(cleanVal);
        }
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
        
        setIsProcessing(true);
        try {
            const orderData = {
                customerPhone,
                vendorId,
                orderType: 'Walk-In', // Logistics Bypass
                deliveryTime,
                items: items.map(i => ({
                    serviceId: i.serviceId,
                    name: i.title,
                    price: i.price,
                    quantity: i.quantity
                })),
                totalAmount: total,
                status: 'In Progress' // Directly to In Progress
            };

            const response = await orderApi.createWalkInOrder(orderData);
            setCreatedOrder(response);
            setShowInvoice(true);
            
            // Logic for customer notification (Mock)
            console.log(`Sending SMS to ${customerPhone}: Order confirmed! Download app: https://spinzyt.com/app`);
            
            toast.success('Walk-In Order Created!');
        } catch (err) {
            console.error('Walk-In Creation Failure:', err);
            toast.error('Failed to generate order');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="text-slate-900 min-h-[100dvh] pb-44 flex flex-col overflow-x-hidden font-sans">
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
                    <div className="relative group">
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
                </section>

                {/* Service Selection */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3D5AFE]">Select Service</h2>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar px-1">
                        {services.length > 0 ? services.map(s => (
                            <motion.button
                                key={s.serviceId}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedService(s)}
                                className={`flex flex-col items-center justify-center p-4 min-w-[100px] h-[100px] rounded-[2rem] border transition-all ${selectedService?.serviceId === s.serviceId ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/10' : 'bg-white border-slate-100 text-slate-500 opacity-80 shadow-sm'}`}
                            >
                                <span className={`material-symbols-outlined mb-1.5 text-xl ${selectedService?.serviceId === s.serviceId ? 'text-[#73e0c9]' : ''}`}>{s.icon}</span>
                                <span className="text-[9px] font-black uppercase tracking-tight text-center leading-tight">{s.title}</span>
                                <span className="text-[8px] font-bold opacity-60 mt-1">₹{s.price}</span>
                            </motion.button>
                        )) : (
                            <div className="w-full py-6 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Services...</div>
                        )}
                    </div>
                    {selectedService && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Quantity</p>
                                    <p className="text-sm font-black text-slate-900 mt-1">{selectedService.title}</p>
                                </div>
                                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl">
                                    <button 
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-900 font-bold"
                                    >
                                        -
                                    </button>
                                    <span className="text-lg font-black w-8 text-center">{quantity}</span>
                                    <button 
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-900 font-bold"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Delivery Commitment</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {['Today, 8 PM', 'Tomorrow, 6 PM', 'In 2 Days', 'Custom Time'].map(time => (
                                        <button 
                                            key={time}
                                            onClick={() => setDeliveryTime(time)}
                                            className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${deliveryTime === time ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={addItem}
                                className="w-full py-5 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">add_circle</span>
                                Add {quantity}x {selectedService.title} to Order
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
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-[50]">
                <div className="max-w-2xl mx-auto flex items-center justify-between gap-6">
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Billable</p>
                        <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">₹{total.toFixed(2)}</p>
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        disabled={items.length === 0 || !customerPhone || isProcessing}
                        onClick={handleCollectAndPrint}
                        className={`flex-[1.5] py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all shadow-xl ${items.length > 0 && customerPhone ? 'bg-slate-950 text-white shadow-slate-900/10' : 'bg-slate-100 text-slate-300 opacity-50 grayscale cursor-not-allowed'}`}
                    >
                        {isProcessing ? (
                            <motion.span 
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                className="material-symbols-outlined text-[18px]"
                            >
                                autorenew
                            </motion.span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[18px]">print</span>
                                <span className="whitespace-nowrap">Collect & Print</span>
                            </>
                        )}
                    </motion.button>
                </div>
            </div>

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
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer Phone</p>
                                        <p className="text-sm font-bold text-slate-800 tracking-tight">+91 {customerPhone}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Store Entity</p>
                                        <p className="text-sm font-bold text-slate-800 tracking-tight truncate">{vendorData.displayName || 'Official Hub'}</p>
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
                                            <p>CUST: +91 {customerPhone}</p>
                                            <p>TYPE: WALK-IN</p>
                                            <p>STATUS: PAID</p>
                                        </div>
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
