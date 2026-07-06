import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { b2bOrderApi, authApi } from '../../../lib/api';
import toast from 'react-hot-toast';
const parseSupplierInfo = (facilityName, phoneFromItem) => {
    let name = facilityName || '';
    let phone = phoneFromItem || '';

    // Find and strip any 10-digit phone number from the name
    const match = name.match(/\b\d{10}\b/);
    if (match) {
        if (!phone) phone = match[0];
        name = name.replace(match[0], '').trim();
    } else {
        // Also try matching any sequence of 4-9 digits at the end if it's a test suffix
        const shortMatch = name.match(/\b\d{4,9}\b/);
        if (shortMatch) {
            if (!phone) phone = shortMatch[0];
            name = name.replace(shortMatch[0], '').trim();
        }
    }
    
    // Clean up name
    name = name.replace(/\s+/g, ' ').trim();
    return { name, phone };
};

const VendorCartDetailsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Fallback if accessed without state
    const { cart = {}, materials = [], vendorData = {} } = location.state || {};
    
    const [promoCode, setPromoCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [profileData, setProfileData] = useState(vendorData);

    useEffect(() => {
        const loadProfile = async () => {
            const vId = vendorData._id || vendorData.id;
            if (!vId) return;
            try {
                const profile = await authApi.getProfile(vId);
                if (profile) {
                    setProfileData(profile);
                    // Update localStorage
                    localStorage.setItem('vendorData', JSON.stringify(profile));
                    if (localStorage.getItem('user')) {
                        localStorage.setItem('user', JSON.stringify(profile));
                    }
                    if (localStorage.getItem('userData')) {
                        localStorage.setItem('userData', JSON.stringify(profile));
                    }
                }
            } catch (err) {
                console.error('Failed to load vendor profile:', err);
            }
        };
        loadProfile();
    }, [vendorData]);
    
    const { itemSubtotal, totalGst, totalDeliveryCharges, grandTotal, totalPlatformFee, payableToSupplier, orderItems, groupedCarts } = useMemo(() => {
        let subTotal = 0;
        let gstTotal = 0;
        const supplierGroups = {};
        const items = [];

        Object.entries(cart).forEach(([id, qty]) => {
            if (qty > 0) {
                const item = materials.find(m => m._id === id);
                if (item) {
                    const originalWholesale = item.wholesaleRate || item.price || 0;
                    const gstPercent = item.gst || 18;
                    const finalPriceOriginal = item.price || 0;
                    
                    const hasBulkDiscount = item.bulkThreshold > 0 && qty >= item.bulkThreshold && item.bulkDiscount > 0;
                    const wholesaleRate = hasBulkDiscount 
                        ? originalWholesale - (originalWholesale * item.bulkDiscount / 100)
                        : originalWholesale;
                    
                    const finalPrice = hasBulkDiscount 
                        ? finalPriceOriginal - (finalPriceOriginal * item.bulkDiscount / 100)
                        : finalPriceOriginal;

                    const gstAmount = (wholesaleRate * gstPercent) / 100;
                    const basePriceWithGst = wholesaleRate + gstAmount;
                    
                    const itemWholesaleTotal = wholesaleRate * qty;
                    const itemGstTotal = gstAmount * qty;
                    const itemTotalFinal = basePriceWithGst * qty;
                    const itemPlatformFee = (item.platformFeePercent || 0) * itemWholesaleTotal / 100;
                    
                    const itemData = {
                        ...item,
                        qty,
                        wholesaleRate,
                        totalPrice: itemTotalFinal,
                        gstAmount: itemGstTotal
                    };

                    subTotal += itemWholesaleTotal;
                    gstTotal += itemGstTotal;
                    items.push(Object.assign(itemData, {
                        materialId: id,
                        quantity: qty,
                        price: finalPrice,
                        wholesaleRate: wholesaleRate,
                        basePrice: basePriceWithGst,
                        originalWholesale: originalWholesale,
                        bulkDiscount: item.bulkDiscount || 0,
                        bulkThreshold: item.bulkThreshold || 0,
                        hasBulkDiscount: hasBulkDiscount
                    }));


                    if (!supplierGroups[item.supplierId]) {
                        const parsedInfo = parseSupplierInfo(item.supplierFacilityName, item.supplierPhone);
                        supplierGroups[item.supplierId] = {
                            supplierId: item.supplierId,
                            supplierName: parsedInfo.name || 'Unknown Supplier',
                            supplierPhone: parsedInfo.phone || '',
                            nextDeliveryDate: item.nextDeliveryDate || '',
                            items: [],
                            subTotal: 0,
                            gstTotal: 0,
                            totalAmount: 0,
                            platformFeeRaw: 0,
                            movFreeDelivery: item.movFreeDelivery || 0,
                            deliveryCharges: item.deliveryCharges || 0,
                            minSupplierPlatformFee: item.minSupplierPlatformFee || 0,
                            maxSupplierPlatformFee: item.maxSupplierPlatformFee !== undefined ? item.maxSupplierPlatformFee : null,
                            payableToSupplier: 0
                        };
                    }
                    supplierGroups[item.supplierId].items.push(itemData);
                    supplierGroups[item.supplierId].subTotal += itemWholesaleTotal;
                    supplierGroups[item.supplierId].gstTotal += itemGstTotal;
                    supplierGroups[item.supplierId].totalAmount += itemTotalFinal;
                    supplierGroups[item.supplierId].platformFeeRaw += itemPlatformFee;
                }
            }
        });

        let deliveryTotal = 0;
        let finalPlatformFeeTotal = 0;
        Object.values(supplierGroups).forEach(group => {
            let deliveryFee = 0;
            if (group.totalAmount < group.movFreeDelivery) {
                deliveryFee = group.deliveryCharges;
                deliveryTotal += group.deliveryCharges;
            }
            group.deliveryCharges = deliveryFee;
            group.payableToSupplier = group.subTotal + group.gstTotal + deliveryFee;

            let clampedFee = group.platformFeeRaw;
            if (group.minSupplierPlatformFee && clampedFee < group.minSupplierPlatformFee) {
                clampedFee = group.minSupplierPlatformFee;
            }
            if (group.maxSupplierPlatformFee !== null && group.maxSupplierPlatformFee !== undefined) {
                if (clampedFee > group.maxSupplierPlatformFee) {
                    clampedFee = group.maxSupplierPlatformFee;
                }
            }
            group.platformFeeFinal = clampedFee;
            finalPlatformFeeTotal += clampedFee;
        });

        const payableToSupplier = subTotal + gstTotal + deliveryTotal;
        const calculatedGrandTotal = subTotal + gstTotal + finalPlatformFeeTotal + deliveryTotal;

        return {
            itemSubtotal: subTotal,
            totalGst: gstTotal,
            totalDeliveryCharges: deliveryTotal,
            grandTotal: calculatedGrandTotal,
            payableToSupplier: payableToSupplier,
            totalPlatformFee: finalPlatformFeeTotal,
            orderItems: items,
            groupedCarts: Object.values(supplierGroups)
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

    let city = profileData.shopDetails?.city || profileData.address_city || profileData.city || '';
    let pincode = profileData.shopDetails?.pincode || profileData.address_pincode || profileData.pincode || '';
    const shippingAddress = profileData.shopDetails?.address || profileData.address || `${city}, ${pincode}`;

    if (!pincode && shippingAddress) {
        const pinMatch = shippingAddress.match(/\b\d{6}\b/);
        if (pinMatch) {
            pincode = pinMatch[0];
        }
    }

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePlaceOrder = async () => {
        const loadingToast = toast.loading('Placing B2B requests...');
        setLoading(true);
        try {
            const payload = {
                vendorId: profileData._id || profileData.id,
                items: orderItems,
                totalAmount: payableToSupplier,
                totalPlatformFee: totalPlatformFee,
                subTotal: itemSubtotal,
                deliveryCharges: totalDeliveryCharges,
                city: city === 'Unknown' ? '' : city,
                pincode: pincode,
                shippingAddress: shippingAddress
            };

            const response = await b2bOrderApi.placeOrder(payload);
            
            if (response.error || !response.orders || response.orders.length === 0) {
                toast.error(response.message || response.error || 'Failed to place procurement requests', { id: loadingToast });
                setLoading(false);
                return;
            }
            
            if (response.razorpayOrderId && response.platformFeeAmount > 0) {
                toast.loading('Opening payment gateway...', { id: loadingToast });
                
                const isScriptLoaded = await loadRazorpayScript();
                if (!isScriptLoaded) {
                    toast.error('Failed to load payment gateway', { id: loadingToast });
                    setLoading(false);
                    return;
                }

                const options = {
                    key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
                    amount: Math.round(response.platformFeeAmount * 100),
                    currency: 'INR',
                    name: 'SPINZYT',
                    description: 'B2B Platform Fee',
                    order_id: response.razorpayOrderId,
                    handler: async function (paymentResponse) {
                        toast.loading('Verifying payment...', { id: loadingToast });
                        try {
                            const orderIds = response.orders.map(o => o._id);
                            await b2bOrderApi.verifyPlatformFeePayment({
                                razorpay_order_id: paymentResponse.razorpay_order_id,
                                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                                razorpay_signature: paymentResponse.razorpay_signature,
                                orderIds: orderIds
                            });
                            toast.success('Order confirmed successfully!', { id: loadingToast });
                            navigate('/vendor/material-request', { replace: true, state: { resetCart: true } });
                        } catch (err) {
                            console.error('Payment Verification Error:', err);
                            toast.error('Payment verified but order confirmation failed', { id: loadingToast });
                        }
                    },
                    prefill: {
                        name: profileData.displayName || profileData.name || '',
                        email: profileData.email || '',
                        contact: profileData.phone || ''
                    },
                    theme: {
                        color: '#0f172a'
                    },
                    modal: {
                        ondismiss: function () {
                            toast.error('Payment cancelled. Order saved as Awaiting Fee Payment.', { id: loadingToast });
                            setLoading(false);
                            // We can navigate back or let them stay. If they stay, they might click PAY NOW again, creating DUPLICATE orders!
                            // So we navigate away with reset cart, they can find the submitted order in their history.
                            navigate('/vendor/material-request', { replace: true, state: { resetCart: true } });
                        }
                    }
                };

                const rzp = new window.Razorpay(options);
                rzp.open();
                
            } else {
                toast.success('Procurement request submitted and confirmed!', { id: loadingToast });
                navigate('/vendor/material-request', { replace: true, state: { resetCart: true } });
            }
        } catch (err) {
            console.error('Submission Error:', err);
            toast.error(err.message || 'Failed to place requests', { id: loadingToast });
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
                    {/* SUPPLIER-WISE CARTS */}
                    {groupedCarts.map((group, idx) => (
                        <div key={idx} className="bg-[#0b0f19] text-white rounded-[2rem] p-6 shadow-2xl relative overflow-hidden mb-4 group">


                            {/* Supplier Summary */}
                            <div className="bg-white/5 border border-white/10 p-4 rounded-3xl space-y-2">
                                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/40">
                                    <span>Subtotal</span>
                                    <span className="text-white">₹{group.subTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/40">
                                    <span>GST Amount</span>
                                    <span className="text-white">₹{group.gstTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/40">
                                    <span>Delivery</span>
                                    <span className="text-white">{group.deliveryCharges === 0 ? 'FREE' : `₹${group.deliveryCharges.toFixed(2)}`}</span>
                                </div>
                                <div className="pt-3 mt-3 border-t border-white/10 flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Supplier Total</span>
                                    <span className="text-lg font-black text-white">₹{group.payableToSupplier.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* PLATFORM PAYMENT BOX */}
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-xl relative overflow-hidden mt-2">
                        <div className="absolute right-0 top-0 p-6 opacity-5 rotate-12 pointer-events-none text-slate-900">
                            <span className="material-symbols-outlined text-[80px]">receipt_long</span>
                        </div>
                        <div className="flex flex-col gap-4 relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 leading-relaxed">
                                If you have to confirm this order please pay platform fee
                            </p>
                            
                            <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100">
                                <div className="flex flex-col">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Payable</p>
                                    <p className="text-3xl font-black tracking-tighter text-slate-900">₹{totalPlatformFee.toFixed(2)}</p>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-1">Only Platform Fee</p>
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

                    {/* SERVICES REVIEW */}
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
                                <div key={idx} className="bg-white rounded-3xl p-4 flex items-center justify-between border border-slate-200 shadow-sm gap-4">
                                    {/* Left: Product Icon & Name */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden relative">
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="material-symbols-outlined text-slate-300 text-lg">inventory_2</span>
                                            )}
                                        </div>
                                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">
                                            {item.name}
                                        </h4>
                                    </div>
                                    
                                    {/* Right: Price & Quantity */}
                                    <div className="flex items-center gap-4 shrink-0">
                                        <p className="text-xs font-black text-slate-900 font-mono">
                                            ₹{(item.wholesaleRate * item.quantity).toFixed(2)}
                                        </p>
                                        <div className="flex items-center bg-slate-100 rounded-xl px-3 py-1.5 border border-slate-200 shrink-0">
                                            <span className="text-[10px] font-black text-slate-700">Qty: {item.quantity}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.main>
        </motion.div>
    );
};

export default VendorCartDetailsPage;
