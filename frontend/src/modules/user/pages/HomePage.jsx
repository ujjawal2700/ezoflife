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

  const [selectedPickup, setSelectedPickup] = useState(() => localStorage.getItem('pickup_date') || '');
  const [pickupTime, setPickupTime] = useState(() => localStorage.getItem('pickup_time') || '');

  const [selectedDelivery, setSelectedDelivery] = useState(() => localStorage.getItem('delivery_date') || '');
  const [deliveryTime, setDeliveryTime] = useState(() => localStorage.getItem('delivery_time') || '');

  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [activeSlotType, setActiveSlotType] = useState('pickup');

  // Address sequential logic
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [activeAddressType, setActiveAddressType] = useState('pickup'); // 'pickup' or 'drop'
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
  const [itemPhotos, setItemPhotos] = useState(() => {
    const saved = localStorage.getItem('item_photos');
    return saved ? JSON.parse(saved) : {};
  });
  const [activeServiceForPhoto, setActiveServiceForPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);


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
          masterServiceApi.getAll({ serviceType: customerType }),
          serviceApi.getAll({ approvedOnly: true, serviceType: customerType })
        ]);

        data = [
          ...(Array.isArray(masterRes) ? masterRes.map(s => ({ ...s, isMaster: true })) : []),
          ...(Array.isArray(customRes) ? customRes.map(s => ({ ...s, isMaster: false })) : [])
        ];
      } catch (err) {
        console.error('Fetch error:', err);
      }

      const filtered = data.map(s => {
        // Normalize Category & SubCategory
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

  const [showMoreServices, setShowMoreServices] = useState(false);

  const filteredServices = useMemo(() => {
    let result = services.filter(s => {
      // Tier filter
      if ((s.tier || 'Essential') !== selectedTier) return false;

      // Search filter
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      // Category filter (Main Category name comparison)
      if (selectedCategory) {
        if (s.mainCategory !== selectedCategory.name) return false;
      }

      // Sub-category filter
      if (selectedSubCategory) {
        if (s.subCategoryName !== selectedSubCategory.name) return false;
      }

      return true;
    });

    // If no category/search is active, limit to 10 by default
    if (!selectedCategory && !selectedSubCategory && !searchQuery && !showMoreServices) {
      return result.slice(0, 10);
    }

    return result;
  }, [services, selectedTier, searchQuery, selectedCategory, selectedSubCategory, showMoreServices]);

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
  const cartTotal = useMemo(() => {
    return Object.entries(selectedQuantities).reduce((acc, [id, q]) => {
      // Find service in both master and custom services
      const service = services.find(s => (s._id?.toString() === id || s.id?.toString() === id));
      if (!service) return acc;

      const actualPrice = service.discountedPrice || service.totalPrice || service.basePrice || 0;
      const price = actualPrice * (pricingFactor || 1);
      return acc + (price * q);
    }, 0);
  }, [selectedQuantities, services, pricingFactor]);

  // NEW: Smart scheduling logic for delivery
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

      // Default to same time slot as pickup if not set
      if (!deliveryTime && pickupTime) {
        setDeliveryTime(pickupTime);
      }
    }
  }, [selectedPickup, maxServiceTime, availableDates, pickupTime, deliveryTime]);

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
      setItemPhotos(prev => ({
        ...prev,
        [activeServiceForPhoto]: [...(prev[activeServiceForPhoto] || []), ...uploaded]
      }));
    } catch (error) {
      console.error('Upload Error:', error);
      alert('Photo upload failed');
    } finally {
      setUploading(false);
      setActiveServiceForPhoto(null);
      e.target.value = ''; // Reset input
    }
  };

  const removeItemPhoto = (serviceId, index) => {
    setItemPhotos(prev => ({
      ...prev,
      [serviceId]: prev[serviceId].filter((_, i) => i !== index)
    }));
  };

  const handleCartClick = () => {
    if (Object.keys(selectedQuantities).length === 0) return alert('Please select at least one service');
    
    // Save selections to localStorage for CartPage to pick up
    if (selectedPickup) localStorage.setItem('pickup_date', selectedPickup);
    if (pickupTime) localStorage.setItem('pickup_time', pickupTime);
    if (selectedDelivery) localStorage.setItem('delivery_date', selectedDelivery);
    if (deliveryTime) localStorage.setItem('delivery_time', deliveryTime);
    localStorage.setItem('is_express', isExpress.toString());
    localStorage.setItem('order_notes', orderNotes);
    if (pickupAddress) localStorage.setItem('pickup_address', JSON.stringify(pickupAddress));
    if (dropAddress) localStorage.setItem('drop_address', JSON.stringify(dropAddress));

    const token = localStorage.getItem('token');
    if (!token) { navigate('/user/auth'); return; }
    navigate('/user/cart');
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
    locationService.getCurrentCoordinates()
      .then(async (coords) => {
        try {
          const addressData = await locationService.reverseGeocode(coords.lat, coords.lng);
          setCustomAddress(addressData.fullAddress);
          const liveAddr = {
            id: 'live',
            type: 'LIVE',
            address: addressData.fullAddress,
            location: { lat: coords.lat, lng: coords.lng }
          };
          setPickupAddress(liveAddr);
          if (isSameAsPickup) setDropAddress(liveAddr);
          setShowAddressForm(true);
        } catch (error) {
          console.error('Error geocoding:', error);
          alert('Could not get address from location');
        } finally {
          setIsLocating(false);
        }
      })
      .catch((error) => {
        console.error('Geolocation error:', error);
        alert('Location access denied or timed out');
        setIsLocating(false);
      });
  };

  const handleCustomAddressChange = (val) => {
    setCustomAddress(val);
    const newAddr = { id: 'custom', type: 'MANUAL', address: val, location: null };
    setPickupAddress(newAddr);
    if (isSameAsPickup) setDropAddress(newAddr);
  };

  const [isHeaderSticky, setIsHeaderSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Logic: If scrolled past the promo/scheduling area (approx 350px)
      // but we can also use a ref for better accuracy
      if (window.scrollY > 350) {
        setIsHeaderSticky(true);
      } else {
        setIsHeaderSticky(false);
      }
    };

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
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <div className="text-on-surface min-h-[100dvh] flex flex-col">
      <main className="flex-1 pt-0 pb-36 px-6 max-w-5xl mx-auto w-full">
        {/* Spacer for Fixed Header */}
        <div className="h-[50px] shrink-0" />

        {/* 1. TOP PROMO BANNER */}
        <section className="mt-4 mb-8 w-full relative px-2">
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

        {/* 2. Tier Toggle & Logistics Priority Row */}
        <div className="flex flex-row items-center gap-4 mb-8">
          {/* TIER TOGGLE (LEFT) */}
          <div className="flex-1 bg-slate-100 p-0.5 rounded-[1.8rem] border border-slate-200 flex gap-0.5 shadow-sm">
            {['Essential', 'Heritage'].map(tier => (
              <button 
                key={tier} 
                onClick={() => setSelectedTier(tier)} 
                className={`flex-1 py-2 rounded-[1.4rem] font-black text-[9px] uppercase tracking-widest transition-all ${selectedTier === tier ? (tier === 'Heritage' ? 'bg-[#996515]' : 'bg-black') + ' text-white shadow-md' : 'text-slate-500 hover:text-black'}`}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* LOGISTICS PRIORITY (RIGHT) */}
          <div className="flex-1 bg-slate-100 p-0.5 rounded-[1.8rem] border border-slate-200 flex gap-0.5 shadow-sm">
            <button 
              onClick={() => setIsExpress(false)} 
              className={`flex-1 py-2 rounded-[1.4rem] font-black text-[9px] uppercase tracking-widest transition-all ${!isExpress ? 'bg-black text-white shadow-md' : 'text-slate-400 hover:text-slate-900'}`}
            >
              Normal (₹{normalLogisticsFee})
            </button>
            <button 
              onClick={() => setIsExpress(true)} 
              className={`flex-1 py-2 rounded-[1.4rem] font-black text-[9px] uppercase tracking-widest transition-all ${isExpress ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-900'}`}
            >
              Express (₹{expressCharge})
            </button>
          </div>
        </div>

        {/* 3. NEW COMPACT SCHEDULING & ADDRESS SECTION - NO SCROLL */}
        <div className="flex flex-row gap-1.5 mb-6 items-stretch px-1">
          {/* PICKUP SLOT */}
          <button 
            onClick={() => { setActiveSlotType('pickup'); setShowSlotPicker(true); }}
            className={`flex-1 p-1.5 rounded-xl border-[1.5px] text-center transition-all ${selectedPickup ? 'bg-slate-900 text-white border-transparent' : 'bg-slate-50 border-slate-100'}`}
          >
            <span className="material-symbols-outlined text-[12px] mb-0.5 block">calendar_today</span>
            <p className="text-[6px] font-black uppercase tracking-tighter opacity-60 leading-none mb-0.5">Pickup</p>
            <p className="text-[7.5px] font-black truncate leading-tight">
              {selectedPickup ? (pickupTime ? pickupTime.split(' - ')[0] : selectedPickup.split(',')[1] || selectedPickup) : 'Set'}
            </p>
          </button>

          {/* DELIVERY SLOT */}
          <button 
            onClick={() => { setActiveSlotType('delivery'); setShowSlotPicker(true); }}
            className={`flex-1 p-1.5 rounded-xl border-[1.5px] text-center transition-all ${selectedDelivery ? 'bg-slate-900 text-white border-transparent' : 'bg-slate-50 border-slate-100'}`}
          >
            <span className="material-symbols-outlined text-[12px] mb-0.5 block">local_shipping</span>
            <p className="text-[6px] font-black uppercase tracking-tighter opacity-60 leading-none mb-0.5">Delivery</p>
            <p className="text-[7.5px] font-black truncate leading-tight">
              {selectedDelivery ? (deliveryTime ? deliveryTime.split(' - ')[0] : selectedDelivery.split(',')[1] || selectedDelivery) : 'Set'}
            </p>
          </button>

          {/* PICKUP ADDRESS */}
          <div 
            onClick={() => {
              setActiveAddressType('pickup');
              setShowAddressPicker(true);
            }}
            className={`flex-1 p-1.5 rounded-xl border-[1.5px] text-center transition-all cursor-pointer ${pickupAddress ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}
          >
            <span className="material-symbols-outlined text-[12px] text-emerald-600 mb-0.5 block">location_on</span>
            <p className="text-[6px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-0.5">Address</p>
            <p className="text-[7.5px] font-black text-slate-900 truncate uppercase leading-tight">
              {pickupAddress ? (pickupAddress.type || 'Selected') : 'Set'}
            </p>
          </div>

          {/* SAME AS TOGGLE / DROP ADDRESS */}
          <div className="flex-1 flex flex-col gap-1">
             <button 
               onClick={() => {
                 const newVal = !isSameAsPickup;
                 setIsSameAsPickup(newVal);
                 if(newVal) setDropAddress(pickupAddress);
               }}
               className={`flex-1 p-1 rounded-lg border-[1.5px] flex flex-col items-center justify-center transition-all ${isSameAsPickup ? 'bg-emerald-500 border-transparent text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
             >
               <span className="material-symbols-outlined text-[10px]">{isSameAsPickup ? 'sync' : 'sync_disabled'}</span>
               <p className="text-[5px] font-black uppercase tracking-tighter mt-0.5 leading-none">Same</p>
             </button>

             {!isSameAsPickup && (
               <button 
                 onClick={() => {
                   setActiveAddressType('drop');
                   setShowAddressPicker(true);
                 }}
                 className={`flex-1 p-1 rounded-lg border-[1.5px] flex flex-col items-center justify-center transition-all ${dropAddress ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
               >
                 <span className="material-symbols-outlined text-[10px]">home_pin</span>
                 <p className="text-[5px] font-black uppercase tracking-tighter mt-0.5 leading-none">Drop</p>
               </button>
             )}
          </div>
        </div>

        {/* STICKY SEARCH & CATEGORY SECTION */}
        <div className={`${isHeaderSticky ? 'fixed top-[50px] left-0 right-0 z-[99] shadow-xl px-6' : 'relative z-[90] px-2'} bg-slate-50/95 backdrop-blur-xl py-4 border-b border-slate-100/50 transition-all duration-300`}>
          <div className="max-w-5xl mx-auto w-full">
            {/* Search Bar */}
            <div className="mb-4">
              <div className={`relative flex items-center bg-white rounded-[1.5rem] px-6 py-3.5 shadow-sm border ${isHeritage ? 'border-[#D4AF37]/30' : 'border-slate-200'} transition-all`}>
                <span className={`material-symbols-outlined ${isHeritage ? 'text-[#996515]' : 'text-slate-400'} mr-4 text-lg`}>search</span>
                <input 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="bg-transparent border-none focus:ring-0 outline-none p-0 text-sm w-full placeholder:text-slate-300 font-bold" 
                  placeholder={isHeritage ? "Search premium care..." : "Search services..."} 
                />
              </div>
            </div>

            {/* Categories Section */}
            <section className="w-full overflow-hidden">
              <div className="flex items-center justify-between mb-3 px-2">
                <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-[0.4em]">Select Category</h3>
                {selectedCategory && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => { setSelectedCategory(null); setSelectedSubCategory(null); setSubCategories([]); }}
                    className="text-[8px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-1 rounded-lg border border-rose-100"
                  >
                    Reset
                  </motion.button>
                )}
              </div>

            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar px-1">
              {categoriesLoading ? (
                [...Array(4)].map((_, i) => <div key={i} className="min-w-[70px] h-20 bg-white rounded-[1.2rem] animate-pulse border border-slate-100" />)
              ) : (
                categories.map(cat => (
                  <motion.button
                    key={cat.name}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCategoryClick(cat)}
                    className={`flex flex-col items-center gap-1.5 min-w-[70px] max-w-[70px] p-2.5 rounded-[1.5rem] border-2 transition-all duration-500 ${selectedCategory?.name === cat.name
                      ? 'bg-slate-950 text-white border-slate-950 shadow-lg'
                      : 'bg-white text-slate-900 border-slate-100 shadow-sm hover:border-slate-200'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-inner transition-all duration-500 ${selectedCategory?.name === cat.name ? 'bg-white/20' : 'bg-slate-50'
                      }`}>
                      <span className={`material-symbols-outlined text-[16px] ${selectedCategory?.name === cat.name ? 'text-white' : 'text-slate-400'}`}>
                        {cat.name.toLowerCase().includes('dry') ? 'dry_cleaning' :
                          cat.name.toLowerCase().includes('wash') ? 'local_laundry_service' :
                            cat.name.toLowerCase().includes('iron') ? 'iron' : 'category'}
                      </span>
                    </div>
                    <span className={`text-[6.5px] font-black uppercase tracking-tighter leading-tight text-center ${selectedCategory?.name === cat.name ? 'text-white' : 'text-slate-900'}`}>
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
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 flex gap-2 overflow-x-auto pb-2 hide-scrollbar px-1"
                >
                  {subCategories.map(sub => (
                    <motion.button
                      key={sub._id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedSubCategory(selectedSubCategory?._id === sub._id ? null : { ...sub, name: sub.subCategory })}
                      className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 shadow-sm ${selectedSubCategory?._id === sub._id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                    >
                      {sub.subCategory}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </div>


        {/* 5. Service Selection Grid */}
        <section className="mb-10 w-full">
          <div className="flex items-center justify-between mb-6 px-2">
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em]">Available Services</h3>
          </div>

          <div className={`flex flex-col gap-3 ${showMoreServices ? 'max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
            {loading ? (
              [...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-3xl p-4 h-24 border border-black/5 animate-pulse" />)
            ) : (
              filteredServices.map((service, i) => {
                const serviceId = service._id || service.id;
                const qty = selectedQuantities[serviceId] || 0;
                const isSelected = qty > 0;
                return (
                  <motion.div 
                    key={serviceId} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-[2rem] p-3 flex flex-row items-center gap-4 border-2 transition-all duration-300 ${isSelected 
                      ? 'border-slate-900 bg-slate-900 shadow-xl shadow-slate-200 scale-[1.02]' 
                      : 'bg-white border-slate-100'}`}
                  >
                    {/* 1. LOGO */}
                    <div 
                      onClick={() => handleServiceClick(serviceId, service, i)} 
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-inner cursor-pointer border transition-all duration-500 ${isSelected 
                        ? 'bg-white/10 border-white/20' 
                        : 'bg-slate-50 border-slate-50'}`}
                    >
                      {service.image ? (
                        <img src={service.image} alt="" className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'scale-110 opacity-80' : ''}`} />
                      ) : (
                        <span className={`material-symbols-outlined text-2xl ${isSelected ? 'text-white' : (isHeritage ? 'text-[#996515]' : 'text-slate-400')}`}>local_laundry_service</span>
                      )}
                    </div>

                    {/* 2. NAME & PRICE */}
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-black text-[11px] leading-tight mb-1 uppercase truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>{service.name || service.itemName}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-[12px] font-black ${isSelected ? 'text-emerald-400' : (isHeritage ? 'text-[#996515]' : 'text-slate-900')}`}>
                          ₹{Math.round((service.discountedPrice || service.basePrice || 0) * (pricingFactor || 1))}
                        </span>
                        {(service.basePrice || 0) > (service.discountedPrice || 0) && (
                          <span className={`text-[9px] font-bold line-through ${isSelected ? 'text-white/40' : 'text-slate-300'}`}>
                            ₹{Math.round((service.basePrice || 0) * (pricingFactor || 1))}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 3. CONTROLS (Quantity + Photo) */}
                    <div className="flex items-center gap-3">
                      {/* Quantity Selector */}
                      <div className="flex items-center bg-white rounded-xl border border-slate-100 p-0.5 shadow-sm">
                        <button 
                          onClick={() => updateQuantity(serviceId, -1)} 
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-black transition-all"
                        >
                          <span className="material-symbols-outlined text-[14px] font-black">remove</span>
                        </button>
                        <span className="text-[11px] font-black text-slate-900 px-2 min-w-[24px] text-center">{qty}</span>
                        <button 
                          onClick={() => updateQuantity(serviceId, 1)} 
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-black transition-all"
                        >
                          <span className="material-symbols-outlined text-[14px] font-black">add</span>
                        </button>
                      </div>

                      {/* Photo Upload Icon */}
                      <div className="flex flex-col items-center">
                        <button 
                          onClick={() => {
                            setActiveServiceForPhoto(serviceId);
                            setTimeout(() => document.getElementById('photo-upload').click(), 10);
                          }}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${itemPhotos[serviceId]?.length > 0 ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-50 text-slate-300 hover:text-black hover:bg-slate-100'}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {uploading && activeServiceForPhoto === serviceId ? 'sync' : 'add_a_photo'}
                          </span>
                        </button>
                        {itemPhotos[serviceId]?.length > 0 && (
                          <span className="text-[6px] font-black text-emerald-600 uppercase tracking-tighter mt-0.5">
                            {itemPhotos[serviceId].length}P
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* View All Button */}
          {!showMoreServices && !selectedCategory && !selectedSubCategory && !searchQuery && filteredServices.length >= 10 && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setShowMoreServices(true)}
                className="px-8 py-3 rounded-2xl bg-white border-2 border-slate-100 text-slate-900 font-black text-[10px] uppercase tracking-widest hover:border-black transition-all shadow-sm flex items-center gap-2 group"
              >
                View All Services
                <span className="material-symbols-outlined text-sm group-hover:translate-y-0.5 transition-transform">expand_more</span>
              </button>
            </div>
          )}

          {showMoreServices && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setShowMoreServices(false)}
                className="px-6 py-2 rounded-xl bg-slate-50 text-slate-400 font-black text-[9px] uppercase tracking-widest hover:text-slate-900 transition-all"
              >
                Show Less
              </button>
            </div>
          )}
        </section>

        {/* 4. LOGISTICS SETUP CARD */}
        {cartItemsCount > 0 && (
          <section className="mb-8 space-y-4">
            <div className="bg-white rounded-[3rem] p-8 md:p-10 border border-slate-100 shadow-2xl shadow-slate-200/40 relative overflow-hidden">
              <div className="absolute right-0 top-0 p-10 opacity-5">
                <span className="material-symbols-outlined text-8xl">logistics</span>
              </div>

              <div className="flex flex-col gap-10">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">1. Order Instructions</p>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Example: Be careful with the buttons, special stain on collar..."
                    className="w-full bg-slate-50 border border-slate-100 p-5 rounded-[2rem] focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold text-slate-800 text-xs min-h-[100px] resize-none"
                  />
                </div>
                {/* Global photo upload removed as per request. Photos are now per-item. */}
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
                <div className="flex justify-between items-center"><h3 className="text-2xl font-black tracking-tighter uppercase leading-none">SELECT <br />{activeSlotType} SLOT.</h3><button onClick={() => setShowSlotPicker(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><span className="material-symbols-outlined">close</span></button></div>
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

        {/* 7. ADDRESS PICKER MODAL */}
        <AnimatePresence>
          {showAddressPicker && (
            <div className="fixed inset-0 z-[200] flex items-end justify-center p-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddressPicker(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-lg bg-white rounded-t-[3rem] p-8 shadow-2xl flex flex-col gap-6 overflow-y-auto max-h-[85vh] hide-scrollbar">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">SELECT <br />{activeAddressType} ADDRESS.</h3>
                  <button onClick={() => setShowAddressPicker(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Saved Addresses List */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Saved Addresses</p>
                    <div className="flex flex-col gap-3">
                      {savedAddresses.map((addr) => (
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
                          className={`w-full p-6 rounded-[2rem] border-2 text-left transition-all flex items-center justify-between ${(activeAddressType === 'pickup' ? pickupAddress : dropAddress)?.id === addr.id ? 'bg-black text-white border-black shadow-xl' : 'bg-slate-50 border-slate-100 hover:border-black'}`}
                        >
                          <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-xl">{addr.type === 'HOME' ? 'home' : addr.type === 'OFFICE' ? 'business' : 'location_on'}</span>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{addr.type}</span>
                              <p className="text-xs font-bold line-clamp-1">{addr.address}</p>
                            </div>
                          </div>
                          {(activeAddressType === 'pickup' ? pickupAddress : dropAddress)?.id === addr.id && (
                            <span className="material-symbols-outlined text-emerald-400">check_circle</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Add New / Custom Address */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">New Address</p>
                    <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-4">
                       <textarea
                         value={customAddress}
                         onChange={(e) => setCustomAddress(e.target.value)}
                         placeholder="Enter new address details here..."
                         className="w-full bg-white border border-slate-200 p-5 rounded-[1.5rem] focus:ring-4 focus:ring-black/5 outline-none transition-all font-bold text-slate-800 text-xs min-h-[100px] resize-none"
                       />
                       <button 
                         onClick={() => {
                           if (!customAddress) return alert('Please enter an address');
                           const newAddr = { id: Date.now(), type: 'OTHER', address: customAddress };
                           if (activeAddressType === 'pickup') {
                             setPickupAddress(newAddr);
                             if (isSameAsPickup) setDropAddress(newAddr);
                           } else {
                             setDropAddress(newAddr);
                           }
                           setShowAddressPicker(false);
                           setCustomAddress('');
                         }}
                         className="w-full bg-black text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-black/20"
                       >
                         Use This Address
                       </button>
                       <button 
                         onClick={() => navigate('/user/profile/addresses')}
                         className="w-full bg-white text-slate-400 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-slate-100"
                       >
                         Manage Saved Addresses
                       </button>
                    </div>
                  </div>
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
