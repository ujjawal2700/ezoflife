import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { serviceApi, masterServiceApi, authApi, categoryApi, mediaApi, geofenceApi } from '../../../lib/api';
import { shippingConfigApi } from '../../../lib/shippingApi';
import { useLocationStore } from '../../../shared/stores/locationStore';
import { locationService } from '../../../lib/locationService';
import { requestForToken } from '../../../lib/firebase';

const HomePage = () => {
  console.log('HomePage Rendering');
  const navigate = useNavigate();
  const { location, setLocation, setPromptOpen, setPickerOpen, pricingFactor, zone, setZoneData, allowDiscount, expressMultiplier, heritageMultiplier } = useLocationStore();

  const updateGeofenceForAddress = async (addressStr) => {
    if (!addressStr) return;
    try {
      console.log(`[Geofence] Geocoding pickup address: ${addressStr}`);
      const coords = await locationService.geocodeAddress(addressStr);
      if (coords && coords.lat !== undefined && coords.lng !== undefined) {
        console.log(`[Geofence] Geocoded address to coordinates: ${coords.lat}, ${coords.lng}`);
        const zoneInfo = await geofenceApi.checkAvailability(coords.lat, coords.lng);
        if (zoneInfo.available) {
          setZoneData({ 
            name: zoneInfo.name, 
            pricingFactor: zoneInfo.pricingFactor, 
            allowDiscount: zoneInfo.allowDiscount,
            platformMultiplier: zoneInfo.platformMultiplier,
            expressMultiplier: zoneInfo.expressMultiplier,
            heritageMultiplier: zoneInfo.heritageMultiplier
          });
          console.log(`[Geofence] Zone matches: ${zoneInfo.name} (Multiplier: ${zoneInfo.pricingFactor}x, Discount Allowed: ${zoneInfo.allowDiscount}, Express Multiplier: ${zoneInfo.expressMultiplier}x, Heritage Multiplier: ${zoneInfo.heritageMultiplier}x)`);
        } else {
          setZoneData({ name: null, pricingFactor: 1, allowDiscount: false, platformMultiplier: 0, expressMultiplier: 1, heritageMultiplier: 1 });
          console.log('[Geofence] Address not in any service zone, using default pricing.');
        }
      }
    } catch (err) {
      console.error('[Geofence] Error in updateGeofenceForAddress:', err);
    }
  };

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

  // Removed misplaced useEffect hook to avoid accessing pickupAddress before initialization.

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState(() => localStorage.getItem('selected_tier')); 
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // LOGISTICS STATE
  const [isExpress, setIsExpress] = useState(() => {
    const saved = localStorage.getItem('is_express');
    return saved === null ? null : saved === 'true';
  });
  const [expressCharge, setExpressCharge] = useState(0);
  const [normalLogisticsFee, setNormalLogisticsFee] = useState(0);

  const availableDates = useMemo(() => {
    const dates = [];
    const now = new Date();
    for (let i = 0; i < 5; i++) { // Restricted to 5 days
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
    
    // Parse Date
    let d;
    const [dayPart, datePart] = dateStr.split(', ');
    
    // Find the corresponding date from availableDates to be precise
    const foundDate = availableDates.find(ad => ad.date === datePart);
    if (foundDate) {
      d = new Date(foundDate.raw);
    } else {
      d = new Date(datePart + ' ' + new Date().getFullYear());
    }

    // Parse Time (e.g., "07:00 AM - 09:00 AM")
    const [timeRange] = timeStr.split(' - ');
    const [time, modifier] = timeRange.split(' ');
    let [hours, minutes] = time.split(':');
    
    let h = parseInt(hours, 10);
    if (h === 12) h = 0;
    if (modifier === 'PM') h += 12;

    d.setHours(h, parseInt(minutes, 10), 0, 0);
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

  const [openDropdown, setOpenDropdown] = useState(null); // 'address', 'date', 'time', etc.
  const [activePhotoService, setActivePhotoService] = useState(null);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let timeoutId;
    if (!location && !pickupAddress) {
      timeoutId = setTimeout(() => setPromptOpen(true), 1500);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [location, pickupAddress, setPromptOpen]);

  // --- 24H/72H GAP VALIDATION ---
  useEffect(() => {
    if (selectedPickup && pickupTime && selectedDelivery && deliveryTime) {
      const pDT = getSlotDateTime(selectedPickup, pickupTime);
      const dDT = getSlotDateTime(selectedDelivery, deliveryTime);
      if (pDT && dDT) {
        const diffH = (dDT - pDT) / (1000 * 60 * 60);
        const minH = isExpress ? 24 : 72;
        if (diffH < minH) {
          // Reset drop-off selection if invalid
          setSelectedDelivery('');
          setDeliveryTime('');
          localStorage.removeItem('delivery_date');
          localStorage.removeItem('delivery_time');
        }
      }
    }
  }, [isExpress, selectedPickup, pickupTime, selectedDelivery, deliveryTime]);
  const [isLocating, setIsLocating] = useState(false);
  const [addressDetails, setAddressDetails] = useState({
    line1: '',
    line2: '',
    floor: '',
    landmark: '',
    pincode: '',
    city: '',
    state: ''
  });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressFormData, setAddressFormData] = useState({
    type: 'Other'
  });

  useEffect(() => {
    if (pickupAddress && pickupAddress.address) {
      updateGeofenceForAddress(pickupAddress.address);
      return;
    }

    if (location) {
      const recheckZone = async () => {
        try {
          const zoneInfo = await geofenceApi.checkAvailability(location.lat, location.lng);
          if (zoneInfo.available) {
            setZoneData({ 
              name: zoneInfo.name, 
              pricingFactor: zoneInfo.pricingFactor, 
              allowDiscount: zoneInfo.allowDiscount,
              platformMultiplier: zoneInfo.platformMultiplier,
              expressMultiplier: zoneInfo.expressMultiplier,
              heritageMultiplier: zoneInfo.heritageMultiplier
            });
          } else {
            setZoneData({ name: null, pricingFactor: 1, allowDiscount: false, platformMultiplier: 0, expressMultiplier: 1, heritageMultiplier: 1 });
          }
        } catch (err) {
          console.error('Silent zone check failed:', err);
        }
      };
      recheckZone();
    } else {
      setZoneData({ name: null, pricingFactor: 1, allowDiscount: false, platformMultiplier: 0, expressMultiplier: 1, heritageMultiplier: 1 });
    }
  }, [location, pickupAddress, setZoneData]);

  const handleSaveCustomAddress = async () => {
    const { line1, line2, floor, landmark, pincode, city, state } = addressDetails;
    if (!line1 || !city || !state) return alert('Please fill in required address fields (Line 1, City, State)');
    
    const formattedAddress = `${line1}${line2 ? ', ' + line2 : ''}${floor ? ', ' + floor : ''}${landmark ? ' (Near ' + landmark + ')' : ''}, ${city}, ${state} - ${pincode}`;
    
    const newAddr = {
      id: Date.now().toString(),
      type: addressFormData.type,
      address: formattedAddress,
      fullAddress: formattedAddress,
      details: addressDetails // Keep details for editing if needed later
    };

    // Update Local State
    setSavedAddresses(prev => [...prev, newAddr]);

    if (activeAddressType === 'pickup') {
      setPickupAddress(newAddr);
      if (isSameAsPickup) setDropAddress(newAddr);
      updateGeofenceForAddress(newAddr.address);
    } else {
      setDropAddress(newAddr);
    }

    // Sync to Backend Profile if logged in
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = userData._id || userData.id;
      if (userId) {
        const currentProfile = await authApi.getProfile(userId);
        const existingAddresses = currentProfile.addresses || [];
        
        // DEDUPLICATE: If Home/Office, replace existing; if Other, append.
        let newAddressesList = [];
        if (newAddr.type === 'Home' || newAddr.type === 'Office') {
          newAddressesList = [
            ...existingAddresses.filter(a => a.type !== newAddr.type),
            { type: newAddr.type, address: newAddr.address }
          ];
        } else {
          newAddressesList = [...existingAddresses, { type: newAddr.type, address: newAddr.address }];
        }

        await authApi.updateProfile(userId, {
          addresses: newAddressesList
        });
        toast.success('Address saved to profile');
      }
    } catch (err) {
      console.error('Error saving address to profile:', err);
    }

    setShowAddressForm(false);
    setShowAddressPicker(false);
    setShowSlotPicker(true); // Re-open the slot picker after saving
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

  // --- BACKEND CART SYNC ---
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasLoadedCart, setHasLoadedCart] = useState(false);

  useEffect(() => {
    const loadCart = async () => {
        try {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = userData._id || userData.id;
            if (userId) {
                const cart = await authApi.getDraftCart(userId);
                if (cart && Object.keys(cart).length > 0) {
                    if (cart.selectedQuantities) setSelectedQuantities(cart.selectedQuantities);
                    if (cart.selectedTier) setSelectedTier(cart.selectedTier);
                    if (cart.isExpress !== undefined) setIsExpress(cart.isExpress);
                    if (cart.pickup) {
                        setSelectedPickup(cart.pickup.date || '');
                        setPickupTime(cart.pickup.time || '');
                        setPickupAddress(cart.pickup.address || null);
                    }
                    if (cart.delivery) {
                        setSelectedDelivery(cart.delivery.date || '');
                        setDeliveryTime(cart.delivery.time || '');
                        setDropAddress(cart.delivery.address || null);
                    }
                    if (cart.orderNotes) setOrderNotes(cart.orderNotes);
                    if (cart.itemPhotos) setItemPhotos(cart.itemPhotos);
                }
            }
            setHasLoadedCart(true);
        } catch (err) {
            console.error('Failed to load cart:', err);
            setHasLoadedCart(true);
        }
    };
    loadCart();
  }, []);

  // Sync effect
  useEffect(() => {
    if (!hasLoadedCart) return;

    const syncCart = async () => {
        try {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = userData._id || userData.id;
            if (!userId) return;

            const cartData = {
                selectedQuantities,
                selectedTier,
                isExpress,
                pickup: { date: selectedPickup, time: pickupTime, address: pickupAddress },
                delivery: { date: selectedDelivery, time: deliveryTime, address: dropAddress },
                orderNotes,
                itemPhotos
            };
            
            await authApi.updateDraftCart(userId, cartData);
        } catch (err) {
            console.error('Failed to sync cart:', err);
        }
    };

    const timeout = setTimeout(syncCart, 2000); // Debounce sync
    return () => clearTimeout(timeout);
  }, [selectedQuantities, selectedTier, isExpress, selectedPickup, pickupTime, selectedDelivery, deliveryTime, pickupAddress, dropAddress, orderNotes, itemPhotos, hasLoadedCart]);

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
        
        // Update localStorage to keep it in sync with backend
        localStorage.setItem('user', JSON.stringify(profile));

        let addrList = [];
        const seenAddresses = new Set();
        
        if (profile.addresses && Array.isArray(profile.addresses)) {
          profile.addresses.forEach((a, idx) => {
            const aAddr = a.address?.trim() || '';
            const aType = (a.type || '').toUpperCase();
            
            // EXTREMELY STRICT FILTERING + DEDUPLICATION
            const isPlaceholder = 
              aAddr.length < 15 || 
              aAddr.toLowerCase().includes('not set') || 
              aAddr.toLowerCase().includes('address line') ||
              aAddr.toLowerCase().includes('placeholder') ||
              aType === 'PROFILE' || 
              aType === 'NA';

            if (!isPlaceholder && !seenAddresses.has(aAddr.toLowerCase())) {
              seenAddresses.add(aAddr.toLowerCase());
              addrList.push({ 
                id: a._id || `addr_${idx}`, 
                type: aType || 'HOME', 
                address: aAddr, 
                location: a.location,
                isDefault: !!a.isDefault
              });
            }
          });
        }

        setSavedAddresses(addrList);

        // Synchronize selected addresses
        if (addrList.length > 0) {
          const isPickupStillValid = pickupAddress && addrList.some(a => a.id === pickupAddress.id);
          const defaultAddr = addrList.find(a => a.isDefault);
          const finalPickupAddr = defaultAddr || (isPickupStillValid ? pickupAddress : addrList[0]);
          setPickupAddress(finalPickupAddr);
          if (finalPickupAddr) {
            updateGeofenceForAddress(finalPickupAddr.address);

            // Sync default address to useLocationStore
            let finalLat = finalPickupAddr.location?.lat || 0;
            let finalLng = finalPickupAddr.location?.lng || 0;
            
            if (!finalLat && !finalLng && finalPickupAddr.address) {
              try {
                const coords = await locationService.geocodeAddress(finalPickupAddr.address);
                if (coords) {
                  finalLat = coords.lat;
                  finalLng = coords.lng;
                }
              } catch (e) {
                console.error('[Geocoding] Error during default address load:', e);
              }
            }

            setLocation({
              fullAddress: finalPickupAddr.address,
              city: finalPickupAddr.city || '',
              area: finalPickupAddr.type || 'HOME',
              lat: finalLat,
              lng: finalLng
            });

            // Make sure the localStorage variable 'pickup_address' is also in sync
            const pickupAddressObj = {
              id: finalPickupAddr.id || finalPickupAddr._id,
              type: (finalPickupAddr.type || 'HOME').toUpperCase(),
              address: finalPickupAddr.address,
              location: { lat: finalLat, lng: finalLng },
              isDefault: !!finalPickupAddr.isDefault
            };
            localStorage.setItem('pickup_address', JSON.stringify(pickupAddressObj));
          }
          
          const isDropStillValid = dropAddress && addrList.some(a => a.id === dropAddress.id);
          if (!isDropStillValid && isSameAsPickup) setDropAddress(finalPickupAddr || addrList[0]);
        } else {
          setPickupAddress(null);
          setDropAddress(null);
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
      
      // Fetch all categories to check which ones are active
      const activeCategoryIds = new Set();
      try {
        const allCats = await categoryApi.getAll();
        if (Array.isArray(allCats)) {
          allCats.filter(c => c.isActive).forEach(c => activeCategoryIds.add(c._id.toString()));
        }
      } catch (err) {
        console.error('Error loading active categories:', err);
      }

      let data = [];
      try {
        const [masterRes, customRes] = await Promise.all([
          masterServiceApi.getAll({ serviceType: customerType, activeOnly: true }),
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
        
        // Category must be active
        const sCatId = s.categoryId?._id || s.categoryId || s.category?._id || s.category;
        const isCategoryActive = sCatId ? activeCategoryIds.has(sCatId.toString()) : true;

        const isCurrIndActive = s.isMaster ? (String(s.curr_ind || 'y').toLowerCase() === 'y') : true;

        return isActive && isApproved && isMatch && isCategoryActive && isCurrIndActive;
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
    // If user has a location but no valid active zone, show services using global prices (fall back pricingFactor = 1)
    // if (location && !zone) return [];

    let result = services.filter(s => {
      if (s.tier === 'Heritage' && selectedTier !== 'Heritage') return false;
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedCategory && s.mainCategory !== selectedCategory.name) return false;
      if (selectedSubCategory && s.subCategoryName !== selectedSubCategory.name) return false;
      return true;
    });
    if (!selectedCategory && !selectedSubCategory && !searchQuery && !showMoreServices) return result.slice(0, 10);
    return result;
  }, [services, selectedTier, searchQuery, selectedCategory, selectedSubCategory, showMoreServices]);

  const updateQuantity = (id, delta) => {
    if (delta > 0 && !isLogisticsValid) {
      toast.error('Please select Pickup and Drop-off details first');
      setShowSlotPicker(true);
      return;
    }
    const current = selectedQuantities[id] || 0;
    const next = Math.max(0, current + delta);
    
    if (delta > 0) {
      const service = services.find(s => (s._id?.toString() === id || s.id?.toString() === id));
      if (service?.vendorId) localStorage.setItem('last_visited_vendor_id', service.vendorId);
      
      // Auto-open photo modal on quantity 0 -> 1 transition
      if (current === 0 && next === 1) {
        setActivePhotoService({ id, name: service?.name || service?.itemName });
      }
    }
    
    if (next === 0) {
      setItemPhotos(prev => {
        const { [id]: _, ...rest } = prev;
        localStorage.setItem('item_photos', JSON.stringify(rest));
        return rest;
      });
    }

    setSelectedQuantities(prev => {
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
      const service = services.find(s => (s._id?.toString() === id || s.id?.toString() === id));
      if (!service) return acc;
      const actualPrice = (allowDiscount !== false) ? (service.discountedPrice || service.basePrice || 0) : (service.basePrice || 0);
      const isHeritage = selectedTier === 'Heritage';
      const price = actualPrice * (pricingFactor || 1) * (isExpress ? (expressMultiplier || 1) : 1) * (isHeritage ? (heritageMultiplier || 1) : 1);
      return acc + (price * q);
    }, 0);
  }, [selectedQuantities, services, pricingFactor, isExpress, expressMultiplier, selectedTier, heritageMultiplier]);

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


  const handleCartClick = () => {
    if (Object.keys(selectedQuantities).length === 0) {
      toast.error('Please select at least one service');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) { navigate('/user/auth'); return; }

    // Enforce mandatory image uploads for any selected service
    for (const [id, qty] of Object.entries(selectedQuantities)) {
      if (qty > 0) {
        const photos = itemPhotos[id] || [];
        if (photos.length === 0) {
          const service = services.find(s => (s._id?.toString() === id || s.id?.toString() === id));
          toast.error(`Please upload at least one photo for "${service?.name || 'selected service'}" before going to cart.`);
          setActivePhotoService({ id, name: service?.name || service?.itemName });
          return;
        }
      }
    }

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
          price: `₹${service.totalPrice}.00`, totalPrice: service.totalPrice, basePrice: service.basePrice,
          allowDiscount: allowDiscount !== false
        }
      }
    });
    if (service.vendorId) localStorage.setItem('last_visited_vendor_id', service.vendorId);
  };

  const handleLiveLocation = () => {
    const updateDetails = (data) => {
      setAddressDetails({
        line1: data.area || '',
        line2: data.subLocal || '',
        floor: '',
        landmark: '',
        pincode: data.pincode || '',
        city: data.city || '',
        state: data.state || ''
      });
    };

    if (location) {
      updateDetails(location);
      setShowAddressForm(true);
      return;
    }

    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    setIsLocating(true);
    locationService.getCurrentCoordinates().then(async (coords) => {
      try {
        const addressData = await locationService.reverseGeocode(coords.lat, coords.lng);
        updateDetails(addressData);
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
    if (selectedTier) localStorage.setItem('selected_tier', selectedTier);
    if (isExpress !== null) localStorage.setItem('is_express', isExpress);
    if (pickupAddress) localStorage.setItem('pickup_address', JSON.stringify(pickupAddress));
    if (dropAddress) localStorage.setItem('drop_address', JSON.stringify(dropAddress));
  }, [deliveryConfirmed, selectedPickup, pickupTime, selectedDelivery, deliveryTime, selectedTier, isExpress, pickupAddress, dropAddress]);

  // Sync Drop Address if same as Pickup
  useEffect(() => {
    if (isSameAsPickup && pickupAddress) {
      setDropAddress(pickupAddress);
    }
  }, [isSameAsPickup, pickupAddress]);

  const handlePhotoFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !activePhotoService) return;
    
    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('media', file);
        const res = await mediaApi.upload(formData);
        if (res.url) {
          uploadedUrls.push(res.url);
        }
      }

      setItemPhotos(prev => {
        const updated = { 
          ...prev, 
          [activePhotoService.id]: [...(prev[activePhotoService.id] || []), ...uploadedUrls] 
        };
        localStorage.setItem('item_photos', JSON.stringify(updated));
        return updated;
      });
      
      toast.success('Photos uploaded successfully!');
    } catch (error) {
      console.error('Upload Error:', error);
      toast.error('Failed to upload photos');
    } finally {
      setUploading(false);
      setActivePhotoService(null);
      e.target.value = ''; // Reset input
    }
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
          <div className="flex-1 h-12 flex gap-1.5 shrink-0">
            {['Essential', 'Heritage'].map(tier => (
              <button 
                key={tier} 
                onClick={() => {
                  setSelectedTier(tier);
                  setDeliveryConfirmed(true);
                }} 
                className={`flex-1 h-full rounded-xl font-black text-[7.5px] uppercase tracking-tighter transition-all duration-300 border ${selectedTier === tier ? (tier === 'Heritage' ? 'bg-[#996515] border-[#996515]' : 'bg-black border-black') + ' text-white shadow-lg' : 'bg-white text-slate-500 border-slate-100 shadow-sm'}`}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* Pickup & Drop-off - Depends on Delivery Type */}
          <button 
            disabled={!selectedTier}
            onClick={() => setShowSlotPicker(true)}
            className={`flex-1 h-12 rounded-xl font-black text-[7.5px] uppercase tracking-[0.05em] border transition-all flex flex-row items-center justify-center gap-1.5 ${!selectedTier ? 'opacity-50 grayscale cursor-not-allowed bg-white text-slate-400 border-slate-100' : 'bg-slate-950 text-white border-slate-950 shadow-xl'}`}
          >
            <span className="material-symbols-outlined text-[14px] leading-none">calendar_today</span>
            <span className="text-left">Schedule Pickup and Drop-off</span>
          </button>
        </div>

        {/* 4. STICKY OPTIMIZED SEARCH & CATEGORY SECTION - Full Visibility */}
        <div className="transition-all duration-500 opacity-100">
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
                        className={`flex flex-row items-center justify-center transition-all duration-300 ${isHeaderSticky ? 'min-w-[70px] px-3 py-1.5 rounded-lg' : 'min-w-[80px] px-4 py-2.5 rounded-xl'} border-2 ${selectedCategory?.name === cat.name ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                      >
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
                // Grouping Logic for Home Page
                Object.entries(
                  filteredServices.reduce((acc, service) => {
                    const catName = service.mainCategory || 'Services';
                    if (!acc[catName]) acc[catName] = [];
                    acc[catName].push(service);
                    return acc;
                  }, {})
                ).map(([categoryName, catServices]) => (
                  <div key={categoryName} className="space-y-3 mb-6">
                    {!selectedCategory && (
                      <div className="flex items-center gap-3 px-2">
                        <span className="text-[7px] font-black uppercase tracking-[0.3em] text-primary">{categoryName}</span>
                        <div className="h-px flex-1 bg-slate-100" />
                      </div>
                    )}
                    
                    {catServices.map((service, i) => {
                      const serviceId = service._id || service.id;
                      const qty = selectedQuantities[serviceId] || 0;
                      const isSelected = qty > 0;
                      return (
                        <motion.div 
                          key={serviceId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                          className={`rounded-[1.5rem] p-2.5 flex flex-row items-center gap-3 border transition-all duration-500 ${isSelected ? 'bg-slate-900 border-slate-900 shadow-xl scale-[1.01]' : 'bg-white border-slate-100 shadow-sm'}`}
                        >
                          {/* Left: Info Block */}
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h4 className={`font-black text-[9px] uppercase line-clamp-1 tracking-tight mb-0.5 ${isSelected ? 'text-white' : 'text-slate-900'}`}>{service.name || service.itemName}</h4>
                            <div className="flex gap-1 items-center">
                              <span className={`text-[6px] font-black uppercase tracking-widest ${isSelected ? 'text-white/40' : 'text-slate-400'}`}>{service.mainCategory || 'Cat'}</span>
                              <span className={`w-0.5 h-0.5 rounded-full ${isSelected ? 'bg-white/20' : 'bg-slate-200'}`} />
                              <span className={`text-[6px] font-black uppercase tracking-widest ${isSelected ? 'text-white/40' : 'text-slate-400'}`}>{service.subCategoryName || 'Sub'}</span>
                            </div>
                          </div>

                          {/* Right: Price & Actions */}
                          <div className="flex items-center gap-2.5 shrink-0">
                            {/* Price */}
                            <div className="flex flex-col items-end">
                              <span className={`text-[11px] font-black ${isSelected ? 'text-emerald-400' : 'text-slate-900'}`}>
                                ₹{Math.round(((allowDiscount !== false ? (service.discountedPrice || service.basePrice) : service.basePrice) || 0) * (pricingFactor || 1) * (isExpress ? (expressMultiplier || 1) : 1) * (isHeritage ? (heritageMultiplier || 1) : 1))}
                              </span>
                              {(allowDiscount !== false && (service.basePrice || 0) > (service.discountedPrice || 0)) && (
                                <span className="text-[8px] font-bold line-through text-slate-300">
                                  ₹{Math.round((service.basePrice || 0) * (pricingFactor || 1) * (isExpress ? (expressMultiplier || 1) : 1) * (isHeritage ? (heritageMultiplier || 1) : 1))}
                                </span>
                              )}
                            </div>

                            {/* Qty Controls */}
                            <div className={`flex items-center rounded-lg p-0.5 border shadow-inner ${isSelected ? 'bg-white/10 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
                              <button onClick={() => updateQuantity(serviceId, -1)} className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${isSelected ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}><span className="material-symbols-outlined text-[12px] font-black">remove</span></button>
                              <span className={`text-[9px] font-black px-1.5 min-w-[20px] text-center ${isSelected ? 'text-white' : 'text-slate-900'}`}>{qty}</span>
                              <button onClick={() => updateQuantity(serviceId, 1)} className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${isSelected ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}><span className="material-symbols-outlined text-[12px] font-black">add</span></button>
                            </div>

                            {/* Camera */}
                            {isSelected && (
                              <button 
                                onClick={() => setActivePhotoService({ id: serviceId, name: service.name || service.itemName })} 
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${itemPhotos[serviceId]?.length > 0 ? 'bg-emerald-500 text-white shadow-md' : 'bg-white/10 text-white/40 border border-white/10 hover:text-white'}`}
                              >
                                <span className="material-symbols-outlined text-[14px]">add_a_photo</span>
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
        {!showMoreServices && !selectedCategory && !selectedSubCategory && !searchQuery && filteredServices.length >= 10 && (
            <div className="flex justify-center mt-6"><button onClick={() => setShowMoreServices(true)} className="px-6 py-2 rounded-xl bg-slate-50 text-slate-400 font-black text-[8px] uppercase tracking-widest hover:text-slate-900 transition-all">View All Services</button></div>
          )}




        {/* 8. SLOT PICKER MODAL */}
        {/* 8. COMBINED PICKUP & DROP-OFF MODAL */}
        <AnimatePresence>
          {showSlotPicker && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => {
                  if (isLogisticsValid) {
                    setShowSlotPicker(false);
                  } else {
                    toast.error('Please complete and confirm your pickup and drop-off logistics first');
                  }
                }} 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.9, opacity: 0, y: 20 }} 
                className="relative w-full max-w-[280px] bg-white rounded-[2rem] p-4 shadow-2xl flex flex-col gap-2 overflow-y-auto max-h-[85vh] hide-scrollbar border border-slate-100"
              >
                <div className="flex justify-between items-center">
                  <div /> {/* Spacer for alignment */}
                  <button 
                    onClick={() => setShowSlotPicker(false)} 
                    className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {/* 1. Delivery Type Toggle - NOW AT THE TOP */}
                  <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200 flex gap-0.5">
                    {['Normal', 'Express'].map(type => (
                      <button 
                        key={type}
                        onClick={() => {
                          setIsExpress(type === 'Express');
                          setDeliveryConfirmed(true);
                        }}
                        className={`flex-1 py-1.5 rounded-lg font-black text-[7px] uppercase tracking-widest transition-all ${((type === 'Express' && isExpress === true) || (type === 'Normal' && isExpress === false)) ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-400'}`}
                      >
                        {type === 'Normal' ? 'Normal Delivery' : 'Express Delivery'}
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
                      {/* Custom Address Dropdown */}
                      <div className="relative">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Select Address</p>
                        <button 
                          onClick={() => setOpenDropdown(openDropdown === 'address' ? null : 'address')}
                          className="w-full bg-white px-3 py-2 rounded-xl border border-slate-100 text-[9px] font-black uppercase tracking-tight text-left flex justify-between items-center shadow-sm"
                        >
                          <span className={pickupAddress ? 'text-slate-900' : 'text-slate-300'}>
                            {pickupAddress ? pickupAddress.type.toUpperCase() : 'Choose Address'}
                          </span>
                          <span className={`material-symbols-outlined text-slate-400 text-sm transition-transform ${openDropdown === 'address' ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>
                        
                        <AnimatePresence>
                          {openDropdown === 'address' && (
                            <motion.div 
                              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                              className="absolute z-[210] top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden"
                            >
                              <div className="max-h-32 overflow-y-auto">
                                {savedAddresses.map(addr => (
                                  <button 
                                    key={addr.id}
                                    onClick={() => {
                                      setPickupAddress(addr);
                                      if (isSameAsPickup) setDropAddress(addr);
                                      setOpenDropdown(null);
                                      updateGeofenceForAddress(addr.address);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-[9px] font-black uppercase hover:bg-slate-50 border-b border-slate-50 last:border-0"
                                  >
                                    {addr.type}
                                  </button>
                                ))}
                                <button 
                                  onClick={() => {
                                    setActiveAddressType('pickup');
                                    setShowSlotPicker(false);
                                    setShowAddressForm(true);
                                    setOpenDropdown(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-[9px] font-black uppercase text-emerald-600 hover:bg-emerald-50"
                                >
                                  + Enter New Address
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Custom Date Dropdown */}
                      <div className="relative">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Date</p>
                        <button 
                          onClick={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
                          className="w-full bg-white px-3 py-2 rounded-xl border border-slate-100 text-[9px] font-black uppercase tracking-tight text-left flex justify-between items-center shadow-sm"
                        >
                          <span className={selectedPickup ? 'text-slate-900' : 'text-slate-300'}>
                            {selectedPickup || 'Select Date'}
                          </span>
                          <span className={`material-symbols-outlined text-slate-400 text-sm transition-transform ${openDropdown === 'date' ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>
                        
                        <AnimatePresence>
                          {openDropdown === 'date' && (
                            <motion.div 
                              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                              className="absolute z-[210] top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden"
                            >
                              <div className="max-h-32 overflow-y-auto">
                                {availableDates.slice(0, 6).map((d, i) => (
                                  <button 
                                    key={i}
                                    onClick={() => {
                                      setSelectedPickup(`${d.day}, ${d.date}`);
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-[9px] font-black uppercase hover:bg-slate-50 border-b border-slate-50 last:border-0"
                                  >
                                    {d.day}, {d.date}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Custom Time Dropdown */}
                      <div className="relative">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Time</p>
                        <button 
                          onClick={() => setOpenDropdown(openDropdown === 'time' ? null : 'time')}
                          className="w-full bg-white px-3 py-2 rounded-xl border border-slate-100 text-[9px] font-black uppercase tracking-tight text-left flex justify-between items-center shadow-sm"
                        >
                          <span className={pickupTime ? 'text-slate-900' : 'text-slate-300'}>
                            {pickupTime || 'Select Time'}
                          </span>
                          <span className={`material-symbols-outlined text-slate-400 text-sm transition-transform ${openDropdown === 'time' ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>
                        
                        <AnimatePresence>
                          {openDropdown === 'time' && (
                            <motion.div 
                              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                              className="absolute z-[210] top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden"
                            >
                              <div className="max-h-32 overflow-y-auto">
                                {timeSlots.filter(slot => {
                                  if (!selectedPickup || !selectedPickup.startsWith('TODAY')) return true;
                                  const [timePart] = slot.split(' - ');
                                  const [time, modifier] = timePart.split(' ');
                                  let [hours] = time.split(':');
                                  let h = parseInt(hours, 10);
                                  if (h === 12) h = 0;
                                  if (modifier === 'PM') h += 12;
                                  const now = new Date();
                                  const slotTime = new Date();
                                  slotTime.setHours(h, 0, 0, 0);
                                  return slotTime > new Date(now.getTime() + 60 * 60 * 1000);
                                }).map((slot) => (
                                  <button 
                                    key={slot}
                                    onClick={() => {
                                      setPickupTime(slot);
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-[9px] font-black uppercase hover:bg-slate-50 border-b border-slate-50 last:border-0"
                                  >
                                    {slot}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* --- DROP-OFF SECTION --- */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 px-1">
                      <div className="w-4 h-4 rounded bg-amber-500/10 flex items-center justify-center text-amber-600">
                        <span className="material-symbols-outlined text-[10px]">local_shipping</span>
                      </div>
                      <p className="text-[7px] font-black text-slate-900 uppercase tracking-widest">2. Drop-off</p>
                    </div>
                    
                    <div className="space-y-2 bg-slate-50 p-2 rounded-[1.2rem] border border-slate-100">
                      {/* Same as Pickup Toggle */}
                       <div className="flex items-center justify-between px-1">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Same as Pickup Address</span>
                          <button 
                            onClick={() => {
                              setIsSameAsPickup(!isSameAsPickup);
                              if (!isSameAsPickup) setDropAddress(pickupAddress);
                            }}
                            className={`w-7 h-3.5 rounded-full transition-all relative ${isSameAsPickup ? 'bg-emerald-500' : 'bg-slate-300'}`}
                          >
                            <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-all ${isSameAsPickup ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                       </div>

                       {/* Conditional Drop-off Address Dropdown - MOVED HERE */}
                       {!isSameAsPickup && (
                        <div className="relative mt-2">
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Drop-off Address</p>
                          <button 
                            onClick={() => setOpenDropdown(openDropdown === 'dropAddress' ? null : 'dropAddress')}
                            className="w-full bg-white px-3 py-2 rounded-xl border border-slate-100 text-[9px] font-black uppercase tracking-tight text-left flex justify-between items-center shadow-sm"
                          >
                            <span className={dropAddress && dropAddress.id !== pickupAddress?.id ? 'text-slate-900' : 'text-slate-300'}>
                              {(dropAddress && dropAddress.id !== pickupAddress?.id) ? dropAddress.type.toUpperCase() : 'Select Drop Address'}
                            </span>
                            <span className={`material-symbols-outlined text-slate-400 text-sm transition-transform ${openDropdown === 'dropAddress' ? 'rotate-180' : ''}`}>expand_more</span>
                          </button>
                          
                          <AnimatePresence>
                            {openDropdown === 'dropAddress' && (
                              <motion.div 
                                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                                className="absolute z-[210] top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden"
                              >
                                <div className="max-h-32 overflow-y-auto">
                                  {savedAddresses.map(addr => (
                                    <button 
                                      key={addr.id}
                                      onClick={() => {
                                        setDropAddress(addr);
                                        setOpenDropdown(null);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-[9px] font-black uppercase hover:bg-slate-50 border-b border-slate-50 last:border-0"
                                    >
                                      {addr.type}
                                    </button>
                                  ))}
                                  <button 
                                    onClick={() => {
                                      setActiveAddressType('drop');
                                      setShowSlotPicker(false);
                                      setShowAddressForm(true);
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-[9px] font-black uppercase text-emerald-600 hover:bg-emerald-50"
                                  >
                                    + Enter New Address
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Date Dropdown */}
                      <div className="relative">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Date</p>
                        <button 
                          disabled={!selectedPickup || !pickupTime}
                          onClick={() => setOpenDropdown(openDropdown === 'dropDate' ? null : 'dropDate')}
                          className={`w-full bg-white px-3 py-2 rounded-xl border border-slate-100 text-[9px] font-black uppercase tracking-tight text-left flex justify-between items-center shadow-sm ${(!selectedPickup || !pickupTime) ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
                        >
                          <span className={selectedDelivery ? 'text-slate-900' : 'text-slate-300'}>
                            {(!selectedPickup || !pickupTime) ? 'Select Pickup First' : (selectedDelivery || 'Select Date')}
                          </span>
                          <span className={`material-symbols-outlined text-slate-400 text-sm transition-transform ${openDropdown === 'dropDate' ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>
                        
                        <AnimatePresence>
                          {openDropdown === 'dropDate' && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                              className="absolute z-[210] top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden"
                            >
                              <div className="max-h-40 overflow-y-auto">
                                {availableDates.filter(d => {
                                  if (!selectedPickup || !pickupTime) return true;
                                  const dateStr = `${d.day}, ${d.date}`;
                                  const pDT = getSlotDateTime(selectedPickup, pickupTime);
                                  // A date is valid if its LAST slot satisfies the min gap
                                  const lastSlotDT = getSlotDateTime(dateStr, timeSlots[timeSlots.length - 1]);
                                  const minH = isExpress ? 24 : 72;
                                  return (lastSlotDT - pDT) / (1000 * 60 * 60) >= minH;
                                }).map((d, i) => {
                                  const dateStr = `${d.day}, ${d.date}`;
                                  return (
                                    <button 
                                      key={i}
                                      onClick={() => {
                                        setSelectedDelivery(dateStr);
                                        setOpenDropdown(null);
                                      }}
                                      className="w-full px-4 py-3 text-left text-[10px] font-black uppercase border-b border-slate-50 last:border-0 hover:bg-slate-50"
                                    >
                                      {d.day}, {d.date}
                                    </button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Time Dropdown */}
                      <div className="relative">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Time</p>
                        <button 
                          disabled={!selectedPickup || !pickupTime || !selectedDelivery}
                          onClick={() => setOpenDropdown(openDropdown === 'dropTime' ? null : 'dropTime')}
                          className={`w-full bg-white px-3 py-2 rounded-xl border border-slate-100 text-[9px] font-black uppercase tracking-tight text-left flex justify-between items-center shadow-sm ${(!selectedPickup || !pickupTime || !selectedDelivery) ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
                        >
                          <span className={deliveryTime ? 'text-slate-900' : 'text-slate-300'}>
                            {(!selectedPickup || !pickupTime || !selectedDelivery) ? 'Select Pickup/Date First' : (deliveryTime || 'Select Time')}
                          </span>
                          <span className={`material-symbols-outlined text-slate-400 text-sm transition-transform ${openDropdown === 'dropTime' ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>
                        
                        <AnimatePresence>
                          {openDropdown === 'dropTime' && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                              className="absolute z-[210] top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden"
                            >
                              <div className="max-h-40 overflow-y-auto">
                                {timeSlots.filter(slot => {
                                  if (!selectedPickup || !pickupTime || !selectedDelivery) return true;
                                  const pDT = getSlotDateTime(selectedPickup, pickupTime);
                                  const dDT = getSlotDateTime(selectedDelivery, slot);
                                  const minH = isExpress ? 24 : 72;
                                  return (dDT - pDT) / (1000 * 60 * 60) >= minH;
                                }).map((slot) => (
                                  <button 
                                    key={slot}
                                    onClick={() => {
                                      setDeliveryTime(slot);
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full px-4 py-3 text-left text-[10px] font-black uppercase border-b border-slate-50 last:border-0 hover:bg-slate-50"
                                  >
                                    {slot}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    if (!isLogisticsValid) {
                      toast.error("Please ensure all fields are selected.");
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
                      {['Home', 'Office', 'Other'].map(t => {
                        const isAlreadyPresent = savedAddresses.some(addr => addr.type?.toLowerCase() === t.toLowerCase());
                        const isDisabled = isAlreadyPresent;
                        
                        return (
                          <button
                            key={t}
                            disabled={isDisabled}
                            onClick={() => setAddressFormData(prev => ({ ...prev, type: t }))}
                            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all flex flex-col items-center justify-center gap-0.5
                              ${isDisabled ? 'opacity-30 grayscale cursor-not-allowed bg-slate-50 text-slate-300 border-slate-100' : 
                                addressFormData.type === t ? 'bg-black text-white border-black shadow-lg shadow-black/20' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                          >
                            <span>{t}</span>
                            {isDisabled && <span className="text-[6px] opacity-60 tracking-tight font-bold">(SAVED)</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Structured Address Inputs */}
                  <div className="space-y-4">
                    {/* Line 1 */}
                    <div className="space-y-1.5">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Address Line 1</p>
                      <input 
                        type="text" 
                        value={addressDetails.line1} 
                        onChange={(e) => setAddressDetails(prev => ({...prev, line1: e.target.value}))}
                        placeholder="Flat/House No, Building Name" 
                        className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 rounded-xl text-[10px] font-black text-slate-900 outline-none focus:bg-white focus:border-slate-950 transition-all shadow-sm"
                      />
                    </div>

                    {/* Line 2 */}
                    <div className="space-y-1.5">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Address Line 2</p>
                      <input 
                        type="text" 
                        value={addressDetails.line2} 
                        onChange={(e) => setAddressDetails(prev => ({...prev, line2: e.target.value}))}
                        placeholder="Street, Area Name" 
                        className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 rounded-xl text-[10px] font-black text-slate-900 outline-none focus:bg-white focus:border-slate-950 transition-all shadow-sm"
                      />
                    </div>

                    {/* Floor & Landmark */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Floor / Apt</p>
                        <input 
                          type="text" 
                          value={addressDetails.floor} 
                          onChange={(e) => setAddressDetails(prev => ({...prev, floor: e.target.value}))}
                          placeholder="e.g. 4th Floor" 
                          className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 rounded-xl text-[10px] font-black text-slate-900 outline-none shadow-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Landmark</p>
                        <input 
                          type="text" 
                          value={addressDetails.landmark} 
                          onChange={(e) => setAddressDetails(prev => ({...prev, landmark: e.target.value}))}
                          placeholder="Near Temple/Gym" 
                          className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 rounded-xl text-[10px] font-black text-slate-900 outline-none shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Pincode & City */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Pincode</p>
                        <input 
                          type="text" 
                          value={addressDetails.pincode} 
                          onChange={(e) => setAddressDetails(prev => ({...prev, pincode: e.target.value}))}
                          placeholder="6-digit ZIP" 
                          className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 rounded-xl text-[10px] font-black text-slate-900 outline-none shadow-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">City</p>
                        <input 
                          type="text" 
                          value={addressDetails.city} 
                          onChange={(e) => setAddressDetails(prev => ({...prev, city: e.target.value}))}
                          placeholder="City Name" 
                          className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 rounded-xl text-[10px] font-black text-slate-900 outline-none shadow-sm"
                        />
                      </div>
                    </div>

                    {/* State */}
                    <div className="space-y-1.5">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">State</p>
                      <input 
                        type="text" 
                        value={addressDetails.state} 
                        onChange={(e) => setAddressDetails(prev => ({...prev, state: e.target.value}))}
                        placeholder="State Name" 
                        className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 rounded-xl text-[10px] font-black text-slate-900 outline-none shadow-sm"
                      />
                    </div>
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
        <AnimatePresence>
          {cartItemsCount > 0 && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-[80px] right-6 z-[150]"
            >
                <button 
                  onClick={handleCartClick}
                  className="bg-primary text-white px-10 py-4.5 rounded-full font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl shadow-primary/50 active:scale-95 transition-all border-2 border-white/20"
                >
                  Review and Pay
                </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 11. PHOTO OPTIONS & MANAGEMENT MODAL */}
        <AnimatePresence>
          {activePhotoService && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-[320px] bg-white rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto hide-scrollbar border border-slate-100">
                <div className="flex justify-end">
                  <button onClick={() => setActivePhotoService(null)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>

                {/* Existing Photos Grid */}
                {itemPhotos[activePhotoService.id]?.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {itemPhotos[activePhotoService.id].map((photo, idx) => (
                        <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons: Add, Edit, Delete */}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => galleryInputRef.current.click()}
                        className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">add</span> Add
                      </button>
                      <button 
                        onClick={() => {
                          // Edit logic: for now, replace all with new selection
                          galleryInputRef.current.click();
                        }}
                        className="flex-1 bg-white border border-slate-200 text-slate-900 py-2.5 rounded-xl font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span> Edit
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm("Delete all photos for this item?")) {
                            setItemPhotos(prev => {
                              const { [activePhotoService.id]: _, ...rest } = prev;
                              return rest;
                            });
                          }
                        }}
                        className="flex-1 bg-rose-50 text-rose-600 py-2.5 rounded-xl font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span> Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  /* No Photos State: From Gallery Only */
                  <div className="flex flex-col items-center gap-4 py-4">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => galleryInputRef.current.click()}
                      className="w-full bg-slate-50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 border-2 border-transparent hover:border-slate-900 transition-all"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-900 shadow-sm border border-slate-100">
                        <span className="material-symbols-outlined text-2xl">photo_library</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Add Images</span>
                    </motion.button>
                  </div>
                )}
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
      </main>
    </div>
  );
};

export default HomePage;
