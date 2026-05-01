import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { serviceApi, masterServiceApi, authApi, categoryApi, mediaApi, geofenceApi } from '../../../lib/api';
import { shippingConfigApi } from '../../../lib/shippingApi';
import { useLocationStore } from '../../../shared/stores/locationStore';

const HomePage = () => {
  console.log('HomePage Rendering');
  const navigate = useNavigate();
  const { location, setPromptOpen, setPickerOpen, pricingFactor, zone, setZoneData } = useLocationStore();
  
  useEffect(() => {
    // Automatically attempt to trigger location prompt if not set
    if (!location) {
      setTimeout(() => setPromptOpen(true), 1500);
    } else {
      // Silent re-check geofence to get latest pricing factors
      const recheckZone = async () => {
        try {
          const zoneInfo = await geofenceApi.checkAvailability(location.lat, location.lng);
          if (zoneInfo.available) {
            setZoneData({ name: zoneInfo.name, pricingFactor: zoneInfo.pricingFactor });
          } else {
            setZoneData({ name: null, pricingFactor: 1 });
          }
        } catch (err) {
          console.error('Silent zone check failed:', err);
        }
      };
      recheckZone();
    }
  }, [location, setPromptOpen, setZoneData]);

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

  const timeSlots = useMemo(() => [
    '07:00 AM - 09:00 AM', '09:00 AM - 11:00 AM', '11:00 AM - 01:00 PM',
    '01:00 PM - 03:00 PM', '03:00 PM - 05:00 PM', '05:00 PM - 07:00 PM',
    '07:00 PM - 09:00 PM', '08:00 PM - 10:00 PM'
  ], []);

  // Helper to get JS Date from slot string
  const getSlotDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    const [dayPart, datePart] = dateStr.split(', ');
    const [timePart] = timeStr.split(' - ');
    const d = new Date(datePart + ' ' + new Date().getFullYear());
    
    let [time, modifier] = timePart.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
    
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return d;
  };

  const [selectedPickup, setSelectedPickup] = useState(() => {
    const saved = localStorage.getItem('pickup_date');
    if (saved) return saved;
    const today = availableDates[0];
    return `${today.day}, ${today.date}`;
  });

  const [pickupTime, setPickupTime] = useState(() => {
    const saved = localStorage.getItem('pickup_time');
    if (saved) return saved;
    return timeSlots[0];
  });

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
  const [isLocating, setIsLocating] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);

  const isSlotsPicked = selectedPickup && pickupTime && selectedDelivery && deliveryTime;

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
        let addrList = [];
        
        // 1. Root profile address
        if (profile.address) {
          addrList.push({ id: 'profile_root', type: 'Profile', address: profile.address, location: profile.location || null });
        }
        
        // 2. Specialized addresses array
        if (profile.addresses && profile.addresses.length > 0) {
          profile.addresses.forEach((a, idx) => {
            addrList.push({ id: a._id || idx, type: a.type.toUpperCase(), address: a.address, location: a.location });
          });
        }

        setSavedAddresses(addrList);
        if (!pickupAddress && addrList.length > 0) setPickupAddress(addrList[0]);
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
    let result = services.filter(s => {
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

    // If no category/search is active, limit to 10
    if (!selectedCategory && !selectedSubCategory && !searchQuery) {
        return result.slice(0, 10);
    }

    return result;
  }, [services, selectedTier, searchQuery, selectedCategory, selectedSubCategory]);

  const updateQuantity = (id, delta) => {
    setSelectedQuantities(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      
      // If adding, try to preserve vendor context
      if (delta > 0) {
        const service = services.find(s => (s._id || s.id) === id);
        if (service?.vendorId) {
          localStorage.setItem('last_visited_vendor_id', service.vendorId);
        }
      }

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
    const actualPrice = service?.discountedPrice || service?.totalPrice || service?.basePrice || 0;
    const price = actualPrice * pricingFactor;
    return acc + price * q; 
  }, 0), [selectedQuantities, services, pricingFactor]);
  
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
          id: serviceId, 
          _id: serviceId,
          name: service.name,
          title: service.name, 
          desc: service.description, 
          image: service.image, 
          vendorId: service.vendorId,
          vendor: service.vendor,
          color: isHeritage ? 'heritage' : (i % 3 === 0 ? 'primary' : i % 3 === 1 ? 'secondary' : 'tertiary'), 
          price: `₹${service.totalPrice}.00`,
          totalPrice: service.totalPrice,
          basePrice: service.basePrice
        } 
      } 
    });

    // Save vendor context for promotions
    if (service.vendorId) {
      localStorage.setItem('last_visited_vendor_id', service.vendorId);
    }
  };

  const [addressLabel, setAddressLabel] = useState('Home'); // Home, Office, Other
  const [isSaving, setIsSaving] = useState(false);

  const saveNewAddress = async () => {
    if (!customAddress) return alert('Please enter address first');
    
    setIsSaving(true);
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = userData._id || userData.id;
      if (!userId) return alert('Please login to save address');

      const profile = await authApi.getProfile(userId);
      const existingAddresses = profile.addresses || [];
      
      const newAddressObj = {
        type: addressLabel,
        address: customAddress,
        location: pickupAddress?.location || null
      };

      const updatedAddresses = [...existingAddresses, newAddressObj];
      
      await authApi.updateProfile(userId, { addresses: updatedAddresses });
      
      // Refresh local list
      const newSaved = [
        ...savedAddresses,
        { id: Date.now(), type: addressLabel.toUpperCase(), address: customAddress, location: newAddressObj.location }
      ];
      setSavedAddresses(newSaved);
      setShowAddressForm(false);
      alert('Address saved successfully!');
    } catch (error) {
      console.error('Save Address Error:', error);
      alert('Failed to save address');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLiveLocation = () => {
    // If location is already set in header (useLocationStore), use it first
    if (location) {
      const addrString = location.fullAddress || 
                        (location.area ? `${location.area}, ${location.city}` : null) || 
                        (typeof location === 'string' ? location : 'Detected Location');
                        
      const liveAddr = { 
        id: 'header_location', 
        type: 'LIVE', 
        address: addrString, 
        location: { lat: location.lat, lng: location.lng } 
      };
      setPickupAddress(liveAddr);
      setCustomAddress(liveAddr.address);
      if (isSameAsPickup) setDropAddress(liveAddr);
      setShowAddressForm(true);
      return;
    }

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Use Google Maps Geocoding API if available, else just coordinates
          const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
          if (apiKey) {
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`);
            const data = await response.json();
            if (data.results && data.results[0]) {
              const addr = data.results[0].formatted_address;
              setCustomAddress(addr);
              const liveAddr = { id: 'live', type: 'LIVE', address: addr, location: { lat: latitude, lng: longitude } };
              setPickupAddress(liveAddr);
              if (isSameAsPickup) setDropAddress(liveAddr);
              setShowAddressForm(true);
            }
          } else {
            const addr = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
            setCustomAddress(addr);
            const liveAddr = { id: 'live', type: 'LIVE', address: addr, location: { lat: latitude, lng: longitude } };
            setPickupAddress(liveAddr);
            if (isSameAsPickup) setDropAddress(liveAddr);
            setShowAddressForm(true);
          }
        } catch (error) {
          console.error('Error geocoding:', error);
          alert('Could not get address from location');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Location access denied');
        setIsLocating(false);
      }
    );
  };

  const handleCustomAddressChange = (val) => {
    setCustomAddress(val);
    const newAddr = { id: 'custom', type: 'MANUAL', address: val, location: null };
    setPickupAddress(newAddr);
    if (isSameAsPickup) setDropAddress(newAddr);
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
    <div className="text-on-surface min-h-[100dvh] flex flex-col">
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
          <div className="bg-slate-100 p-1.5 rounded-[2rem] border border-slate-200 flex gap-1 shadow-sm shrink-0 w-full md:w-auto">
            {['Essential', 'Heritage'].map(tier => (
              <button key={tier} onClick={() => setSelectedTier(tier)} className={`flex-1 px-6 md:px-8 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${selectedTier === tier ? (tier === 'Heritage' ? 'bg-[#996515]' : 'bg-black') + ' text-white shadow-xl' : 'text-slate-500 hover:text-black'}`}>{tier}</button>
            ))}
          </div>
          <div className={`relative flex-1 flex items-center bg-white rounded-[2rem] px-6 py-4 shadow-sm border ${isHeritage ? 'border-[#D4AF37]/30' : 'border-slate-200'} transition-all`}>
            <span className={`material-symbols-outlined ${isHeritage ? 'text-[#996515]' : 'text-slate-400'} mr-4`}>search</span>
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-none focus:ring-0 outline-none p-0 text-sm w-full placeholder:text-slate-300 font-bold" placeholder={isHeritage ? "Search premium care..." : "Search services..."} />
          </div>
        </div>

        {/* Categories Section */}
        <section className="mb-12 w-full overflow-hidden">
          <div className="flex items-center justify-between mb-6 px-2">
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em]">Select Category</h3>
            {selectedCategory && (
              <motion.button 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => { setSelectedCategory(null); setSelectedSubCategory(null); setSubCategories([]); }}
                className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100"
              >
                Reset
              </motion.button>
            )}
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-6 hide-scrollbar px-1">
            {categoriesLoading ? (
              [...Array(4)].map((_, i) => <div key={i} className="min-w-[115px] h-32 bg-white rounded-[2.5rem] animate-pulse border border-slate-200" />)
            ) : (
              categories.map(cat => (
                <motion.button 
                  key={cat._id}
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleCategoryClick(cat)}
                  className={`flex flex-col items-center gap-4 min-w-[115px] max-w-[115px] p-5 rounded-[2.5rem] border-2 transition-all duration-300 ${
                    selectedCategory?._id === cat._id 
                      ? 'bg-slate-950 text-white border-slate-950 shadow-[0_20px_40px_rgba(0,0,0,0.3)] ring-4 ring-slate-950/10' 
                      : 'bg-white text-slate-900 border-slate-200 hover:border-slate-400 shadow-[0_8px_20px_rgba(0,0,0,0.06)]'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-inner transition-colors ${
                    selectedCategory?._id === cat._id ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-slate-200'
                  }`}>
                    {cat.image ? (
                      <img src={cat.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className={`material-symbols-outlined text-2xl ${selectedCategory?._id === cat._id ? 'text-white' : 'text-slate-600'}`}>category</span>
                    )}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest leading-none text-center ${selectedCategory?._id === cat._id ? 'text-white' : 'text-slate-900'}`}>
                    {cat.name}
                  </span>
                </motion.button>
              ))
            )}
          </div>

          {/* Sub Categories */}
          <AnimatePresence>
            {subCategories.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-8 flex gap-3 overflow-x-auto pb-6 hide-scrollbar px-1"
              >
                {subCategories.map(sub => (
                  <motion.button
                    key={sub._id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedSubCategory(selectedSubCategory?._id === sub._id ? null : sub)}
                    className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 shadow-sm ${
                      selectedSubCategory?._id === sub._id 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20' 
                        : 'bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {sub.name}
                  </motion.button>
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
                        <motion.div key={serviceId} className={`bg-white rounded-[2.5rem] p-6 flex flex-col items-center text-center gap-5 border-2 ${isSelected ? (isHeritage ? 'border-[#996515] bg-[#996515]/5 shadow-xl shadow-[#996515]/10' : 'border-black bg-slate-50 shadow-xl shadow-black/5') : 'border-slate-100'} group relative overflow-hidden transition-all hover:border-slate-300`}>
                          <div onClick={() => handleServiceClick(serviceId, service, i)} className={`w-16 h-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-on-surface cursor-pointer group-hover:scale-110 transition-all duration-500 overflow-hidden shadow-inner`}>
                              {service.image ? <img src={service.image} alt={service.name} className="w-full h-full object-cover" /> : <span className={`material-symbols-outlined text-3xl ${isHeritage ? 'text-[#996515]' : 'text-slate-400'}`}>local_laundry_service</span>}
                          </div>
                          
                          <div className="flex-1">
                            <h4 className="font-black text-[14px] leading-tight mb-2 text-slate-900 line-clamp-2 px-2 uppercase tracking-tight">{service.name || service.itemName}</h4>
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-2">
                                {(service.basePrice || 0) > (service.discountedPrice || 0) && (
                                  <span className="text-[10px] font-bold text-slate-400 line-through">
                                    ₹{Math.round((service.basePrice || 0) * (pricingFactor || 1))}
                                  </span>
                                )}
                                <span className={`text-[15px] font-black ${isHeritage ? 'text-[#996515]' : 'text-slate-900'}`}>
                                  ₹{Math.round((service.discountedPrice || service.basePrice || 0) * (pricingFactor || 1))}
                                </span>
                              </div>
                              {pricingFactor > 1 && (
                                <div className="flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                                  <p className="text-[8px] font-black text-amber-600 uppercase tracking-tighter">
                                    Area Surge {Math.round((pricingFactor - 1) * 100)}%
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between bg-white p-1 rounded-2xl border border-slate-100 w-full shadow-sm">
                              <button onClick={() => updateQuantity(serviceId, -1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-black hover:bg-slate-100 transition-all active:scale-90"><span className="material-symbols-outlined text-base font-black">remove</span></button>
                              <span className="text-[13px] font-black text-slate-900 px-3">{qty}</span>
                              <button onClick={() => updateQuantity(serviceId, 1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-black hover:bg-slate-100 transition-all active:scale-90"><span className="material-symbols-outlined text-base font-black">add</span></button>
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
                      <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">3. Pickup Address</p>
                          <button 
                            onClick={handleLiveLocation}
                            disabled={isLocating}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isLocating ? 'bg-slate-100 text-slate-400' : 'bg-primary-gradient text-white shadow-lg'}`}
                          >
                            <span className="material-symbols-outlined text-xs">{isLocating ? 'sync' : 'my_location'}</span>
                            {isLocating ? 'Locating...' : 'Live Location'}
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {/* Filter to only show HOME and OFFICE as per request */}
                          {savedAddresses.filter(a => ['HOME', 'OFFICE'].includes(a.type)).map(addr => (
                            <button 
                              key={addr.id} 
                              onClick={() => { setPickupAddress(addr); if(isSameAsPickup) setDropAddress(addr); }}
                              className={`px-8 py-5 rounded-[2rem] border-2 transition-all flex items-center gap-3 ${pickupAddress?.address === addr.address ? 'border-black bg-black text-white shadow-xl' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-300'}`}
                            >
                              <span className="material-symbols-outlined text-sm">
                                {addr.type === 'HOME' ? 'home' : 'business'}
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-widest">{addr.type}</span>
                            </button>
                          ))}
                          
                          {savedAddresses.filter(a => ['HOME', 'OFFICE'].includes(a.type)).length === 0 && (
                            <button 
                              onClick={() => navigate('/user/more')}
                              className="px-6 py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-sm">add_circle</span>
                              <span className="text-[9px] font-black uppercase tracking-widest">Add Home/Office in 'More'</span>
                            </button>
                          )}
                        </div>

                        {pickupAddress && (
                          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-start gap-3 mx-2">
                             <span className="material-symbols-outlined text-emerald-500 text-sm mt-0.5">verified</span>
                             <p className="text-[11px] font-bold text-emerald-800 leading-relaxed">{pickupAddress.address}</p>
                          </div>
                        )}
                      </div>

                      {/* Dropoff Address Toggle */}
                      <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">4. Drop-off Address</p>
                          {!isSameAsPickup && (
                            <button 
                              onClick={handleLiveLocation}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-primary-gradient text-white shadow-lg transition-all"
                            >
                              <span className="material-symbols-outlined text-xs">my_location</span>
                              Live Location
                            </button>
                          )}
                        </div>

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
                              {savedAddresses.filter(a => ['HOME', 'OFFICE'].includes(a.type)).map(addr => (
                                <button 
                                  key={addr.id} 
                                  onClick={() => setDropAddress(addr)}
                                  className={`px-8 py-5 rounded-[2rem] border-2 transition-all flex items-center gap-3 ${dropAddress?.address === addr.address ? 'border-black bg-black text-white shadow-lg' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    {addr.type === 'HOME' ? 'home' : 'business'}
                                  </span>
                                  <span className="text-[10px] font-black uppercase tracking-widest">{addr.type}</span>
                                </button>
                              ))}
                            </div>
                            {dropAddress && (
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start gap-3 mx-2">
                                <span className="material-symbols-outlined text-slate-400 text-sm mt-0.5">location_on</span>
                                <p className="text-[11px] font-bold text-slate-500 leading-relaxed">{dropAddress.address}</p>
                              </div>
                            )}
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

                        {/* NEW: PHOTO UPLOAD SECTION */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">6. Garment Photos (Optional)</p>
                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{orderPhotos.length}/5 Photos</span>
                          </div>
                          
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                            <AnimatePresence>
                              {orderPhotos.map((url, idx) => (
                                <motion.div 
                                  key={url}
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.8, opacity: 0 }}
                                  className="relative aspect-square rounded-2xl overflow-hidden border border-slate-100 shadow-sm"
                                >
                                  <img src={url} alt="" className="w-full h-full object-cover" />
                                  <button 
                                    onClick={() => removePhoto(idx)}
                                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-sm"
                                  >
                                    <span className="material-symbols-outlined text-xs">close</span>
                                  </button>
                                </motion.div>
                              ))}
                            </AnimatePresence>

                            {orderPhotos.length < 5 && (
                              <button 
                                onClick={() => document.getElementById('photo-upload').click()}
                                disabled={uploading}
                                className={`aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-black hover:text-black transition-all bg-slate-50/50 ${uploading ? 'animate-pulse' : ''}`}
                              >
                                <span className="material-symbols-outlined text-xl">
                                  {uploading ? 'sync' : 'add_a_photo'}
                                </span>
                                <span className="text-[8px] font-black uppercase tracking-tighter">
                                  {uploading ? 'Uploading...' : 'Add Photo'}
                                </span>
                              </button>
                            )}
                          </div>
                          <input 
                            id="photo-upload"
                            type="file" 
                            multiple 
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden" 
                          />
                          <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest text-center">Upload photos for verification and care tracking</p>
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
                      {availableDates.map((d, i) => {
                        const dateStr = `${d.day}, ${d.date}`;
                        const isSelected = (activeSlotType === 'pickup' ? selectedPickup : selectedDelivery).includes(d.date);
                        
                        // Validation for delivery date
                        let isDisabled = false;
                        if (activeSlotType === 'delivery' && selectedPickup && pickupTime) {
                          const pickupDT = getSlotDateTime(selectedPickup, pickupTime);
                          const currentDT = getSlotDateTime(dateStr, timeSlots[timeSlots.length - 1]); // Check if even last slot is possible
                          const minHours = isExpress ? 24 : 72;
                          const diffHours = (currentDT - pickupDT) / (1000 * 60 * 60);
                          if (diffHours < minHours) isDisabled = true;
                        }

                        return (
                          <button 
                            key={i} 
                            disabled={isDisabled}
                            onClick={() => activeSlotType === 'pickup' ? setSelectedPickup(dateStr) : setSelectedDelivery(dateStr)} 
                            className={`min-w-[90px] p-4 rounded-[1.5rem] border transition-all flex flex-col items-center gap-1 ${isDisabled ? 'opacity-20 cursor-not-allowed grayscale' : (isSelected ? 'bg-black text-white border-black' : 'bg-slate-50 text-slate-400 border-slate-100')}`}
                          >
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{d.day}</span>
                            <span className="text-sm font-black tracking-tighter">{d.date}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Select Time Window (2 Hours)</p>
                    <div className="grid grid-cols-2 gap-2">
                      {timeSlots.map((slot) => {
                        const isSelected = (activeSlotType === 'pickup' ? pickupTime : deliveryTime) === slot;
                        
                        // Validation for delivery time slot
                        let isDisabled = false;
                        if (activeSlotType === 'delivery' && selectedPickup && pickupTime && selectedDelivery) {
                          const pickupDT = getSlotDateTime(selectedPickup, pickupTime);
                          const deliveryDT = getSlotDateTime(selectedDelivery, slot);
                          const minHours = isExpress ? 24 : 72;
                          const diffHours = (deliveryDT - pickupDT) / (1000 * 60 * 60);
                          if (diffHours < minHours) isDisabled = true;
                        }

                        return (
                          <button 
                            key={slot} 
                            disabled={isDisabled}
                            onClick={() => activeSlotType === 'pickup' ? setPickupTime(slot) : setDeliveryTime(slot)} 
                            className={`py-4 rounded-2xl border text-[10px] font-black uppercase tracking-tight transition-all ${isDisabled ? 'opacity-20 cursor-not-allowed grayscale' : (isSelected ? 'bg-black text-white border-black shadow-lg shadow-black/20' : 'bg-slate-50 text-slate-400 border-slate-100')}`}
                          >
                            {slot}
                          </button>
                        );
                      })}
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
