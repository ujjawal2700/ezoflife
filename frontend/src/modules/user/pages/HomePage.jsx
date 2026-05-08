import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { serviceApi, masterServiceApi, authApi, categoryApi, mediaApi, geofenceApi } from '../../../lib/api';
import { shippingConfigApi } from '../../../lib/shippingApi';
import { useLocationStore } from '../../../shared/stores/locationStore';
import { locationService } from '../../../lib/locationService';
import { requestForToken } from '../../../lib/firebase';

const HomePage = () => {
  console.log('HomePage Rendering');
  const navigate = useNavigate();
  const { location, setPromptOpen, setPickerOpen, pricingFactor, zone, setZoneData } = useLocationStore();

  // FCM TOKEN REGISTRATION
  useEffect(() => {
    const registerToken = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = userData._id || userData.id;

        if (userId) {
          const fcmToken = await requestForToken();
          if (fcmToken) {
            await authApi.updateFcmToken(userId, fcmToken);
          }
        }
      } catch (err) {
        console.error('FCM Registration Error:', err);
      }
    };

    registerToken();
  }, []);

  useEffect(() => {
    if (!location) {
      setTimeout(() => setPromptOpen(true), 1500);
    } else {
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
  const [selectedTier, setSelectedTier] = useState('Essential'); 
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

  const [selectedPickup, setSelectedPickup] = useState(() => localStorage.getItem('pickup_date') || '');
  const [pickupTime, setPickupTime] = useState(() => localStorage.getItem('pickup_time') || '');

  const [selectedDelivery, setSelectedDelivery] = useState(() => localStorage.getItem('delivery_date') || '');
  const [deliveryTime, setDeliveryTime] = useState(() => localStorage.getItem('delivery_time') || '');

  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [activeSlotType, setActiveSlotType] = useState('pickup');

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [activeAddressType, setActiveAddressType] = useState('pickup');
  const [pickupAddress, setPickupAddress] = useState(() => {
    const saved = localStorage.getItem('pickup_address');
    return saved ? JSON.parse(saved) : null;
  });
  const [dropAddress, setDropAddress] = useState(() => {
    const saved = localStorage.getItem('drop_address');
    return saved ? JSON.parse(saved) : null;
  });
  const [isSameAsPickup, setIsSameAsPickup] = useState(true);

  const [orderNotes, setOrderNotes] = useState(() => localStorage.getItem('order_notes') || '');
  const [itemPhotos, setItemPhotos] = useState(() => {
    const saved = localStorage.getItem('item_photos');
    return saved ? JSON.parse(saved) : {};
  });
  const [activePhotoService, setActivePhotoService] = useState(null);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressFormData, setAddressFormData] = useState({
    type: 'Home'
  });

  const handleSaveCustomAddress = () => {
    if (!customAddress) return alert('Please enter an address');
    const newAddr = {
      id: Date.now().toString(),
      type: addressFormData.type,
      address: customAddress,
      fullAddress: customAddress
    };
    if (activeAddressType === 'pickup') {
      setPickupAddress(newAddr);
      if (isSameAsPickup) setDropAddress(newAddr);
    } else {
      setDropAddress(newAddr);
    }
    setShowAddressForm(false);
    setShowAddressPicker(false);
  };

  useEffect(() => {
    localStorage.setItem('selected_tier', selectedTier);
    localStorage.setItem('is_express', isExpress);
    localStorage.setItem('pickup_date', selectedPickup);
    localStorage.setItem('pickup_time', pickupTime);
    localStorage.setItem('delivery_date', selectedDelivery);
    localStorage.setItem('delivery_time', deliveryTime);
    if (pickupAddress) localStorage.setItem('pickup_address', JSON.stringify(pickupAddress));
    if (dropAddress) localStorage.setItem('drop_address', JSON.stringify(dropAddress));
    localStorage.setItem('order_notes', orderNotes);
    localStorage.setItem('item_photos', JSON.stringify(itemPhotos));
  }, [selectedTier, isExpress, selectedPickup, pickupTime, selectedDelivery, deliveryTime, pickupAddress, dropAddress, orderNotes, itemPhotos]);

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

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = userData._id || userData.id;
      if (userId) {
        const profile = await authApi.getProfile(userId);
        let addrList = [];
        if (profile.address) {
          addrList.push({ id: 'profile_root', type: 'Profile', address: profile.address, location: profile.location || null });
        }
        if (profile.addresses && profile.addresses.length > 0) {
          profile.addresses.forEach((a, idx) => {
            addrList.push({ id: a._id || idx, type: a.type.toUpperCase(), address: a.address, location: a.location });
          });
        }
        setSavedAddresses(addrList);
        if (addrList.length > 0) {
          if (!pickupAddress) setPickupAddress(addrList[0]);
          if (!dropAddress && isSameAsPickup) setDropAddress(addrList[0]);
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
          masterServiceApi.getAll({ serviceType: customerType }),
          serviceApi.getAll({ approvedOnly: true, serviceType: customerType })
        ]);
        data = [
          ...(Array.isArray(masterRes) ? masterRes.map(s => ({ ...s, isMaster: true })) : []),
          ...(Array.isArray(customRes) ? customRes.map(s => ({ ...s, isMaster: false })) : [])
        ];
      } catch (err) { console.error('Fetch error:', err); }

      const filtered = data.map(s => {
        const catObj = s.categoryId || s.category;
        return {
          ...s,
          name: s.name || s.itemName,
          mainCategory: catObj?.mainCategory || (typeof catObj === 'string' ? catObj : null),
          subCategoryName: catObj?.subCategory || (typeof s.subCategory === 'string' ? s.subCategory : s.subCategory?.name)
        };
      }).filter(s => {
        const isActive = s.status === 'Active' || s.isActive === true;
        const isApproved = s.isMaster || s.approvalStatus === 'Approved';
        const target = (s.targetAudience || 'both').toLowerCase();
        const isMatch = target === 'both' || target === customerType || (customerType === 'retail' && target === 'individual');
        return isActive && isApproved && isMatch;
      });
      setServices(filtered);
    } catch (error) { console.error('Error fetching services:', error); } finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const data = await categoryApi.getMain();
      setCategories(data);
    } catch (error) { console.error('Error fetching categories:', error); } finally { setCategoriesLoading(false); }
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
      } catch (error) { console.error('Error fetching sub-categories:', error); }
    }
  };

  useEffect(() => { fetchServices(); fetchCategories(); }, []);

  const [showMoreServices, setShowMoreServices] = useState(false);

  const filteredServices = useMemo(() => {
    let result = services.filter(s => {
      if ((s.tier || 'Essential') !== selectedTier) return false;
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedCategory && s.mainCategory !== selectedCategory.name) return false;
      if (selectedSubCategory && s.subCategoryName !== selectedSubCategory.name) return false;
      return true;
    });
    if (!selectedCategory && !selectedSubCategory && !searchQuery && !showMoreServices) return result.slice(0, 10);
    return result;
  }, [services, selectedTier, searchQuery, selectedCategory, selectedSubCategory, showMoreServices]);

  const updateQuantity = (id, delta) => {
    setSelectedQuantities(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (delta > 0) {
        const service = services.find(s => (s._id || s.id) === id);
        if (service?.vendorId) localStorage.setItem('last_visited_vendor_id', service.vendorId);
      }
      if (next === 0) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: next };
    });
  };

  const cartItemsCount = useMemo(() => Object.values(selectedQuantities).reduce((acc, q) => acc + q, 0), [selectedQuantities]);
  const cartTotal = useMemo(() => {
    return Object.entries(selectedQuantities).reduce((acc, [id, q]) => {
      const service = services.find(s => (s._id?.toString() === id || s.id?.toString() === id));
      if (!service) return acc;
      const actualPrice = service.discountedPrice || service.totalPrice || service.basePrice || 0;
      const price = actualPrice * (pricingFactor || 1);
      return acc + (price * q);
    }, 0);
  }, [selectedQuantities, services, pricingFactor]);

  const maxServiceTime = useMemo(() => {
    let max = 1;
    Object.keys(selectedQuantities).forEach(id => {
      const s = services.find(srv => (srv._id?.toString() === id || srv.id?.toString() === id));
      if (s?.serviceTime && s.serviceTime > max) max = s.serviceTime;
    });
    return max;
  }, [selectedQuantities, services]);

  useEffect(() => {
    if (!selectedPickup) return;
    const pickupIndex = availableDates.findIndex(d => `${d.day}, ${d.date}` === selectedPickup);
    if (pickupIndex !== -1) {
      const deliveryIndex = Math.min(pickupIndex + maxServiceTime, availableDates.length - 1);
      const deliveryD = availableDates[deliveryIndex];
      setSelectedDelivery(`${deliveryD.day}, ${deliveryD.date}`);
      if (!deliveryTime && pickupTime) setDeliveryTime(pickupTime);
    }
  }, [selectedPickup, maxServiceTime, availableDates, pickupTime]);

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !activeServiceForPhoto) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('media', file);
        const res = await mediaApi.upload(formData);
        if (res.url) uploaded.push(res.url);
      }
      setItemPhotos(prev => ({ ...prev, [activeServiceForPhoto]: [...(prev[activeServiceForPhoto] || []), ...uploaded] }));
    } catch (error) { console.error('Upload Error:', error); alert('Photo upload failed'); } finally { setUploading(false); setActiveServiceForPhoto(null); e.target.value = ''; }
  };

  const handleCartClick = () => {
    if (Object.keys(selectedQuantities).length === 0) return alert('Please select at least one service');
    const token = localStorage.getItem('token');
    if (!token) { navigate('/user/auth'); return; }
    navigate('/user/cart');
  };

  const [isCartDismissed, setIsCartDismissed] = useState(false);
  useEffect(() => { if (cartItemsCount > 0) setIsCartDismissed(false); }, [cartItemsCount]);

  const handleServiceClick = (serviceId, service, i) => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/user/auth'); return; }
    navigate('/user/service-info', {
      state: {
        selectedService: {
          id: serviceId, _id: serviceId, name: service.name, title: service.name, desc: service.description,
          image: service.image, vendorId: service.vendorId, vendor: service.vendor,
          color: isHeritage ? 'heritage' : (i % 3 === 0 ? 'primary' : i % 3 === 1 ? 'secondary' : 'tertiary'),
          price: `₹${service.totalPrice}.00`, totalPrice: service.totalPrice, basePrice: service.basePrice
        }
      }
    });
    if (service.vendorId) localStorage.setItem('last_visited_vendor_id', service.vendorId);
  };

  const handleLiveLocation = () => {
    if (location) {
      const addrString = location.fullAddress || (location.area ? `${location.area}, ${location.city}` : null) || (typeof location === 'string' ? location : 'Detected Location');
      const liveAddr = { id: 'live_' + Date.now(), type: 'LIVE', address: addrString, location: { lat: location.lat, lng: location.lng } };
      
      if (activeAddressType === 'pickup') {
        setPickupAddress(liveAddr);
        if (isSameAsPickup) setDropAddress(liveAddr);
      } else {
        setDropAddress(liveAddr);
      }
      
      setCustomAddress(liveAddr.address);
      setShowAddressForm(true);
      return;
    }
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    setIsLocating(true);
    locationService.getCurrentCoordinates().then(async (coords) => {
      try {
        const addressData = await locationService.reverseGeocode(coords.lat, coords.lng);
        setCustomAddress(addressData.fullAddress);
        const liveAddr = { id: 'live_' + Date.now(), type: 'LIVE', address: addressData.fullAddress, location: { lat: coords.lat, lng: coords.lng } };
        
        if (activeAddressType === 'pickup') {
          setPickupAddress(liveAddr);
          if (isSameAsPickup) setDropAddress(liveAddr);
        } else {
          setDropAddress(liveAddr);
        }
        
        setShowAddressForm(true);
      } catch (err) { console.error(err); } finally { setIsLocating(false); }
    }).catch(() => setIsLocating(false));
  };

  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  useEffect(() => {
    const handleScroll = () => { if (window.scrollY > 350) setIsHeaderSticky(true); else setIsHeaderSticky(false); };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHeritage = selectedTier === 'Heritage';
  const themeGradient = useMemo(() => isHeritage ? 'bg-gradient-to-br from-[#D4AF37] to-[#996515]' : 'bg-primary-gradient', [isHeritage]);

  const banners = useMemo(() => [
    { id: 1, title: isHeritage ? <>Exquisite<br />Garment Care</> : <>30% Off Your<br />First Order</>, sub: isHeritage ? 'Heritage Tier' : 'Limited Era', bg: isHeritage ? 'bg-gradient-to-br from-[#D4AF37] to-[#996515]' : 'bg-primary-gradient' },
    { id: 2, title: <>Experience<br />Heritage Care</>, sub: 'Premium Tier', bg: 'bg-gradient-to-br from-[#D4AF37] to-[#996515]' }
  ], [isHeritage]);

  const [currentBanner, setCurrentBanner] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => { setCurrentBanner((prev) => (prev + 1) % banners.length); }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const isTierSelected = !!selectedTier;
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(() => localStorage.getItem('delivery_confirmed') === 'true');
  const isLogisticsValid = !!(selectedPickup && pickupTime && selectedDelivery && deliveryTime && pickupAddress && dropAddress);

  // Persistence for Logistics States
  useEffect(() => {
    localStorage.setItem('delivery_confirmed', deliveryConfirmed);
    localStorage.setItem('pickup_date', selectedPickup);
    localStorage.setItem('pickup_time', pickupTime);
    localStorage.setItem('delivery_date', selectedDelivery);
    localStorage.setItem('delivery_time', deliveryTime);
    if (pickupAddress) localStorage.setItem('pickup_address', JSON.stringify(pickupAddress));
    if (dropAddress) localStorage.setItem('drop_address', JSON.stringify(dropAddress));
  }, [deliveryConfirmed, selectedPickup, pickupTime, selectedDelivery, deliveryTime, pickupAddress, dropAddress]);

  // Sync Drop Address if same as Pickup
  useEffect(() => {
    if (isSameAsPickup && pickupAddress) {
      setDropAddress(pickupAddress);
    }
  }, [isSameAsPickup, pickupAddress]);

  const handlePhotoFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !activePhotoService) return;
    
    const newPhotoUrls = files.map(file => URL.createObjectURL(file));
    
    setItemPhotos(prev => {
      const updated = { 
        ...prev, 
        [activePhotoService.id]: [...(prev[activePhotoService.id] || []), ...newPhotoUrls] 
      };
      localStorage.setItem('item_photos', JSON.stringify(updated));
      return updated;
    });
    
    toast.success('Photos added!');
    setActivePhotoService(null);
  };

  const handleDeletePhoto = (serviceId, photoUrl) => {
    setItemPhotos(prev => {
      const updated = {
        ...prev,
        [serviceId]: (prev[serviceId] || []).filter(url => url !== photoUrl)
      };
      localStorage.setItem('item_photos', JSON.stringify(updated));
      return updated;
    });
    toast.success('Photo removed');
  };

  const StepWrapper = ({ children, isLocked, stepNumber, label, isCompleted }) => (
    <div className={`relative transition-all duration-500 ${isLocked ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
      {isLocked && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="bg-white/80 backdrop-blur-sm p-3 rounded-full shadow-lg border border-slate-200">
            <span className="material-symbols-outlined text-slate-400 text-xl">lock</span>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${isCompleted ? 'bg-emerald-500 text-white' : isLocked ? 'bg-slate-200 text-slate-400' : 'bg-black text-white'}`}>
          {isCompleted ? <span className="material-symbols-outlined text-[14px]">check</span> : stepNumber}
        </div>
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLocked ? 'text-slate-300' : 'text-slate-900'}`}>{label}</span>
      </div>
      {children}
    </div>
  );

  return (
    <div className="text-on-surface min-h-[100dvh] flex flex-col">
      <main className="flex-1 pt-0 pb-36 px-6 max-w-5xl mx-auto w-full">
        <div className="h-[50px] shrink-0" />

        {/* 1. COMPACT PROMO BANNER */}
        <section className="mt-2 mb-4 w-full relative px-2">
          <div className="overflow-hidden rounded-[2rem] shadow-xl shadow-slate-100 border border-slate-100">
            <AnimatePresence mode="wait">
              <motion.div
                key={banners[currentBanner].id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className={`${banners[currentBanner].bg} p-4 relative overflow-hidden flex flex-col justify-end min-h-[60px]`}
              >
                <div className="relative z-10">
                  <span className="text-white/80 text-[6px] font-black uppercase tracking-[0.3em] mb-1 block">{banners[currentBanner].sub}</span>
                  <h2 className="text-lg font-black text-white mb-2 leading-tight tracking-tighter">{banners[currentBanner].title}</h2>
                  <div className="flex gap-1.5">
                    {banners.map((_, i) => (
                      <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === currentBanner ? 'w-6 bg-white' : 'w-1 bg-white/40'}`} />
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
        {/* 2. CONSOLIDATED CONTROL ROW (ORIGINAL COMPACT DESIGN) */}
        <div className="flex flex-row items-center justify-between gap-2 mb-4 px-0 w-full">
          {/* Tier Toggle - Always Active */}
          <div className="flex-1 h-12 bg-slate-100 p-0.5 rounded-xl border border-slate-200 flex gap-0.5 shrink-0">
            {['Essential', 'Heritage'].map(tier => (
              <button 
                key={tier} 
                onClick={() => {
                  setSelectedTier(tier);
                  setDeliveryConfirmed(true);
                }} 
                className={`flex-1 h-full rounded-lg font-black text-[9px] uppercase tracking-tight transition-all duration-300 ${selectedTier === tier ? (tier === 'Heritage' ? 'bg-[#996515]' : 'bg-black') + ' text-white shadow-sm' : 'text-slate-400'}`}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* Pickup & Dropup - Depends on Delivery Type */}
          <button 
            disabled={!deliveryConfirmed}
            onClick={() => setShowSlotPicker(true)}
            className={`flex-1 h-12 rounded-xl font-black text-[8px] uppercase tracking-tight border transition-all flex flex-row items-center justify-center gap-2 ${!deliveryConfirmed ? 'opacity-30 grayscale cursor-not-allowed' : 'bg-slate-950 text-white border-slate-950 shadow-xl'}`}
          >
            <div className="flex flex-col items-center gap-0.5">
              <span className="material-symbols-outlined text-[14px] leading-none">calendar_today</span>
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-[8px] text-left">{isLogisticsValid ? 'Schedule Pickup and Dropup' : 'Schedule Pickup and Dropup'}</span>
            </div>
          </button>
        </div>

        {/* 4. STICKY OPTIMIZED SEARCH & CATEGORY SECTION - Depends on Logistics */}
        <div className={`transition-all duration-500 ${!isLogisticsValid ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
          <div className={`${isHeaderSticky ? 'fixed top-[50px] left-0 right-0 z-[99] shadow-2xl px-4 py-2 bg-white/95 backdrop-blur-2xl rounded-b-[2.2rem] border-b border-slate-100' : 'relative z-[90] px-1 py-2'} transition-all duration-500`}>
            <div className="max-w-5xl mx-auto w-full space-y-1">
              {/* MINI CATEGORIES */}
              <section className="w-full">

                <div className={`flex gap-2 overflow-x-auto hide-scrollbar px-1 ${isHeaderSticky ? 'pb-1' : 'pb-2'}`}>
                  {categoriesLoading ? (
                    [...Array(5)].map((_, i) => <div key={i} className="min-w-[65px] h-16 bg-slate-50 rounded-xl animate-pulse" />)
                  ) : (
                    categories.map(cat => (
                      <motion.button
                        key={cat.name}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleCategoryClick(cat)}
                        className={`flex flex-row items-center gap-2 transition-all duration-300 ${isHeaderSticky ? 'min-w-[90px] p-2 rounded-xl' : 'min-w-[125px] px-5 py-3 rounded-2xl'} border-2 ${selectedCategory?.name === cat.name ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                      >
                        <div className={`rounded-lg flex items-center justify-center shrink-0 transition-all ${isHeaderSticky ? 'w-4 h-4' : 'w-6 h-6'} ${selectedCategory?.name === cat.name ? 'bg-white/20' : 'bg-slate-50'}`}>
                          <span className={`material-symbols-outlined ${isHeaderSticky ? 'text-[10px]' : 'text-sm'} ${selectedCategory?.name === cat.name ? 'text-white' : 'text-slate-400'}`}>
                            {cat.name.toLowerCase().includes('dry') ? 'dry_cleaning' : cat.name.toLowerCase().includes('wash') ? 'local_laundry_service' : cat.name.toLowerCase().includes('iron') ? 'iron' : 'category'}
                          </span>
                        </div>
                        <span className={`font-black uppercase tracking-widest leading-none ${isHeaderSticky ? 'text-[6px]' : 'text-[8px]'} ${selectedCategory?.name === cat.name ? 'text-white' : 'text-slate-500'}`}>{cat.name}</span>
                      </motion.button>
                    ))
                  )}
                </div>

                <AnimatePresence>
                  {subCategories.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`flex gap-2 overflow-x-auto hide-scrollbar px-1 ${isHeaderSticky ? 'mt-2' : 'mt-4'}`}>
                      {subCategories.map(sub => (
                        <button
                          key={sub._id}
                          onClick={() => setSelectedSubCategory(selectedSubCategory?._id === sub._id ? null : { ...sub, name: sub.subCategory })}
                          className={`rounded-lg font-black uppercase tracking-widest transition-all whitespace-nowrap border ${isHeaderSticky ? 'px-3 py-1.5 text-[6px]' : 'px-5 py-2.5 text-[8px]'} ${selectedSubCategory?._id === sub._id ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200'}`}
                        >
                          {sub.subCategory}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
              {/* SEARCH BAR */}
              <div className="relative group px-1">
                <div className={`absolute inset-y-0 left-5 flex items-center pointer-events-none ${isHeaderSticky ? 'scale-75' : ''}`}>
                  <span className={`material-symbols-outlined ${isHeritage ? 'text-[#996515]' : 'text-slate-900'} text-base opacity-40 group-focus-within:opacity-100 transition-opacity`}>search</span>
                </div>
                <input 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className={`w-full bg-slate-100 border-2 border-slate-200/20 focus:border-slate-900 focus:bg-white rounded-full pr-8 ${isHeaderSticky ? 'pl-10 py-1.5 text-[8px]' : 'pl-12 py-2.5 text-[9px]'} font-black text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-sm`} 
                  placeholder={isHeritage ? "Search..." : "Search services add to the cart"} 
                />
              </div>
            </div>
          </div>

          {/* 5. SERVICES LIST */}
          <section className="mb-10 w-full px-1">
            <div className={`flex flex-col gap-3 ${showMoreServices ? 'max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
              {loading ? (
                [...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-[2rem] p-4 h-24 border border-slate-50 animate-pulse" />)
              ) : (
                filteredServices.map((service, i) => {
                  const serviceId = service._id || service.id;
                  const qty = selectedQuantities[serviceId] || 0;
                  const isSelected = qty > 0;
                  return (
                    <motion.div 
                      key={serviceId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className={`rounded-[2.2rem] p-3 flex flex-row items-center gap-4 border-2 transition-all duration-500 ${isSelected ? 'bg-slate-900 border-slate-900 shadow-2xl shadow-slate-300 scale-[1.02]' : 'bg-white border-slate-100 shadow-sm'}`}
                    >
                      <div className="flex-1 min-w-0 flex flex-col items-center py-1">
                        <h4 onClick={() => handleServiceClick(serviceId, service, i)} className={`font-black text-[10px] leading-tight mb-2 uppercase line-clamp-1 cursor-pointer ${isSelected ? 'text-white' : 'text-slate-900'} tracking-tight`}>{service.name || service.itemName}</h4>
                        
                        <div className="flex items-center justify-between w-full px-2 gap-2">
                          <span className={`text-[9px] font-black uppercase tracking-tight text-left whitespace-nowrap overflow-hidden ${isSelected ? 'text-white/60' : 'text-slate-500'}`}>{service.mainCategory || 'Category'}</span>
                          
                          <div className="flex flex-col items-center shrink-0">
                            <div className="flex items-center gap-1">
                              <span className={`text-[13px] font-black ${isSelected ? 'text-emerald-400' : 'text-slate-900'}`}>₹{Math.round((service.discountedPrice || service.basePrice || 0) * (pricingFactor || 1))}</span>
                              {(service.basePrice || 0) > (service.discountedPrice || 0) && <span className="text-[10px] font-bold line-through text-slate-300">₹{Math.round((service.basePrice || 0) * (pricingFactor || 1))}</span>}
                            </div>
                          </div>

                          <span className={`text-[9px] font-black uppercase tracking-tight text-right whitespace-nowrap overflow-hidden ${isSelected ? 'text-white/60' : 'text-slate-500'}`}>{service.subCategoryName || 'Sub'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-50 rounded-xl p-0.5 border border-slate-100 shadow-inner">
                          <button onClick={() => updateQuantity(serviceId, -1)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 active:scale-90 transition-all"><span className="material-symbols-outlined text-[14px] font-black">remove</span></button>
                          <span className="text-[10px] font-black text-slate-900 px-2 min-w-[24px] text-center">{qty}</span>
                          <button onClick={() => updateQuantity(serviceId, 1)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 active:scale-90 transition-all"><span className="material-symbols-outlined text-[14px] font-black">add</span></button>
                        </div>
                        {isSelected && (
                          <button 
                            onClick={() => setActivePhotoService({ id: serviceId, name: service.name || service.itemName })} 
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${itemPhotos[serviceId]?.length > 0 ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-slate-300 border border-slate-100 shadow-sm hover:text-slate-900'}`}
                          >
                            <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </section>
        </div>
        {!showMoreServices && !selectedCategory && !selectedSubCategory && !searchQuery && filteredServices.length >= 10 && (
            <div className="flex justify-center mt-6"><button onClick={() => setShowMoreServices(true)} className="px-6 py-2 rounded-xl bg-slate-50 text-slate-400 font-black text-[8px] uppercase tracking-widest hover:text-slate-900 transition-all">View All Services</button></div>
          )}

        {/* 6. INSTRUCTIONS SECTION */}
        {cartItemsCount > 0 && (
          <section className="mb-8 space-y-4">
            <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-2xl relative overflow-hidden">
              <div className="absolute right-0 top-0 p-10 opacity-5"><span className="material-symbols-outlined text-8xl">logistics</span></div>
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Order Instructions</p>
                <textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Special care instructions..." className="w-full bg-slate-50 border border-slate-100 p-5 rounded-[2rem] focus:bg-white outline-none font-bold text-slate-800 text-xs min-h-[100px] resize-none" />
              </div>
            </div>
          </section>
        )}



        {/* 8. SLOT PICKER MODAL */}
        {/* 8. COMBINED PICKUP & DROPUP MODAL */}
        <AnimatePresence>
          {showSlotPicker && (
            <div className="fixed inset-0 z-[200] flex items-end justify-center p-0">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setShowSlotPicker(false)} 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              />
              <motion.div 
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }} 
                className="relative w-full max-w-xs bg-white rounded-t-[1.5rem] p-3 shadow-2xl flex flex-col gap-2 overflow-y-auto max-h-[92vh] hide-scrollbar"
              >
                <div className="flex justify-between items-center">
                  <div /> {/* Spacer for alignment */}
                  <button onClick={() => setShowSlotPicker(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Delivery Type Toggle */}
                  <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200 flex gap-0.5">
                    {['Normal', 'Express'].map(type => (
                      <button 
                        key={type}
                        onClick={() => {
                          setIsExpress(type === 'Express');
                          setDeliveryConfirmed(true);
                        }}
                        className={`flex-1 py-1.5 rounded-lg font-black text-[7px] uppercase tracking-widest transition-all ${((type === 'Express' && isExpress) || (type === 'Normal' && !isExpress)) ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-400'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  {/* --- PICKUP SECTION --- */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 px-1">
                      <div className="w-4 h-4 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                        <span className="material-symbols-outlined text-[10px]">calendar_today</span>
                      </div>
                      <p className="text-[7px] font-black text-slate-900 uppercase tracking-widest">1. Pickup</p>
                    </div>
                    
                    <div className="space-y-2 bg-slate-50 p-2 rounded-[1.2rem] border border-slate-100">
                      {/* Date Dropdown */}
                      <div>
                        <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Date</p>
                        <select 
                          value={selectedPickup}
                          onChange={(e) => setSelectedPickup(e.target.value)}
                          className="w-full bg-white px-2 py-1.5 rounded-lg border border-slate-100 text-[8px] font-black uppercase tracking-tight outline-none focus:border-slate-950 transition-all"
                        >
                          <option value="">Select Date</option>
                          {availableDates.slice(0, 6).map((d, i) => (
                            <option key={i} value={`${d.day}, ${d.date}`}>{d.day}, {d.date}</option>
                          ))}
                        </select>
                      </div>

                      {/* Time Dropdown */}
                      <div>
                        <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Time</p>
                        <select 
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          className="w-full bg-white px-2 py-1.5 rounded-lg border border-slate-100 text-[8px] font-black uppercase tracking-tight outline-none focus:border-slate-950 transition-all"
                        >
                          <option value="">Select Time</option>
                          {timeSlots.map((slot) => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Pickup Address Selection (Home/Office) */}
                      <div>
                        <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Address</p>
                        <div className="flex gap-1.5">
                          {['Home', 'Office'].map(type => {
                            const isSelected = pickupAddress?.type === type;
                            return (
                              <button 
                                key={type}
                                onClick={() => {
                                  const addr = savedAddresses.find(a => a.type === type);
                                  if (addr) {
                                    setPickupAddress(addr);
                                    if (isSameAsPickup) setDropAddress(addr);
                                  } else {
                                    setActiveAddressType('pickup');
                                    setShowSlotPicker(false);
                                    setShowAddressForm(true);
                                    setAddressFormData({ type });
                                    toast.error(`Please add your ${type} address`);
                                  }
                                }}
                                className={`flex-1 py-1 rounded-lg border-2 flex flex-col items-center gap-0.5 transition-all ${isSelected ? 'border-slate-950 bg-slate-50 text-slate-950' : 'border-slate-100 bg-white text-slate-300'}`}
                              >
                                <span className="material-symbols-outlined text-[12px]">{type === 'Home' ? 'home' : 'business'}</span>
                                <span className="text-[9px] font-black uppercase tracking-widest">{type}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* --- DROPUP SECTION --- */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded bg-amber-500/10 flex items-center justify-center text-amber-600">
                          <span className="material-symbols-outlined text-[10px]">local_shipping</span>
                        </div>
                        <p className="text-[7px] font-black text-slate-900 uppercase tracking-widest">2. Dropup</p>
                      </div>

                      {/* Same as Pickup Toggle */}
                      <div className="flex items-center gap-1.5 bg-slate-100/50 px-1.5 py-0.5 rounded-full border border-slate-100">
                         <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Same</span>
                         <button 
                           onClick={() => setIsSameAsPickup(!isSameAsPickup)}
                           className={`w-7 h-3.5 rounded-full transition-all relative ${isSameAsPickup ? 'bg-emerald-500' : 'bg-slate-300'}`}
                         >
                           <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-all ${isSameAsPickup ? 'right-0.5' : 'left-0.5'}`} />
                         </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 bg-slate-50 p-2 rounded-[1.2rem] border border-slate-100">
                      {/* Date Dropdown */}
                      <div>
                        <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Date</p>
                        <select 
                          value={selectedDelivery}
                          onChange={(e) => setSelectedDelivery(e.target.value)}
                          className="w-full bg-white px-2 py-1.5 rounded-lg border border-slate-100 text-[8px] font-black uppercase tracking-tight outline-none focus:border-slate-950 transition-all"
                        >
                          <option value="">Select Date</option>
                          {availableDates.map((d, i) => {
                            const dateStr = `${d.day}, ${d.date}`;
                            
                            // Min gap logic
                            let isDisabled = false;
                            if (selectedPickup && pickupTime) {
                              const pDT = getSlotDateTime(selectedPickup, pickupTime);
                              const dDT = getSlotDateTime(dateStr, timeSlots[timeSlots.length-1]);
                              const minH = isExpress ? 24 : 72;
                              if ((dDT - pDT) / (1000*60*60) < minH) isDisabled = true;
                            }

                            return (
                              <option key={i} value={dateStr} disabled={isDisabled}>
                                {d.day}, {d.date}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Time Dropdown */}
                      <div>
                        <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Time</p>
                        <select 
                          value={deliveryTime}
                          onChange={(e) => setDeliveryTime(e.target.value)}
                          className="w-full bg-white px-2 py-1.5 rounded-lg border border-slate-100 text-[8px] font-black uppercase tracking-tight outline-none focus:border-slate-950 transition-all"
                        >
                          <option value="">Select Time</option>
                          {timeSlots.map((slot) => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </select>
                      </div>

                      {/* Dropup Address (Only if NOT same as pickup) */}
                      {!isSameAsPickup && (
                        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="pt-1.5 border-t border-slate-200 mt-1">
                          <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1 mt-1.5">Address</p>
                          <div className="flex gap-1.5">
                            {['Home', 'Office'].map(type => {
                              const isSelected = dropAddress?.type === type;
                              return (
                                <button 
                                  key={type}
                                  onClick={() => {
                                    const addr = savedAddresses.find(a => a.type === type);
                                    if (addr) setDropAddress(addr);
                                    else {
                                      setActiveAddressType('drop');
                                      setShowSlotPicker(false);
                                      setShowAddressForm(true);
                                      setAddressFormData({ type });
                                      toast.error(`Please add your ${type} address`);
                                    }
                                  }}
                                  className={`flex-1 py-1 rounded-lg border-2 flex flex-col items-center gap-0.5 transition-all ${isSelected ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-slate-100 bg-white text-slate-300'}`}
                                >
                                  <span className="material-symbols-outlined text-[12px]">{type === 'Home' ? 'home' : 'business'}</span>
                                  <span className="text-[9px] font-black uppercase tracking-widest">{type}</span>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    if (!isLogisticsValid) {
                      alert("Please ensure all fields are selected.");
                      return;
                    }
                    setShowSlotPicker(false);
                  }} 
                  className="w-full bg-slate-950 text-white py-3 rounded-xl font-black text-[8px] uppercase tracking-[0.2em] mt-2 shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                  Confirm Logistics
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 9. ADDRESS PICKER MODAL */}
        <AnimatePresence>
          {showAddressPicker && (
            <div className="fixed inset-0 z-[210] flex items-end justify-center p-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddressPicker(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-lg bg-white rounded-t-[3rem] p-8 shadow-2xl flex flex-col gap-6 overflow-y-auto max-h-[85vh] hide-scrollbar">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">CHOOSE <br />{activeAddressType} ADDRESS.</h3>
                  <button onClick={() => setShowAddressPicker(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><span className="material-symbols-outlined">close</span></button>
                </div>

                <div className="space-y-4">
                  {savedAddresses.length > 0 ? savedAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      onClick={() => {
                        if (activeAddressType === 'pickup') {
                          setPickupAddress(addr);
                          if (isSameAsPickup) setDropAddress(addr);
                        } else {
                          setDropAddress(addr);
                        }
                        setShowAddressPicker(false);
                      }}
                      className={`w-full p-4 rounded-2xl border-2 text-left flex items-start gap-3 transition-all ${((activeAddressType === 'pickup' ? pickupAddress : dropAddress)?.id === addr.id) ? 'border-black bg-slate-50' : 'border-slate-100'}`}
                    >
                      <span className="material-symbols-outlined text-slate-400">location_on</span>
                      <div>
                        <p className="text-[11px] font-black uppercase text-slate-900">{addr.type}</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-1 line-clamp-2">{addr.address || addr.fullAddress}</p>
                      </div>
                    </button>
                  )) : (
                    <div className="py-10 text-center">
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No saved addresses found</p>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowAddressPicker(false);
                      setShowAddressForm(true);
                    }}
                    className="w-full p-6 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 flex items-center justify-center gap-2 hover:border-slate-900 hover:text-slate-900 transition-all"
                  >
                    <span className="material-symbols-outlined">add</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">Add New Address</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 10. ADDRESS FORM MODAL (FORMAT) */}
        <AnimatePresence>
          {showAddressForm && (
            <div className="fixed inset-0 z-[220] flex items-end justify-center p-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddressForm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-lg bg-white rounded-t-[3rem] p-8 shadow-2xl flex flex-col gap-6 overflow-y-auto max-h-[90vh] hide-scrollbar">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">ENTER NEW <br />ADDRESS.</h3>
                  <button onClick={() => setShowAddressForm(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><span className="material-symbols-outlined">close</span></button>
                </div>

                <div className="space-y-6">
                  {/* Address Type */}
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Address Type</p>
                    <div className="flex gap-2">
                      {['Home', 'Work', 'Other'].map(t => (
                        <button
                          key={t}
                          onClick={() => setAddressFormData(prev => ({ ...prev, type: t }))}
                          className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all ${addressFormData.type === t ? 'bg-black text-white border-black' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Address Input */}
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Full Address</p>
                    <textarea
                      value={customAddress}
                      onChange={(e) => setCustomAddress(e.target.value)}
                      placeholder="Street, Building, Area..."
                      className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:bg-white outline-none font-bold text-slate-800 text-xs min-h-[100px] resize-none"
                    />
                  </div>

                  <button
                    onClick={handleLiveLocation}
                    className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest"
                  >
                    <span className="material-symbols-outlined text-lg">my_location</span>
                    {isLocating ? 'Locating...' : 'Use Current Location'}
                  </button>

                  <button
                    onClick={handleSaveCustomAddress}
                    className="w-full bg-black text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em]"
                  >
                    SAVE & USE ADDRESS
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        <AnimatePresence>
          {cartItemsCount > 0 && (
            <motion.div 
              initial={{ y: 100 }} 
              animate={{ y: 0 }} 
              exit={{ y: 100 }}
              className="fixed bottom-[70px] left-0 right-0 z-[150] bg-[#161B28] text-white border-t border-white/5"
            >
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Final Total</span>
                    <span className="text-xl font-black tracking-tight">₹{Math.round(cartTotal)}</span>
                  </div>
                  
                  <div className="w-[1px] h-8 bg-white/10" />
                  
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{cartItemsCount} Items</span>
                </div>

                <button 
                  onClick={handleCartClick}
                  className="flex items-center gap-3 group"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">Verify & Pay</span>
                  <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center group-hover:bg-slate-600 transition-all">
                    <span className="material-symbols-outlined text-white text-xl">east</span>
                  </div>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 11. PHOTO OPTIONS & MANAGEMENT MODAL */}
        <AnimatePresence>
          {activePhotoService && (
            <div className="fixed inset-0 z-[300] flex items-end justify-center p-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActivePhotoService(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-lg bg-white rounded-t-[3rem] p-8 shadow-2xl flex flex-col gap-6 max-h-[85vh] overflow-y-auto hide-scrollbar">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-black tracking-tighter uppercase leading-none">Manage Article <br />Photos.</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">{activePhotoService.name}</p>
                  </div>
                  <button onClick={() => setActivePhotoService(null)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><span className="material-symbols-outlined">close</span></button>
                </div>

                {/* Existing Photos Grid */}
                {itemPhotos[activePhotoService.id]?.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-900/40 uppercase tracking-[0.4em]">Current Photos ({itemPhotos[activePhotoService.id].length})</p>
                    <div className="grid grid-cols-3 gap-3">
                      {itemPhotos[activePhotoService.id].map((photo, idx) => (
                        <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 group">
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                          <button 
                            onClick={() => handleDeletePhoto(activePhotoService.id, photo)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-rose-500 transition-all shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-900/40 uppercase tracking-[0.4em]">Add More</p>
                  <div className="grid grid-cols-2 gap-4">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => cameraInputRef.current.click()}
                      className="bg-slate-50 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-3 border-2 border-transparent hover:border-slate-900 transition-all"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-900 shadow-sm">
                        <span className="material-symbols-outlined text-2xl">photo_camera</span>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Take Photo</span>
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => galleryInputRef.current.click()}
                      className="bg-slate-50 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-3 border-2 border-transparent hover:border-slate-900 transition-all"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-900 shadow-sm">
                        <span className="material-symbols-outlined text-2xl">photo_library</span>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">From Gallery</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* HIDDEN INPUTS FOR PHOTOS */}
        <input 
          ref={galleryInputRef} 
          type="file" 
          multiple 
          accept="image/*" 
          onChange={handlePhotoFileChange} 
          className="hidden" 
        />
        <input 
          ref={cameraInputRef} 
          type="file" 
          accept="image/*" 
          capture="environment" 
          onChange={handlePhotoFileChange} 
          className="hidden" 
        />
        </AnimatePresence>
      </main>
    </div>
  );
};

export default HomePage;
