import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleMap, useJsApiLoader, Marker, StandaloneSearchBox } from '@react-google-maps/api';
import { authApi } from '../../../lib/api';

const libraries = ['drawing', 'places', 'geometry'];
const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 28.4595, lng: 77.0266 }; // Gurgaon

const RiderProfile = () => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    // Map States
    const [mapLocation, setMapLocation] = useState(defaultCenter);
    const [mapAddress, setMapAddress] = useState('');
    const searchBoxRef = useRef(null);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries
    });

    const riderData = JSON.parse(localStorage.getItem('riderData') || '{}');
    const riderId = riderData.id || localStorage.getItem('userId') || '66112c3f8e4b8a2e5c8b4569';

    const [profileData, setProfileData] = useState({
        name: 'Marcus V.',
        phone: '',
        address: '',
        location: defaultCenter,
        vehicleModel: '',
        plateNumber: '',
        joinedDate: '',
        riderId: ''
    });

    const [tempData, setTempData] = useState({ ...profileData });

    // Fetch Live Data
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await authApi.getProfile(riderId);
                const mappedData = {
                    name: data.displayName || 'Marcus V.',
                    phone: data.phone || '',
                    address: data.riderDetails?.address || '',
                    location: data.location || defaultCenter,
                    vehicleModel: data.riderDetails?.vehicleModel || '',
                    plateNumber: data.riderDetails?.plateNumber || '',
                    joinedDate: new Date(data.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    riderId: `#RD-${data._id.slice(-4)}`
                };
                setProfileData(mappedData);
                setTempData(mappedData);
                setMapLocation(data.location || defaultCenter);
                setIsLoading(false);
            } catch (err) {
                console.error('Profile fetch error:', err);
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [riderId]);

    const stats = useMemo(() => [
        { label: 'Weekly Earnings', value: '₹5,420', icon: 'payments', color: 'emerald' },
        { label: 'Tasks Today', value: '08', icon: 'task_alt', color: 'blue' },
        { label: 'Lifetime Rating', value: '4.92', icon: 'star', color: 'amber' }
    ], []);

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
        setTempData(prev => ({ ...prev, address: mapAddress, location: mapLocation }));
        setShowMapPicker(false);
    };

    const handleSave = async () => {
        try {
            setIsLoading(true);
            const updatePayload = {
                displayName: tempData.name,
                phone: tempData.phone,
                location: tempData.location,
                riderDetails: {
                    address: tempData.address,
                    vehicleModel: tempData.vehicleModel,
                    plateNumber: tempData.plateNumber
                }
            };
            await authApi.updateProfile(riderId, updatePayload);
            setProfileData({ ...tempData });
            setIsEditing(false);
            setIsLoading(false);
        } catch (err) {
            alert('Update failed: ' + err.message);
            setIsLoading(false);
        }
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
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newPos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setMapLocation(newPos);
                    reverseGeocode(newPos.lat, newPos.lng);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    alert('Could not fetch location. Please enable GPS.');
                }
            );
        }
    };

    const handleEdit = () => {
        setTempData({ ...profileData });
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    const handleChange = (field, value) => {
        setTempData(prev => ({ ...prev, [field]: value }));
    };

    if (isLoading && !isEditing) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching Profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen pb-32 font-sans overflow-x-hidden">
            {/* Profile Header */}
            <header className="bg-white px-6 pt-12 pb-10 rounded-b-[3rem] shadow-sm border-b border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 opacity-60" />
                
                <div className="flex flex-col items-center text-center relative z-10">
                    <div className="relative mb-6">
                        <div className="w-28 h-28 rounded-[2.5rem] bg-emerald-600 p-1 shadow-2xl shadow-emerald-200">
                            <img 
                                src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop" 
                                alt={profileData.name} 
                                className="w-full h-full object-cover rounded-[2.3rem] border-4 border-white"
                            />
                        </div>
                        {isEditing && (
                            <button className="absolute -bottom-1 -right-1 bg-white p-2.5 rounded-2xl shadow-xl flex items-center justify-center border border-slate-100 text-emerald-600">
                                <span className="material-symbols-outlined text-lg">photo_camera</span>
                            </button>
                        )}
                    </div>

                    {isEditing ? (
                        <input 
                            type="text" 
                            value={tempData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-3 text-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                    ) : (
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1 capitalize">{profileData.name}</h1>
                    )}

                    {!isEditing && (
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">Rider ID: {profileData.riderId}</span>
                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                Gold Tier
                            </span>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        {isEditing ? (
                            <>
                                <button 
                                    onClick={handleSave}
                                    disabled={isLoading}
                                    className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button 
                                    onClick={handleCancel}
                                    className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                <button 
                                    onClick={handleEdit}
                                    className="px-6 py-2.5 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                                >
                                    Edit Profile
                                </button>
                                <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                                    <span className="material-symbols-outlined text-xl">settings</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="px-6 py-10 space-y-10 max-w-xl mx-auto">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                    {stats.map((stat, i) => (
                        <div key={i} className="bg-white p-4 rounded-3xl border border-slate-100 text-center shadow-sm">
                            <div className={`w-8 h-8 rounded-xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center mx-auto mb-3`}>
                                <span className="material-symbols-outlined text-lg">{stat.icon}</span>
                            </div>
                            <p className="text-lg font-black text-slate-900 leading-none mb-1">{stat.value}</p>
                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.1em]">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Account Details */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Account & Identity</h2>
                        {isEditing && (
                            <button 
                                onClick={() => {
                                    setMapLocation(tempData.location || defaultCenter);
                                    setMapAddress(tempData.address || '');
                                    setShowMapPicker(true);
                                }}
                                className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 py-1 px-3 bg-emerald-50 rounded-full border border-emerald-100"
                            >
                                <span className="material-symbols-outlined text-[14px]">map</span>
                                Pin on Map
                            </button>
                        )}
                    </div>
                    <div className="bg-white rounded-[2.5rem] p-6 border border-slate-200/60 shadow-sm space-y-6">
                        {/* Phone */}
                        <div className="flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                                <span className="material-symbols-outlined text-slate-400 text-xl">call</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Mobile Number</p>
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        value={tempData.phone}
                                        onChange={(e) => handleChange('phone', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10"
                                    />
                                ) : (
                                    <p className="text-sm font-bold text-slate-800 leading-tight">{profileData.phone}</p>
                                )}
                            </div>
                        </div>

                        {/* Address */}
                        <div className="flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                                <span className="material-symbols-outlined text-slate-400 text-xl">home_pin</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Residential Address</p>
                                {isEditing ? (
                                    <textarea 
                                        value={tempData.address}
                                        onChange={(e) => handleChange('address', e.target.value)}
                                        rows="3"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 resize-none"
                                        placeholder="Add your address..."
                                    />
                                ) : (
                                    <p className="text-sm font-bold text-slate-800 leading-tight">{profileData.address || 'Address not added'}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Vehicle Section */}
                <section className="space-y-4">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Vehicle On-File</h2>
                    <div className="bg-white rounded-[2.5rem] p-6 border border-slate-200/60 shadow-sm space-y-6">
                        <div className="flex gap-4 items-center">
                            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                                <span className="material-symbols-outlined text-slate-400 text-xl">motorcycle</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Vehicle Model</p>
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        value={tempData.vehicleModel}
                                        onChange={(e) => handleChange('vehicleModel', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10"
                                    />
                                ) : (
                                    <p className="text-sm font-bold text-slate-800">{profileData.vehicleModel || 'Model not added'}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-4 items-center">
                            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                                <span className="material-symbols-outlined text-slate-400 text-xl">license</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Plate Number</p>
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        value={tempData.plateNumber}
                                        onChange={(e) => handleChange('plateNumber', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10"
                                    />
                                ) : (
                                    <p className="text-sm font-bold text-slate-800">{profileData.plateNumber || 'Plate not added'}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Map Address Picker Modal */}
            <AnimatePresence>
                {showMapPicker && (
                    <motion.div 
                        initial={{ opacity: 0, y: '100%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: '100%' }}
                        className="fixed inset-0 z-[100] bg-white flex flex-col"
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
                                <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Pin Accurate Spot</h3>
                            </div>
                            <button 
                                onClick={handleMapConfirm}
                                className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 active:scale-95 transition-all"
                            >
                                Confirm & Skip Manual
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
                                                placeholder="Search area or building..."
                                                className="w-full bg-white px-6 py-4 rounded-[2rem] shadow-2xl border border-slate-100 outline-none text-sm font-bold focus:ring-4 focus:ring-emerald-500/10"
                                            />
                                            <span className="material-symbols-outlined absolute right-6 top-1/2 -translate-y-1/2 text-emerald-600 transition-transform group-focus-within:scale-125">search</span>
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
                                        animation={window.google.maps.Animation.DROP}
                                    />
                                </GoogleMap>
                            ) : (
                                <div className="h-full flex items-center justify-center gap-3">
                                    <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Initializing Radar...</p>
                                </div>
                            )}

                            {/* Map Floating Actions */}
                            <div className="absolute bottom-10 left-6 right-6 flex flex-col gap-4">
                                <button 
                                    onClick={handleUseCurrentLocation}
                                    className="self-end w-14 h-14 bg-white rounded-2xl shadow-2xl border border-slate-100 flex items-center justify-center text-emerald-600 active:scale-90 transition-transform"
                                >
                                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>my_location</span>
                                </button>
                                
                                <motion.div 
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="bg-slate-900/95 backdrop-blur-lg p-6 rounded-[2.5rem] shadow-2xl border border-white/10"
                                >
                                    <div className="flex gap-4 items-start mb-2">
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-xl">location_on</span>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1">Detected Spot</p>
                                            <p className="text-sm font-bold text-white leading-tight opacity-90 line-clamp-2 italic">{mapAddress || 'Move marker to pick address'}</p>
                                        </div>
                                    </div>
                                    <p className="text-[8px] font-black text-emerald-400/60 uppercase tracking-[0.2em] text-center mt-4">Drag the marker for ultimate accuracy</p>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RiderProfile;
