import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { b2bOrderApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const VendorCartDetailsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Fallback if accessed without state
    const { cart = {}, materials = [], vendorData = {} } = location.state || {};
    
    const [promoCode, setPromoCode] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Calculate cart totals (copied from MaterialRequestPage logic)
    const { itemSubtotal, totalDeliveryCharges, grandTotal, orderItems } = useMemo(() => {
        let subTotal = 0;
        const supplierGroups = {};
        const items = [];

        Object.entries(cart).forEach(([id, qty]) => {
            if (qty > 0) {
                const item = materials.find(m => m._id === id);
                if (item) {
                    const itemTotal = (item.price || 0) * qty;
                    subTotal += itemTotal;
                    
                    items.push({
                        materialId: id,
                        name: item.name,
                        quantity: qty,
                        price: item.price,
                        image: item.images?.[0] || null,
                        supplierFacilityName: item.supplierFacilityName,
                        deliveryFrequency: item.deliveryFrequency
                    });
                    
                    if (!supplierGroups[item.supplierId]) {
                        supplierGroups[item.supplierId] = {
                            totalAmount: 0,
                            movFreeDelivery: item.movFreeDelivery || 0,
                            deliveryCharges: item.deliveryCharges || 0
                        };
                    }
                    supplierGroups[item.supplierId].totalAmount += itemTotal;
                }
            }
        });

        let deliveryTotal = 0;
        Object.values(supplierGroups).forEach(group => {
            if (group.totalAmount < group.movFreeDelivery) {
                deliveryTotal += group.deliveryCharges;
            }
        });

        return {
            itemSubtotal: subTotal,
            totalDeliveryCharges: deliveryTotal,
            grandTotal: subTotal + deliveryTotal,
            orderItems: items
        };
    }, [cart, materials]);

    // Handle empty cart
    if (orderItems.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
                <p className="text-sm font-black uppercase text-slate-400">Cart is empty</p>
                <button 
                    onClick={() => navigate(-1)}
                    className="mt-4 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const city = vendorData.shopDetails?.city || vendorData.address_city || vendorData.city || '';
    const pincode = vendorData.shopDetails?.pincode || vendorData.address_pincode || vendorData.pincode || '';
    const shippingAddress = vendorData.shopDetails?.address || vendorData.address || `${city}, ${pincode}`;

    const handlePlaceOrder = async () => {
        const loadingToast = toast.loading('Placing B2B requests...');
        setLoading(true);
        try {
            const payload = {
                vendorId: vendorData._id || vendorData.id,
                items: orderItems,
                totalAmount: grandTotal,
                subTotal: itemSubtotal,
                deliveryCharges: totalDeliveryCharges,
                city: city === 'Unknown' ? '' : city,
                pincode: pincode,
                shippingAddress: shippingAddress
            };

            await b2bOrderApi.placeOrder(payload);
            toast.success('Procurement request submitted!', { id: loadingToast });
            navigate('/vendor/material-request', { replace: true, state: { resetCart: true } });
        } catch (err) {
            console.error('Submission Error:', err);
            toast.error(err.message || 'Failed to place requests', { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-50 font-body text-slate-900 min-h-[100dvh] flex flex-col"
        >
            <header className="fixed top-0 left-0 right-0 z-[80] bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <motion.button 
                        whileTap={{ scale: 0.9 }} 
                        onClick={() => navigate(-1)} 
                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-900 shadow-sm border border-slate-200"
                    >
                        <span className="material-symbols-outlined font-black">arrow_back</span>
                    </motion.button>
                    <h1 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Cart Details</h1>
                    <div className="w-10" />
                </div>
            </header>

            <motion.main className="max-w-md mx-auto px-6 pb-36 w-full flex-1 overflow-y-auto hide-scrollbar pt-[84px]">
                <div className="flex flex-col gap-4">
                    {/* ORDER SUMMARY BOX */}
                    <div className="bg-[#0b0f19] text-white rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-6 opacity-[0.03] rotate-12 pointer-events-none">
                            <span className="material-symbols-outlined text-[80px]">receipt_long</span>
                        </div>
                        
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <h2 className="text-xl font-black uppercase tracking-tighter leading-none text-white">Order Summary</h2>
                        </div>


                        
                        <div className="space-y-3 relative z-10">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-1">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/40">
                                    <span>Subtotal</span>
                                    <span className="text-white">₹{itemSubtotal}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/40">
                                    <span>GST</span>
                                    <span className="text-white">Included</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/40">
                                    <span>Delivery Charges</span>
                                    <span className="text-white">{totalDeliveryCharges === 0 ? 'FREE' : `₹${totalDeliveryCharges}`}</span>
                                </div>
                            </div>


                        </div>
                        
                        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col gap-1 relative z-10">
                            <p className="text-[8px] font-black uppercase tracking-widest text-emerald-400 leading-relaxed">This amount payable to supplier for your product</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <p className="text-3xl font-black tracking-tighter text-white">₹{grandTotal}</p>
                            </div>
                        </div>
                    </div>

                    {/* PLATFORM PAYMENT BOX */}
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
                        <div className="flex flex-col gap-4 relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 leading-relaxed">
                                If you have to confirm this order please pay platform fee
                            </p>
                            
                            <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100">
                                <div className="flex flex-col">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Platform Fee</p>
                                    <p className="text-3xl font-black tracking-tighter text-slate-900">₹49</p>
                                </div>
                                <motion.button 
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handlePlaceOrder}
                                    disabled={loading}
                                    className="bg-slate-900 text-white px-8 py-4 rounded-[1.2rem] font-black text-[11px] uppercase tracking-widest shadow-xl shadow-slate-900/20 disabled:opacity-50 active:scale-95 transition-all"
                                >
                                    {loading ? 'WAIT...' : 'PAY NOW'}
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Services Review</p>
                        <button 
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-1.5 text-[9px] font-black text-slate-900 uppercase bg-white border border-slate-200 px-4 py-2 rounded-full hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                        >
                            <span className="material-symbols-outlined text-[12px] font-bold">edit</span>
                            EDIT
                        </button>
                    </div>

                    <div className="space-y-3">
                        {orderItems.map((item, idx) => (
                            <div key={idx} className="bg-white rounded-3xl p-4 flex items-center gap-4 border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden relative">
                                    {item.image ? (
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-symbols-outlined text-slate-300">inventory_2</span>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex flex-col gap-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-black text-[11px] text-slate-900 uppercase tracking-tight truncate">{item.name}</h3>
                                                <span className="text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest bg-emerald-50 text-emerald-600 shrink-0 border border-emerald-100">
                                                    {item.deliveryFrequency || 'Normal'}
                                                </span>
                                            </div>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate">{item.supplierFacilityName}</p>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0">
                                            <p className="text-sm font-black text-slate-900 tracking-tighter">
                                                ₹{item.price * item.quantity}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 pl-2">
                                    <div className="flex items-center bg-slate-50 rounded-xl px-4 py-2 border border-slate-100">
                                        <span className="text-[11px] font-black text-slate-900">Qty: {item.quantity}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </motion.main>
        </motion.div>
    );
};

export default VendorCartDetailsPage;
