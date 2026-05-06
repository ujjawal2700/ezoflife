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
  
  const [expressMultiplier, setExpressMultiplier] = useState(1);
  const [platformMultiplier, setPlatformMultiplier] = useState(1);
  const [gstPercent, setGstPercent] = useState(18);
  const [advanceConfigPerc, setAdvanceConfigPerc] = useState(100);
  const [normalLogisticsConfig, setNormalLogisticsConfig] = useState(0);
  
  useEffect(() => {
    const fetchConfig = async () => {
        try {
            const configs = await shippingConfigApi.getConfig();
            const exMult = configs.find(c => c.key === 'express_multiplier');
            if (exMult) setExpressMultiplier(Number(exMult.value));
            const platMult = configs.find(c => c.key === 'platform_multiplier');
            if (platMult) setPlatformMultiplier(Number(platMult.value));
            const gst = configs.find(c => c.key === 'gst_percent');
            if (gst) setGstPercent(Number(gst.value));
            const advance = configs.find(c => c.key === 'advance_percentage');
            if (advance) setAdvanceConfigPerc(Number(advance.value));
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
  const [paymentMethod, setPaymentMethod] = useState('Online'); // Default to Online

  const timeInfo = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    
    if (currentHour >= 6 && currentHour < 12) {
      return {
        message: "Pickup will be scheduled for today.",
        color: "bg-emerald-50 text-emerald-700 border-emerald-100",
        indicator: "bg-emerald-500",
        icon: "check_circle",
        probability: "High Probability"
      };
    } else if (currentHour >= 12 && currentHour < 15) {
      return {
        message: "Trying for today pickup, based on courier availability.",
        color: "bg-amber-50 text-amber-700 border-amber-100",
        indicator: "bg-amber-500",
        icon: "schedule",
        probability: "Medium Probability"
      };
    } else if (currentHour >= 15 && currentHour < 18) {
      return {
        message: "Late request! Pickup will likely happen tomorrow.",
        color: "bg-orange-50 text-orange-700 border-orange-100",
        indicator: "bg-orange-500",
        icon: "history",
        probability: "Low Probability"
      };
    } else {
      return {
        message: "Pickup will be scheduled for tomorrow.",
        color: "bg-rose-50 text-rose-700 border-rose-100",
        indicator: "bg-rose-500",
        icon: "event",
        probability: "Next Day Scheduled"
      };
    }
  }, []);

  const maxServiceTime = useMemo(() => {
    if (cartItems.length === 0) return 1;
    return cartItems.reduce((max, item) => Math.max(max, item.completionTime || 1), 1);
  }, [cartItems]);

  useEffect(() => {
    // When selectedPickup or maxServiceTime changes, update selectedDelivery
    const pickupIndex = availableDates.findIndex(d => `${d.day}, ${d.date}` === selectedPickup);
    if (pickupIndex !== -1) {
      const deliveryIndex = Math.min(pickupIndex + maxServiceTime, availableDates.length - 1);
      const deliveryD = availableDates[deliveryIndex];
      setSelectedDelivery(`${deliveryD.day}, ${deliveryD.date}`);
    }
  }, [selectedPickup, maxServiceTime, availableDates]);

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

  const areaMultiplier = 1; // Default to 1, can be linked to location later
  
  // V_Items = (Base * Area * Express * Platform)
  const currentExpressMultiplier = isExpress ? expressMultiplier : 1;
  
  const V_Items = useMemo(() => {
    return cartItems.reduce((acc, item) => {
        const itemBase = getItemPrice(item) * (quantities[item._id || item.id] || 0);
        return acc + (itemBase * areaMultiplier * currentExpressMultiplier * platformMultiplier);
    }, 0);
  }, [cartItems, quantities, areaMultiplier, currentExpressMultiplier, platformMultiplier]);

  const V = V_Items + normalLogisticsConfig;
  const taxAmount = V * (gstPercent / 100);
  const grandTotal = V + taxAmount;
  
  const discount = useMemo(() => {
      if (!isPromoApplied || !appliedPromoData) return 0;
      if (appliedPromoData.discountType === 'Flat') return Math.min(appliedPromoData.discountValue, grandTotal);
      return (grandTotal * appliedPromoData.discountValue) / 100;
  }, [isPromoApplied, appliedPromoData, grandTotal]);

  const finalTotal = useMemo(() => Math.max(0, grandTotal - discount), [grandTotal, discount]);

  const priceBreakdown = useMemo(() => {
    const baseWithArea = cartItems.reduce((acc, item) => {
        return acc + (getItemPrice(item) * (quantities[item._id || item.id] || 0) * areaMultiplier);
    }, 0);
    
    // Multiplicative logic breakdown
    const expressSurcharge = baseWithArea * platformMultiplier * (currentExpressMultiplier - 1);
    const platformFee = baseWithArea * currentExpressMultiplier * (platformMultiplier - 1);
    
    return {
        baseWithArea,
        expressSurcharge,
        platformFee,
        logisticsFee: normalLogisticsConfig,
        gstAmount: taxAmount
    };
  }, [cartItems, quantities, areaMultiplier, platformMultiplier, currentExpressMultiplier, normalLogisticsConfig, taxAmount]);

  const subtotal = priceBreakdown.baseWithArea;

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

      const advanceAmount = Math.round(finalTotal * (advanceConfigPerc / 100));

      if (paymentMethod === 'Online' && advanceAmount > 0) {
        const loadScript = (src) => {
          return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
          });
        };

        const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
        if (!res) {
          alert('Razorpay SDK failed to load');
          return;
        }

        const rzpOrder = await orderApi.createRazorpayOrder({
          amount: advanceAmount
        });

        console.log('📦 [CART] Razorpay Order received from backend:', rzpOrder);

        if (!rzpOrder || !rzpOrder.id) {
          console.error('❌ [CART] Razorpay order creation failed:', rzpOrder);
          alert('Failed to create Razorpay order. Check your backend configuration.');
          return;
        }

        const options = {
          key: rzpOrder.keyId,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          name: 'EzOfLife',
          description: `Advance Payment`,
          order_id: rzpOrder.id,
          handler: async function (response) {
            await finalizeOrder(userId, response.razorpay_payment_id, 'Online');
          },
          prefill: {
            name: userData.displayName || '',
            email: userData.email || '',
            contact: userData.phone || ''
          },
          theme: { color: '#000000' }
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.open();
      } else {
        await finalizeOrder(userId, null, 'COD');
      }
    } catch (err) {
      alert('Error initiating order');
    }
  };

  const finalizeOrder = async (userId, paymentId, method) => {
    try {
      setLoading(true);
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
        paymentStatus: method === 'Online' ? 'Paid' : 'Pending',
        paymentMethod: method,
        razorpayPaymentId: paymentId,
        deliveryMode: isExpress ? 'Express' : 'Normal',
        deliveryCharge: normalLogisticsConfig,
        areaMultiplier: areaMultiplier,
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
        
        if (method === 'Online') {
          // Go to Confirmation (Review) page first for Online success
          navigate('/user/confirmation', { state: { order: response } });
        } else {
          // Go directly to tracking for COD
          navigate(`/user/tracking/${response._id}`);
        }
      }
    } catch (err) {
      alert('Error finalizing order');
    } finally {
      setLoading(false);
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

      <motion.main className="max-w-5xl mx-auto px-6 pt-16 pb-36 w-full flex-1 overflow-y-auto hide-scrollbar">
        <div className="flex flex-col gap-10">
          {/* 1. CONCISE ORDER SUMMARY BOX */}
          <div className="bg-slate-950 text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-10 opacity-[0.03] rotate-12 pointer-events-none">
              <span className="material-symbols-outlined text-[120px]">receipt_long</span>
            </div>
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Order Summary</h2>
                <p className="text-white/40 text-[8px] font-black uppercase tracking-[0.2em] mt-1">Order Logistics & Preferences</p>
              </div>
              <div className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest ${isExpress ? 'bg-amber-500 text-black shadow-[0_10px_20px_rgba(245,158,11,0.2)]' : 'bg-white/10 text-white'}`}>
                {isExpress ? '⚡ Express Delivery' : 'Normal Delivery'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white/40 text-lg">calendar_today</span>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Pickup Slot & Address</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-bold">{selectedPickup?.split(',')[1] || selectedPickup} • {pickupTime?.split(' - ')[0]}</p>
                      <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md uppercase tracking-tighter border border-amber-400/20">
                        {selectedPickupAddress?.type || 'Home'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white/40 text-lg">local_shipping</span>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Delivery Slot & Address</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-bold">{selectedDelivery?.split(',')[1] || selectedDelivery} • {deliveryTime?.split(' - ')[0]}</p>
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md uppercase tracking-tighter border border-emerald-400/20">
                        {isSameAddress ? selectedPickupAddress?.type : (selectedDropAddress?.type || 'Home')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between pt-6 md:pt-0 md:pl-8 md:border-l border-white/5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">Service Tier</p>
                    <p className="text-[10px] font-black text-white uppercase tracking-tighter">
                      {[...new Set(cartItems.map(item => (item.tier === 'Heritage' || item.basePrice > 200) ? 'Heritage' : 'Essential'))].join(' & ') || 'Essential'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">Priority</p>
                    <p className="text-[10px] font-black text-white uppercase tracking-tighter">{isExpress ? 'Express (24-48h)' : 'Normal (3-4 Days)'}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">Items Count</p>
                    <p className="text-[10px] font-black text-white uppercase tracking-tighter">{cartItems.length} Services</p>
                  </div>
                </div>
                
                <div className="mt-6 flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5">
                  <span className="material-symbols-outlined text-[14px] text-amber-500">info</span>
                  <p className="text-[7px] font-black text-white/30 uppercase tracking-widest leading-tight">Prices include doorstep pickup and professional handling</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Services Review</p>
            {cartItems.map((item) => {
              const itemId = item._id || item.id;
              const qty = quantities[itemId];
              const unitPrice = getItemPrice(item);
              const totalPrice = unitPrice * qty;
              const isHeritageService = item.tier === 'Heritage' || (item.basePrice > 200);

              return (
                <div key={itemId} className="bg-white rounded-3xl p-4 flex items-center gap-4 border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-100 shrink-0">
                    <span className="material-symbols-outlined text-lg">{item.icon || 'local_laundry_service'}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-[10px] text-slate-900 uppercase tracking-tight truncate">{item.name}</h3>
                      <span className="text-[6px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest bg-slate-100 text-slate-400 shrink-0">
                        {isHeritageService ? 'Heritage' : 'Essential'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-black text-slate-400">
                        {qty} {billingUnits[itemId] || 'Unit'} × ₹{unitPrice}
                      </p>
                      <p className="text-[11px] font-black text-slate-900 tracking-tighter">₹{totalPrice.toFixed(0)}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => updateQuantity(itemId, -qty)}
                    className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm font-black">close</span>
                  </button>
                </div>
              );
            })}
          </div>





          <div className="bg-slate-950 text-white rounded-[3rem] p-10 shadow-2xl space-y-8 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-12 opacity-[0.03] rotate-12 pointer-events-none group-hover:opacity-[0.05] transition-opacity">
              <span className="material-symbols-outlined text-[140px]">payments</span>
            </div>

            <div className="space-y-6 relative z-10">
              {/* PROMO CODE INTEGRATED */}
              <div className="bg-white/5 rounded-[2rem] border border-white/10 p-5 flex flex-col gap-4 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Have a Promo Code?</p>
                  {isPromoApplied && (
                    <button onClick={() => { setIsPromoApplied(false); setAppliedPromoData(null); setPromoCode(''); }} className="text-[9px] font-black text-rose-400 uppercase tracking-widest bg-rose-400/10 px-3 py-1.5 rounded-xl border border-rose-400/20">Remove</button>
                  )}
                </div>
                <div className="flex gap-3">
                    <input 
                      type="text" 
                      placeholder="ENTER CODE"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-[11px] font-black uppercase tracking-widest outline-none focus:bg-white/10 focus:border-white/20 transition-all text-white placeholder:text-white/20"
                    />
                    <button 
                      onClick={handleApplyPromo}
                      className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isPromoApplied ? 'bg-emerald-500 text-white' : 'bg-white text-black'}`}
                    >
                      {isPromoApplied ? 'APPLIED' : 'APPLY'}
                    </button>
                </div>
                {promoError && <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest ml-1">{promoError}</p>}
                {isPromoApplied && (
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest ml-1">✨ SAVED ₹{discount.toFixed(0)} WITH {appliedPromoData?.code}!</p>
                )}
              </div>

              <div className="space-y-5 px-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.15em] text-white/40">
                  <span>Base Items Total</span>
                  <span className="text-white">₹{priceBreakdown.baseWithArea.toFixed(0)}</span>
                </div>
                
                {priceBreakdown.expressSurcharge > 0 && (
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.15em] text-amber-400">
                    <span>Express Surcharge</span>
                    <span>₹{priceBreakdown.expressSurcharge.toFixed(0)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.15em] text-white/40">
                  <span>Platform Fee</span>
                  <span className="text-white">₹{priceBreakdown.platformFee.toFixed(0)}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.15em] text-white/40">
                  <span>Logistic Fee</span>
                  <span className="text-white">₹{priceBreakdown.logisticsFee.toFixed(0)}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.15em] text-white/40">
                  <span>GST (18%)</span>
                  <span className="text-white">₹{priceBreakdown.gstAmount.toFixed(0)}</span>
                </div>

                {isPromoApplied && (
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.15em] text-emerald-400 bg-emerald-400/10 px-5 py-3 rounded-2xl border border-emerald-400/20">
                    <span>Promo Discount ({appliedPromoData?.code})</span>
                    <span>- ₹{discount.toFixed(0)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-8 border-t border-white/5 space-y-6 relative z-10">
              <div className="flex flex-col">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 mb-1 px-2">Total Payable Amount</p>
                <div className="flex flex-wrap items-baseline gap-3 px-2">
                    <p className="text-5xl font-black tracking-tighter text-white">₹{finalTotal.toFixed(0)}</p>
                    {paymentMethod === 'Online' && advanceConfigPerc < 100 && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">
                          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">₹{(finalTotal * (advanceConfigPerc/100)).toFixed(0)} Pay Now</p>
                        </div>
                    )}
                </div>
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePlaceOrder}
                disabled={cartItems.length === 0 || loading}
                className="w-full bg-white text-black py-6 rounded-[2rem] font-black text-[14px] uppercase tracking-[0.05em] shadow-[0_20px_60px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 group/btn transition-all"
              >
                {loading ? 'PROCESSING...' : 'PROCEED TO PAYMENT'}
                <span className="material-symbols-outlined text-xl group-hover/btn:translate-x-2 transition-transform duration-500">
                  arrow_forward_ios
                </span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.main>
    </motion.div>
  );
};

export default CartPage;
