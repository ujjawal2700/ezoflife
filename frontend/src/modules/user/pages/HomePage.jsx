import React, { useEffect, useMemo, useState } from 'react';
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
  const [activeServiceForPhoto, setActiveServiceForPhoto] = useState(null);
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
    localStorage.setItem('is_express', isExpress);
    localStorage.setItem('pickup_date', selectedPickup);
    localStorage.setItem('pickup_time', pickupTime);
    localStorage.setItem('delivery_date', selectedDelivery);
    localStorage.setItem('delivery_time', deliveryTime);
    if (pickupAddress) localStorage.setItem('pickup_address', JSON.stringify(pickupAddress));
    if (dropAddress) localStorage.setItem('drop_address', JSON.stringify(dropAddress));
    localStorage.setItem('order_notes', orderNotes);
    localStorage.setItem('item_photos', JSON.stringify(itemPhotos));
  }, [isExpress, selectedPickup, pickupTime, selectedDelivery, deliveryTime, pickupAddress, dropAddress, orderNotes, itemPhotos]);

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

  return (
    <div className="text-on-surface min-h-[100dvh] flex flex-col">
      <main className="flex-1 pt-0 pb-36 px-6 max-w-5xl mx-auto w-full">
        <div className="h-[50px] shrink-0" />

        {/* 1. COMPACT PROMO BANNER (TODAY'S DESIGN) */}
        <section className="mt-2 mb-2 w-full relative px-2">
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

        {/* 2. TIER & EXPRESS TOGGLE ROW */}
        <div className="flex flex-row items-center gap-4 mb-2">
          <div className="flex-1 bg-slate-200/50 p-1 rounded-[2rem] border border-slate-200 flex gap-1 shadow-inner">
            {['Essential', 'Heritage'].map(tier => (
              <button 
                key={tier} 
                onClick={() => setSelectedTier(tier)} 
                className={`flex-1 py-3 rounded-[1.6rem] font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${selectedTier === tier ? (tier === 'Heritage' ? 'bg-[#996515]' : 'bg-black') + ' text-white shadow-xl' : 'text-slate-600 hover:text-black'}`}
              >
                {tier}
              </button>
            ))}
          </div>

          <div className="flex-1 flex items-center justify-end px-2">
            <label className="group relative cursor-pointer">
              <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 transition-all duration-300 ${isExpress ? 'border-amber-500 bg-amber-50 shadow-lg shadow-amber-100' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isExpress ? 'text-amber-700' : 'text-slate-400'}`}>Express</span>
                <input 
                  type="checkbox" 
                  checked={isExpress}
                  onChange={(e) => setIsExpress(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 transition-all cursor-pointer"
                />
              </div>
              <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[120]">
                <div className="bg-slate-900 text-white text-[8px] font-black uppercase tracking-[0.2em] px-4 py-2.5 rounded-xl whitespace-nowrap shadow-2xl relative border border-white/10">
                  if u check this box then u will get express delivery
                  <div className="absolute top-full right-6 w-3 h-3 bg-slate-900 rotate-45 -translate-y-1.5 border-r border-b border-white/10"></div>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* 3. COMPACT SCHEDULING CARDS */}
        <div className="grid grid-cols-2 gap-2 mb-2 px-1">
          <div 
            className={`p-2.5 rounded-[1.2rem] border-2 text-left transition-all duration-500 ${selectedPickup ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 border-white shadow-inner hover:border-slate-200 text-slate-900'}`}
          >
            <button 
              onClick={() => { setActiveSlotType('pickup'); setShowSlotPicker(true); }}
              className="w-full"
            >
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-[14px] ${selectedPickup ? 'text-white' : 'text-slate-400'}`}>calendar_today</span>
                <h4 className="text-[9px] font-black uppercase tracking-tight truncate">
                  {selectedPickup ? (pickupTime ? pickupTime.split(' - ')[0] : selectedPickup.split(',')[1] || selectedPickup) : 'Pickup Time'}
                </h4>
              </div>
            </button>
            <div className="mt-1.5 flex items-center justify-between border-t border-white/5 pt-1.5">
              <p className={`text-[6px] font-bold truncate uppercase tracking-widest ${selectedPickup ? 'text-white/40' : 'text-slate-300'}`}>{pickupAddress ? pickupAddress.type : 'Address'}</p>
              <button 
                onClick={() => { setActiveAddressType('pickup'); setShowAddressPicker(true); }}
                className={`text-[6px] font-black uppercase px-1.5 py-0.5 rounded-md ${selectedPickup ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-600'}`}
              >
                Edit
              </button>
            </div>
          </div>

          <div 
            className={`p-2.5 rounded-[1.2rem] border-2 text-left transition-all duration-500 ${selectedDelivery ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 border-white shadow-inner hover:border-slate-200 text-slate-900'}`}
          >
            <button 
              onClick={() => { setActiveSlotType('delivery'); setShowSlotPicker(true); }}
              className="w-full"
            >
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-[14px] ${selectedDelivery ? 'text-white' : 'text-slate-400'}`}>local_shipping</span>
                <h4 className="text-[9px] font-black uppercase tracking-tight truncate">
                  {selectedDelivery ? (deliveryTime ? deliveryTime.split(' - ')[0] : selectedDelivery.split(',')[1] || selectedDelivery) : 'Delivery Time'}
                </h4>
              </div>
            </button>
            <div className="mt-1.5 flex items-center justify-between border-t border-white/5 pt-1.5">
              <p className={`text-[6px] font-bold truncate uppercase tracking-widest ${selectedDelivery ? 'text-white/40' : 'text-slate-300'}`}>{isSameAsPickup ? 'Same' : (dropAddress ? dropAddress.type : 'Address')}</p>
              <button 
                onClick={() => isSameAsPickup ? setIsSameAsPickup(false) : (setActiveAddressType('delivery'), setShowAddressPicker(true))}
                className={`text-[6px] font-black uppercase px-1.5 py-0.5 rounded-md ${selectedDelivery ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-600'}`}
              >
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* 4. STICKY OPTIMIZED SEARCH & CATEGORY SECTION */}
        <div className={`${isHeaderSticky ? 'fixed top-[50px] left-0 right-0 z-[99] shadow-2xl px-4 py-2' : 'relative z-[90] px-1 py-5'} bg-white/95 backdrop-blur-2xl rounded-b-[2.2rem] border-b border-slate-100 mb-8 transition-all duration-500`}>
          <div className="max-w-5xl mx-auto w-full space-y-3">
            {/* MINI CATEGORIES - SLIM WHEN STICKY */}
            <section className="w-full">
              {!isHeaderSticky && (
                <div className="flex items-center justify-between mb-4 px-3">
                  <h3 className="text-[9px] font-black text-slate-900/40 uppercase tracking-[0.3em]">Quick Categories</h3>
                </div>
              )}

              <div className={`flex gap-2 overflow-x-auto hide-scrollbar px-1 ${isHeaderSticky ? 'pb-1' : 'pb-2'}`}>
                {categoriesLoading ? (
                  [...Array(5)].map((_, i) => <div key={i} className="min-w-[65px] h-16 bg-slate-50 rounded-xl animate-pulse" />)
                ) : (
                  categories.map(cat => (
                    <motion.button
                      key={cat.name}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCategoryClick(cat)}
                      className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${isHeaderSticky ? 'min-w-[55px] max-w-[55px] p-1.5 rounded-xl' : 'min-w-[68px] max-w-[68px] p-2.5 rounded-[1.8rem]'} border-2 ${selectedCategory?.name === cat.name ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                    >
                      <div className={`rounded-lg flex items-center justify-center shrink-0 transition-all ${isHeaderSticky ? 'w-6 h-6' : 'w-10 h-10'} ${selectedCategory?.name === cat.name ? 'bg-white/20' : 'bg-slate-50'}`}>
                        <span className={`material-symbols-outlined ${isHeaderSticky ? 'text-sm' : 'text-lg'} ${selectedCategory?.name === cat.name ? 'text-white' : 'text-slate-400'}`}>
                          {cat.name.toLowerCase().includes('dry') ? 'dry_cleaning' : cat.name.toLowerCase().includes('wash') ? 'local_laundry_service' : cat.name.toLowerCase().includes('iron') ? 'iron' : 'category'}
                        </span>
                      </div>
                      <span className={`font-black uppercase tracking-tighter leading-tight text-center ${isHeaderSticky ? 'text-[6px]' : 'text-[7px]'} ${selectedCategory?.name === cat.name ? 'text-white' : 'text-slate-500'}`}>{cat.name}</span>
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
            {/* SEARCH BAR - SLIM WHEN STICKY */}
            <div className="relative group px-1">
              <div className={`absolute inset-y-0 left-6 flex items-center pointer-events-none ${isHeaderSticky ? 'scale-75' : ''}`}>
                <span className={`material-symbols-outlined ${isHeritage ? 'text-[#996515]' : 'text-slate-900'} text-xl opacity-40 group-focus-within:opacity-100 transition-opacity`}>search</span>
              </div>
              <input 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className={`w-full bg-slate-100 border-2 border-slate-200/20 focus:border-slate-900 focus:bg-white rounded-full pr-8 ${isHeaderSticky ? 'pl-12 py-2.5 text-[10px]' : 'pl-16 py-4 text-[11px]'} font-black text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-sm`} 
                placeholder={isHeritage ? "Search..." : "Search services..."} 
              />
            </div>
          </div>
        </div>

        {/* 5. SERVICES LIST (CLEAN IMAGE-MATCHED DESIGN) */}
        <section className="mb-10 w-full px-2">
          <div className="flex items-center justify-between mb-6 px-2">
            <h3 className="text-[10px] font-black text-slate-900/40 uppercase tracking-[0.4em]">Available Services</h3>
          </div>
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
                    {/* Icon/Logo */}
                    <div onClick={() => handleServiceClick(serviceId, service, i)} className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden border border-slate-100/50 cursor-pointer">
                      {service.image ? <img src={service.image} alt="" className="w-full h-full object-cover" /> : <span className={`material-symbols-outlined text-2xl ${isSelected ? 'text-white' : 'text-slate-300'}`}>local_laundry_service</span>}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-black text-[10px] leading-tight mb-1 uppercase line-clamp-1 ${isSelected ? 'text-white' : 'text-slate-900'} tracking-tight`}>{service.name || service.itemName}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-[12px] font-black ${isSelected ? 'text-emerald-400' : 'text-slate-900'}`}>₹{Math.round((service.discountedPrice || service.basePrice || 0) * (pricingFactor || 1))}</span>
                        {(service.basePrice || 0) > (service.discountedPrice || 0) && <span className="text-[9px] font-bold line-through text-slate-300">₹{Math.round((service.basePrice || 0) * (pricingFactor || 1))}</span>}
                      </div>
                    </div>

                    {/* Quantity & Photo */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-slate-50 rounded-full p-1 border border-slate-100 shadow-inner">
                        <button onClick={() => updateQuantity(serviceId, -1)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-900 active:scale-90 transition-all"><span className="material-symbols-outlined text-[16px] font-black">remove</span></button>
                        <span className="text-[11px] font-black text-slate-900 px-3 min-w-[32px] text-center">{qty}</span>
                        <button onClick={() => updateQuantity(serviceId, 1)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-900 active:scale-90 transition-all"><span className="material-symbols-outlined text-[16px] font-black">add</span></button>
                      </div>
                      
                      {isSelected && (
                        <button 
                          onClick={() => { setActiveServiceForPhoto(serviceId); setTimeout(() => document.getElementById('photo-upload').click(), 10); }}
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${itemPhotos[serviceId]?.length > 0 ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-slate-300 border border-slate-100 shadow-sm hover:text-slate-900'}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">{uploading && activeServiceForPhoto === serviceId ? 'sync' : 'add_a_photo'}</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
          <input id="photo-upload" type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          {!showMoreServices && !selectedCategory && !selectedSubCategory && !searchQuery && filteredServices.length >= 10 && (
            <div className="flex justify-center mt-6"><button onClick={() => setShowMoreServices(true)} className="px-6 py-2 rounded-xl bg-slate-50 text-slate-400 font-black text-[8px] uppercase tracking-widest hover:text-slate-900 transition-all">View All Services</button></div>
          )}
        </section>

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

        {/* 7. FLOATING CART BAR */}
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

        {/* 8. SLOT PICKER MODAL */}
        <AnimatePresence>
          {showSlotPicker && (
            <div className="fixed inset-0 z-[200] flex items-end justify-center p-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSlotPicker(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-lg bg-white rounded-t-[3rem] p-8 shadow-2xl flex flex-col gap-6 overflow-y-auto max-h-[85vh] hide-scrollbar">
                <div className="flex justify-between items-center"><h3 className="text-2xl font-black tracking-tighter uppercase leading-none">SELECT <br />{activeSlotType} SLOT.</h3><button onClick={() => setShowSlotPicker(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><span className="material-symbols-outlined">close</span></button></div>
                <div className="space-y-6">
                  <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Select Date</p>
                    <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
                      {availableDates.map((d, i) => {
                        const dateStr = `${d.day}, ${d.date}`;
                        const isSelected = (activeSlotType === 'pickup' ? selectedPickup : selectedDelivery)?.includes(d.date);
                        let isDisabled = false;
                        if (activeSlotType === 'delivery' && selectedPickup && pickupTime) {
                          const pickupDT = getSlotDateTime(selectedPickup, pickupTime);
                          const currentDT = getSlotDateTime(dateStr, timeSlots[timeSlots.length - 1]);
                          const minHours = isExpress ? 24 : 72;
                          const diffHours = (currentDT - pickupDT) / (1000 * 60 * 60);
                          if (diffHours < minHours) isDisabled = true;
                        }
                        return (<button key={i} disabled={isDisabled} onClick={() => activeSlotType === 'pickup' ? setSelectedPickup(dateStr) : setSelectedDelivery(dateStr)} className={`min-w-[90px] p-4 rounded-[1.5rem] border transition-all flex flex-col items-center gap-1 ${isDisabled ? 'opacity-20 cursor-not-allowed grayscale' : (isSelected ? 'bg-black text-white border-black' : 'bg-slate-50 text-slate-400 border-slate-100')}`}><span className="text-[9px] font-black uppercase tracking-widest opacity-60">{d.day}</span><span className="text-sm font-black tracking-tighter">{d.date}</span></button>);
                      })}
                    </div>
                  </div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Select Time Window (2 Hours)</p>
                    <div className="grid grid-cols-2 gap-2">
                                            {timeSlots.map((slot) => {
                        const isSelected = (activeSlotType === 'pickup' ? pickupTime : deliveryTime) === slot;
                        let isDisabled = false;
                        
                        // 1. Logic for Delivery min-gap
                        if (activeSlotType === 'delivery' && selectedPickup && pickupTime && selectedDelivery) {
                          const pickupDT = getSlotDateTime(selectedPickup, pickupTime);
                          const deliveryDT = getSlotDateTime(selectedDelivery, slot);
                          const minHours = isExpress ? 24 : 72;
                          const diffHours = (deliveryDT - pickupDT) / (1000 * 60 * 60);
                          if (diffHours < minHours) isDisabled = true;
                        }

                        // 2. Logic for Past Time Slots (Today only)
                        const isToday = (activeSlotType === 'pickup' ? selectedPickup : selectedDelivery)?.includes('TODAY');
                        if (isToday) {
                          const [slotStart] = slot.split(' - ');
                          const slotDT = getSlotDateTime(activeSlotType === 'pickup' ? selectedPickup : selectedDelivery, slot);
                          if (slotDT && slotDT < new Date()) isDisabled = true;
                        }

                        return (<button key={slot} disabled={isDisabled} onClick={() => activeSlotType === 'pickup' ? setPickupTime(slot) : setDeliveryTime(slot)} className={`py-4 rounded-2xl border text-[10px] font-black uppercase tracking-tight transition-all ${isDisabled ? 'opacity-20 cursor-not-allowed grayscale' : (isSelected ? 'bg-black text-white border-black shadow-lg shadow-black/20' : 'bg-slate-50 text-slate-400 border-slate-100')}`}>{slot}</button>);
                      })}
                    </div>
                  </div>
                </div>
                  {/* ADDRESS SELECTION SECTION */}
                  <div className="pt-6 border-t border-slate-100 space-y-6">
                    <div className="flex items-center justify-between px-2">
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{activeSlotType === 'pickup' ? 'Pickup' : 'Delivery'} Address</p>
                        <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">Select where we should visit</p>
                      </div>
                      <button 
                        onClick={() => { setShowSlotPicker(false); setShowAddressPicker(true); }} 
                        className="text-[9px] font-black text-slate-900 uppercase tracking-widest bg-slate-50 hover:bg-black hover:text-white px-4 py-2 rounded-xl transition-all duration-300 border border-slate-200/50 shadow-sm"
                      >
                        Change
                      </button>
                    </div>
                    
                    <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm shadow-slate-200/50 group transition-all hover:shadow-md active:scale-[0.98]">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-black group-hover:text-white transition-colors">
                          <span className="material-symbols-outlined text-xl">location_on</span>
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-[11px] font-black uppercase text-slate-900 tracking-tight">
                            {(activeSlotType === 'pickup' ? pickupAddress : (isSameAsPickup ? pickupAddress : dropAddress))?.type || 'Not Set'}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {(activeSlotType === 'pickup' ? pickupAddress : (isSameAsPickup ? pickupAddress : dropAddress))?.fullAddress || (activeSlotType === 'pickup' ? 'Please select pickup address' : 'Please select delivery address')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {activeSlotType === 'pickup' && (
                      <div className="flex items-center justify-between bg-slate-950 p-5 rounded-[2.2rem] shadow-2xl shadow-slate-200 border border-white/5 overflow-hidden relative">
                        <div className="absolute right-0 top-0 p-8 opacity-[0.03] rotate-12 pointer-events-none">
                          <span className="material-symbols-outlined text-6xl text-white">swap_calls</span>
                        </div>
                        <div className="flex items-center gap-4 relative z-10">
                          <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white/40 text-lg">swap_calls</span>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-white uppercase tracking-widest">Deliver to different address?</p>
                            <p className="text-[7px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Toggle for separate drop-off</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setIsSameAsPickup(!isSameAsPickup)}
                          className={`w-14 h-7 rounded-full transition-all relative z-10 ${!isSameAsPickup ? 'bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'bg-white/10'}`}
                        >
                          <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-500 ${!isSameAsPickup ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>
                    )}

                    {!isSameAsPickup && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-2">
                        <div className="flex items-center justify-between px-2">
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Delivery Address</p>
                            <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">Final destination for your garments</p>
                          </div>
                          <button 
                            onClick={() => { setShowSlotPicker(false); setShowAddressPicker(true); }} 
                            className="text-[9px] font-black text-slate-900 uppercase tracking-widest bg-slate-50 hover:bg-black hover:text-white px-4 py-2 rounded-xl transition-all duration-300 border border-slate-200/50 shadow-sm"
                          >
                            Change
                          </button>
                        </div>
                        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm shadow-slate-200/50 group transition-all hover:shadow-md active:scale-[0.98]">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-black group-hover:text-white transition-colors">
                              <span className="material-symbols-outlined text-xl text-slate-400">local_shipping</span>
                            </div>
                            <div className="flex-1 pt-1">
                              <p className="text-[11px] font-black uppercase text-slate-900 tracking-tight">{dropAddress?.type || 'Not Set'}</p>
                              <p className="text-[10px] font-bold text-slate-500 mt-1 line-clamp-2 leading-relaxed">{dropAddress?.fullAddress || 'Please select an address for delivery'}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                <button 
                  onClick={() => setShowSlotPicker(false)} 
                  className="w-full bg-black text-white py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] mt-8 shadow-[0_20px_40px_rgba(0,0,0,0.15)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Confirm Selection
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
        </AnimatePresence>
      </main>
    </div>
  );
};

export default HomePage;
