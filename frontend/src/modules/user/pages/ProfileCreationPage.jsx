import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleMap, useJsApiLoader, Marker, StandaloneSearchBox } from '@react-google-maps/api';
import { authApi } from '../../../lib/api';

const libraries = ['drawing', 'places', 'geometry'];
const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 28.4595, lng: 77.0266 }; // Gurgaon

const ProfileCreationPage = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const mergedUser = { ...user, ...userData };

    const [name, setName] = useState(mergedUser.displayName || '');
    const [address, setAddress] = useState(mergedUser.address || '');
    const [isLocating, setIsLocating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);

    // Business onboarding additions
    const [customerType, setCustomerType] = useState('individual'); // 'individual' or 'retail' (for business)
    const [gpsAddress, setGpsAddress] = useState(''); // GPS selected location for Business
    const [businessName, setBusinessName] = useState(mergedUser.businessName || '');
    const [businessAddress, setBusinessAddress] = useState(mergedUser.businessAddress || '');
    const [gstNumber, setGstNumber] = useState(mergedUser.gstNumber || '');
    const [termsAccepted, setTermsAccepted] = useState(false);

    // Initial check for redirection
    React.useEffect(() => {
        if (mergedUser.displayName && mergedUser.address && !isLoading) {
            navigate('/user/home');
        }
    }, [mergedUser, navigate]);

    // Map States
    const [mapLocation, setMapLocation] = useState(mergedUser.location || defaultCenter);
    const [mapAddress, setMapAddress] = useState('');
    const searchBoxRef = useRef(null);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        version: '3.64',
        libraries
    });

    const userId = mergedUser.id || mergedUser._id; 
    const riderId = userId || '66112c3f8e4b8a2e5c8b4569';
    const reverseGeocode = async (lat, lng) => {
        if (!window.google) return;
        const geocoder = new window.google.maps.Geocoder();
        try {
            const response = await geocoder.geocode({ location: { lat, lng } });
            if (response.results[0]) {
                setMapAddress(response.results[0].formatted_address);
            }
        } catch (error) {
            console.error('Geocoding failed:', error);
        }
    };

    const handleMapConfirm = () => {
        if (customerType === 'individual') {
            setAddress(mapAddress);
        } else {
            setGpsAddress(mapAddress);
        }
        setShowMapPicker(false);
    };

    const onPlacesChanged = () => {
        const places = searchBoxRef.current.getPlaces();
        if (places && places.length > 0) {
            const place = places[0];
            const newPos = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
            };
            setMapLocation(newPos);
            setMapAddress(place.formatted_address);
        }
    };

    const handleMarkerDragEnd = (e) => {
        const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        setMapLocation(newPos);
        reverseGeocode(newPos.lat, newPos.lng);
    };

    const handleUseCurrentLocation = () => {
        if (navigator.geolocation) {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newPos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setMapLocation(newPos);
                    reverseGeocode(newPos.lat, newPos.lng);
                    setIsLocating(false);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    alert('Could not fetch location. Please enable GPS.');
                    setIsLocating(false);
                }
            );
        }
    };

    const handleLaunch = async () => {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = currentUser.id || currentUser._id;
        
        if (!userId) {
            console.error('No User ID found for profile update');
            navigate('/user/auth');
            return;
        }

        try {
            setIsLoading(true);

            const addressesPayload = [];
            if (customerType === 'individual') {
                addressesPayload.push({
                    type: 'Home',
                    address: address,
                    location: mapLocation,
                    isDefault: true
                });
            } else {
                addressesPayload.push({
                    type: 'Office',
                    address: gpsAddress,
                    location: mapLocation,
                    isDefault: true
                });
            }

            const payload = {
                displayName: name,
                customerType: customerType,
                isProfileComplete: true,
                addresses: addressesPayload
            };

            if (customerType === 'individual') {
                payload.address = address;
                payload.location = mapLocation;
            } else {
                payload.address = businessAddress;
                payload.businessName = businessName;
                payload.gstNumber = gstNumber;
                payload.businessAddress = businessAddress;
                payload.location = mapLocation;
            }

            await authApi.updateProfile(userId, payload);
            
            // Update local storage with the complete profile info
            const updatedUser = { 
                ...currentUser, 
                displayName: name, 
                customerType: customerType,
                isProfileComplete: true,
                addresses: addressesPayload
            };

            if (customerType === 'individual') {
                updatedUser.address = address;
                updatedUser.location = mapLocation;
            } else {
                updatedUser.address = businessAddress;
                updatedUser.businessName = businessName;
                updatedUser.gstNumber = gstNumber;
                updatedUser.businessAddress = businessAddress;
                updatedUser.location = mapLocation;
            }

            localStorage.setItem('user', JSON.stringify(updatedUser));
            localStorage.setItem('userData', JSON.stringify(updatedUser));
            localStorage.setItem('userType', customerType);
            
            navigate('/user/home');
        } catch (err) {
            alert('Could not save profile: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const isComplete = useMemo(() => {
        if (customerType === 'individual') {
            return name.trim().length >= 3 && address.trim().length > 10;
        } else {
            return name.trim().length >= 3 && 
                   gpsAddress.trim().length > 0 && 
                   businessName.trim().length >= 2 && 
                   businessAddress.trim().length > 10 && 
                   gstNumber.trim().length >= 10 && 
                   termsAccepted;
        }
    }, [customerType, name, address, gpsAddress, businessName, businessAddress, gstNumber, termsAccepted]);

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="bg-background text-on-surface min-h-[100dvh] pb-10 overflow-x-hidden">
            <header className="px-6 pt-16 mb-10">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-12 h-12 bg-primary-container rounded-2xl flex items-center justify-center text-primary mb-6"
                >
                    <span className="material-symbols-outlined text-[28px]">person_add</span>
                </motion.div>
                <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-4xl font-black tracking-tighter leading-none mb-3"
                >
                    Final Touch
                </motion.h1>
                <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-on-surface-variant text-sm font-semibold opacity-70"
                >
                    Complete your profile to unlock the flow.
                </motion.p>
            </header>

            <main className="px-6 max-w-md mx-auto">
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                >
                    {/* Customer Type Selector */}
                    <motion.div variants={itemVariants} className="flex gap-4">
                        <button 
                            type="button"
                            onClick={() => setCustomerType('individual')}
                            className={`flex-1 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest border transition-all ${
                                customerType === 'individual'
                                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            Individual
                        </button>
                        <button 
                            type="button"
                            onClick={() => setCustomerType('retail')}
                            className={`flex-1 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest border transition-all ${
                                customerType === 'retail'
                                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            Business
                        </button>
                    </motion.div>

                    {/* Name Input */}
                    <motion.div variants={itemVariants}>
                        <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-3 ml-1">Full Name</label>
                        <div className="bg-white rounded-3xl p-5 border border-slate-300 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                            <input 
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your full name"
                                className="w-full bg-transparent border-none focus:ring-0 outline-none p-0 text-md font-black placeholder:text-outline-variant/40"
                            />
                        </div>
                    </motion.div>

                    {/* Business specific fields */}
                    {customerType === 'retail' && (
                        <>
                            {/* GPS Address */}
                            <motion.div variants={itemVariants}>
                                <div className="flex justify-between items-center mb-3 px-1">
                                    <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">GPS Address</label>
                                    <button 
                                        type="button"
                                        onClick={() => setShowMapPicker(true)}
                                        className="flex items-center gap-1.5 text-primary text-[9px] font-black uppercase tracking-widest"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">my_location</span>
                                        Select GPS Location
                                    </button>
                                </div>
                                <div 
                                    onClick={() => setShowMapPicker(true)}
                                    className="bg-white rounded-[2rem] p-5 border border-slate-300 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all cursor-pointer"
                                >
                                    <textarea 
                                        rows={2}
                                        readOnly
                                        value={gpsAddress}
                                        placeholder="Click 'Select GPS Location' to choose location on map"
                                        className="w-full bg-transparent border-none focus:ring-0 outline-none p-0 text-sm font-bold text-on-surface leading-normal placeholder:text-outline-variant/40 resize-none cursor-pointer"
                                    />
                                </div>
                            </motion.div>

                            {/* Business Name */}
                            <motion.div variants={itemVariants}>
                                <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-3 ml-1">Business Name</label>
                                <div className="bg-white rounded-3xl p-5 border border-slate-300 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                    <input 
                                        type="text"
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        placeholder="Your business name"
                                        className="w-full bg-transparent border-none focus:ring-0 outline-none p-0 text-md font-black placeholder:text-outline-variant/40"
                                    />
                                </div>
                            </motion.div>

                            {/* Business Address */}
                            <motion.div variants={itemVariants}>
                                <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-3 ml-1">Business Address</label>
                                <div className="bg-white rounded-[2rem] p-5 border border-slate-300 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                    <textarea 
                                        rows={3}
                                        value={businessAddress}
                                        onChange={(e) => setBusinessAddress(e.target.value)}
                                        placeholder="Full formal physical location text block for invoicing/billing routing"
                                        className="w-full bg-transparent border-none focus:ring-0 outline-none p-0 text-sm font-bold text-on-surface leading-normal placeholder:text-outline-variant/40 resize-none"
                                    />
                                </div>
                            </motion.div>

                            {/* GST Number */}
                            <motion.div variants={itemVariants}>
                                <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-3 ml-1">GST Number</label>
                                <div className="bg-white rounded-3xl p-5 border border-slate-300 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                    <input 
                                        type="text"
                                        value={gstNumber}
                                        onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                                        placeholder="15-character GSTIN"
                                        maxLength={15}
                                        className="w-full bg-transparent border-none focus:ring-0 outline-none p-0 text-md font-black placeholder:text-outline-variant/40"
                                    />
                                </div>
                            </motion.div>
                        </>
                    )}

                    {/* Address Input with GPS */}
                    {customerType === 'individual' && (
                        <motion.div variants={itemVariants}>
                            <div className="flex justify-between items-center mb-3 px-1">
                                <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Home Address</label>
                                <button 
                                    type="button"
                                    onClick={() => setShowMapPicker(true)}
                                    className="flex items-center gap-1.5 text-primary text-[9px] font-black uppercase tracking-widest"
                                >
                                    <span className={`material-symbols-outlined text-[14px]`}>my_location</span>
                                    Use GPS
                                </button>
                            </div>
                            <div className="bg-white rounded-[2rem] p-5 border border-slate-300 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                <textarea 
                                    rows={3}
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Search or type your home address"
                                    className="w-full bg-transparent border-none focus:ring-0 outline-none p-0 text-sm font-bold text-on-surface leading-normal placeholder:text-outline-variant/40 resize-none"
                                />
                            </div>
                            <p className="text-[9px] font-bold text-on-surface-variant opacity-50 mt-3 px-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[12px]">info</span>
                                This will be your default pickup location.
                            </p>
                        </motion.div>
                    )}

                    {customerType === 'retail' && (
                        <motion.div variants={itemVariants} className="flex items-start gap-3 px-2">
                            <input 
                                type="checkbox"
                                id="termsAccepted"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                className="w-4 h-4 rounded text-primary border-slate-300 focus:ring-primary/20 mt-0.5 cursor-pointer"
                            />
                            <label htmlFor="termsAccepted" className="text-[10px] font-bold text-on-surface-variant opacity-70 leading-normal uppercase tracking-wider cursor-pointer">
                                I accept the Terms & Conditions and authorize EZOFLIFE to verify my Business details.
                            </label>
                        </motion.div>
                    )}

                    {/* Completion Button */}
                    <motion.button 
                        variants={itemVariants}
                        whileTap={isComplete ? { scale: 0.98 } : {}}
                        onClick={handleLaunch}
                        disabled={!isComplete || isLoading}
                        className={`w-full py-5 rounded-[2rem] transition-all duration-300 font-headline font-black uppercase tracking-[0.2em] text-xs shadow-xl flex items-center justify-center gap-2 ${
                            isComplete 
                            ? 'bg-primary-gradient text-on-primary shadow-primary/20 cursor-pointer' 
                            : 'bg-surface-container-high text-outline-variant opacity-50 cursor-not-allowed'
                        }`}
                    >
                        {isLoading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Please wait...
                            </>
                        ) : 'Launch Experience'}
                    </motion.button>
                </motion.div>
            </main>

            {/* Map Picker Modal */}
            <AnimatePresence>
                {showMapPicker && (
                    <motion.div 
                        initial={{ opacity: 0, y: '100%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: '100%' }}
                        className="fixed inset-0 z-[100] bg-white flex flex-col pt-safe"
                    >
                        {/* Map Header */}
                        <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm z-10">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setShowMapPicker(false)}
                                    className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center active:scale-90"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                                <h3 className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Verify Pickup Spot</h3>
                            </div>
                            <button 
                                onClick={handleMapConfirm}
                                className="px-5 py-3 bg-primary text-on-primary rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
                            >
                                Confirm Location
                            </button>
                        </div>

                        {/* Search Overlay */}
                        <div className="p-4 absolute top-24 left-0 right-0 z-20">
                            <div className="max-w-md mx-auto">
                                {isLoaded && (
                                    <StandaloneSearchBox
                                        onLoad={ref => searchBoxRef.current = ref}
                                        onPlacesChanged={onPlacesChanged}
                                    >
                                        <div className="relative group">
                                            <input 
                                                type="text" 
                                                placeholder="Enter colony or landmark..."
                                                className="w-full bg-white px-6 py-4 rounded-[2rem] shadow-2xl border border-slate-100 outline-none text-sm font-bold focus:ring-4 focus:ring-primary/10"
                                            />
                                            <span className="material-symbols-outlined absolute right-6 top-1/2 -translate-y-1/2 text-primary transition-transform group-focus-within:scale-125">search</span>
                                        </div>
                                    </StandaloneSearchBox>
                                )}
                            </div>
                        </div>

                        {/* Interactive Map */}
                        <div className="flex-grow bg-slate-100 relative">
                            {isLoaded ? (
                                <GoogleMap
                                    mapContainerStyle={mapContainerStyle}
                                    center={mapLocation}
                                    zoom={15}
                                    options={{
                                        disableDefaultUI: true,
                                        styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }]
                                    }}
                                >
                                    <Marker 
                                        position={mapLocation} 
                                        draggable={true} 
                                        onDragEnd={handleMarkerDragEnd}
                                    />
                                </GoogleMap>
                            ) : (
                                <div className="h-full flex items-center justify-center gap-3">
                                    <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                    <p className="text-[10px] font-black text-on-surface-variant tracking-widest uppercase">Loading Radar...</p>
                                </div>
                            )}

                            {/* Map Floating Actions */}
                            <div className="absolute bottom-10 left-6 right-6 flex flex-col gap-4">
                                <button 
                                    onClick={handleUseCurrentLocation}
                                    className="self-end w-14 h-14 bg-white rounded-2xl shadow-2xl border border-slate-100 flex items-center justify-center text-primary active:scale-90 transition-transform"
                                >
                                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>my_location</span>
                                </button>
                                
                                <motion.div 
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="bg-slate-900/95 backdrop-blur-lg p-6 rounded-[2.5rem] shadow-2xl border border-white/10"
                                >
                                    <div className="flex gap-4 items-start mb-2">
                                        <div className="w-10 h-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-xl">location_on</span>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1">Pickup Address</p>
                                            <p className="text-sm font-bold text-white leading-tight opacity-90 line-clamp-2 italic">{mapAddress || 'Move marker to pick address'}</p>
                                        </div>
                                    </div>
                                    <p className="text-[8px] font-black text-primary/60 uppercase tracking-[0.2em] text-center mt-4">Drag marker to specify your gate/block</p>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Visual Accents */}
            <div className="fixed -bottom-20 -left-20 w-80 h-80 bg-primary/5 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="fixed top-1/2 -right-40 w-80 h-80 bg-tertiary/5 rounded-full blur-[80px] pointer-events-none"></div>
        </div>
    );
};

export default ProfileCreationPage;
