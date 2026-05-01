import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MASTER_SERVICES } from '../../../shared/data/sharedData';
import { orderApi, serviceApi, authApi, promotionApi, masterServiceApi, mediaApi } from '../../../lib/api';
import { shippingConfigApi } from '../../../lib/shippingApi';
import { useLocationStore } from '../../../shared/stores/locationStore';

import { Autocomplete } from '@react-google-maps/api';

const mapContainerStyle = { width: '100%', height: '400px' };
const defaultCenter = { lat: 22.7196, lng: 75.8577 }; // Indore as default

const CartPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedService = location.state?.selectedService;

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applicablePromos, setApplicablePromos] = useState([]);
  const [appliedPromoData, setAppliedPromoData] = useState(null);
  const [detectedVendorId, setDetectedVendorId] = useState(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const [masterRes, customRes] = await Promise.all([
          masterServiceApi.getAll(),
          serviceApi.getAll({ approvedOnly: true })
        ]);
        
        const combinedData = [
          ...(Array.isArray(masterRes) ? masterRes.map(s => ({ 
            ...s, 
            isMaster: true,
            name: s.itemName || s.name // Normalize name for validation
          })) : []),
          ...(Array.isArray(customRes) ? customRes.map(s => ({ 
            ...s, 
            isMaster: false,
            name: s.name || s.itemName 
          })) : [])
        ];
        
        setServices(combinedData);
      } catch (error) {
        console.error('Error fetching services for cart:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const [quantities, setQuantities] = useState(() => {
    const saved = localStorage.getItem('cart_quantities');
    const q = saved ? JSON.parse(saved) : {};
    if (selectedService && !q[selectedService._id || selectedService.id]) {
        const sid = selectedService._id || selectedService.id;
        q[sid] = selectedService.initialQuantity || 1;
    }
    return q;
  });

  const [clothCounts, setClothCounts] = useState({});

  const cartItems = useMemo(() => {
    if (services.length === 0) return [];
    return services.filter(s => {
      const id = s._id || s.id;
      return quantities[id] > 0;
    });
  }, [services, quantities]);

  // Combined Address/Map States
  const [mapLocation, setMapLocation] = useState(defaultCenter);
  const [mapAddress, setMapAddress] = useState('');

  useEffect(() => {
    const detectAndFetchPromos = async () => {
        const detectVendorId = () => {
            let vid = null;
            // 1. Try from cart items
            if (cartItems.length > 0) {
                for (const item of cartItems) {
                    vid = item.vendorId || 
                          item.vendor?._id || 
                          item.vendor?.id || 
                          (item._id && typeof item._id === 'object' ? item._id.vendorId : null) ||
                          item.userId;

                    if (vid && vid !== 'undefined' && vid !== 'null' && vid.length > 10) {
                        console.log('🔍 CartPage: Detected Vendor ID from Cart Items:', vid);
                        return vid;
                    }
                }
            }

            // 2. Try from localStorage (Shop Context)
            const storageKeys = ['last_visited_vendor_id', 'selected_vendor_id', 'current_shop_id', 'vendor_id', 'vendorData'];
            for (const key of storageKeys) {
                let val = localStorage.getItem(key);
                if (val) {
                    try {
                        const parsed = JSON.parse(val);
                        val = parsed._id || parsed.id || val;
                    } catch (e) {}
                    if (val && val !== 'undefined' && val !== 'null' && typeof val === 'string' && val.length > 10) {
                        console.log(`💾 CartPage: Detected Vendor ID from LocalStorage (${key}):`, val);
                        return val;
                    }
                }
            }
            return null;
        };

        let vId = detectVendorId();
        
        // 3. Fallback: Find Nearest Vendor if no ID detected (Crucial for Master Services)
        if (!vId && mapLocation?.lat) {
            console.log('🔄 CartPage: No explicit Vendor ID, searching for nearby vendors...');
            try {
                const nearby = await orderApi.getNearbyVendors(mapLocation.lat, mapLocation.lng, 15); // Search up to 15km
                if (nearby && nearby.length > 0) {
                    vId = nearby[0].id;
                    console.log('📍 CartPage: Fallback to nearest vendor:', nearby[0].name, vId);
                }
            } catch (err) {
                console.warn('⚠️ CartPage: Fallback vendor search failed:', err);
            }
        }

        if (vId && vId !== 'undefined' && vId !== 'null') {
            setDetectedVendorId(vId); // Store for promo application
            console.log('🚀 CartPage: Fetching promos for Vendor:', vId);
            try {
                const data = await promotionApi.getApplicablePromos(vId);
                console.log('🎁 CartPage: Fetched Promos:', data);
                if (Array.isArray(data)) setApplicablePromos(data);
            } catch (err) {
                console.error('❌ CartPage: Promo Fetch Error:', err);
            }
        } else {
            setDetectedVendorId(null);
            console.warn('⚠️ CartPage: No Vendor ID detected (even after fallback) for promo fetching');
        }
    };

    detectAndFetchPromos();
  }, [cartItems, services, mapLocation]);

  const [billingUnits, setBillingUnits] = useState({});

  useEffect(() => {
    if (cartItems.length > 0 && Object.keys(billingUnits).length === 0) {
      const u = {};
      cartItems.forEach(item => {
        const id = item._id || item.id;
        u[id] = item.unit || (id.includes('wash') || id.includes('carpet') ? 'kg' : 'pc');
      });
      setBillingUnits(u);
    }
  }, [cartItems]);
  
  useEffect(() => {
    if (Object.keys(quantities).length > 0) {
      localStorage.setItem('cart_quantities', JSON.stringify(quantities));
    }
  }, [quantities]);
  
  const [expressChargeConfig, setExpressChargeConfig] = useState(0);
  const [normalLogisticsConfig, setNormalLogisticsConfig] = useState(0);
  
  useEffect(() => {
    const fetchConfig = async () => {
        try {
            const configs = await shippingConfigApi.getConfig();
            const surcharge = configs.find(c => c.key === 'express_surcharge');
            if (surcharge) setExpressChargeConfig(Number(surcharge.value));
            const normalFee = configs.find(c => c.key === 'normal_logistics_fee');
            if (normalFee) setNormalLogisticsConfig(Number(normalFee.value));
        } catch (err) {
            console.error('Error fetching delivery config:', err);
        }
    };
    fetchConfig();
  }, []);

  const [isExpress, setIsExpress] = useState(() => localStorage.getItem('is_express') === 'true');
  const [garmentPhotos, setGarmentPhotos] = useState(() => {
    const saved = localStorage.getItem('order_photos');
    return saved ? JSON.parse(saved) : [];
  });
  const fileInputRef = useRef(null);

  const availableDates = useMemo(() => {
    const dates = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      let dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      if (i === 0) dayLabel = 'TODAY';
      if (i === 1) dayLabel = 'TOMORROW';
      dates.push({
        day: dayLabel,
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        raw: d
      });
    }
    return dates;
  }, []);

  const [selectedPickup, setSelectedPickup] = useState(() => localStorage.getItem('pickup_date') || `${availableDates[0].day}, ${availableDates[0].date}`);
  const [pickupTime, setPickupTime] = useState(() => localStorage.getItem('pickup_time') || '02:00 PM - 04:00 PM');
  const [selectedDelivery, setSelectedDelivery] = useState(() => localStorage.getItem('delivery_date') || `${availableDates[1].day}, ${availableDates[1].date}`);
  const [deliveryTime, setDeliveryTime] = useState(() => localStorage.getItem('delivery_time') || '06:00 PM - 08:00 PM');
  
  const [promoCode, setPromoCode] = useState('');
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');

  const [addresses, setAddresses] = useState([]);
  const [selectedPickupAddress, setSelectedPickupAddress] = useState(null);
  const [selectedDropAddress, setSelectedDropAddress] = useState(null);
  const [isSameAddress, setIsSameAddress] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const syncAddresses = async () => {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = userData._id || userData.id;
      const localPickup = JSON.parse(localStorage.getItem('pickup_address') || 'null');
      const localDrop = JSON.parse(localStorage.getItem('drop_address') || 'null');
      const detectedAddr = localStorage.getItem('detected_address');
      const detectedCoords = JSON.parse(localStorage.getItem('detected_coords') || 'null');

      let initialAddresses = [];
      if (localPickup) initialAddresses.push(localPickup);
      if (localDrop && localDrop.id !== localPickup?.id) initialAddresses.push(localDrop);
      if (detectedAddr && !localPickup) {
          initialAddresses.push({ 
            id: 'current_set', 
            type: 'Current Selection', 
            address: detectedAddr, 
            location: detectedCoords || defaultCenter 
          });
      }

      if (userId) {
        try {
          const profile = await authApi.getProfile(userId);
          if (profile.address) {
            const profileAddr = { 
              id: 'profile', 
              type: 'Profile Home', 
              address: profile.address, 
              location: profile.location || defaultCenter 
            };
            if (!initialAddresses.some(a => a.address === profile.address)) {
              initialAddresses.push(profileAddr);
            }
            if (profile.location) setMapLocation(profile.location);
          }
        } catch (error) {
          console.error('Error fetching profile address:', error);
        }
      }
      setAddresses(initialAddresses);
      if (localPickup) setSelectedPickupAddress(localPickup);
      else if (initialAddresses.length > 0) setSelectedPickupAddress(initialAddresses[0]);
      if (localDrop) setSelectedDropAddress(localDrop);
      else if (initialAddresses.length > 0) setSelectedDropAddress(initialAddresses[0]);
    };
    syncAddresses();
  }, []);

  const updateQuantity = (id, delta) => {
    setQuantities(prev => {
      const current = prev[id] || 0;
      const newVal = Math.max(0, current + delta);
      const next = { ...prev };
      if (newVal === 0) delete next[id];
      else next[id] = newVal;
      return next;
    });
  };

  const { pricingFactor, zone } = useLocationStore();

  const getItemPrice = (item) => {
    // Priority: discountedPrice -> totalPrice -> basePrice
    const price = item.discountedPrice || item.totalPrice || item.basePrice || 0;
    return Math.round(price * (pricingFactor || 1));
  };

  const subtotal = useMemo(() => cartItems.reduce((acc, item) => {
    return acc + (getItemPrice(item) * (quantities[item._id || item.id] || 0));
  }, 0), [cartItems, quantities]);

  const logisticsFee = normalLogisticsConfig;
  const currentExpressFee = isExpress ? expressChargeConfig : 0;
  
  // Dynamic Tax Calculation based on DB items
  const taxAmount = useMemo(() => {
    // 1. Calculate GST on items
    const itemsTax = cartItems.reduce((acc, item) => {
      const qty = quantities[item._id || item.id] || 0;
      const price = getItemPrice(item);
      const itemGst = item.gst !== undefined ? item.gst : 0.18; // Use DB GST or fallback to 18%
      return acc + (price * qty * itemGst);
    }, 0);

    // 2. Calculate GST on logistics (Standard 18%)
    const logisticsTax = (logisticsFee + currentExpressFee) * 0.18;

    return itemsTax + logisticsTax;
  }, [cartItems, quantities, logisticsFee, currentExpressFee]);

  const taxableAmount = subtotal + logisticsFee + currentExpressFee;
  const grandTotal = useMemo(() => (taxableAmount + taxAmount), [taxableAmount, taxAmount]);
  
  const discount = useMemo(() => {
      if (!isPromoApplied || !appliedPromoData) return 0;
      if (appliedPromoData.discountType === 'Flat') return Math.min(appliedPromoData.discountValue, grandTotal);
      return (grandTotal * appliedPromoData.discountValue) / 100;
  }, [isPromoApplied, appliedPromoData, grandTotal]);

  const finalTotal = useMemo(() => Math.max(0, grandTotal - discount), [grandTotal, discount]);

  const handleApplyPromo = async (code) => {
    const targetCode = typeof code === 'string' ? code : promoCode;
    if (!targetCode) return;
    
    const vendorId = detectedVendorId;
    if (!vendorId) {
        console.warn('❌ Cannot apply promo: No valid Vendor ID detected');
        setPromoError('Vendor context missing. Please refresh cart.');
        return;
    }

    try {
        const response = await promotionApi.validate({
            code: targetCode,
            vendorId,
            orderValue: subtotal
        });

        if (response.message) {
            setPromoError(response.message);
            setIsPromoApplied(false);
            setAppliedPromoData(null);
        } else {
            setAppliedPromoData(response);
            setIsPromoApplied(true);
            setPromoError('');
            setPromoCode(response.code);
        }
    } catch (err) {
        setPromoError('Invalid or Expired Code');
        setIsPromoApplied(false);
        setAppliedPromoData(null);
    }
  };

  const [specialInstructions, setSpecialInstructions] = useState(() => localStorage.getItem('order_notes') || '');

  const handlePlaceOrder = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = userData._id || userData.id; 
      if (!userId) return alert('Please login');

      const orderData = {
        customerId: userId,
        items: cartItems.map(item => ({
          serviceId: item._id || item.id,
          name: item.name || item.itemName || 'Service Item',
          quantity: quantities[item._id || item.id],
          price: getItemPrice(item),
          unit: billingUnits[item._id || item.id]
        })),
        pickupSlot: { date: selectedPickup, time: pickupTime },
        deliverySlot: { date: selectedDelivery, time: deliveryTime },
        pickupAddress: selectedPickupAddress?.address || '',
        pickupLocation: selectedPickupAddress?.location || defaultCenter,
        dropAddress: isSameAddress ? (selectedPickupAddress?.address || '') : (selectedDropAddress?.address || ''),
        dropLocation: isSameAddress ? (selectedPickupAddress?.location || defaultCenter) : (selectedDropAddress?.location || defaultCenter),
        totalAmount: finalTotal,
        deliveryMode: isExpress ? 'Express' : 'Normal',
        deliveryCharge: logisticsFee + currentExpressFee,
        promoApplied: isPromoApplied ? appliedPromoData?._id : null,
        discountAmount: discount,
        specialInstructions,
        customerPhotos: garmentPhotos
      };

      const response = await orderApi.createOrder(orderData);
      if (response._id) {
        localStorage.removeItem('cart_quantities');
        localStorage.removeItem('order_photos');
        localStorage.removeItem('order_notes');
        navigate('/user/confirmation', { state: { order: response } });
      }
    } catch (err) {
      alert('Error placing order');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-background font-body text-on-background min-h-[100dvh] flex flex-col"
    >
      <header className="fixed top-0 left-0 right-0 z-[80] bg-background/80 backdrop-blur-xl border-b border-outline-variant/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary shadow-sm"><span className="material-symbols-outlined font-black">arrow_back</span></motion.button>
          <h1 className="text-sm font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-60">Cart Details</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Booking Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex flex-col gap-1">
                  <h3 className="font-headline font-black text-2xl text-slate-900 uppercase tracking-tighter">Order Summary.</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting Rider Assignment</p>
                </div>
                <button onClick={() => setShowPreview(false)} className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm hover:text-rose-500 transition-all">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 hide-scrollbar">
                {/* Status Card */}
                <div className="bg-amber-50 border border-amber-100 p-5 rounded-3xl flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center text-white shrink-0">
                    <span className="material-symbols-outlined text-sm">hail</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Current Status</p>
                    <p className="text-xs font-bold text-amber-900 uppercase">Awaiting Rider Assignment</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Services & Items</p>
                  <div className="space-y-3">
                    {cartItems.map(item => (
                      <div key={item._id || item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-slate-400">check_circle</span>
                          <span className="font-bold text-sm text-slate-900">{item.name} × {quantities[item._id || item.id]}</span>
                        </div>
                        <span className="font-black text-slate-900">₹{getItemPrice(item) * quantities[item._id || item.id]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950 rounded-[2.5rem] p-8 text-white space-y-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl" />
                  
                  <div className="space-y-3 relative z-10">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                      <span>Gross Amount</span>
                      <span className="text-white">₹{finalTotal.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40 border-t border-white/10 pt-3">
                      <span>Status</span>
                      <span className="text-amber-400">PENDING</span>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/10 flex justify-between items-center relative z-10">
                    <div className="flex flex-col">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Paid Amount (Advance)</p>
                      <p className="text-3xl font-black text-white tracking-tighter">₹{(finalTotal * 0.05).toFixed(0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Remaining Amount</p>
                      <p className="text-2xl font-black text-white/60 tracking-tighter">₹{(finalTotal * 0.95).toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  className={`w-full py-6 rounded-[1.5rem] bg-black text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all hover:bg-emerald-500 flex items-center justify-center gap-3 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'PROCESSING...' : 'CONFIRM ORDER'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.main className="max-w-5xl mx-auto px-6 pt-24 pb-36 w-full flex-1 overflow-y-auto hide-scrollbar">
        <div className="flex flex-col gap-10">
          
          <div className="pl-4 border-l-4 border-black">
            <h2 className="font-headline text-3xl font-black tracking-tighter leading-none mb-1 text-slate-900 uppercase">Your Summary.</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{cartItems.length} services selected</p>
          </div>

          <div className="space-y-4">
            {cartItems.map((item) => {
              const itemId = item._id || item.id;
              const qty = quantities[itemId];
              const unitPrice = getItemPrice(item);
              const totalPrice = unitPrice * qty;
              const isHeritageService = item.tier === 'Heritage' || (item.basePrice > 200);

              return (
                <div key={itemId} className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-5 border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-100 shrink-0">
                    <span className="material-symbols-outlined text-xl md:text-2xl">{item.icon || 'local_laundry_service'}</span>
                  </div>

                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-2 mb-3 md:mb-4">
                      <h3 className="font-black text-md md:text-lg text-slate-900 uppercase tracking-tight leading-none truncate">{item.name}</h3>
                      <span className="text-[8px] md:text-[9px] font-black px-2 py-0.5 md:py-1 rounded-lg uppercase tracking-widest bg-slate-100 text-slate-400 shrink-0">
                        {isHeritageService ? 'Heritage' : 'Essential'}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-8">
                      <div className="bg-slate-50 rounded-[2rem] px-1.5 py-1 flex items-center gap-2 md:gap-4 border border-slate-100/50 shadow-inner w-full sm:w-auto justify-between sm:justify-start">
                        <button 
                          onClick={() => updateQuantity(itemId, -1)}
                          className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-white rounded-full text-slate-400 shadow-sm hover:text-black transition-all active:scale-90"
                        >
                          <span className="material-symbols-outlined text-sm md:text-md font-black">remove</span>
                        </button>
                        
                        <div className="flex flex-col items-center min-w-[30px] md:min-w-[40px]">
                          <span className="text-xs font-black text-slate-900 leading-none">{qty}</span>
                          <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-1 whitespace-nowrap">Per {billingUnits[itemId] || 'Kg'}</span>
                        </div>

                        <button 
                          onClick={() => updateQuantity(itemId, 1)}
                          className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-white rounded-full text-slate-400 shadow-sm hover:text-black transition-all active:scale-90"
                        >
                          <span className="material-symbols-outlined text-sm md:text-md font-black">add</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between sm:justify-start gap-6 md:gap-8 w-full sm:w-auto pt-2 sm:pt-0">
                        <div className="flex flex-col">
                          <p className="text-[8px] md:text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Price/Unit</p>
                          <p className="text-md md:text-lg font-black text-slate-900 mt-1 tracking-tighter">₹{unitPrice}</p>
                        </div>
                        <div className="flex flex-col">
                          <p className="text-[8px] md:text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Total</p>
                          <p className="text-xl md:text-2xl font-black text-slate-900 mt-1 tracking-tighter">₹{totalPrice.toFixed(0)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => updateQuantity(itemId, -qty)}
                    className="absolute top-3 right-3 md:top-4 md:right-4 w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-lg md:text-xl font-black">close</span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] space-y-4">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Logistics Priority</p>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-400">{isExpress ? 'bolt' : 'schedule'}</span>
                  <p className="text-xl font-black tracking-tight">{isExpress ? 'Express Delivery' : 'Standard Delivery'}</p>
                </div>
                <p className="text-[11px] font-medium text-white/60">Preferences set on Home Page</p>
             </div>
             <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] space-y-4 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scheduling</p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-900 uppercase">Pickup:</span>
                    <span className="text-[11px] font-bold text-slate-500">{selectedPickup} • {pickupTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-900 uppercase">Delivery:</span>
                    <span className="text-[11px] font-bold text-slate-500">{selectedDelivery} • {deliveryTime}</span>
                  </div>
                </div>
             </div>
          </div>


          {/* Offers & Promos Section */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-black">confirmation_number</span>
                    <h3 className="font-headline font-black text-xl text-slate-900 uppercase tracking-tighter">Offers & Promos.</h3>
                </div>
            </div>
            
            <div className="flex gap-2">
                <input 
                    type="text" 
                    placeholder="Enter Promo Code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest outline-none focus:bg-white focus:ring-2 ring-black/5 transition-all"
                />
                <button 
                    onClick={handleApplyPromo}
                    className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isPromoApplied ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-black text-white'}`}
                >
                    {isPromoApplied ? 'APPLIED' : 'APPLY'}
                </button>
            </div>
            
            {promoError && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest px-2">{promoError}</p>}
            {isPromoApplied && (
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between animate-pulse">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Savings of ₹{discount.toFixed(0)} Applied!</p>
                    <button onClick={() => { setIsPromoApplied(false); setAppliedPromoData(null); setPromoCode(''); }} className="text-emerald-400"><span className="material-symbols-outlined text-sm">cancel</span></button>
                </div>
            )}
            
            {applicablePromos.length > 0 && !isPromoApplied && (
                <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Available Offers:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {applicablePromos.map(p => {
                            const isLocked = subtotal < p.minOrderValue;
                            return (
                                <button 
                                    key={p._id} 
                                    disabled={isLocked}
                                    onClick={() => handleApplyPromo(p.code)} 
                                    className={`relative p-5 rounded-3xl border-2 transition-all flex flex-col items-start gap-2 text-left group ${isLocked ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed' : 'bg-white border-emerald-100 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10'}`}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className={`text-xs font-black uppercase tracking-widest ${isLocked ? 'text-slate-400' : 'text-emerald-600'}`}>
                                            {p.code}
                                        </span>
                                        {isLocked && (
                                            <span className="material-symbols-outlined text-slate-300 text-sm">lock</span>
                                        )}
                                    </div>
                                    <p className={`text-lg font-black tracking-tighter ${isLocked ? 'text-slate-400' : 'text-slate-900'}`}>
                                        SAVE {p.discountType === 'Flat' ? `₹${p.discountValue}` : `${p.discountValue}%`}
                                    </p>
                                    <div className="flex items-center justify-between w-full mt-1">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                            {isLocked ? `Add ₹${(p.minOrderValue - subtotal).toFixed(0)} more` : `Applicable on your order`}
                                        </p>
                                        {!isLocked && <span className="text-[8px] font-black bg-emerald-500 text-white px-2 py-1 rounded-full uppercase tracking-widest animate-pulse">Apply</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-black text-xl flex items-center gap-3 text-slate-900 uppercase tracking-tighter">
                <span className="material-symbols-outlined text-black">location_on</span>Address Details.
              </h3>
              <button onClick={() => navigate('/user/home')} className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-4 py-2 rounded-xl">Change on Home</button>
            </div>
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-900 shadow-sm shrink-0">
                <span className="material-symbols-outlined text-xl">directions_run</span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Delivery Location</p>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {selectedPickupAddress?.address || 'Set in Home Page'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-4">
            <h3 className="font-headline font-black text-xl flex items-center gap-3 text-slate-900 uppercase tracking-tighter">
              <span className="material-symbols-outlined text-black">description</span>Special Instructions.
            </h3>
            <textarea 
              value={specialInstructions}
              onChange={(e) => {
                setSpecialInstructions(e.target.value);
                localStorage.setItem('order_notes', e.target.value);
              }}
              placeholder="Any specific care instructions for your clothes?"
              className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] p-6 text-xs font-bold outline-none focus:bg-white focus:ring-2 ring-black/5 min-h-[120px] transition-all"
            />
          </div>

          <div className="bg-slate-950 text-white rounded-[3.5rem] p-8 md:p-12 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 blur-[120px] -mr-40 -mt-40" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[100px] -ml-32 -mb-32" />
            
            <div className="relative z-10 space-y-8">
              <div className="space-y-5">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.25em] opacity-40">
                  <span>Subtotal</span>
                  <span className="text-white">₹{subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.25em] opacity-40">
                  <span>Delivery {isExpress ? '(Express)' : '(Normal)'}</span>
                  <span className="text-white">₹{(logisticsFee + currentExpressFee).toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.25em] opacity-40">
                  <span>Service Tax (GST)</span>
                  <span className="text-white">₹{taxAmount.toFixed(0)}</span>
                </div>
                {isPromoApplied && (
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">
                    <span>Promo Discount</span>
                    <span>- ₹{discount.toFixed(0)}</span>
                  </div>
                )}
              </div>
              
              <div className="pt-8 border-t border-white/10">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-2">Final Amount to Pay</p>
                    <p className="text-6xl font-black tracking-tighter bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">₹{finalTotal.toFixed(0)}</p>
                  </div>
                  
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowPreview(true)}
                    disabled={cartItems.length === 0}
                    className="w-full bg-white text-slate-950 py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(255,255,255,0.15)] flex items-center justify-center gap-4 group transition-all"
                  >
                    PREVIEW ORDER
                    <span className="material-symbols-outlined text-lg group-hover:translate-x-2 transition-transform">arrow_forward</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.main>
    </motion.div>
  );
};

export default CartPage;
