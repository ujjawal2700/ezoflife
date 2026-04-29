import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MASTER_SERVICES } from '../../../shared/data/sharedData';
import { orderApi, serviceApi, authApi, promotionApi, masterServiceApi, mediaApi } from '../../../lib/api';
import { shippingConfigApi } from '../../../lib/shippingApi';
import { GoogleMap, useLoadScript, Marker, Autocomplete } from '@react-google-maps/api';

const libraries = ['places'];
const mapContainerStyle = { width: '100%', height: '400px' };
const defaultCenter = { lat: 28.4595, lng: 77.0266 }; // Gurgaon

const CartPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedService = location.state?.selectedService;

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applicablePromos, setApplicablePromos] = useState([]);
  const [appliedPromoData, setAppliedPromoData] = useState(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const [masterRes, customRes] = await Promise.all([
          masterServiceApi.getAll(),
          serviceApi.getAll({ approvedOnly: true })
        ]);
        
        const combinedData = [
          ...(Array.isArray(masterRes) ? masterRes.map(s => ({ ...s, isMaster: true })) : []),
          ...(Array.isArray(customRes) ? customRes.map(s => ({ ...s, isMaster: false })) : [])
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

  useEffect(() => {
    if (cartItems.length > 0) {
        const vendorId = cartItems[0].vendorId;
        if (vendorId) {
            promotionApi.getApplicablePromos(vendorId).then(setApplicablePromos).catch(console.error);
        }
    }
  }, [cartItems]);

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
  const [normalLogisticsConfig, setNormalLogisticsConfig] = useState(0); // Default to 0 to detect fetch
  
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
  
  const [showPicker, setShowPicker] = useState(false);
  const [activePicking, setActivePicking] = useState('pickup');

  const timeSlots = useMemo(() => [
    '08:00 AM - 10:00 AM',
    '10:00 AM - 12:00 PM',
    '12:00 PM - 02:00 PM',
    '02:00 PM - 04:00 PM',
    '04:00 PM - 06:00 PM',
    '06:00 PM - 08:00 PM'
  ], []);

  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [custPickup, setCustPickup] = useState(null);
  const [custDelivery, setCustDelivery] = useState(null);

  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapLocation, setMapLocation] = useState(defaultCenter);
  const [mapAddress, setMapAddress] = useState('');
  
  // Detailed Address States
  const [addrDetails, setAddrDetails] = useState({
    type: 'HOME',
    line1: '',
    line2: '',
    floor: '',
    landmark: '',
    pincode: '',
    city: '',
    state: ''
  });

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries
  });

  const autocompleteRef = useRef(null);
  const mapRef = useRef(null);

  const reverseGeocode = useCallback((lat, lng) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        setMapAddress(results[0].formatted_address);
      }
    });
  }, []);

  const onPlaceSelected = () => {
    const place = autocompleteRef.current.getPlace();
    if (place.geometry) {
      const newPos = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      };
      setMapLocation(newPos);
      setMapAddress(place.formatted_address);
      mapRef.current?.panTo(newPos);
    }
  };

  const onMarkerDragEnd = (e) => {
    const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setMapLocation(newPos);
    reverseGeocode(newPos.lat, newPos.lng);
  };

  const [addresses, setAddresses] = useState([]);
  const [selectedPickupAddress, setSelectedPickupAddress] = useState(null);
  const [selectedDropAddress, setSelectedDropAddress] = useState(null);
  const [isSameAddress, setIsSameAddress] = useState(true);
  const [activeAddressType, setActiveAddressType] = useState('pickup');
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

  const confirmMapAddress = async () => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = userData._id || userData.id;
    if (!userId) {
        alert('Please login to save address');
        return;
    }

    const fullAddress = `${addrDetails.line1}, ${addrDetails.line2}${addrDetails.floor ? `, Floor: ${addrDetails.floor}` : ''}${addrDetails.landmark ? `, Near ${addrDetails.landmark}` : ''}, ${addrDetails.city}, ${addrDetails.state} - ${addrDetails.pincode}`;

    try {
        const newAddr = { 
            id: Date.now(), 
            type: addrDetails.type, 
            address: fullAddress, 
            location: mapLocation,
            details: addrDetails
        };
        
        await authApi.updateProfile(userId, { 
            address: fullAddress,
            location: mapLocation 
        });

        setAddresses(prev => [newAddr, ...prev]);
        localStorage.setItem('address_is_full', 'true');

        if (activeAddressType === 'pickup') {
            setSelectedPickupAddress(newAddr);
            if (isSameAddress) setSelectedDropAddress(newAddr);
        } else {
            setSelectedDropAddress(newAddr);
        }

        setShowMapPicker(false);
        setShowAddressPicker(false);
    } catch (error) {
        console.error('Save address error:', error);
        alert('Failed to save address');
    }
  };

  const [promoCode, setPromoCode] = useState('');
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');

  const handleCalendarSelect = (day) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const dayLabel = selected.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const dateStr = selected.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const formattedDate = `${dayLabel}, ${dateStr}`;
    const isStandard = availableDates.some(ad => `${ad.day}, ${ad.date}` === formattedDate);

    if (activePicking === 'pickup') {
      setSelectedPickup(formattedDate);
      setCustPickup(isStandard ? null : { day: 'CUSTOM', date: dateStr });
    } else {
      setSelectedDelivery(formattedDate);
      setCustDelivery(isStandard ? null : { day: 'CUSTOM', date: dateStr });
    }
    setShowFullCalendar(false);
  };

  const updateQuantity = (id, delta) => {
    setQuantities(prev => {
      const current = prev[id] || 0;
      const newVal = Math.max(0, current + delta);
      const next = { ...prev };
      if (newVal === 0) {
        delete next[id];
      } else {
        next[id] = newVal;
      }
      return next;
    });
  };

  const getItemPrice = (item) => {
    return item.totalPrice || item.basePrice || 0;
  };

  const subtotal = useMemo(() => cartItems.reduce((acc, item) => {
    return acc + (getItemPrice(item) * (quantities[item._id || item.id] || 0));
  }, 0), [cartItems, quantities, billingUnits]);

  const logisticsFee = normalLogisticsConfig;
  const currentExpressFee = isExpress ? expressChargeConfig : 0;
  const grandTotal = useMemo(() => (subtotal + logisticsFee + currentExpressFee), [subtotal, logisticsFee, currentExpressFee]);
  
  const discount = useMemo(() => {
      if (!isPromoApplied || !appliedPromoData) return 0;
      if (appliedPromoData.discountType === 'Flat') return Math.min(appliedPromoData.discountValue, grandTotal);
      return (grandTotal * appliedPromoData.discountValue) / 100;
  }, [isPromoApplied, appliedPromoData, grandTotal]);

  const finalTotal = useMemo(() => Math.max(0, grandTotal - discount), [grandTotal, discount]);

  const handleApplyPromo = (code) => {
    const targetCode = typeof code === 'string' ? code : promoCode;
    const promo = applicablePromos.find(p => p.code.toUpperCase() === targetCode.toUpperCase());
    
    if (promo) {
      if (subtotal < promo.minOrderValue) {
          setPromoError(`Min order ₹${promo.minOrderValue} required`);
          setIsPromoApplied(false);
          return;
      }
      setAppliedPromoData(promo);
      setIsPromoApplied(true);
      setPromoError('');
      setPromoCode(promo.code);
    } else {
      setPromoError('Invalid code');
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

      // Photos are already uploaded from Home Page and stored in localStorage
      const uploadedPhotoUrls = garmentPhotos;

      const orderData = {
        customerId: userId,
        items: cartItems.map(item => ({
          serviceId: item._id || item.id,
          name: item.name,
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
        customerPhotos: uploadedPhotoUrls
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
                  <h3 className="font-headline font-black text-2xl text-slate-900 uppercase tracking-tighter">Booking Preview.</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verify your details before payment</p>
                </div>
                <button onClick={() => setShowPreview(false)} className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm hover:text-rose-500 transition-all">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 hide-scrollbar">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Pickup Address</p>
                    <p className="text-xs font-bold text-slate-900 leading-relaxed">{selectedPickupAddress?.address}</p>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Scheduling</p>
                    <p className="text-xs font-bold text-slate-900">Pickup: {selectedPickup}</p>
                    <p className="text-xs font-bold text-slate-900 mt-1">Delivery: {selectedDelivery}</p>
                  </div>
                </div>

                <div className="bg-black rounded-[2.5rem] p-8 text-white space-y-4 shadow-xl">
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest text-white/40">
                    <span>Grand Total</span>
                    <span className="text-white">₹{finalTotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-white/10">
                    <div className="flex flex-col">
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Pay Now (Advance)</p>
                      <p className="text-4xl font-black text-white tracking-tighter">₹{(finalTotal * 0.05).toFixed(0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Pay After Delivery</p>
                      <p className="text-2xl font-black text-white/60 tracking-tighter">₹{(finalTotal * 0.95).toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  className={`w-full py-6 rounded-[1.5rem] bg-black text-white font-black text-sm uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all hover:bg-emerald-500 flex items-center justify-center gap-3 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'PROCESSING...' : 'PROCEED TO PAYMENT'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.main className="max-w-5xl mx-auto px-6 pt-24 pb-36 w-full flex-1 overflow-y-auto hide-scrollbar">
        <div className="flex flex-col gap-10">
          
          {/* 1. Item Summary Detail - TOP */}
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
                  {/* Icon Box */}
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-100 shrink-0">
                    <span className="material-symbols-outlined text-xl md:text-2xl">{item.icon || 'local_laundry_service'}</span>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-2 mb-3 md:mb-4">
                      <h3 className="font-black text-md md:text-lg text-slate-900 uppercase tracking-tight leading-none truncate">{item.name}</h3>
                      <span className="text-[8px] md:text-[9px] font-black px-2 py-0.5 md:py-1 rounded-lg uppercase tracking-widest bg-slate-100 text-slate-400 shrink-0">
                        {isHeritageService ? 'Heritage' : 'Essential'}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-8">
                      {/* QTY CONTROL */}
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

          {/* 2. ORDER CONTEXT INFO (Display Only) */}
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

          {/* 3. Address Preview (Display Only) */}
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


          {/* 7. Price Breakdown & Final Action */}
          <div className="bg-black rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col gap-1 mb-8">
              <h3 className="font-headline font-black text-2xl text-white uppercase tracking-tighter">Price Breakdown.</h3>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Clear pricing transparency</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm font-black uppercase tracking-widest text-white/60">
                <span>Items Total</span>
                <span className="text-white">₹{subtotal.toFixed(0)}</span>
              </div>
              
              <div className="flex justify-between text-sm font-black uppercase tracking-widest text-white/60">
                <span>Delivery Fee</span>
                <span className="text-white">₹{normalLogisticsConfig.toFixed(0)}</span>
              </div>

              {isExpress && (
                <div className="flex justify-between text-sm font-black uppercase tracking-widest text-amber-400">
                  <span>Express Fee</span>
                  <span>₹{expressChargeConfig.toFixed(0)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black uppercase tracking-widest text-white/60">
                <span>Taxes (GST)</span>
                <span className="text-white">₹{(grandTotal * 0.05).toFixed(0)}</span>
              </div>

              <div className="h-px bg-white/10 my-4"></div>

              <div className="flex justify-between items-center py-2">
                <div className="flex flex-col">
                  <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Advance Payable (5%)</p>
                  <p className="text-3xl font-black text-white tracking-tighter">₹{(finalTotal * 0.05).toFixed(0)}</p>
                </div>
                <div className="text-right flex flex-col">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Remaining After Delivery</p>
                  <p className="text-2xl font-black text-white tracking-tighter mt-1">₹{(finalTotal * 0.95).toFixed(0)}</p>
                </div>
              </div>
            </div>

            <button 
              onClick={handlePlaceOrder} 
              className="w-full mt-10 bg-white text-black font-black py-6 rounded-[1.5rem] text-sm uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all hover:bg-amber-400 hover:text-black transition-colors"
            >
              Confirm Booking
            </button>
          </div>

        </div>
      </motion.main>
    </motion.div>
  );
};

export default CartPage;
