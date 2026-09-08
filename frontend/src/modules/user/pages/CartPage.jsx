import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShoppingBag, ShieldCheck, Tag, Sparkles, CheckCircle2, AlertCircle, Plus, Minus, Trash2, Camera, Calendar, Clock, MapPin, Truck, ChevronRight, X, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MASTER_SERVICES } from '../../../shared/data/sharedData';
import { orderApi, serviceApi, authApi, promotionApi, masterServiceApi, mediaApi, geofenceApi } from '../../../lib/api';
import { shippingConfigApi } from '../../../lib/shippingApi';
import { useLocationStore } from '../../../shared/stores/locationStore';
import toast from 'react-hot-toast';

import { Autocomplete } from '@react-google-maps/api';

const mapContainerStyle = { width: '100%', height: '400px' };
const defaultCenter = { lat: 22.7196, lng: 75.8577 }; // Indore as default

const CartPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedService = location.state?.selectedService;

  // Camera capture state
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    setCameraError('');
    setShowCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      setCameraStream(stream);
      // Attach to video element after state update
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera access was denied. Please allow camera access in your browser settings.'
          : err.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : 'Unable to open camera. Please try uploading from gallery instead.'
      );
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
    setCameraError('');
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      stopCamera();
      // Reuse handlePhotoFileChange by simulating a file list
      const dt = new DataTransfer();
      dt.items.add(file);
      const fakeEvent = { target: { files: dt.files } };
      await handlePhotoFileChange(fakeEvent);
    }, 'image/jpeg', 0.92);
  };

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
          masterServiceApi.getAll({ activeOnly: true }),
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
    localStorage.setItem('cart_quantities', JSON.stringify(quantities));
  }, [quantities]);

  useEffect(() => {
    // Only redirect after services have loaded AND quantities confirm nothing is in cart
    if (!loading && services.length > 0 && cartItems.length === 0) {
      navigate('/user/home');
    }
  }, [loading, services, cartItems, navigate]);
  
  const [expressMultiplier, setExpressMultiplier] = useState(1);
  const [platformMultiplier, setPlatformMultiplier] = useState(1);
  const [gstPercent, setGstPercent] = useState(18);
  const [normalLogisticsConfig, setNormalLogisticsConfig] = useState(50);
  const [globalFreeDeliveryThreshold, setGlobalFreeDeliveryThreshold] = useState(500);
  
  useEffect(() => {
    const fetchConfig = async () => {
        try {
            const configs = await shippingConfigApi.getConfig();
            const exMult = configs.find(c => c.key === 'express_multiplier');
            if (exMult) setExpressMultiplier(Number(exMult.value));
            const platMult = configs.find(c => c.key === 'platform_fee_multiplier');
            if (platMult) setPlatformMultiplier(Number(platMult.value));
            const gst = configs.find(c => c.key === 'gst_percent');
            if (gst) setGstPercent(Number(gst.value));
            const normalFee = configs.find(c => c.key === 'normal_logistics_fee');
            if (normalFee) setNormalLogisticsConfig(Number(normalFee.value));
            const threshold = configs.find(c => c.key === 'free_delivery_threshold');
            if (threshold) setGlobalFreeDeliveryThreshold(Number(threshold.value));
        } catch (err) {
            console.error('Error fetching delivery config:', err);
        }
    };
    fetchConfig();
  }, []);

  const [isExpress, setIsExpress] = useState(() => localStorage.getItem('is_express') === 'true');
  const [itemPhotos, setItemPhotos] = useState(() => {
    const saved = localStorage.getItem('item_photos');
    return saved ? JSON.parse(saved) : {};
  });
  const [activePhotoService, setActivePhotoService] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [garmentPhotos, setGarmentPhotos] = useState(() => {
    const saved = localStorage.getItem('order_photos');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedTier] = useState(() => {
    const saved = localStorage.getItem('selected_tier');
    if (saved === 'Essential' || saved === 'Heritage') return saved;
    return 'Essential'; // fallback to Essential instead of showing invalid tier
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
  const [selectedPickupAddress, setSelectedPickupAddress] = useState(() => {
    const saved = localStorage.getItem('pickup_address');
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedDropAddress, setSelectedDropAddress] = useState(() => {
    const saved = localStorage.getItem('drop_address');
    return saved ? JSON.parse(saved) : null;
  });
  const [isSameAddress, setIsSameAddress] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Online'); // Default to Online
  const [showPromoDropdown, setShowPromoDropdown] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const userRaw = localStorage.getItem('user');
        if (userRaw) {
          const user = JSON.parse(userRaw);
          const userId = user._id || user.id;
          if (userId) {
            const profile = await authApi.getProfile(userId);
            setWalletBalance(profile?.walletBalance || 0);
          }
        }
      } catch (err) {
        console.error('Error fetching wallet balance:', err);
      }
    };
    fetchWallet();
  }, []);

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

  // Sync Geofence Zone whenever selected pickup address changes
  useEffect(() => {
    const checkGeofenceForPickup = async () => {
      const lat = selectedPickupAddress?.location?.lat;
      const lng = selectedPickupAddress?.location?.lng;
      if (lat && lng) {
        try {
          const zoneInfo = await geofenceApi.checkAvailability(lat, lng);
          if (zoneInfo && zoneInfo.available) {
            useLocationStore.getState().setZoneData(zoneInfo);
          }
        } catch (err) {
          console.warn('⚠️ CartPage: Geofence check failed for pickup address:', err);
        }
      }
    };
    checkGeofenceForPickup();
  }, [selectedPickupAddress]);

  const updateQuantity = (id, delta) => {
    const current = quantities[id] || 0;
    const next = Math.max(0, current + delta);

    if (delta > 0 && current === 0 && next === 1) {
      const item = services.find(s => (s._id?.toString() === id || s.id?.toString() === id));
      setActivePhotoService({ id, name: item?.name || item?.itemName });
    }

    if (next === 0) {
      setItemPhotos(prev => {
        const { [id]: _, ...rest } = prev;
        localStorage.setItem('item_photos', JSON.stringify(rest));
        return rest;
      });
    }

    setQuantities(prev => {
      const nextQ = { ...prev };
      if (next === 0) delete nextQ[id];
      else nextQ[id] = next;
      return nextQ;
    });
  };

  const { pricingFactor, zone, allowDiscount, platformMultiplier: zonePlatformMultiplier, minPlatformFee: zoneMinPlatformFee, maxPlatformFee: zoneMaxPlatformFee, expressMultiplier: zoneExpressMultiplier, heritageMultiplier: zoneHeritageMultiplier, freeDeliveryThreshold: zoneFreeDeliveryThreshold } = useLocationStore();
  
  // Use zone platform multiplier if defined, otherwise fallback to global platformMultiplier config
  const rawPlatformMultiplier = (zone && zonePlatformMultiplier !== undefined && zonePlatformMultiplier !== null)
    ? zonePlatformMultiplier 
    : (platformMultiplier || 0);

  // Convert multiplier to rate: If multiplier >= 1 (e.g. 1.2 for 20%), rate is 0.2. If multiplier < 1 (e.g. 0.05 for 5%), rate is 0.05.
  const activePlatformRate = rawPlatformMultiplier >= 1 ? (rawPlatformMultiplier - 1) : rawPlatformMultiplier;

  const activeMinPlatformFee = zone ? (zoneMinPlatformFee || 0) : 0;
  const activeMaxPlatformFee = zone ? (zoneMaxPlatformFee || null) : null;
  const activeExpressMultiplier = zone ? (zoneExpressMultiplier !== undefined ? zoneExpressMultiplier : expressMultiplier) : expressMultiplier;
  const activeHeritageMultiplier = zone ? (zoneHeritageMultiplier !== undefined ? zoneHeritageMultiplier : 1) : 1;

  // Free delivery threshold: prioritize zone setting if > 0, otherwise fallback to global config (default 500)
  const activeFreeDeliveryThreshold = (zone && zoneFreeDeliveryThreshold !== undefined && zoneFreeDeliveryThreshold !== null && Number(zoneFreeDeliveryThreshold) > 0)
    ? Number(zoneFreeDeliveryThreshold)
    : (globalFreeDeliveryThreshold || 500);

  const getItemPrice = (item) => {
    // Priority: Respect showDiscountPrice or allowDiscount toggle from Master Service
    const basePrice = item.basePrice || item.totalPrice || 0;
    const discountedPrice = item.discountedPrice || basePrice;
    
    // If allowDiscount is false or showDiscountPrice is false, explicitly use basePrice
    const sourcePrice = (allowDiscount === false || item.showDiscountPrice === false) ? basePrice : discountedPrice;
    
    const isHeritage = selectedTier === 'Heritage';
    return Math.round(sourcePrice * (pricingFactor || 1) * (isHeritage ? (activeHeritageMultiplier || 1) : 1));
  };

  const areaMultiplier = 1; // Default to 1, can be linked to location later
  
  // V_Items = Base + (Base * (Express - 1)) + (Base * PlatformMultiplier)
  const currentExpressMultiplier = isExpress ? activeExpressMultiplier : 1;
  
  const subtotalBeforeLogistics = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      return acc + (getItemPrice(item) * (quantities[item._id || item.id] || 0) * areaMultiplier);
    }, 0);
  }, [cartItems, quantities, areaMultiplier, selectedTier, pricingFactor, allowDiscount, activeHeritageMultiplier]);

  const isFreeDelivery = activeFreeDeliveryThreshold > 0 && subtotalBeforeLogistics >= activeFreeDeliveryThreshold;
  const activeLogisticsFee = isFreeDelivery ? 0 : normalLogisticsConfig;

  const V_Items = useMemo(() => {
    const totalBase = subtotalBeforeLogistics;
    
    const expressSurcharge = totalBase * (currentExpressMultiplier - 1);
    const baseWithExpress = totalBase + expressSurcharge;
    
    let platformFee = baseWithExpress * activePlatformRate;
    if (activeMinPlatformFee > 0 && platformFee < activeMinPlatformFee) {
        platformFee = activeMinPlatformFee;
    }
    if (activeMaxPlatformFee > 0 && platformFee > activeMaxPlatformFee) {
        platformFee = activeMaxPlatformFee;
    }
    
    return totalBase + expressSurcharge + platformFee;
  }, [subtotalBeforeLogistics, currentExpressMultiplier, activePlatformRate, activeMinPlatformFee, activeMaxPlatformFee]);

  const V = V_Items + activeLogisticsFee;
  const taxAmount = useMemo(() => {
    const itemsGst = cartItems.reduce((acc, item) => {
      const itemBase = getItemPrice(item) * (quantities[item._id || item.id] || 0) * areaMultiplier;
      const expressSurcharge = itemBase * (currentExpressMultiplier - 1);
      const taxableValue = itemBase + expressSurcharge;
      
      const itemGstPercent = selectedTier === 'Heritage' 
        ? (item.heritageGst !== undefined && item.heritageGst !== null ? item.heritageGst : 18)
        : (item.gst !== undefined && item.gst !== null ? item.gst : 5);
        
      return acc + (taxableValue * (itemGstPercent / 100));
    }, 0);

    return itemsGst;
  }, [cartItems, quantities, areaMultiplier, currentExpressMultiplier, selectedTier]);

  const grandTotal = V + taxAmount;
  
  const discount = useMemo(() => {
      if (!isPromoApplied || !appliedPromoData) return 0;
      if (appliedPromoData.discountType === 'Flat') return Math.min(appliedPromoData.discountValue, grandTotal);
      return (grandTotal * appliedPromoData.discountValue) / 100;
  }, [isPromoApplied, appliedPromoData, grandTotal]);

  const finalTotal = useMemo(() => Math.max(0, grandTotal - discount), [grandTotal, discount]);

  const remainingPayable = useMemo(() => {
    const balanceUsed = useWallet ? Math.min(walletBalance, finalTotal) : 0;
    return Math.max(0, finalTotal - balanceUsed);
  }, [useWallet, walletBalance, finalTotal]);

  const priceBreakdown = useMemo(() => {
    const baseWithArea = subtotalBeforeLogistics;
    
    // Additive logic breakdown based on Base Price
    const expressSurcharge = baseWithArea * (currentExpressMultiplier - 1);
    const baseWithExpress = baseWithArea + expressSurcharge;
    
    let platformFee = baseWithExpress * activePlatformRate;
    if (activeMinPlatformFee > 0 && platformFee < activeMinPlatformFee) {
        platformFee = activeMinPlatformFee;
    }
    if (activeMaxPlatformFee > 0 && platformFee > activeMaxPlatformFee) {
        platformFee = activeMaxPlatformFee;
    }
    
    return {
        baseWithArea,
        expressSurcharge,
        platformFee,
        logisticsFee: activeLogisticsFee,
        isFreeDelivery,
        freeDeliveryThreshold: activeFreeDeliveryThreshold,
        gstAmount: taxAmount
    };
  }, [subtotalBeforeLogistics, activePlatformRate, activeMinPlatformFee, activeMaxPlatformFee, currentExpressMultiplier, activeLogisticsFee, isFreeDelivery, activeFreeDeliveryThreshold, taxAmount]);

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

      // Enforce photo presence validation
      for (const item of cartItems) {
        const itemId = item._id || item.id;
        const photos = itemPhotos[itemId] || [];
        if (photos.length === 0) {
          toast.error(`Please upload at least one photo for "${item.name || 'selected service'}" before placing order.`);
          setActivePhotoService({ id: itemId, name: item.name || item.itemName });
          return;
        }
      }

      const amountToPay = Math.round(remainingPayable);

      if (paymentMethod === 'Online' && amountToPay > 0) {
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
          amount: amountToPay
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
          description: `Full Payment`,
          order_id: rzpOrder.id,
          handler: async function (response) {
            // The full Razorpay response is forwarded so the server can verify the
            // signature. Payment success is confirmed by the backend, not here.
            await finalizeOrder(userId, response, 'Online');
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
        const actualMethod = amountToPay === 0 ? 'Online' : 'COD';
        await finalizeOrder(userId, null, actualMethod);
      }
    } catch (err) {
      alert('Error initiating order');
    }
  };

  const finalizeOrder = async (userId, paymentResponse, method) => {
    try {
      setLoading(true);

      const allItemPhotos = [];
      cartItems.forEach(item => {
        const itemId = item._id || item.id;
        const photos = itemPhotos[itemId] || [];
        allItemPhotos.push(...photos);
      });

      const mergedPhotos = Array.from(new Set([...garmentPhotos, ...allItemPhotos]));
      const amountToPay = Math.round(remainingPayable);

      const orderData = {
        customerId: userId,
        items: cartItems.map(item => {
          const itemId = item._id || item.id;
          return {
            serviceId: itemId,
            name: item.name || item.itemName || 'Service Item',
            quantity: quantities[itemId],
            price: getItemPrice(item),
            unit: billingUnits[itemId],
            photos: itemPhotos[itemId] || []
          };
        }),
        pickupSlot: { date: selectedPickup, time: pickupTime },
        deliverySlot: { date: selectedDelivery, time: deliveryTime },
        pickupAddress: selectedPickupAddress?.address || '',
        pickupLocation: selectedPickupAddress?.location || defaultCenter,
        dropAddress: isSameAddress ? (selectedPickupAddress?.address || '') : (selectedDropAddress?.address || ''),
        dropLocation: isSameAddress ? (selectedPickupAddress?.location || defaultCenter) : (selectedDropAddress?.location || defaultCenter),
        totalAmount: finalTotal,
        paymentMethod: amountToPay === 0 ? 'Wallet' : method,
        useWallet: useWallet,
        razorpayPaymentId: paymentResponse?.razorpay_payment_id || null,
        razorpayOrderId: paymentResponse?.razorpay_order_id || null,
        razorpaySignature: paymentResponse?.razorpay_signature || null,
        deliveryMode: isExpress ? 'Express' : 'Normal',
        deliveryCharge: priceBreakdown.logisticsFee,
        areaMultiplier: areaMultiplier,
        platformMultiplier: activePlatformRate,
        minPlatformFee: activeMinPlatformFee,
        maxPlatformFee: activeMaxPlatformFee,
        expressMultiplier: activeExpressMultiplier,
        heritageMultiplier: activeHeritageMultiplier,
        selectedTier: selectedTier,
        promoApplied: isPromoApplied ? appliedPromoData?._id : null,
        discountAmount: discount,
        specialInstructions,
        customerPhotos: mergedPhotos
      };

      const response = await orderApi.createOrder(orderData);
      if (response._id) {
        localStorage.removeItem('cart_quantities');
        localStorage.removeItem('order_photos');
        localStorage.removeItem('order_notes');
        localStorage.removeItem('item_photos');

        // Go directly to tracking for both Online and COD
        navigate(`/user/tracking/${response._id}`);
      } else {
        // The server rejected the order — most often a payment it could not verify.
        alert(response.message || 'Order could not be placed. Please try again.');
      }
    } catch (err) {
      alert('Error finalizing order');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !activePhotoService) return;
    
    setUploading(true);
    setUploadProgress(0);
    try {
      const uploadedUrls = [];
      let currentFileIndex = 0;

      for (const file of files) {
        const url = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          formData.append('media', file);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const fileProgress = Math.round((event.loaded / event.total) * 100);
              const overallProgress = Math.round(
                ((currentFileIndex * 100) + fileProgress) / files.length
              );
              setUploadProgress(overallProgress);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const res = JSON.parse(xhr.responseText);
                resolve(res.url);
              } catch (e) {
                reject(new Error('Invalid response'));
              }
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error'));
          xhr.open('POST', `${BASE_URL}/media/upload`);
          xhr.send(formData);
        });

        if (url) {
          uploadedUrls.push(url);
        }
        currentFileIndex++;
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
      setUploadProgress(0);
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

  return (
    <div className="min-h-[100dvh] flex flex-col text-slate-900 bg-background">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full flex-1 pb-36">
        {/* Page Subheader */}
        <div className="flex items-center justify-between gap-2 pb-4 sm:pb-6 mb-2 border-b border-slate-200/60">
          <button 
            onClick={() => navigate('/user/home')} 
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 px-2.5 sm:px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Continue Shopping</span>
            <span className="sm:hidden">Back</span>
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ShoppingBag size={17} className="text-slate-900 shrink-0" />
            <h1 className="text-sm sm:text-lg font-bold text-slate-900 truncate">Checkout & Review</h1>
          </div>
          <div className="w-10 sm:w-24 shrink-0" />
        </div>
        {loading ? (
          /* Skeleton loader — shows while services fetch on refresh */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-pulse">
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                <div className="h-4 bg-slate-100 rounded-full w-40" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-20 bg-slate-100 rounded-xl" />
                  <div className="h-20 bg-slate-100 rounded-xl" />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                <div className="h-4 bg-slate-100 rounded-full w-32" />
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-slate-100 rounded-full w-3/4" />
                      <div className="h-2.5 bg-slate-100 rounded-full w-1/3" />
                    </div>
                    <div className="h-6 w-16 bg-slate-100 rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                <div className="h-4 bg-slate-100 rounded-full w-32" />
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex justify-between">
                    <div className="h-3 bg-slate-100 rounded-full w-24" />
                    <div className="h-3 bg-slate-100 rounded-full w-12" />
                  </div>
                ))}
                <div className="pt-4 border-t border-slate-100">
                  <div className="h-11 bg-slate-100 rounded-xl w-full" />
                </div>
              </div>
            </div>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 p-8 max-w-md mx-auto">
            <ShoppingBag size={48} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-900">Your cart is empty</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Looks like you haven't added any laundry services yet.</p>
            <button
              onClick={() => navigate('/user/home')}
              className="mt-5 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs cursor-pointer"
            >
              Browse Services
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: Logistics, Services Review & Garment Photos */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* 1. Schedule & Address Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Truck size={17} className="text-slate-700" />
                    <h2 className="text-sm sm:text-base font-semibold text-slate-900">Delivery Schedule & Locations</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200">
                      {selectedTier} Tier
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-xs font-medium">
                      {isExpress ? 'Express Delivery' : 'Standard Delivery'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
                  {/* Pickup Block */}
                  <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                      <Calendar size={13} className="text-slate-500" />
                      <span>Pickup Slot</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <Clock size={12} className="text-slate-400" />
                        <span>{pickupTime}</span>
                      </div>
                      <div className="flex items-start gap-1 text-slate-600 font-normal">
                        <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                        <span className="truncate">{selectedPickupAddress?.address || selectedPickupAddress?.type || 'Select on home'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dropoff Block */}
                  <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                      <Calendar size={13} className="text-slate-500" />
                      <span>Delivery Slot</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <Clock size={12} className="text-slate-400" />
                        <span>{deliveryTime}</span>
                      </div>
                      <div className="flex items-start gap-1 text-slate-600 font-normal">
                        <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                        <span className="truncate">{(isSameAddress ? selectedPickupAddress?.address : selectedDropAddress?.address) || 'Same as pickup'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Services Review Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={17} className="text-slate-700" />
                    <h2 className="text-sm sm:text-base font-semibold text-slate-900">
                      Items Review ({cartItems.reduce((acc, item) => acc + (quantities[item._id || item.id] || 0), 0)} items)
                    </h2>
                  </div>
                  <button 
                    onClick={() => navigate('/user/home')}
                    className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-200/60"
                  >
                    + Add More
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {cartItems.map((item) => {
                    const itemId = item._id || item.id;
                    const qty = quantities[itemId] || 0;
                    const unitPrice = getItemPrice(item);
                    const totalPrice = unitPrice * qty;
                    const isHeritageService = item.tier === 'Heritage' || (item.basePrice > 200);

                    return (
                      <div key={itemId} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                            <span className="material-symbols-outlined text-base sm:text-lg">{item.icon || 'local_laundry_service'}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-semibold text-slate-900 break-words">
                                {item.name}
                              </h4>
                              <span className="text-[9px] sm:text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 shrink-0">
                                {isHeritageService ? 'Heritage' : 'Essential'}
                              </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-slate-500 font-normal mt-0.5">
                              ₹{unitPrice} per piece
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 shrink-0 pt-1 sm:pt-0 pl-11 sm:pl-0">
                          <div className="flex items-center bg-slate-100 rounded-xl px-2.5 py-0.5 sm:py-1 border border-slate-200/60">
                            <span className="text-xs font-semibold text-slate-800">
                              Qty: {qty}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              ₹{Math.round(totalPrice)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">excl. GST</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Uploaded Articles Photos */}
              {Object.values(itemPhotos).some(photos => photos.length > 0) && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                        <Camera size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-semibold text-slate-900">Uploaded Garment Photos</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Reference photos for special care and handling.</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                      {Object.values(itemPhotos).reduce((acc, p) => acc + p.length, 0)} Photos
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {Object.entries(itemPhotos).map(([itemId, photos]) => 
                      photos.map((photo, pIdx) => {
                        const serviceName = cartItems.find(i => (i._id || i.id) === itemId)?.name || 'Article';
                        return (
                          <div 
                            key={`${itemId}-${pIdx}`} 
                            onClick={() => setActivePhotoService({ id: itemId, name: serviceName })}
                            className="aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 relative group cursor-pointer shadow-2xs hover:shadow-xs transition-all"
                          >
                            <img src={photo} alt={serviceName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                              <span className="text-[11px] text-white font-medium truncate drop-shadow-xs">
                                {serviceName}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Sticky Order Summary & Pay Action */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-5">
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">Payment Breakdown</h3>
                </div>

                {/* Pricing Table */}
                <div className="space-y-2.5 text-xs sm:text-sm">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Service Subtotal <span className="text-[10px] text-slate-400">(excl. GST)</span></span>
                    <span className="font-semibold text-slate-900">
                      ₹{priceBreakdown.baseWithArea.toFixed(0)}
                    </span>
                  </div>
                  {isExpress && priceBreakdown.expressSurcharge > 0 && (
                    <div className="flex justify-between items-center text-amber-600">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">bolt</span>
                        Express Surcharge
                      </span>
                      <span className="font-medium">+₹{priceBreakdown.expressSurcharge.toFixed(0)}</span>
                    </div>
                  )}
                  {priceBreakdown.platformFee > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Platform Fee</span>
                    <span className="font-medium text-slate-800">
                      ₹{priceBreakdown.platformFee.toFixed(0)}
                    </span>
                  </div>
                  )}
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Logistics & Handling</span>
                    {priceBreakdown.isFreeDelivery ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 line-through text-xs">₹{normalLogisticsConfig}</span>
                        <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px] tracking-wider uppercase">
                          FREE
                        </span>
                      </div>
                    ) : (
                      <span className="font-medium text-slate-800">
                        ₹{priceBreakdown.logisticsFee.toFixed(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>GST & Taxes</span>
                    <span className="font-medium text-slate-800">
                      ₹{priceBreakdown.gstAmount.toFixed(0)}
                    </span>
                  </div>
                  {isPromoApplied && (
                    <div className="flex justify-between items-center text-emerald-600 font-medium">
                      <span>Promo Discount</span>
                      <span>-₹{discount.toFixed(0)}</span>
                    </div>
                  )}
                  {/* Free Delivery Status Indicator */}
                  {priceBreakdown.isFreeDelivery ? (
                    <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-xl p-2.5 flex items-center gap-2 text-emerald-800 text-xs font-medium">
                      <Sparkles size={14} className="text-emerald-600 shrink-0" />
                      <span>Free Delivery unlocked! (Orders above ₹{priceBreakdown.freeDeliveryThreshold})</span>
                    </div>
                  ) : priceBreakdown.freeDeliveryThreshold > 0 && subtotalBeforeLogistics > 0 && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs text-slate-600">
                      <span>Add ₹{(priceBreakdown.freeDeliveryThreshold - subtotalBeforeLogistics).toFixed(0)} more for Free Delivery</span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">₹{priceBreakdown.freeDeliveryThreshold} Min</span>
                    </div>
                  )}
                </div>

                {/* Promo Code Input & Dropdown */}
                <div className="pt-3 border-t border-slate-100 space-y-2 relative">
                  <label className="text-xs font-medium text-slate-700">Promo Code</label>
                  <div className="relative flex items-center">
                    <input 
                      type="text" 
                      placeholder="ENTER COUPON CODE"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value.toUpperCase());
                        setShowPromoDropdown(true);
                      }}
                      onFocus={() => setShowPromoDropdown(true)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all pr-20"
                    />
                    <div className="absolute right-1.5 flex items-center gap-1">
                      {isPromoApplied ? (
                        <button 
                          onClick={() => { setIsPromoApplied(false); setAppliedPromoData(null); setPromoCode(''); }} 
                          className="text-xs font-medium text-rose-600 px-2 py-1 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          Remove
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            handleApplyPromo(promoCode);
                            setShowPromoDropdown(false);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Apply
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Available Promos Dropdown */}
                  <AnimatePresence>
                    {showPromoDropdown && applicablePromos.length > 0 && (
                      <>
                        <div 
                          onClick={() => setShowPromoDropdown(false)}
                          className="fixed inset-0 z-[90]"
                        />
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute left-0 right-0 top-full mt-1 z-[100] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto"
                        >
                          {applicablePromos.map(p => (
                            <button
                              key={p._id}
                              onClick={() => {
                                setPromoCode(p.code);
                                handleApplyPromo(p.code);
                                setShowPromoDropdown(false);
                              }}
                              className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 flex items-center justify-between cursor-pointer"
                            >
                              <div>
                                <span className="text-xs font-bold text-slate-900">{p.code}</span>
                                <p className="text-[11px] text-slate-500 line-clamp-1">{p.description || 'Special discount'}</p>
                              </div>
                              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                {p.discountType === 'Flat' ? `₹${p.discountValue}` : `${p.discountValue}%`} OFF
                              </span>
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>

                  {promoError && <p className="text-xs text-rose-600 mt-1">{promoError}</p>}
                  {isPromoApplied && (
                    <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1.5">
                      <CheckCircle2 size={13} />
                      <span>Coupon applied! Saved ₹{discount.toFixed(0)}</span>
                    </p>
                  )}
                </div>

                {/* Wallet Balance Checkbox */}
                {walletBalance > 0 && (
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="text-left text-xs">
                      <p className="font-semibold text-slate-800">Use Wallet Credits</p>
                      <p className="text-slate-500 font-normal">Available: ₹{walletBalance.toFixed(0)}</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={useWallet} 
                      onChange={(e) => setUseWallet(e.target.checked)}
                      className="w-4 h-4 rounded text-slate-900 focus:ring-0 accent-slate-900 cursor-pointer"
                    />
                  </div>
                )}

                {/* Final Total Amount */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  {useWallet && Math.min(walletBalance, finalTotal) > 0 && (
                    <div className="flex items-baseline justify-between text-xs text-slate-500">
                      <span>Grand Total (incl. GST)</span>
                      <span className="font-semibold">₹{finalTotal.toFixed(0)}</span>
                    </div>
                  )}
                  {useWallet && Math.min(walletBalance, finalTotal) > 0 && (
                    <div className="flex items-baseline justify-between text-xs text-emerald-700 font-medium">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">account_balance_wallet</span>
                        Wallet Credits Used
                      </span>
                      <span>-₹{Math.min(walletBalance, finalTotal).toFixed(0)}</span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-slate-500 font-medium">
                        {useWallet && Math.min(walletBalance, finalTotal) > 0 ? 'Amount Payable' : 'Total Amount (incl. GST)'}
                      </span>
                      <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                        ₹{remainingPayable.toFixed(0)}
                      </p>
                    </div>
                    {useWallet && (
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        ₹{Math.min(walletBalance, finalTotal).toFixed(0)} from wallet
                      </span>
                    )}
                  </div>
                </div>

                {/* Pay Now Button */}
                <button 
                  onClick={handlePlaceOrder}
                  disabled={cartItems.length === 0 || loading}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm sm:text-base transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Lock size={16} />
                  <span>{loading ? 'Processing Order...' : `Pay ₹${remainingPayable.toFixed(0)} Now`}</span>
                </button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-normal pt-1">
                  <ShieldCheck size={14} className="text-slate-500" />
                  <span>256-Bit SSL Encrypted & Secure Checkout</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
          {/* Photo Upload & Management Modal */}
          <AnimatePresence>
            {activePhotoService && (
              <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  onClick={() => setActivePhotoService(null)} 
                  className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" 
                />
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 10 }} 
                  animate={{ scale: 1, opacity: 1, y: 0 }} 
                  exit={{ scale: 0.95, opacity: 0, y: 10 }} 
                  className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 text-slate-900 space-y-5 max-h-[90vh] overflow-y-auto hide-scrollbar"
                >
                  {/* Modal Header */}
                  <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold mb-1">
                        <Camera size={12} />
                        <span>Garment Care Photos</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                        Photos for {activePhotoService.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-normal mt-0.5">
                        Add photos showing stains, tears, or specific care notes.
                      </p>
                    </div>
                    <button 
                      onClick={() => setActivePhotoService(null)} 
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0 mt-0.5"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Upload Progress Bar */}
                  {uploading && (
                    <div className="w-full space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex justify-between text-xs font-medium text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <div className="w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                          Uploading photos...
                        </span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-slate-900 transition-all duration-300 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Photos Grid or Empty Dropzone */}
                  {itemPhotos[activePhotoService.id]?.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {itemPhotos[activePhotoService.id].map((photo, idx) => (
                          <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group shadow-2xs">
                            <img src={photo} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(activePhotoService.id, photo)}
                              title="Delete Photo"
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/95 text-rose-600 hover:bg-rose-50 border border-slate-200/80 shadow-xs flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}

                        {/* Add More Tile */}
                        <button
                          type="button"
                          onClick={() => galleryInputRef.current.click()}
                          className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-50 flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-full bg-white shadow-2xs border border-slate-200/80 flex items-center justify-center text-slate-700 group-hover:scale-110 transition-transform">
                            <Plus size={16} />
                          </div>
                          <span className="text-xs font-medium">Add More</span>
                        </button>
                      </div>

                      {/* Modal Bottom Action Controls */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <button 
                          type="button"
                          onClick={() => {
                            if (window.confirm("Delete all photos for this item?")) {
                              setItemPhotos(prev => {
                                const { [activePhotoService.id]: _, ...rest } = prev;
                                localStorage.setItem('item_photos', JSON.stringify(rest));
                                return rest;
                              });
                              toast.success("All photos removed");
                            }
                          }}
                          className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Trash2 size={13} />
                          <span>Delete All</span>
                        </button>

                        <button 
                          type="button"
                          onClick={() => setActivePhotoService(null)}
                          className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle2 size={14} />
                          <span>Done</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* No Photos Upload Options */
                    <div className="space-y-4 py-2">
                      {/* Two-button layout */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Take Photo — opens camera via getUserMedia */}
                        <button
                          type="button"
                          onClick={startCamera}
                          className="flex flex-col items-center justify-center gap-2.5 p-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl transition-all cursor-pointer group active:scale-95"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                            <Camera size={22} />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold">Take Photo</p>
                            <p className="text-[10px] text-white/60 font-normal mt-0.5">Open camera</p>
                          </div>
                        </button>

                        {/* Select from Gallery */}
                        <button
                          type="button"
                          onClick={() => galleryInputRef.current.click()}
                          className="flex flex-col items-center justify-center gap-2.5 p-5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer group active:scale-95"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-600 group-hover:border-slate-300 transition-colors">
                            <span className="material-symbols-outlined text-xl">photo_library</span>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold">From Gallery</p>
                            <p className="text-[10px] text-slate-400 font-normal mt-0.5">Browse files</p>
                          </div>
                        </button>
                      </div>

                      <p className="text-center text-[11px] text-slate-400">
                        PNG, JPG, HEIC · up to 10 MB each
                      </p>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Hidden inputs for file upload */}
          <input 
            ref={galleryInputRef} 
            type="file" 
            multiple 
            accept="image/*" 
            onChange={handlePhotoFileChange} 
            className="hidden" 
          />
          {/* Hidden canvas for getUserMedia capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* In-browser Camera Capture Modal */}
          <AnimatePresence>
            {showCameraModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-black flex flex-col"
              >
                {/* Camera Toolbar */}
                <div className="flex items-center justify-between px-4 py-3 bg-black/80">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="text-white/80 hover:text-white flex items-center gap-1.5 text-sm font-medium cursor-pointer"
                  >
                    <X size={18} />
                    <span>Close</span>
                  </button>
                  <span className="text-white/60 text-xs font-medium tracking-wide uppercase">
                    {activePhotoService?.name ? `Photo for ${activePhotoService.name}` : 'Take Photo'}
                  </span>
                  <div className="w-16" />
                </div>

                {/* Video Preview */}
                <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
                  {cameraError ? (
                    <div className="text-center px-8 space-y-4">
                      <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto">
                        <AlertCircle size={32} className="text-rose-400" />
                      </div>
                      <p className="text-white/80 text-sm font-medium leading-relaxed">{cameraError}</p>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium cursor-pointer"
                      >
                        Upload from Gallery instead
                      </button>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {/* Viewfinder guide */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-8 border-2 border-white/30 rounded-2xl" />
                        <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-xl" />
                        <div className="absolute top-8 right-8 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-xl" />
                        <div className="absolute bottom-8 left-8 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-xl" />
                        <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-xl" />
                      </div>
                    </>
                  )}
                </div>

                {/* Capture Button */}
                {!cameraError && (
                  <div className="flex items-center justify-center py-8 bg-black/80">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="w-16 h-16 rounded-full bg-white hover:bg-white/90 flex items-center justify-center shadow-2xl active:scale-95 transition-transform cursor-pointer"
                    >
                      <div className="w-13 h-13 rounded-full border-2 border-slate-900/20 flex items-center justify-center">
                        <Camera size={24} className="text-slate-900" />
                      </div>
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
    </div>

  );
};

export default CartPage;
