import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { serviceApi, masterServiceApi, authApi, categoryApi, mediaApi } from '../../../lib/api';
import { shippingConfigApi } from '../../../lib/shippingApi';
import { useLocationStore } from '../../../shared/stores/locationStore';

const HomePage = () => {
  const navigate = useNavigate();
  const { location, setPromptOpen, setPickerOpen } = useLocationStore();
  
  useEffect(() => {
    // Automatically attempt to trigger location prompt if not set
    if (!location) {
      setTimeout(() => setPromptOpen(true), 1500);
    }
  }, [location, setPromptOpen]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState('Essential'); // 'Essential' or 'Heritage'
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  
  // LOGISTICS STATE
  const [isExpress, setIsExpress] = useState(() => localStorage.getItem('is_express') === 'true');
  const [expressCharge, setExpressCharge] = useState(0);
  const [normalLogisticsFee, setNormalLogisticsFee] = useState(0);

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

  const [selectedPickup, setSelectedPickup] = useState(() => localStorage.getItem('pickup_date') || '');
  const [pickupTime, setPickupTime] = useState(() => localStorage.getItem('pickup_time') || '');
  const [selectedDelivery, setSelectedDelivery] = useState(() => localStorage.getItem('delivery_date') || '');
  const [deliveryTime, setDeliveryTime] = useState(() => localStorage.getItem('delivery_time') || '');
  
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [activeSlotType, setActiveSlotType] = useState('pickup');

  // Address sequential logic
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [pickupAddress, setPickupAddress] = useState(() => {
    const saved = localStorage.getItem('pickup_address');
    return saved ? JSON.parse(saved) : null;
  });
  const [dropAddress, setDropAddress] = useState(() => {
    const saved = localStorage.getItem('drop_address');
    return saved ? JSON.parse(saved) : null;
  });
  const [isSameAsPickup, setIsSameAsPickup] = useState(true);
  
  // NEW: ORDER INSTRUCTIONS & PHOTOS
  const [orderNotes, setOrderNotes] = useState(() => localStorage.getItem('order_notes') || '');
  const [orderPhotos, setOrderPhotos] = useState(() => {
    const saved = localStorage.getItem('order_photos');
    return saved ? JSON.parse(saved) : [];
  });
  const [uploading, setUploading] = useState(false);

  const isSlotsPicked = selectedPickup && pickupTime && selectedDelivery && deliveryTime;

  const timeSlots = useMemo(() => [
    '08:00 AM - 10:00 AM', '10:00 AM - 12:00 PM', '12:00 PM - 02:00 PM',
    '02:00 PM - 04:00 PM', '04:00 PM - 06:00 PM', '06:00 PM - 08:00 PM'
  ], []);

  // PERSIST LOGISTICS
  useEffect(() => {
    localStorage.setItem('is_express', isExpress);
    localStorage.setItem('pickup_date', selectedPickup);
    localStorage.setItem('pickup_time', pickupTime);
    localStorage.setItem('delivery_date', selectedDelivery);
    localStorage.setItem('delivery_time', deliveryTime);
    if (pickupAddress) localStorage.setItem('pickup_address', JSON.stringify(pickupAddress));
    if (dropAddress) localStorage.setItem('drop_address', JSON.stringify(dropAddress));
    localStorage.setItem('order_notes', orderNotes);
    localStorage.setItem('order_photos', JSON.stringify(orderPhotos));
  }, [isExpress, selectedPickup, pickupTime, selectedDelivery, deliveryTime, pickupAddress, dropAddress, orderNotes, orderPhotos]);

  const [selectedQuantities, setSelectedQuantities] = useState(() => {
    const saved = localStorage.getItem('cart_quantities');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('cart_quantities', JSON.stringify(selectedQuantities));
  }, [selectedQuantities]);

  const fetchConfig = async () => {
    try {
      const configs = await shippingConfigApi.getConfig();
      const surcharge = configs.find(c => c.key === 'express_surcharge');
      if (surcharge) setExpressCharge(Number(surcharge.value));
      const normalFee = configs.find(c => c.key === 'normal_logistics_fee');
      if (normalFee) setNormalLogisticsFee(Number(normalFee.value));

      // Fetch User Addresses
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = userData._id || userData.id;
      if (userId) {
        const profile = await authApi.getProfile(userId);
        if (profile.address) {
          // Assume profile address is "HOME" by default or try to parse
          const addrList = [
            { id: 'profile_home', type: 'HOME', address: profile.address, location: profile.location || null }
          ];
          setSavedAddresses(addrList);
          if (!pickupAddress) setPickupAddress(addrList[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching delivery config/profile:', err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const customerType = (userData.customerType || localStorage.getItem('userType') || 'individual').toLowerCase();
      let data = [];
      
      try {
        const [masterRes, customRes] = await Promise.all([
          masterServiceApi.getAll(),
          serviceApi.getAll({ approvedOnly: true })
        ]);
        
        data = [
          ...(Array.isArray(masterRes) ? masterRes.map(s => ({ ...s, isMaster: true })) : []),
          ...(Array.isArray(customRes) ? customRes.map(s => ({ ...s, isMaster: false })) : [])
        ];
      } catch (err) {
        console.error('Fetch error:', err);
      }

      const filtered = data.filter(s => {
        const isActive = s.status === 'Active' || s.isActive === true;
        const isApproved = s.isMaster || s.approvalStatus === 'Approved';
        const target = (s.targetAudience || 'both').toLowerCase();
        const isMatch = target === 'both' || target === customerType || (customerType === 'retail' && target === 'individual');
        return isActive && isApproved && isMatch;
      });
      setServices(filtered);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const data = await categoryApi.getMain();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleCategoryClick = async (category) => {
    if (selectedCategory?._id === category._id) {
      setSelectedCategory(null);
      setSelectedSubCategory(null);
      setSubCategories([]);
    } else {
      setSelectedCategory(category);
      setSelectedSubCategory(null);
      try {
        const subData = await categoryApi.getSub(category._id);
        setSubCategories(subData);
      } catch (error) {
        console.error('Error fetching sub-categories:', error);
      }
    }
  };

  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, []);

  const filteredServices = useMemo(() => {
    return services.filter(s => {
      // Tier filter
      if ((s.tier || 'Essential') !== selectedTier) return false;
      
      // Search filter
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      // Category filter
      if (selectedCategory) {
        const sCatId = s.category?._id || s.category;
        if (sCatId !== selectedCategory._id) return false;
      }
      
      // Sub-category filter
      if (selectedSubCategory) {
        const sSubCatId = s.subCategory?._id || s.subCategory;
        if (sSubCatId !== selectedSubCategory._id) return false;
      }
      
      return true;
    });
  }, [services, selectedTier, searchQuery, selectedCategory, selectedSubCategory]);

  const updateQuantity = (id, delta) => {
    setSelectedQuantities(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const cartItemsCount = useMemo(() => Object.values(selectedQuantities).reduce((acc, q) => acc + q, 0), [selectedQuantities]);
  const cartTotal = useMemo(() => Object.entries(selectedQuantities).reduce((acc, [id, q]) => {
    const service = services.find(s => (s._id || s.id) === id);
    const price = service?.totalPrice || service?.basePrice || 0;
    return acc + price * q; 
  }, 0), [selectedQuantities, services]);
  
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    setUploading(true);
    try {
        const uploaded = [];
        for (const file of files) {
            const formData = new FormData();
            formData.append('media', file);
            const res = await mediaApi.upload(formData);
            if (res.url) uploaded.push(res.url);
        }
        setOrderPhotos(prev => [...prev, ...uploaded]);
    } catch (error) {
        console.error('Upload Error:', error);
        alert('Photo upload failed');
    } finally {
        setUploading(false);
    }
  };

  const removePhoto = (index) => {
    setOrderPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const [isCartDismissed, setIsCartDismissed] = useState(false);

  useEffect(() => {
    if (cartItemsCount > 0) {
      setIsCartDismissed(false);
    }
  }, [cartItemsCount]);

  const handleServiceClick = (serviceId, service, i) => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/user/auth'); return; }
    navigate('/user/service-info', { 
      state: { 
        selectedService: { 
          id: serviceId, title: service.name, desc: service.description, image: service.image, 
          color: isHeritage ? 'heritage' : (i % 3 === 0 ? 'primary' : i % 3 === 1 ? 'secondary' : 'tertiary'), 
          price: `₹${service.totalPrice}.00` 
        } 
      } 
    });
  };

  const handleCartClick = () => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/user/auth'); return; }
    navigate('/user/cart');
  };

  const isHeritage = selectedTier === 'Heritage';
  const themeGradient = useMemo(() => isHeritage ? 'bg-gradient-to-br from-[#D4AF37] to-[#996515]' : 'bg-primary-gradient', [isHeritage]);

  const banners = useMemo(() => [
    { id: 1, title: isHeritage ? <>Exquisite<br/>Garment Care</> : <>30% Off Your<br/>First Order</>, sub: isHeritage ? 'Heritage Tier' : 'Limited Era', bg: isHeritage ? 'bg-gradient-to-br from-[#D4AF37] to-[#996515]' : 'bg-primary-gradient' },
    { id: 2, title: <>Experience<br/>Heritage Care</>, sub: 'Premium Tier', bg: 'bg-gradient-to-br from-[#D4AF37] to-[#996515]' }
  ], [isHeritage]);

  const [currentBanner, setCurrentBanner] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <div className="bg-background text-on-surface min-h-[100dvh] flex flex-col">
      <main className="flex-1 pt-24 pb-36 px-6 max-w-5xl mx-auto w-full overflow-y-auto hide-scrollbar">
        
        {/* 1. TOP PROMO BANNER */}
        <section className="mb-8 w-full relative">
          <div className="overflow-hidden rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-100">
            <AnimatePresence mode="wait">
              <motion.div 
                key={banners[currentBanner].id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className={`${banners[currentBanner].bg} p-10 relative overflow-hidden flex flex-col justify-end min-h-[220px]`}
              >
                <div className="relative z-10">
                  <span className="text-white/80 text-[10px] font-black uppercase tracking-[0.3em] mb-3 block">{banners[currentBanner].sub}</span>
                  <h2 className="text-4xl font-black text-white mb-6 leading-tight tracking-tighter">{banners[currentBanner].title}</h2>
                  <div className="flex gap-2">
                    {banners.map((_, i) => (
                      <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentBanner ? 'w-8 bg-white' : 'w-1.5 bg-white/40'}`} />
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* 2. Tier Toggle & Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="bg-slate-50 p-1.5 rounded-[2rem] border border-slate-100 flex gap-1 shadow-sm shrink-0 w-full md:w-auto">
            {['Essential', 'Heritage'].map(tier => (
              <button key={tier} onClick={() => setSelectedTier(tier)} className={`flex-1 px-6 md:px-8 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${selectedTier === tier ? (tier === 'Heritage' ? 'bg-[#996515]' : 'bg-black') + ' text-white shadow-xl' : 'text-slate-400'}`}>{tier}</button>
            ))}
          </div>
          <div className={`relative flex-1 flex items-center bg-white rounded-[2rem] px-6 py-4 shadow-sm border ${isHeritage ? 'border-[#D4AF37]/30' : 'border-slate-100'} transition-all`}>
            <span className={`material-symbols-outlined ${isHeritage ? 'text-[#996515]' : 'text-slate-400'} mr-4`}>search</span>
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-none focus:ring-0 outline-none p-0 text-sm w-full placeholder:text-slate-300 font-bold" placeholder={isHeritage ? "Search premium care..." : "Search services..."} />
          </div>
        </div>

        {/* Categories Section */}
        <section className="mb-10 w-full overflow-hidden">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Select Category</h3>
            {selectedCategory && (
              <button 
                onClick={() => { setSelectedCategory(null); setSelectedSubCategory(null); setSubCategories([]); }}
                className="text-[9px] font-black text-primary uppercase tracking-widest"
              >
                Clear All
              </button>
            )}
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
            {categoriesLoading ? (
              [...Array(4)].map((_, i) => <div key={i} className="min-w-[80px] h-24 bg-white rounded-3xl animate-pulse border border-black/5" />)
            ) : (
              categories.map(cat => (
                <button 
                  key={cat._id}
                  onClick={() => handleCategoryClick(cat)}
                  className={`flex flex-col items-center gap-3 min-w-[110px] max-w-[110px] p-4 rounded-[2rem] border transition-all ${selectedCategory?._id === cat._id ? 'bg-black text-white border-black shadow-xl shadow-black/10' : 'bg-white text-slate-400 border-black/5 hover:border-black/20'}`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden ${selectedCategory?._id === cat._id ? 'bg-white/20' : 'bg-slate-50'}`}>
                    {cat.image ? (
                      <img src={cat.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-xl">category</span>
                    )}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest leading-tight text-center">{cat.name}</span>
                </button>
              ))
            )}
          </div>

          {/* Sub Categories */}
          <AnimatePresence>
            {subCategories.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 flex gap-2 overflow-x-auto pb-4 hide-scrollbar px-1"
              >
                {subCategories.map(sub => (
                  <button
                    key={sub._id}
                    onClick={() => setSelectedSubCategory(selectedSubCategory?._id === sub._id ? null : sub)}
                    className={`px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${selectedSubCategory?._id === sub._id ? 'bg-primary text-white border-primary' : 'bg-slate-100 text-slate-400 border-transparent hover:bg-slate-200'}`}
                  >
                    {sub.name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* 3. Service Selection Grid */}
        <section className="mb-10 w-full">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {loading ? (
                [...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-[2rem] p-5 h-48 border border-black/5 animate-pulse" />)
            ) : (
                filteredServices.map((service, i) => {
                    const serviceId = service._id || service.id;
                    const qty = selectedQuantities[serviceId] || 0;
                    const isSelected = qty > 0;
                    return (
                        <motion.div key={serviceId} className={`bg-white rounded-[2.2rem] p-5 flex flex-col items-center text-center gap-4 border ${isSelected ? (isHeritage ? 'border-[#996515] ring-2 ring-[#996515]/10' : 'border-black ring-2 ring-black/10') : 'border-black/5'} shadow-sm group relative overflow-hidden transition-all`}>
                          <div onClick={() => handleServiceClick(serviceId, service, i)} className={`w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-on-surface cursor-pointer group-hover:bg-black group-hover:text-white transition-all overflow-hidden`}>
                              {service.image ? <img src={service.image} alt={service.name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-2xl">local_laundry_service</span>}
                          </div>
                          <div><h4 className="font-black text-[13px] leading-tight mb-1 text-slate-900 truncate w-32">{service.name}</h4><p className="text-[10px] font-black text-slate-900 mt-1">₹{service.totalPrice || service.basePrice || 0}</p></div>
                          <div className="flex items-center justify-between bg-slate-50 p-1 rounded-2xl border border-slate-100 w-full">
                              <button onClick={() => updateQuantity(serviceId, -1)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white shadow-sm text-slate-400 hover:text-black transition-all active:scale-90"><span className="material-symbols-outlined text-sm font-black">remove</span></button>
                              <span className="text-[11px] font-black text-slate-900 px-2">{qty}</span>
                              <button onClick={() => updateQuantity(serviceId, 1)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white shadow-sm text-slate-400 hover:text-black transition-all active:scale-90"><span className="material-symbols-outlined text-sm font-black">add</span></button>
                          </div>
                        </motion.div>
                    );
                })
            )}
          </div>
        </section>

        {/* 4. LOGISTICS SETUP CARD */}
        {cartItemsCount > 0 && (
          <section className="mb-8 space-y-4">
            <div className="bg-white rounded-[3rem] p-8 md:p-10 border border-slate-100 shadow-2xl shadow-slate-200/40 relative overflow-hidden">
              <div className="absolute right-0 top-0 p-10 opacity-5">
                <span className="material-symbols-outlined text-8xl">logistics</span>
              </div>
              
              <div className="flex flex-col gap-10">
                {/* 4.1 Delivery Priority */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">1. Select Priority</p>
                  <div className="flex gap-2 p-1.5 bg-slate-50 rounded-[2rem] border border-slate-100 max-w-md">
                    <button onClick={() => setIsExpress(false)} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!isExpress ? 'bg-black text-white shadow-xl' : 'text-slate-400'}`}>Normal (₹{normalLogisticsFee})</button>
                    <button onClick={() => setIsExpress(true)} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isExpress ? 'bg-amber-500 text-white shadow-xl' : 'text-slate-400'}`}>Express ⚡ (₹{expressCharge})</button>
                  </div>
                </div>

                {/* 4.2 Scheduling Slots */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">2. Scheduling Slots</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={() => { setActiveSlotType('pickup'); setShowSlotPicker(true); }} className={`p-6 rounded-[2.5rem] border-2 text-left transition-all ${selectedPickup ? 'bg-slate-900 text-white border-transparent' : 'bg-slate-50 border-slate-100 hover:border-black'}`}>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${selectedPickup ? 'text-white/40' : 'text-slate-400'}`}>Pickup Slot</p>
                      </div>
                      <p className="text-sm font-black truncate">{selectedPickup ? `${selectedPickup} @ ${pickupTime}` : 'Select Date & Time'}</p>
                    </button>
                    <button onClick={() => { setActiveSlotType('delivery'); setShowSlotPicker(true); }} className={`p-6 rounded-[2.5rem] border-2 text-left transition-all ${selectedDelivery ? 'bg-slate-900 text-white border-transparent' : 'bg-slate-50 border-slate-100 hover:border-black'}`}>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="material-symbols-outlined text-sm">local_shipping</span>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${selectedDelivery ? 'text-white/40' : 'text-slate-400'}`}>Delivery Slot</p>
                      </div>
                      <p className="text-sm font-black truncate">{selectedDelivery ? `${selectedDelivery} @ ${deliveryTime}` : 'Select Date & Time'}</p>
                    </button>
                  </div>
                </div>

                {/* 4.3 Sequential Address Flow - NEW */}
                <AnimatePresence>
                  {isSlotsPicked && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pt-6 border-t border-slate-100">
                      {/* Pickup Address */}
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">3. Pickup Address</p>
                        <div className="flex flex-wrap gap-3">
                          {savedAddresses.map(addr => (
                            <button 
                              key={addr.id} 
                              onClick={() => { setPickupAddress(addr); if(isSameAsPickup) setDropAddress(addr); }}
                              className={`px-8 py-5 rounded-[2rem] border-2 transition-all flex items-center gap-3 ${pickupAddress?.id === addr.id ? 'border-black bg-black text-white' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-300'}`}
                            >
                              <span className="material-symbols-outlined text-sm">{addr.type === 'HOME' ? 'home' : 'work'}</span>
                              <span className="text-[10px] font-black uppercase tracking-widest">{addr.type}</span>
                            </button>
                          ))}
                          <button onClick={() => { setActiveSlotType('address_pickup'); navigate('/user/cart'); /* Trigger address modal logic there or here */ }} className="px-8 py-5 rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400 hover:border-black hover:text-black transition-all flex items-center gap-3">
                            <span className="material-symbols-outlined text-sm">add_location</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Add New</span>
                          </button>
                        </div>
                        {pickupAddress && (
                          <p className="text-[11px] font-bold text-slate-400 italic px-4">Selected: {pickupAddress.address}</p>
                        )}
                      </div>

                      {/* Dropoff Address Toggle */}
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">4. Drop-off Address</p>
                        <div className="flex items-center gap-4 mb-4">
                          <button 
                            onClick={() => { setIsSameAsPickup(true); setDropAddress(pickupAddress); }}
                            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isSameAsPickup ? 'bg-emerald-500 text-white shadow-xl' : 'bg-slate-50 text-slate-400'}`}
                          >
                            Same as Pickup
                          </button>
                          <button 
                            onClick={() => setIsSameAsPickup(false)}
                            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!isSameAsPickup ? 'bg-black text-white shadow-xl' : 'bg-slate-50 text-slate-400'}`}
                          >
                            Select Different
                          </button>
                        </div>

                        {!isSameAsPickup && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                            <div className="flex flex-wrap gap-3">
                              {savedAddresses.map(addr => (
                                <button 
                                  key={addr.id} 
                                  onClick={() => setDropAddress(addr)}
                                  className={`px-8 py-5 rounded-[2rem] border-2 transition-all flex items-center gap-3 ${dropAddress?.id === addr.id ? 'border-black bg-black text-white' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
                                >
                                  <span className="material-symbols-outlined text-sm">{addr.type === 'HOME' ? 'home' : 'work'}</span>
                                  <span className="text-[10px] font-black uppercase tracking-widest">{addr.type}</span>
                                </button>
                              ))}
                            </div>
                            {dropAddress && <p className="text-[11px] font-bold text-slate-400 italic px-4">Selected Drop: {dropAddress.address}</p>}
                          </motion.div>
                        )}
                      </div>

                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">5. Order Instructions</p>
                          <textarea 
                            value={orderNotes}
                            onChange={(e) => setOrderNotes(e.target.value)}
                            placeholder="Example: Be careful with the buttons, special stain on collar..."
                            className="w-full bg-slate-50 border border-slate-100 p-5 rounded-[2rem] focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold text-slate-800 text-xs min-h-[100px] resize-none"
                          />
                        </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>
        )}

        {/* 5. FLOATING CART BAR */}
        <AnimatePresence>
          {cartItemsCount > 0 && !isCartDismissed && (
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-28 left-6 right-6 z-[100] max-w-lg mx-auto">
              <motion.button whileTap={{ scale: 0.98 }} onClick={handleCartClick} className={`${themeGradient} w-full h-[68px] rounded-[2rem] p-1 flex items-center justify-between shadow-2xl relative overflow-hidden`}>
                <div className="flex items-center gap-4 pl-6 relative z-10"><div className="flex flex-col items-start leading-none"><span className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-1">Final Total</span><h3 className="text-white font-black text-xl tracking-tight">₹{cartTotal.toLocaleString()}</h3></div><div className="h-8 w-px bg-white/20"></div><span className="text-white/80 font-black text-[9px] uppercase tracking-widest bg-black/10 px-3 py-1.5 rounded-full">{cartItemsCount} Items</span></div>
                <div className="flex items-center gap-2 pr-6 relative z-10"><span className="text-white font-black text-[10px] uppercase tracking-widest">Verify & Pay</span><div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white"><span className="material-symbols-outlined text-xl">arrow_forward</span></div></div>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 6. SLOT PICKER MODAL */}
        <AnimatePresence>
          {showSlotPicker && (
            <div className="fixed inset-0 z-[200] flex items-end justify-center p-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSlotPicker(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-lg bg-white rounded-t-[3rem] p-8 shadow-2xl flex flex-col gap-6 overflow-y-auto max-h-[85vh] hide-scrollbar">
                <div className="flex justify-between items-center"><h3 className="text-2xl font-black tracking-tighter uppercase leading-none">SELECT <br/>{activeSlotType} SLOT.</h3><button onClick={() => setShowSlotPicker(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><span className="material-symbols-outlined">close</span></button></div>
                <div className="space-y-6">
                  <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Select Date</p>
                    <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
                      {availableDates.map((d, i) => (
                        <button key={i} onClick={() => activeSlotType === 'pickup' ? setSelectedPickup(`${d.day}, ${d.date}`) : setSelectedDelivery(`${d.day}, ${d.date}`)} className={`min-w-[90px] p-4 rounded-[1.5rem] border transition-all flex flex-col items-center gap-1 ${((activeSlotType === 'pickup' ? selectedPickup : selectedDelivery).includes(d.date)) ? 'bg-black text-white border-black' : 'bg-slate-50 text-slate-400 border-slate-100'}`}><span className="text-[9px] font-black uppercase tracking-widest opacity-60">{d.day}</span><span className="text-sm font-black tracking-tighter">{d.date}</span></button>
                      ))}
                    </div>
                  </div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Select Time</p>
                    <div className="grid grid-cols-2 gap-2">
                      {timeSlots.map((slot) => (
                        <button key={slot} onClick={() => activeSlotType === 'pickup' ? setPickupTime(slot) : setDeliveryTime(slot)} className={`py-4 rounded-2xl border text-[10px] font-black uppercase tracking-tight transition-all ${((activeSlotType === 'pickup' ? pickupTime : deliveryTime) === slot) ? 'bg-black text-white border-black shadow-lg shadow-black/20' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{slot}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowSlotPicker(false)} className="w-full bg-black text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] mt-4">CONFIRM SELECTION</button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default HomePage;
