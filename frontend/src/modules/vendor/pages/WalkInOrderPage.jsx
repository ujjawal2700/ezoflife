import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { serviceApi, orderApi, authApi, masterServiceApi, mediaApi, promotionApi } from '../../../lib/api';
import toast from 'react-hot-toast';
import { GoogleMap, Marker, Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { locationService } from '../../../lib/locationService';

const GOOGLE_MAPS_LIBRARIES = ['drawing', 'places', 'geometry'];

const getTomorrowDateString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const WalkInOrderPage = () => {
    const navigate = useNavigate();
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [tempName, setTempName] = useState('');
    const [otpValue, setOtpValue] = useState('');
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [showOtpField, setShowOtpField] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [items, setItems] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [liveServices, setLiveServices] = useState([]);
    const [showInvoice, setShowInvoice] = useState(false);
    const [createdOrder, setCreatedOrder] = useState(null);
    const [deliveryTime, setDeliveryTime] = useState('Tomorrow, 6:00 PM');
    const [quantity, setQuantity] = useState(1);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [deliveryMethod, setDeliveryMethod] = useState('self');
    const [deliveryAddress, setDeliveryAddress] = useState('');

    // Photo states
    const [itemPhotos, setItemPhotos] = useState({});
    const [activePhotoService, setActivePhotoService] = useState(null);
    const [uploading, setUploading] = useState(false);
    const galleryInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    // Review Modal states
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [vendorAddress, setVendorAddress] = useState('');
    const [promoCode, setPromoCode] = useState('');
    const [isPromoApplied, setIsPromoApplied] = useState(false);
    const [promoError, setPromoError] = useState('');
    const [discount, setDiscount] = useState(0);

    // Category and subcategory filtering states
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState(null);

    // New Address & Maps states
    const [savedCustomerAddress, setSavedCustomerAddress] = useState(null);
    const [enableDelivery, setEnableDelivery] = useState(false);
    const [showLocateModal, setShowLocateModal] = useState(false);
    const [addressDetails, setAddressDetails] = useState({
        type: 'HOME',
        flatNo: '',
        street: '',
        floor: '',
        landmark: '',
        city: '',
        state: '',
        pincode: '',
        lat: 22.7196,
        lng: 75.8577
    });
    const [showMapModal, setShowMapModal] = useState(false);
    const [autocompleteInstance, setAutocompleteInstance] = useState(null);
    const [mapCenter, setMapCenter] = useState({ lat: 22.7196, lng: 75.8577 });
    const [markerPos, setMarkerPos] = useState({ lat: 22.7196, lng: 75.8577 });
    const [addressPreview, setAddressPreview] = useState('');
    const [tempAddressDetails, setTempAddressDetails] = useState({
        flatNo: '',
        street: '',
        city: '',
        state: '',
        pincode: '',
        lat: 22.7196,
        lng: 75.8577
    });

    // Delivery date and time custom states
    const [deliveryDate, setDeliveryDate] = useState(getTomorrowDateString());
    const [deliveryTimeVal, setDeliveryTimeVal] = useState('18:00');

    const isAddressComplete = useMemo(() => {
        return !!(
            addressDetails.flatNo?.trim() &&
            addressDetails.street?.trim() &&
            addressDetails.city?.trim() &&
            addressDetails.state?.trim() &&
            addressDetails.pincode?.trim()
        );
    }, [addressDetails]);

    useEffect(() => {
        if (deliveryDate && deliveryTimeVal) {
            const dateObj = new Date(`${deliveryDate}T${deliveryTimeVal}`);
            if (!isNaN(dateObj.getTime())) {
                const formattedDate = dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                const formattedTime = dateObj.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
                setDeliveryTime(`${formattedDate}, ${formattedTime}`);
            } else {
                setDeliveryTime(`${deliveryDate} ${deliveryTimeVal}`);
            }
        }
    }, [deliveryDate, deliveryTimeVal]);

    const selectPreset = (preset) => {
        const today = new Date();
        if (preset === 'today') {
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            setDeliveryDate(`${yyyy}-${mm}-${dd}`);
            setDeliveryTimeVal('20:00');
        } else if (preset === 'tomorrow') {
            setDeliveryDate(getTomorrowDateString());
            setDeliveryTimeVal('18:00');
        } else if (preset === '2days') {
            const in2Days = new Date();
            in2Days.setDate(in2Days.getDate() + 2);
            const yyyy = in2Days.getFullYear();
            const mm = String(in2Days.getMonth() + 1).padStart(2, '0');
            const dd = String(in2Days.getDate()).padStart(2, '0');
            setDeliveryDate(`${yyyy}-${mm}-${dd}`);
            setDeliveryTimeVal('18:00');
        }
    };

    const mapRef = useRef(null);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: GOOGLE_MAPS_LIBRARIES
    });

    const vendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
    const getVendorId = () => {
        const keys = ['user', 'vendorData', 'userData', 'auth_user', 'vendor'];
        for (const key of keys) {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) continue;
                const data = JSON.parse(raw);
                const id = data?._id || data?.id || data?.user?._id || data?.user?.id || data?.uid;
                if (id) return id;
            } catch (e) { continue; }
        }
        return null;
    };

    const vendorId = getVendorId();

    const fetchServices = async () => {
        if (!vendorId) {
            console.warn('WalkInHub: No vendorId found, skipping service fetch.');
            return;
        }
        try {
            // Fetch custom services, vendor profile, and master services list
            const [masterRes, profileRes, masterServices] = await Promise.all([
                serviceApi.getAll({ vendorId }),
                authApi.getProfile(vendorId),
                masterServiceApi.getAll({ limit: 10000 })
            ]);

            if (profileRes) {
                const shopAddr = profileRes.shopDetails?.address || profileRes.address || '';
                setVendorAddress(shopAddr);
            }
            
            const registrationServices = profileRes.shopDetails?.services || [];
            
            // Filter only approved registration services
            const approvedRegistrationServices = registrationServices.filter(s => s.status === 'approved');
            
            // Build a lookup map for master services to resolve categories/subcategories
            const masterMap = new Map();
            if (Array.isArray(masterServices)) {
                masterServices.forEach(ms => {
                    masterMap.set(ms._id, ms);
                });
            }
            
            const mergedMap = new Map();

            // Add approved registration services to map
            approvedRegistrationServices.forEach(s => {
                const id = s.id || s._id;
                const master = masterMap.get(id);
                mergedMap.set(id, {
                    ...s,
                    id: id,
                    _id: id,
                    name: s.name || master?.itemName || master?.name || 'Unnamed Service',
                    isFromRegistration: true,
                    approvalStatus: 'Approved',
                    active: s.active ?? true,
                    basePrice: s.basePrice || s.vendorRate || 0,
                    mainCategory: master?.categoryId?.mainCategory || 'Dry Cleaning',
                    subCategory: master?.categoryId?.subCategory || 'General'
                });
            });

            // Add custom services to map (overwriting/merging duplicates)
            masterRes.forEach(s => {
                const id = s._id || s.id;
                const master = masterMap.get(id);
                mergedMap.set(id, {
                    ...s,
                    id: id,
                    _id: id,
                    name: s.name || master?.itemName || master?.name || 'Unnamed Service',
                    isFromRegistration: false,
                    approvalStatus: s.approvalStatus || 'Pending',
                    active: s.status === 'Active',
                    basePrice: s.basePrice || 0,
                    mainCategory: s.category || master?.categoryId?.mainCategory || 'Custom',
                    subCategory: master?.categoryId?.subCategory || 'General'
                });
            });

            setLiveServices(Array.from(mergedMap.values()));
        } catch (error) {
            console.error('Fetch Services Error:', error);
        }
    };

    useEffect(() => {
        if (vendorId) {
            fetchServices();
        }
    }, [vendorId]);

    const services = useMemo(() => {
        return liveServices
            .filter(s => s.active && s.approvalStatus === 'Approved')
            .map(s => ({
                serviceId: s._id || s.id,
                title: s.name,
                price: s.basePrice || 0,
                icon: s.icon || 'local_laundry_service',
                category: s.mainCategory || 'Custom',
                subCategory: s.subCategory || 'General'
            }));
    }, [liveServices]);

    // Unique Categories memo derived from active services
    const uniqueCategories = useMemo(() => {
        const cats = new Set();
        services.forEach(s => {
            if (s.category) cats.add(s.category);
        });
        return Array.from(cats);
    }, [services]);

    // Unique Subcategories memo derived from active services in the selected category
    const uniqueSubCategories = useMemo(() => {
        if (!selectedCategory) return [];
        const subs = new Set();
        services.forEach(s => {
            if (s.category === selectedCategory && s.subCategory) {
                subs.add(s.subCategory);
            }
        });
        return Array.from(subs);
    }, [services, selectedCategory]);

    // Filtered services depending on selected category and subcategory
    const filteredServices = useMemo(() => {
        return services.filter(s => {
            if (selectedCategory && s.category !== selectedCategory) return false;
            if (selectedSubCategory && s.subCategory !== selectedSubCategory) return false;
            return true;
        });
    }, [services, selectedCategory, selectedSubCategory]);

    // Automatically select the first category if none is selected
    useEffect(() => {
        if (uniqueCategories.length > 0 && !selectedCategory) {
            setSelectedCategory(uniqueCategories[0]);
        }
    }, [uniqueCategories, selectedCategory]);

    const handleCategoryClick = (cat) => {
        if (selectedCategory === cat) {
            setSelectedCategory(null);
            setSelectedSubCategory(null);
        } else {
            setSelectedCategory(cat);
            setSelectedSubCategory(null);
        }
    };

    const handleSubCategoryClick = (sub) => {
        if (selectedSubCategory === sub) {
            setSelectedSubCategory(null);
        } else {
            setSelectedSubCategory(sub);
        }
    };

    // Automatically reset verification status and address details if phone is edited
    useEffect(() => {
        setIsVerified(false);
        setShowOtpField(false);
        setOtpValue('');
        setCustomerName('');
        setEnableDelivery(false);
        setAddressDetails({
            flatNo: '',
            street: '',
            city: '',
            state: '',
            pincode: '',
            lat: 22.7196,
            lng: 75.8577
        });
    }, [customerPhone]);

    // Automatically reset verification status if name is edited - REMOVED to prevent resetting when lookup auto-fills name.

    // Sync enableDelivery and addressDetails to checkout states
    useEffect(() => {
        if (enableDelivery) {
            setDeliveryMethod('shiprocket');
            const addrParts = [
                addressDetails.flatNo,
                addressDetails.street,
                addressDetails.city,
                addressDetails.state,
                addressDetails.pincode ? `PIN-${addressDetails.pincode}` : ''
            ].filter(p => p && p.trim() !== '');
            setDeliveryAddress(addrParts.join(', '));
        } else {
            setDeliveryMethod('self');
            setDeliveryAddress('');
        }
    }, [enableDelivery, addressDetails]);

    // Map Modal setup effect
    useEffect(() => {
        if (showMapModal) {
            const initialLat = addressDetails.lat || vendorData.location?.lat || 22.7196;
            const initialLng = addressDetails.lng || vendorData.location?.lng || 75.8577;
            const initialPos = { lat: initialLat, lng: initialLng };
            setMarkerPos(initialPos);
            setMapCenter(initialPos);
            
            const currentPreview = [addressDetails.flatNo, addressDetails.street, addressDetails.city, addressDetails.state, addressDetails.pincode]
                .filter(p => p && p.trim() !== '')
                .join(', ');
            setAddressPreview(currentPreview || 'Drag marker or search to see address preview...');
            setTempAddressDetails({ ...addressDetails, lat: initialLat, lng: initialLng });
        }
    }, [showMapModal]);

    const handlePlaceChanged = () => {
        if (!autocompleteInstance) return;
        const place = autocompleteInstance.getPlace();
        if (place.geometry) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const newPos = { lat, lng };
            setMarkerPos(newPos);
            setMapCenter(newPos);
            
            // Extract components
            let street = '';
            let city = '';
            let state = '';
            let pincode = '';
            
            if (place.address_components) {
                const streetNumberComp = place.address_components.find(c => c.types.includes('street_number'));
                const routeComp = place.address_components.find(c => c.types.includes('route'));
                const sublocalityComp = place.address_components.find(c => c.types.includes('sublocality_level_1'));
                const neighborhoodComp = place.address_components.find(c => c.types.includes('neighborhood'));
                
                const parts = [
                    streetNumberComp?.long_name,
                    routeComp?.long_name,
                    sublocalityComp?.long_name,
                    neighborhoodComp?.long_name
                ].filter(Boolean);
                
                street = parts.join(', ') || place.name || '';
                
                const cityComp = place.address_components.find(c => c.types.includes('locality') || c.types.includes('administrative_area_level_2'));
                city = cityComp ? cityComp.long_name : '';
                
                const stateComp = place.address_components.find(c => c.types.includes('administrative_area_level_1'));
                state = stateComp ? stateComp.long_name : '';
                
                const pinComp = place.address_components.find(c => c.types.includes('postal_code'));
                pincode = pinComp ? pinComp.long_name : '';
            }
            
            setTempAddressDetails({
                flatNo: '',
                street: street,
                city: city,
                state: state,
                pincode: pincode,
                lat,
                lng
            });
            setAddressPreview(place.formatted_address || '');
        }
    };

    const handleMarkerDragEnd = async (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        const newPos = { lat, lng };
        setMarkerPos(newPos);
        
        try {
            const addressData = await locationService.reverseGeocode(lat, lng);
            setTempAddressDetails({
                flatNo: addressDetails.flatNo || addressData.subLocal || '',
                street: addressData.area || addressData.fullAddress || '',
                city: addressData.city || '',
                state: addressData.state || '',
                pincode: addressData.pincode || '',
                lat,
                lng
            });
            setAddressPreview(addressData.fullAddress);
        } catch (error) {
            console.error('Reverse Geocode Error:', error);
        }
    };

    const confirmMapLocation = () => {
        setAddressDetails(tempAddressDetails);
        setShowMapModal(false);
        toast.success('Location updated!');
    };

    const handlePhoneChange = async (val) => {
        const cleanVal = val.replace(/\D/g, '');
        if (cleanVal.length <= 10) {
            setCustomerPhone(cleanVal);
            if (cleanVal.length === 10) {
                try {
                    const lookupRes = await authApi.lookupPhone(cleanVal);
                    if (lookupRes && lookupRes.isRegistered) {
                        const dispName = lookupRes.displayName || '';
                        setTempName(dispName);
                        setCustomerName(dispName);
                        setIsVerified(true);
                        
                        let rawAddress = lookupRes.address || '';
                        let cCity = lookupRes.city || '';
                        let cState = lookupRes.state || '';
                        let cPincode = lookupRes.pincode || '';
                        let cFlatNo = '';
                        let cStreet = rawAddress;

                        // Try to parse rawAddress if it contains commas and city/pincode are missing
                        if (rawAddress && (!cCity || !cPincode)) {
                            const parts = rawAddress.split(',').map(s => s.trim());
                            if (parts.length >= 3) {
                                const lastPart = parts.pop();
                                const pinMatch = lastPart.match(/\d{6}/);
                                if (pinMatch) cPincode = pinMatch[0];
                                
                                cCity = parts.pop();
                                cStreet = parts.join(', ');
                            }
                        } else if (rawAddress && cCity && cStreet.includes(cCity)) {
                             // remove city and everything after it from street to avoid duplication
                             const cityIdx = cStreet.lastIndexOf(cCity);
                             if(cityIdx > 0) {
                                 cStreet = cStreet.substring(0, cityIdx).replace(/,\s*$/, '').trim();
                             }
                        }
                        
                        // Attempt to extract flat number if there are still multiple parts
                        const streetParts = cStreet.split(',');
                        if (streetParts.length > 1 && streetParts[0].length < 20) {
                            cFlatNo = streetParts[0].trim();
                            cStreet = streetParts.slice(1).join(', ').trim();
                        }

                        setSavedCustomerAddress({
                            flatNo: cFlatNo,
                            street: cStreet,
                            city: cCity,
                            state: cState,
                            pincode: cPincode,
                            lat: lookupRes.lat,
                            lng: lookupRes.lng
                        });
                        toast.success(`Welcome back, ${dispName || 'Customer'}!`);
                    } else if (lookupRes && lookupRes.displayName) {
                        setTempName(lookupRes.displayName);
                        setIsVerified(false);
                        setSavedCustomerAddress(null);
                    } else {
                        setTempName('');
                        setIsVerified(false);
                        setSavedCustomerAddress(null);
                    }
                } catch (err) {
                    console.log('Customer not previously registered under this phone.');
                    setTempName('');
                    setIsVerified(false);
                    setSavedCustomerAddress(null);
                }
            }
        }
    };

    const handleSendOtpInline = async () => {
        if (!customerPhone || customerPhone.length !== 10) {
            toast.error('Please enter a valid 10-digit mobile number');
            return;
        }
        if (!tempName.trim()) {
            toast.error('Please enter customer name');
            return;
        }
        setIsSendingOtp(true);
        try {
            await authApi.requestOtp(customerPhone, 'SMS', undefined, { role: 'Customer', name: tempName.trim() });
            toast.success('OTP sent to customer\'s mobile number!');
            setOtpValue('');
            setShowOtpField(true);
        } catch (err) {
            console.error('Request OTP Error:', err);
            toast.error('Failed to send OTP. Please try again.');
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleVerifyOtpInline = async () => {
        if (!otpValue || otpValue.length < 6) {
            toast.error('Please enter 6-digit OTP code');
            return;
        }
        setIsVerifyingOtp(true);
        try {
            const res = await authApi.verifyOtp(customerPhone, otpValue);
            if (res && (res.token || res.message === 'OTP verified successfully')) {
                setCustomerName(tempName.trim());
                setIsVerified(true);
                setShowOtpField(false);
                toast.success(`Customer verified: ${tempName.trim()}`);
            } else {
                toast.error(res.message || 'Verification failed');
            }
        } catch (err) {
            console.error('OTP Verification Error:', err);
            toast.error('Invalid or expired OTP. Please try again.');
        } finally {
            setIsVerifyingOtp(false);
        }
    };

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

            setItemPhotos(prev => ({ 
                ...prev, 
                [activePhotoService.id]: [...(prev[activePhotoService.id] || []), ...uploadedUrls] 
            }));
            
            toast.success('Photos uploaded successfully!');
        } catch (error) {
            console.error('Upload Error:', error);
            toast.error('Failed to upload photos');
        } finally {
            setUploading(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleDeletePhoto = (serviceId, photoUrl) => {
        setItemPhotos(prev => ({
            ...prev,
            [serviceId]: (prev[serviceId] || []).filter(url => url !== photoUrl)
        }));
        toast.success('Photo removed');
    };

    const handleApplyPromo = async () => {
        if (!promoCode) return;
        try {
            const res = await promotionApi.validate({
                code: promoCode,
                vendorId,
                orderValue: total
            });
            if (res.message) {
                setPromoError(res.message);
                setIsPromoApplied(false);
                setDiscount(0);
            } else {
                setIsPromoApplied(true);
                setPromoError('');
                setDiscount(res.discountType === 'Flat' ? res.discountValue : Math.round((total * res.discountValue) / 100));
                toast.success('Promo applied successfully!');
            }
        } catch (err) {
            setPromoError('Invalid or expired code');
            setIsPromoApplied(false);
            setDiscount(0);
        }
    };

    const getServiceQty = (serviceId) => {
        return items.filter(item => item.serviceId === serviceId).reduce((sum, item) => sum + item.quantity, 0);
    };

    const updateServiceQty = (service, change) => {
        const serviceId = service.serviceId;
        const currentItems = [...items];
        const existingIndex = currentItems.findIndex(item => item.serviceId === serviceId);

        if (change === 1) {
            if (existingIndex > -1) {
                currentItems[existingIndex].quantity += 1;
                setItems(currentItems);
                toast.success(`Incremented quantity of ${service.title}`);
            } else {
                const newItem = {
                    serviceId: serviceId,
                    title: service.title,
                    price: service.price,
                    icon: service.icon,
                    category: service.category,
                    subCategory: service.subCategory,
                    id: Date.now(),
                    quantity: 1,
                    tag: `T-${Math.floor(1000 + Math.random() * 9000)}`
                };
                setItems([...currentItems, newItem]);
                toast.success(`Added ${service.title} to queue`);
            }
        } else if (change === -1) {
            if (existingIndex > -1) {
                if (currentItems[existingIndex].quantity > 1) {
                    currentItems[existingIndex].quantity -= 1;
                    setItems(currentItems);
                    toast.success(`Decremented quantity of ${service.title}`);
                } else {
                    setItems(currentItems.filter(item => item.serviceId !== serviceId));
                    setItemPhotos(prev => {
                        const { [serviceId]: _, ...rest } = prev;
                        return rest;
                    });
                    toast.success(`Removed ${service.title} from queue`);
                }
            }
        }
    };

    useEffect(() => {
        if (selectedService) {
            const qty = getServiceQty(selectedService.serviceId);
            setQuantity(qty > 0 ? qty : 1);
        }
    }, [selectedService, items]);

    const addItem = () => {
        if (!selectedService) return;
        const qty = getServiceQty(selectedService.serviceId);
        if (qty > 0) {
            toast.success("Item is already in the queue!");
            return;
        }
        const newItem = { 
            ...selectedService, 
            id: Date.now(), 
            quantity: quantity,
            tag: `T-${Math.floor(1000 + Math.random() * 9000)}` 
        };
        setItems([...items, newItem]);
        toast.success(`${quantity}x ${selectedService.title} added!`);
        setQuantity(1); // Reset quantity
    };

    const removeItem = (id) => {
        const itemToRemove = items.find(item => item.id === id);
        const newItems = items.filter(item => item.id !== id);
        setItems(newItems);
        if (itemToRemove) {
            const hasRemaining = newItems.some(i => i.serviceId === itemToRemove.serviceId);
            if (!hasRemaining) {
                setItemPhotos(prev => {
                    const { [itemToRemove.serviceId]: _, ...rest } = prev;
                    return rest;
                });
            }
        }
    };

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleCollectAndPrint = async () => {
        if (!customerPhone || items.length === 0) return;
        
        if (enableDelivery && !isAddressComplete) {
            toast.error('Please complete the delivery address');
            return;
        }
        
        setIsProcessing(true);
        try {
            const allPhotos = [];
            items.forEach(item => {
                const photos = itemPhotos[item.serviceId] || [];
                allPhotos.push(...photos);
            });
            const uniquePhotos = Array.from(new Set(allPhotos));

            const finalPrice = Math.max(0, total + (enableDelivery ? 10 : 0) + Math.round(total * 0.05) - discount);
            const dropAddressStr = enableDelivery ? `${addressDetails.flatNo}, ${addressDetails.street}, ${addressDetails.city}, ${addressDetails.state} - ${addressDetails.pincode}` : 'Self Delivery / Customer';

            const orderData = {
                customerPhone,
                customerName,
                vendorId,
                orderType: 'Walk-In',
                riderDropOff: enableDelivery,
                dropAddress: dropAddressStr,
                deliveryTime: enableDelivery ? deliveryTime : 'N/A',
                addressDetails: enableDelivery ? addressDetails : null,
                items: items.map(i => ({
                    serviceId: i.serviceId,
                    name: i.title,
                    price: i.price,
                    quantity: i.quantity,
                    photos: itemPhotos[i.serviceId] || []
                })),
                totalAmount: finalPrice,
                status: 'In Progress',
                customerPhotos: uniquePhotos,
                deliveryCharge: enableDelivery ? 10 : 0,
                discountAmount: discount,
                promoApplied: isPromoApplied ? promoCode : null
            };

            const response = await orderApi.createWalkInOrder(orderData);
            setCreatedOrder(response);
            setShowReviewModal(false);
            setShowInvoice(true);
            
            toast.success('Walk-In Order Created!');
            setTimeout(() => {
                window.print();
            }, 600);
        } catch (err) {
            console.error('Walk-In Creation Failure:', err);
            toast.error('Failed to generate order');
        } finally {
            setIsProcessing(false);
        }
    };

    if (showReviewModal) {
        return (
            <div className="bg-slate-50 font-sans text-slate-900 min-h-[100dvh] flex flex-col pb-36">
                <main className="max-w-md mx-auto px-6 pt-6 pb-36 w-full flex-1 overflow-y-auto hide-scrollbar flex flex-col justify-start gap-4">
                    <header className="flex items-center gap-3 mb-2">
                        <motion.button 
                            whileTap={{ scale: 0.9 }} 
                            onClick={() => setShowReviewModal(false)} 
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-900 shadow-sm transition-all"
                        >
                            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        </motion.button>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
                            Review Details
                        </span>
                    </header>
                    
                    <div className="flex flex-col">
                        {/* 1. CONCISE ORDER SUMMARY BOX */}
                        <div className="bg-slate-950 text-white rounded-t-[2rem] p-5 shadow-2xl relative overflow-hidden group border-b border-white/5">
                            <div className="absolute right-0 top-0 p-6 opacity-[0.03] rotate-12 pointer-events-none">
                                <span className="material-symbols-outlined text-[80px]">receipt_long</span>
                            </div>
                            
                            <div className="flex items-center justify-between mb-5 relative z-10">
                                <div>
                                    <h2 className="text-xl font-black uppercase tracking-tighter leading-none">Order Summary</h2>
                                </div>
                            </div>

                            <div className="grid grid-cols-[1fr_1.15fr] gap-2 relative z-10">
                                {/* Left Side: Tier & Mode */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex-1">
                                            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Tier</p>
                                            <p className="text-[10px] font-black text-white uppercase">Essential</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex-1">
                                            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Delivery Mode</p>
                                            <p className="text-[10px] font-black text-white uppercase">
                                                {enableDelivery ? 'Shiprocket' : 'Normal (Self)'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Pickup & Drop */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="text-[7px] font-black text-white/30 uppercase tracking-widest leading-none mb-1 whitespace-nowrap">Pickup Address & Time</p>
                                            <div className="flex items-center gap-1.5 mt-1 whitespace-nowrap">
                                                <span className="text-[7px] font-black text-white/40 uppercase px-1 py-0.5 bg-white/5 rounded border border-white/5 shrink-0">
                                                    Store
                                                </span>
                                                <p className="text-[9px] font-black text-white uppercase">
                                                    {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="text-[7px] font-black text-white/30 uppercase tracking-widest leading-none mb-1 whitespace-nowrap">Dropoff Address & Time</p>
                                            {enableDelivery ? (
                                                <div className="space-y-1 mt-1">
                                                    <p className="text-[9px] font-black text-white uppercase truncate">
                                                        {addressDetails.flatNo}, {addressDetails.street}
                                                    </p>
                                                    <p className="text-[9px] font-black text-white/60 uppercase truncate">
                                                        {addressDetails.city}, {addressDetails.state} - {addressDetails.pincode}
                                                    </p>
                                                    <p className="text-[7px] font-black text-emerald-400 uppercase tracking-wide">
                                                        {deliveryTime}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 mt-1 whitespace-nowrap">
                                                    <span className="text-[7px] font-black bg-rose-500/20 text-rose-400 uppercase px-1.5 py-0.5 rounded border border-rose-500/10 shrink-0">
                                                        N/A
                                                    </span>
                                                    <p className="text-[9px] font-black text-white/40 uppercase">
                                                        No Dropoff Configured
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. PRICE BREAKDOWN / PAYMENT BOX */}
                        <div className="bg-slate-950 text-white rounded-b-[2rem] p-6 shadow-2xl space-y-4 relative overflow-hidden group">
                            <div className="absolute right-0 top-0 p-8 opacity-[0.02] rotate-12 pointer-events-none group-hover:opacity-[0.04] transition-opacity">
                                <span className="material-symbols-outlined text-[100px]">payments</span>
                            </div>

                            <div className="space-y-4 relative z-10">
                                <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 px-1">
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/40">
                                        <span>Service Price</span>
                                        <span className="text-white">₹{total.toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/40">
                                        <span>Platform Fee</span>
                                        <span className="text-white">₹0</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/40">
                                        <span>Logistic Fee</span>
                                        <span className="text-white">₹{enableDelivery ? '10' : '0'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/40">
                                        <span>GST</span>
                                        <span className="text-white">₹{Math.round(total * 0.05)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-white/5 space-y-4 relative z-10">
                                <div className="flex flex-col">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Total Payable Amount</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-3xl font-black tracking-tighter text-white">
                                            ₹{(total + (enableDelivery ? 10 : 0) + Math.round(total * 0.05)).toFixed(0)}
                                        </p>
                                    </div>
                                </div>
                                
                            </div>
                        </div>
                    </div>

                    {/* Services Review List - matching Customer Cart page style */}
                    <div className="mt-6 space-y-3">
                        <div className="flex items-center justify-between px-2">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Services Review</p>
                        </div>
                        {items.map((item, idx) => {
                            return (
                                <div key={item.id} className="bg-white rounded-3xl p-4 flex items-center gap-4 border border-slate-100 shadow-sm relative overflow-hidden group">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 font-black text-xs shrink-0">
                                        #{idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-slate-800 leading-none mb-1 truncate">{item.quantity}x {item.title}</p>
                                        <p className="text-[9px] font-bold text-[#3D5AFE] uppercase tracking-widest">Tag: {item.tag}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-900">₹{(item.price * item.quantity).toFixed(0)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </main>

                <div className="fixed bottom-[90px] left-0 right-0 p-4 z-50">
                    <div className="max-w-md mx-auto">
                        {enableDelivery ? (
                            <div className="grid grid-cols-2 gap-3">
                                <motion.button 
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="button"
                                    onClick={handleCollectAndPrint}
                                    disabled={isProcessing}
                                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-2xl transition-all text-center"
                                >
                                    PAY ON VENDOR
                                </motion.button>
                                <motion.button 
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="button"
                                    onClick={handleCollectAndPrint}
                                    disabled={isProcessing}
                                    className="w-full bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-2xl transition-all text-center"
                                >
                                    PAY WITH SPINZYT
                                </motion.button>
                            </div>
                        ) : (
                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                onClick={handleCollectAndPrint}
                                disabled={isProcessing}
                                className="w-full bg-slate-900 text-white hover:bg-slate-800 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all text-center"
                            >
                                SUBMIT
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="text-slate-900 min-h-[100dvh] pb-64 flex flex-col overflow-x-hidden font-sans">
            <main className="px-6 pt-2 space-y-6 flex-1">
                <header className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-900 shadow-sm transition-all">
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    </button>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
                        take customer order here
                    </span>
                </header>

                {/* Customer Section */}
                <section className="space-y-4">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Phone Input */}
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-base">phone_iphone</span>
                            <input 
                                type="tel"
                                placeholder="Enter Customer Mobile Number"
                                value={customerPhone}
                                onChange={(e) => handlePhoneChange(e.target.value)}
                                maxLength={10}
                                disabled={isVerified}
                                className={`w-full bg-white rounded-xl pl-12 pr-4 py-3.5 text-xs font-bold border border-slate-200 shadow-sm focus:ring-4 focus:ring-[#3D5AFE]/10 transition-all outline-none ${isVerified ? 'bg-slate-50 text-slate-500' : ''}`}
                            />
                        </div>

                        {/* Name Input */}
                        <div className={`relative group transition-all duration-300 ${customerPhone.length !== 10 ? 'opacity-40 pointer-events-none' : ''}`}>
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-base">person</span>
                            <input 
                                type="text"
                                placeholder="Enter Customer Name"
                                value={tempName}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^A-Za-z\s]/g, '');
                                    setTempName(val);
                                }}
                                disabled={isVerified || customerPhone.length !== 10}
                                className={`w-full bg-white rounded-xl pl-12 pr-4 py-3.5 text-xs font-bold border border-slate-200 shadow-sm focus:ring-4 focus:ring-[#3D5AFE]/10 transition-all outline-none ${isVerified ? 'bg-slate-50 text-slate-500' : ''}`}
                            />
                        </div>
                    </div>

                    {/* Drop-off Delivery Toggle */}
                    <div className={`flex items-center justify-between bg-slate-50 p-4 border border-slate-200/60 rounded-xl transition-all duration-300 ${customerPhone.length !== 10 || tempName.trim().length === 0 ? 'opacity-40 pointer-events-none' : ''}`}>
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Drop-off Delivery</span>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Enable rider courier delivery to customer address</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                if (!enableDelivery) {
                                    setEnableDelivery(true);
                                    if (savedCustomerAddress && (savedCustomerAddress.street || savedCustomerAddress.flatNo)) {
                                        setAddressDetails(prev => ({
                                            ...prev,
                                            flatNo: savedCustomerAddress.flatNo || '',
                                            street: savedCustomerAddress.street || '',
                                            city: savedCustomerAddress.city || '',
                                            state: savedCustomerAddress.state || '',
                                            pincode: savedCustomerAddress.pincode || '',
                                            lat: savedCustomerAddress.lat || 22.7196,
                                            lng: savedCustomerAddress.lng || 75.8577
                                        }));
                                        toast.success("Delivery address auto-filled from customer profile!");
                                    } else {
                                        setShowLocateModal(true);
                                    }
                                } else {
                                    setEnableDelivery(false);
                                }
                            }}
                            className={`w-12 h-6 flex items-center p-1 rounded-full cursor-pointer transition-all duration-300 border ${
                                enableDelivery ? 'bg-slate-950 border-slate-950 justify-end' : 'bg-slate-200 border-slate-300 justify-start'
                            }`}
                        >
                            <motion.div 
                                layout 
                                className="w-4 h-4 bg-white rounded-full"
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                        </button>
                    </div>

                    {/* Delivery Address Summary */}
                    {enableDelivery && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-50 border border-slate-200 p-4 space-y-4 rounded-3xl"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Delivery Address</span>
                                    <span className="text-[10px] font-bold text-slate-500 mt-1">
                                        {isAddressComplete ? `${addressDetails.flatNo}, ${addressDetails.street}` : 'Please provide location details'}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowLocateModal(true)}
                                    className="w-8 h-8 bg-slate-200 text-slate-900 rounded-full hover:bg-slate-300 transition-colors flex items-center justify-center"
                                >
                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                </button>
                            </div>

                            {/* Delivery Date & Time Selector - Shows inside the address block once address is complete */}
                            {isAddressComplete && (
                                <div className="border-t border-slate-200 pt-4 mt-3 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-[#3D5AFE] uppercase tracking-widest">Select Delivery Date & Time</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Delivery Date</label>
                                            <input
                                                type="date"
                                                value={deliveryDate}
                                                onChange={(e) => setDeliveryDate(e.target.value)}
                                                className="w-full bg-white border border-slate-200 px-3 py-2.5 text-xs font-bold focus:border-slate-300 transition-all outline-none rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Delivery Time</label>
                                            <input
                                                type="time"
                                                value={deliveryTimeVal}
                                                onChange={(e) => setDeliveryTimeVal(e.target.value)}
                                                className="w-full bg-white border border-slate-200 px-3 py-2.5 text-xs font-bold focus:border-slate-300 transition-all outline-none rounded-xl"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                        <button 
                                            type="button" 
                                            onClick={() => selectPreset('today')}
                                            className="flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest rounded bg-slate-200 text-slate-600 hover:bg-slate-300 transition-all"
                                        >
                                            Today 8PM
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => selectPreset('tomorrow')}
                                            className="flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest rounded bg-slate-200 text-slate-600 hover:bg-slate-300 transition-all"
                                        >
                                            Tomorrow 8PM
                                        </button>
                                    </div>
                                    {/* Format Preview */}
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                        Selected Schedule: <strong className="text-slate-800">{deliveryTime}</strong>
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Google Map Picker Modal Overlay */}
                    <AnimatePresence>
                        {showMapModal && (
                            <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.95, opacity: 0 }}
                                    className="bg-white w-full max-w-lg h-[80vh] rounded-none shadow-2xl flex flex-col overflow-hidden border border-slate-100"
                                >
                                    {/* Modal Header */}
                                    <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                                        <div>
                                            <h3 className="text-xs font-black tracking-widest uppercase text-slate-950">Select Location on Map</h3>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Search or drag marker to pinpoint address</p>
                                        </div>
                                        <button 
                                            onClick={() => setShowMapModal(false)} 
                                            className="w-8 h-8 rounded-none border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    </div>

                                    {/* Map & Search Container */}
                                    <div className="flex-1 relative bg-slate-50 flex flex-col">
                                        {/* Autocomplete Search input */}
                                        <div className="p-4 shrink-0 bg-white border-b border-slate-100 z-10">
                                            {isLoaded ? (
                                                <Autocomplete
                                                    onLoad={ac => setAutocompleteInstance(ac)}
                                                    onPlaceChanged={handlePlaceChanged}
                                                >
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-sm">search</span>
                                                        <input
                                                            type="text"
                                                            placeholder="Search for your locality, street or building..."
                                                            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 text-xs font-bold outline-none rounded-none focus:bg-white focus:border-slate-300 transition-all"
                                                        />
                                                    </div>
                                                </Autocomplete>
                                            ) : (
                                                <div className="w-full h-9 bg-slate-50 rounded-none animate-pulse border border-slate-100" />
                                            )}
                                        </div>

                                        {/* Google Map */}
                                        <div className="flex-1 relative">
                                            {isLoaded ? (
                                                <GoogleMap
                                                    mapContainerStyle={{ width: '100%', height: '100%' }}
                                                    center={mapCenter}
                                                    zoom={15}
                                                    options={{
                                                        disableDefaultUI: true,
                                                        zoomControl: true,
                                                        clickableIcons: false
                                                    }}
                                                    onLoad={map => {
                                                        mapRef.current = map;
                                                    }}
                                                >
                                                    <Marker
                                                        position={markerPos}
                                                        draggable={true}
                                                        onDragEnd={handleMarkerDragEnd}
                                                    />
                                                </GoogleMap>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                    Loading Google Maps...
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Modal Footer with Address Preview */}
                                    <div className="p-4 bg-white border-t border-slate-100 shrink-0 space-y-3">
                                        <div className="bg-slate-50 p-3 border border-slate-200/60 rounded-none flex items-start gap-3">
                                            <span className="material-symbols-outlined text-emerald-600 text-sm mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>beenhere</span>
                                            <div className="space-y-0.5">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Address Preview</span>
                                                <p className="text-[10px] font-bold text-slate-900 leading-snug break-words">
                                                    {addressPreview || 'Drag marker or search to see address preview...'}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={confirmMapLocation}
                                            disabled={!addressPreview}
                                            className="w-full py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-none shadow-md hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            <span>Confirm & Apply Location</span>
                                            <span className="material-symbols-outlined text-xs">arrow_forward</span>
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Send Verification OTP button */}
                    {customerPhone.length === 10 && tempName.trim() && (!enableDelivery || isAddressComplete) && !isVerified && !showOtpField && (
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSendOtpInline}
                            disabled={isSendingOtp}
                            className="w-fit mx-auto px-8 py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-md flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                        >
                            {isSendingOtp ? (
                                <motion.span 
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                    className="material-symbols-outlined text-[14px]"
                                >
                                    autorenew
                                </motion.span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-sm">sms</span>
                                    <span>Send OTP</span>
                                </>
                            )}
                        </motion.button>
                    )}

                    {/* Inline OTP Input Field */}
                    {showOtpField && !isVerified && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-3xl p-3 border border-slate-200 shadow-sm w-fit mx-auto"
                        >
                            <div className="flex gap-2 items-center">
                                <input 
                                    type="text"
                                    placeholder="ENTER OTP"
                                    value={otpValue}
                                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-[140px] px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-900 text-center tracking-[0.5em] placeholder:tracking-widest focus:bg-white border-2 border-transparent focus:border-slate-100 transition-all outline-none uppercase"
                                />
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleVerifyOtpInline}
                                    disabled={isVerifyingOtp}
                                    className="px-5 py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md flex items-center justify-center hover:bg-slate-800 transition-colors"
                                >
                                    {isVerifyingOtp ? (
                                        <motion.span 
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                            className="material-symbols-outlined text-[14px]"
                                        >
                                            autorenew
                                        </motion.span>
                                    ) : (
                                        'Verify'
                                    )}
                                </motion.button>
                                <button 
                                    onClick={handleSendOtpInline}
                                    className="text-slate-400 hover:text-slate-900 transition-colors p-2 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-center"
                                    title="Resend OTP"
                                >
                                    <span className="material-symbols-outlined text-[20px]">refresh</span>
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Verified Customer Status */}
                    {isVerified && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center justify-between bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-3 rounded-none text-xs font-bold"
                        >
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-600 text-base">verified</span>
                                <span>Customer Verified: <strong>{customerName}</strong></span>
                            </div>
                            <button 
                                onClick={() => {
                                    setCustomerPhone('');
                                    setTempName('');
                                }}
                                className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-700"
                            >
                                Reset
                            </button>
                        </motion.div>
                    )}
                </section>

                {/* Service Selection */}
                <section className={`space-y-4 transition-all duration-300 ${customerPhone.length !== 10 || tempName.trim().length === 0 ? 'opacity-40 pointer-events-none' : ''}`}>

                    <div className="space-y-1.5">
                        {/* Category Selection Row */}
                        {uniqueCategories.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5 px-1">
                            {uniqueCategories.map(cat => (
                                <motion.button
                                    key={cat}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleCategoryClick(cat)}
                                    className={`flex flex-row items-center justify-center transition-all duration-300 min-w-[80px] px-4 py-2.5 border-2 rounded-xl ${selectedCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                                >
                                    <span className={`font-black uppercase tracking-widest leading-none text-[8px] ${selectedCategory === cat ? 'text-white' : 'text-slate-500'}`}>{cat}</span>
                                </motion.button>
                            ))}
                        </div>
                    )}

                    {/* Subcategory Selection Row */}
                    <AnimatePresence>
                        {uniqueSubCategories.length > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5 px-1"
                            >
                                {uniqueSubCategories.map(sub => (
                                    <button
                                        key={sub}
                                        onClick={() => handleSubCategoryClick(sub)}
                                        className={`font-black uppercase tracking-widest transition-all whitespace-nowrap border px-6 py-3.5 text-[10px] rounded-lg ${selectedSubCategory === sub ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200'}`}
                                    >
                                        {sub}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    </div>
                    
                    {/* Vertical list of service rows */}
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {filteredServices.length > 0 ? filteredServices.map(s => {
                            const isSelected = selectedService?.serviceId === s.serviceId;
                            const qty = getServiceQty(s.serviceId);
                            return (
                                <motion.button
                                    key={s.serviceId}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedService(s)}
                                    className={`w-full flex items-center justify-between p-3.5 rounded-[1.5rem] border transition-all duration-500 text-left ${isSelected ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-[1.01]' : 'bg-white border-slate-100 text-slate-700 hover:border-slate-300 shadow-sm'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#73e0c9]/20 text-[#73e0c9]' : 'bg-slate-50 text-slate-400'}`}>
                                            <span className="material-symbols-outlined text-base">{s.icon}</span>
                                        </div>
                                        <div>
                                            <h4 className={`text-[9px] font-black uppercase line-clamp-1 tracking-tight mb-0.5 ${isSelected ? 'text-white' : 'text-slate-900'}`}>{s.title}</h4>
                                            <div className="flex gap-1 items-center">
                                                <span className={`text-[6px] font-black uppercase tracking-widest ${isSelected ? 'text-white/40' : 'text-slate-400'}`}>{s.category}</span>
                                                <span className={`w-0.5 h-0.5 rounded-full ${isSelected ? 'bg-white/20' : 'bg-slate-200'}`} />
                                                <span className={`text-[6px] font-black uppercase tracking-widest ${isSelected ? 'text-white/40' : 'text-slate-400'}`}>{s.subCategory}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2.5 shrink-0 ml-2 text-right" onClick={(e) => e.stopPropagation()}>
                                        <span className={`text-[11px] font-black ${isSelected ? 'text-emerald-400' : 'text-slate-900'}`}>₹{s.price}</span>
                                        
                                        {/* Inline Qty Controls */}
                                        <div className={`flex items-center rounded-lg p-0.5 border shadow-inner ${qty > 0 ? (isSelected ? 'bg-white/10 border-white/10' : 'bg-slate-50 border-slate-100') : 'bg-slate-50 border-slate-100'}`}>
                                            <button 
                                                type="button"
                                                onClick={() => updateServiceQty(s, -1)} 
                                                className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${qty > 0 ? (isSelected ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-slate-900') : 'text-slate-300 pointer-events-none'}`}
                                            >
                                                <span className="material-symbols-outlined text-[12px] font-black">remove</span>
                                            </button>
                                            <span className={`text-[9px] font-black px-1.5 min-w-[20px] text-center ${qty > 0 ? (isSelected ? 'text-white' : 'text-slate-900') : 'text-slate-400'}`}>
                                                {qty}
                                            </span>
                                            <button 
                                                type="button"
                                                onClick={() => updateServiceQty(s, 1)} 
                                                className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${qty > 0 ? (isSelected ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-slate-900') : 'text-slate-400 hover:text-slate-900'}`}
                                            >
                                                <span className="material-symbols-outlined text-[12px] font-black">add</span>
                                            </button>
                                        </div>

                                        {qty > 0 && (
                                            <button 
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActivePhotoService({ id: s.serviceId, name: s.title });
                                                }}
                                                className={`w-7 h-7 rounded-none flex items-center justify-center transition-all border ${
                                                    itemPhotos[s.serviceId]?.length > 0 
                                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md animate-pulse' 
                                                        : (isSelected 
                                                            ? 'bg-white/10 text-white/60 border-white/10 hover:text-white' 
                                                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600')
                                                }`}
                                                title="Add/Edit Photos (Optional)"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">add_a_photo</span>
                                            </button>
                                        )}
                                    </div>
                                </motion.button>
                            );
                        }) : (
                            <div className="w-full py-10 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">No Services Found...</div>
                        )}
                    </div>

                    {selectedService && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm space-y-4"
                        >
                            {/* Row 1: Item Name and Quantity Select */}
                            <div className="flex items-center justify-between gap-4">
                                <h3 className="text-xs font-black uppercase tracking-tight text-slate-900 truncate leading-none">{selectedService.title}</h3>
                                <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl">
                                    <button 
                                        onClick={() => updateServiceQty(selectedService, -1)}
                                        className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-900 font-bold text-sm"
                                    >
                                        -
                                    </button>
                                    <span className="text-sm font-black w-6 text-center">{quantity}</span>
                                    <button 
                                        onClick={() => updateServiceQty(selectedService, 1)}
                                        className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-900 font-bold text-sm"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Row 2: Delivery commitment in a single horizontal row */}
                            {!enableDelivery && (
                                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                                    {['Today, 8 PM', 'Tomorrow, 6 PM', 'In 2 Days', 'Custom Time'].map(time => (
                                        <button 
                                            key={time}
                                            onClick={() => setDeliveryTime(time)}
                                            className={`py-3 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${deliveryTime === time ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-400 border-slate-100'}`}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Row 3: Add button only with "ADD" text */}
                            {getServiceQty(selectedService.serviceId) === 0 && (
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={addItem}
                                    className="w-full py-3.5 bg-slate-950 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md flex items-center justify-center hover:bg-slate-900 transition-colors"
                                >
                                    Add
                                </motion.button>
                            )}
                        </motion.div>
                    )}
                </section>

                {/* Active Order Queue Removed per user request */}
            </main>

            {/* Sticky Order Action */}
            <AnimatePresence>
                {items.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-16 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-[50]"
                    >
                        <div className="max-w-2xl mx-auto flex justify-center">
                            <button
                                type="button"
                                onClick={() => setShowReviewModal(true)}
                                disabled={items.length === 0 || !customerPhone || !isVerified || isProcessing}
                                className={`w-full max-w-md py-4 rounded-none font-black text-[10px] uppercase tracking-widest transition-all border-2 ${
                                    items.length > 0 && customerPhone && isVerified
                                        ? 'bg-slate-950 text-white border-slate-950 shadow-md hover:bg-slate-900'
                                        : 'bg-slate-100 text-slate-300 border-transparent opacity-50 grayscale cursor-not-allowed'
                                }`}
                            >
                                Review
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>







            {/* Invoice Modal */}
            <AnimatePresence>
                {showInvoice && createdOrder && (
                    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/90 backdrop-blur-md">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-lg rounded-none shadow-2xl overflow-hidden relative"
                        >
                            {/* Blue Header Accent */}
                            <div className="h-2 bg-[#3D5AFE]"></div>

                            <div className="p-8 space-y-8">
                                {/* Brand & Title */}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tighter uppercase text-slate-950">Spinzyt</h3>
                                        <p className="text-[10px] font-black text-[#3D5AFE] uppercase tracking-widest">Hub Invoice</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ref ID</p>
                                        <p className="text-sm font-black text-slate-900">{createdOrder.orderId}</p>
                                    </div>
                                </div>

                                {/* Customer & Store Info */}
                                <div className="grid grid-cols-2 gap-4 pb-6 border-b border-slate-100">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</p>
                                        <p className="text-sm font-bold text-slate-800 tracking-tight leading-tight">
                                            {customerName ? `${customerName}` : `+91 ${customerPhone}`}
                                        </p>
                                        {customerName && (
                                            <p className="text-[10px] font-bold text-slate-400">+91 {customerPhone}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Store Entity</p>
                                        <p className="text-sm font-bold text-slate-800 tracking-tight truncate">{vendorData.displayName || 'Official Hub'}</p>
                                    </div>
                                    <div className="space-y-1 col-span-2 border-t border-slate-100 pt-3">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Delivery Mode</p>
                                        <p className="text-sm font-bold text-slate-800 tracking-tight text-wrap">
                                            {createdOrder.riderDropOff ? `Shiprocket Delivery (Address: ${createdOrder.dropAddress})` : 'Self Delivery / Customer'}
                                        </p>
                                    </div>
                                </div>

                                {/* Billing Table */}
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Itemized Billing</p>
                                    <div className="space-y-3">
                                        {items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-slate-50 px-5 py-3 rounded-none">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black text-[#3D5AFE]">{idx + 1}</span>
                                                    <div>
                                                        <p className="text-[11px] font-bold text-slate-800">{item.title}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.tag}</p>
                                                    </div>
                                                </div>
                                                <span className="text-[11px] font-black text-slate-900">₹{item.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Final Total Card */}
                                <div className="bg-slate-900 rounded-none p-6 text-white flex justify-between items-center shadow-lg">
                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-black text-[#73e0c9] uppercase tracking-[0.2em] leading-none mb-1">Net Payable</p>
                                        <p className="text-xs font-bold text-slate-400 leading-none">Status: Success (Paid)</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-black tracking-tighter">₹{total.toFixed(2)}</p>
                                    </div>
                                </div>

                                {/* Footer & Action */}
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Thank you for your visit!</p>
                                    </div>
                                    <div className="flex gap-3 print:hidden">
                                        <button 
                                            onClick={() => window.print()}
                                            className="flex-1 py-4 bg-slate-100 text-slate-950 rounded-none font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">print</span>
                                            Print Slip
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setShowInvoice(false);
                                                setItems([]);
                                                setCustomerPhone('');
                                                setCustomerName('');
                                                navigate('/vendor/dashboard');
                                            }}
                                            className="flex-1 py-4 bg-[#3D5AFE] text-white rounded-none font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#3D5AFE]/20 flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">home</span>
                                            Dashboard
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Hidden Professional Print Area */}
                            <div className="hidden print:block fixed inset-0 bg-white p-10 font-mono text-slate-900 leading-tight">
                                <div className="max-w-[400px] mx-auto border-2 border-slate-900 p-6 space-y-6">
                                    <div className="text-center border-b-2 border-slate-900 pb-4">
                                        <h2 className="text-3xl font-black tracking-tighter uppercase mb-1">Spinzyt Laundry</h2>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Professional Care Network</p>
                                        <p className="text-xs font-bold mt-2">{vendorData.displayName || 'Authorized Hub'}</p>
                                    </div>

                                    <div className="flex justify-between text-[11px] font-bold border-b border-slate-200 pb-4">
                                        <div className="space-y-1">
                                            <p>ORDER: {createdOrder.orderId}</p>
                                            <p>DATE: {new Date().toLocaleDateString()}</p>
                                            <p>TIME: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                        <div className="text-right space-y-1">
                                            {customerName && <p>NAME: {customerName.toUpperCase()}</p>}
                                            <p>CUST: +91 {customerPhone}</p>
                                            <p>TYPE: WALK-IN</p>
                                            <p>STATUS: PAID</p>
                                        </div>
                                    </div>

                                    <div className="text-[10px] font-mono border-b border-slate-200 pb-4 space-y-0.5">
                                        <p>DELIVERY MODE: {createdOrder.riderDropOff ? 'SHIPROCKET DELIVERY' : 'SELF / CUSTOMER'}</p>
                                        {createdOrder.riderDropOff && (
                                            <p className="break-all whitespace-normal">DELIVERY ADDR: {createdOrder.dropAddress}</p>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <table className="w-full text-xs font-bold">
                                            <thead>
                                                <tr className="border-b-2 border-slate-900 text-left">
                                                    <th className="py-1">DESCRIPTION</th>
                                                    <th className="py-1 text-right">TAG</th>
                                                    <th className="py-1 text-right">PRICE</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map((item, i) => (
                                                    <tr key={i} className="border-b border-slate-100">
                                                        <td className="py-2">{item.title}</td>
                                                        <td className="py-2 text-right">{item.tag}</td>
                                                        <td className="py-2 text-right">₹{item.price}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex justify-between items-center bg-slate-100 p-3 rounded-lg">
                                        <p className="text-sm font-black uppercase tracking-widest">Grand Total</p>
                                        <p className="text-xl font-black underline decoration-2">₹{total.toFixed(2)}</p>
                                    </div>

                                    <div className="flex justify-between items-end pt-4 border-t-2 border-slate-900 border-dashed">
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <p className="text-[8px] font-black uppercase tracking-widest leading-none mb-1">Authorized Scan</p>
                                                <div className="w-16 h-16 bg-white border-2 border-slate-900 p-1">
                                                    <div className="w-full h-full bg-slate-950 flex flex-wrap gap-[2px] p-[2px]">
                                                        {Array.from({length: 36}).map((_, i) => (
                                                            <div key={i} className={`w-[6px] h-[6px] ${Math.random() > 0.5 ? 'bg-white' : 'bg-transparent'}`}></div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[7px] font-bold uppercase tracking-tighter opacity-70">1. Not responsible for color bleed.</p>
                                                <p className="text-[7px] font-bold uppercase tracking-tighter opacity-70">2. Deliver within 48 hours.</p>
                                                <p className="text-[7px] font-bold uppercase tracking-tighter opacity-70">3. Non-refundable item check.</p>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="w-24 h-8 border-b border-slate-500 mb-1"></div>
                                            <p className="text-[7px] font-bold uppercase opacity-50">Store Manager</p>
                                        </div>
                                    </div>

                                    <div className="text-center pt-2">
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">*** Thank You for choosing Spinzyt ***</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* PHOTO OPTIONS & MANAGEMENT MODAL (OPTIONAL PHOTO ATTACHMENT) */}
            <AnimatePresence>
                {activePhotoService && (
                    <div className="fixed inset-0 z-[8000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="absolute inset-0 bg-transparent" 
                            onClick={() => setActivePhotoService(null)}
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.9, opacity: 0 }} 
                            className="relative w-full max-w-[340px] bg-white rounded-none p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto hide-scrollbar border border-slate-200"
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 leading-none">
                                    Photos for {activePhotoService.name} (Optional)
                                </span>
                                <button 
                                    type="button"
                                    onClick={() => setActivePhotoService(null)} 
                                    className="w-7 h-7 rounded-none bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-base">close</span>
                                </button>
                            </div>

                            {uploading && (
                                <div className="flex flex-col items-center justify-center py-4 gap-2 text-slate-500">
                                    <motion.span 
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                        className="material-symbols-outlined text-2xl"
                                    >
                                        autorenew
                                    </motion.span>
                                    <span className="text-[9px] font-black uppercase tracking-widest">Uploading media...</span>
                                </div>
                            )}

                            {/* Existing Photos Grid */}
                            {itemPhotos[activePhotoService.id]?.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2">
                                        {itemPhotos[activePhotoService.id].map((photo, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-none overflow-hidden border border-slate-100 bg-slate-50 group">
                                                <img src={photo} alt="" className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeletePhoto(activePhotoService.id, photo)}
                                                    className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-none flex items-center justify-center shadow-md hover:bg-rose-600 transition-all"
                                                    title="Remove Photo"
                                                >
                                                    <span className="material-symbols-outlined text-[10px] font-bold">close</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-2">
                                        <button 
                                            type="button"
                                            onClick={() => galleryInputRef.current.click()}
                                            className="flex-1 bg-slate-900 text-white py-2.5 rounded-none font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-xs">add</span> Add More
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => cameraInputRef.current.click()}
                                            className="flex-1 bg-white border border-slate-200 text-slate-900 py-2.5 rounded-none font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-xs">photo_camera</span> Take Photo
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                if (window.confirm("Delete all photos for this service?")) {
                                                    setItemPhotos(prev => {
                                                        const { [activePhotoService.id]: _, ...rest } = prev;
                                                        return rest;
                                                    });
                                                    toast.success('All photos removed');
                                                }
                                            }}
                                            className="flex-1 bg-rose-50 text-rose-600 py-2.5 rounded-none font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-rose-100 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-xs">delete</span> Clear All
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* No Photos State */
                                <div className="flex flex-col gap-3">
                                    <button
                                        type="button"
                                        onClick={() => galleryInputRef.current.click()}
                                        className="w-full bg-slate-50 rounded-none p-6 flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 hover:border-slate-900 transition-all text-slate-500 hover:text-slate-800"
                                    >
                                        <div className="w-10 h-10 rounded-none bg-white flex items-center justify-center text-slate-800 shadow-sm border border-slate-100">
                                            <span className="material-symbols-outlined text-xl">photo_library</span>
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest">Choose from Gallery</span>
                                    </button>
                                    
                                    <button
                                        type="button"
                                        onClick={() => cameraInputRef.current.click()}
                                        className="w-full bg-slate-50 rounded-none p-6 flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 hover:border-slate-900 transition-all text-slate-500 hover:text-slate-800"
                                    >
                                        <div className="w-10 h-10 rounded-none bg-white flex items-center justify-center text-slate-800 shadow-sm border border-slate-100">
                                            <span className="material-symbols-outlined text-xl">photo_camera</span>
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest">Capture Photo</span>
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showLocateModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-[#f8f9fa] rounded-[2rem] p-6 w-full max-w-[360px] shadow-2xl relative overflow-hidden flex flex-col h-[520px]"
                        >
                            <div className="flex-1 overflow-y-auto hide-scrollbar -mx-2 px-2 pb-6 pt-2">
                                <div className="mb-6">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowLocateModal(false)}
                                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors mb-2 -ml-2 bg-slate-100 rounded-full"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                    </button>
                                    <h2 className="text-[40px] font-black uppercase tracking-tighter leading-[0.9] text-[#1a1f2b]">ADDRESS.</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3">Details for accurate delivery</p>
                                </div>
                                
                                <div className="space-y-5 mt-8">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Search your location</label>
                                        {isLoaded ? (
                                            <Autocomplete
                                                onLoad={ac => setAutocompleteInstance(ac)}
                                                onPlaceChanged={async () => {
                                                    if (!autocompleteInstance) return;
                                                    const place = autocompleteInstance.getPlace();
                                                    if (!place || !place.geometry) return;
                                                    
                                                    const lat = place.geometry.location.lat();
                                                    const lng = place.geometry.location.lng();
                                                    
                                                    let street = '';
                                                    let city = '';
                                                    let state = '';
                                                    let pincode = '';

                                                    if (place.address_components) {
                                                        const streetNumberComp = place.address_components.find(c => c.types.includes('street_number'));
                                                        const routeComp = place.address_components.find(c => c.types.includes('route'));
                                                        const sublocalityComp = place.address_components.find(c => c.types.includes('sublocality_level_1'));
                                                        const neighborhoodComp = place.address_components.find(c => c.types.includes('neighborhood'));
                                                        
                                                        const parts = [
                                                            streetNumberComp?.long_name,
                                                            routeComp?.long_name,
                                                            sublocalityComp?.long_name,
                                                            neighborhoodComp?.long_name
                                                        ].filter(Boolean);
                                                        
                                                        street = parts.join(', ') || place.name || '';
                                                        
                                                        const cityComp = place.address_components.find(c => c.types.includes('locality') || c.types.includes('administrative_area_level_2'));
                                                        city = cityComp ? cityComp.long_name : '';
                                                        
                                                        const stateComp = place.address_components.find(c => c.types.includes('administrative_area_level_1'));
                                                        state = stateComp ? stateComp.long_name : '';
                                                        
                                                        const pinComp = place.address_components.find(c => c.types.includes('postal_code'));
                                                        pincode = pinComp ? pinComp.long_name : '';
                                                    }
                                                    
                                                    setAddressDetails(prev => ({
                                                        ...prev,
                                                        street: street,
                                                        city: city,
                                                        state: state,
                                                        pincode: pincode,
                                                        lat,
                                                        lng
                                                    }));
                                                }}
                                            >
                                                <input 
                                                    type="text" 
                                                    placeholder="Search for your house/building..." 
                                                    className="w-full bg-[#111625] text-white px-5 py-4 rounded-[1.2rem] text-sm font-bold outline-none placeholder:text-slate-500 shadow-inner" 
                                                />
                                            </Autocomplete>
                                        ) : (
                                            <div className="w-full h-[52px] bg-slate-200 animate-pulse rounded-[1.2rem]" />
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 pt-2">
                                        <button 
                                            type="button"
                                            className={`flex-1 py-4 rounded-[1.2rem] flex flex-col items-center justify-center gap-1.5 transition-all ${addressDetails.type === 'HOME' ? 'bg-black text-white shadow-xl shadow-black/20' : 'bg-transparent border border-slate-200 text-[#a0aabf]'}`} 
                                            onClick={() => setAddressDetails({...addressDetails, type: 'HOME'})}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">lock</span>
                                            <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
                                        </button>
                                        <button 
                                            type="button"
                                            className={`flex-1 py-4 rounded-[1.2rem] flex flex-col items-center justify-center gap-1.5 transition-all ${addressDetails.type === 'OFFICE' ? 'bg-black text-white shadow-xl shadow-black/20' : 'bg-transparent border border-slate-200 text-[#a0aabf]'}`} 
                                            onClick={() => setAddressDetails({...addressDetails, type: 'OFFICE'})}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">work</span>
                                            <span className="text-[9px] font-black uppercase tracking-widest">Office</span>
                                        </button>
                                        <button 
                                            type="button"
                                            className={`flex-1 py-4 rounded-[1.2rem] flex flex-col items-center justify-center gap-1.5 transition-all ${addressDetails.type === 'OTHER' ? 'bg-black text-white shadow-xl shadow-black/20' : 'bg-transparent border border-slate-200 text-[#a0aabf]'}`} 
                                            onClick={() => setAddressDetails({...addressDetails, type: 'OTHER'})}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">location_on</span>
                                            <span className="text-[9px] font-black uppercase tracking-widest">Other</span>
                                        </button>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Address Line 1</label>
                                        <input 
                                            type="text" 
                                            placeholder="Flat/House No, Building Name" 
                                            value={addressDetails.flatNo || ''} 
                                            onChange={(e) => setAddressDetails({...addressDetails, flatNo: e.target.value})} 
                                            className="w-full bg-[#f1f3f6] border border-slate-200/50 px-5 py-3.5 rounded-[1.2rem] text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-300 transition-all outline-none" 
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Address Line 2</label>
                                        <input 
                                            type="text" 
                                            placeholder="Street, Area Name" 
                                            value={addressDetails.street || ''} 
                                            onChange={(e) => setAddressDetails({...addressDetails, street: e.target.value})} 
                                            className="w-full bg-[#f1f3f6] border border-slate-200/50 px-5 py-3.5 rounded-[1.2rem] text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-300 transition-all outline-none" 
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Floor / Apt</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. 4th Floor" 
                                                value={addressDetails.floor || ''} 
                                                onChange={(e) => setAddressDetails({...addressDetails, floor: e.target.value})} 
                                                className="w-full bg-[#f1f3f6] border border-slate-200/50 px-5 py-3.5 rounded-[1.2rem] text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-300 transition-all outline-none" 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Landmark</label>
                                            <input 
                                                type="text" 
                                                placeholder="Near Temple/Gym" 
                                                value={addressDetails.landmark || ''} 
                                                onChange={(e) => setAddressDetails({...addressDetails, landmark: e.target.value})} 
                                                className="w-full bg-[#f1f3f6] border border-slate-200/50 px-5 py-3.5 rounded-[1.2rem] text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-300 transition-all outline-none" 
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Pincode</label>
                                            <input 
                                                type="text" 
                                                placeholder="6-digit ZIP" 
                                                value={addressDetails.pincode || ''} 
                                                onChange={(e) => setAddressDetails({...addressDetails, pincode: e.target.value})} 
                                                className="w-full bg-[#f1f3f6] border border-slate-200/50 px-5 py-3.5 rounded-[1.2rem] text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-300 transition-all outline-none" 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">City</label>
                                            <input 
                                                type="text" 
                                                placeholder="City Name" 
                                                value={addressDetails.city || ''} 
                                                onChange={(e) => setAddressDetails({...addressDetails, city: e.target.value})} 
                                                className="w-full bg-[#f1f3f6] border border-slate-200/50 px-5 py-3.5 rounded-[1.2rem] text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-300 transition-all outline-none" 
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">State</label>
                                        <input 
                                            type="text" 
                                            placeholder="State Name" 
                                            value={addressDetails.state || ''} 
                                            onChange={(e) => setAddressDetails({...addressDetails, state: e.target.value})} 
                                            className="w-full bg-[#f1f3f6] border border-slate-200/50 px-5 py-3.5 rounded-[1.2rem] text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-300 transition-all outline-none" 
                                        />
                                    </div>

                                </div>
                            </div>
                            
                            <div className="mt-4 pt-2 bg-[#f8f9fa] relative z-10">
                                <button 
                                    type="button"
                                    onClick={() => setShowLocateModal(false)} 
                                    className="w-full py-4 bg-black text-white rounded-full text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-black/20"
                                >
                                    Save Address
                                </button>
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
        </div>
    );
};

export default WalkInOrderPage;
