import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocationStore } from '../stores/locationStore';
import { locationService } from '../../lib/locationService';
import toast from 'react-hot-toast';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '2rem'
};

const center = {
  lat: 22.7196, // Default to Indore
  lng: 75.8577
};

const LocationPicker = () => {
  const { isPickerOpen, setPickerOpen, setLocation, location: currentLoc } = useLocationStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [mapCenter, setMapCenter] = useState(currentLoc ? { lat: currentLoc.lat, lng: currentLoc.lng } : center);
  const [markerPos, setMarkerPos] = useState(currentLoc ? { lat: currentLoc.lat, lng: currentLoc.lng } : center);
  const [isConfirming, setIsConfirming] = useState(false);
  const [addressPreview, setAddressPreview] = useState(currentLoc?.fullAddress || '');
  const [showManualForm, setShowManualForm] = useState(false);
  
  // Manual Form State
  const [manualAddress, setManualAddress] = useState({
    line1: '',
    line2: '',
    city: currentLoc?.city || '',
    pincode: '',
    type: 'HOME'
  });

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: API_KEY,
    libraries: ['drawing', 'places']
  });

  const autocompleteService = useRef(null);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    if (!autocompleteService.current && window.google) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
    }

    if (autocompleteService.current) {
      autocompleteService.current.getPlacePredictions(
        { input: query, componentRestrictions: { country: 'in' } },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSearchResults(predictions);
          } else {
            setSearchResults([]);
          }
        }
      );
    }
  }, []);

  const handleSelectPlace = useCallback((place) => {
    if (!window.google) return;

    const mapElement = document.createElement('div');
    const service = new window.google.maps.places.PlacesService(mapElement);
    
    service.getDetails(
      { placeId: place.place_id, fields: ['geometry', 'formatted_address', 'address_components'] },
      (details, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && details.geometry) {
          const newPos = {
            lat: details.geometry.location.lat(),
            lng: details.geometry.location.lng()
          };
          setMapCenter(newPos);
          setMarkerPos(newPos);
          setAddressPreview(details.formatted_address);
          setSearchResults([]);
          setSearchQuery(place.description);
          
          // Pre-fill manual form city if available
          const cityComp = details.address_components?.find(c => 
            c.types.includes('locality') || c.types.includes('administrative_area_level_2')
          );
          if (cityComp) {
            setManualAddress(prev => ({ ...prev, city: cityComp.long_name }));
          }
        } else {
          toast.error('Could not get place details');
        }
      }
    );
  }, []);

  const onMarkerDragEnd = async (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarkerPos({ lat, lng });
    
    try {
      const addressData = await locationService.reverseGeocode(lat, lng);
      setAddressPreview(addressData.fullAddress);
    } catch (error) {
      console.error('Reverse Geocode Error:', error);
    }
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const addressData = await locationService.reverseGeocode(markerPos.lat, markerPos.lng);
      setLocation(addressData);
      toast.success('Location updated!');
      setPickerOpen(false);
    } catch (error) {
      toast.error('Error saving location');
    } finally {
      setIsConfirming(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <AnimatePresence>
      {isPickerOpen && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
            onClick={() => setPickerOpen(false)}
          />
          
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-2xl bg-[#F8FAFC] h-[90vh] sm:h-[80vh] rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden flex flex-col"
          >
            {/* Header / Search */}
            <div className="p-6 space-y-4 bg-white shadow-sm z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black tracking-tighter text-slate-950">Select Location</h3>
                <button onClick={() => setPickerOpen(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <span className="material-symbols-outlined text-lg">search</span>
                </div>
                <input 
                  type="text"
                  placeholder="Search area, street or landmark..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:bg-white focus:border-primary/30 outline-none transition-all"
                />
                
                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-20 max-h-60 overflow-y-auto">
                    {searchResults.map((res) => (
                      <button 
                        key={res.place_id}
                        onClick={() => handleSelectPlace(res)}
                        className="w-full flex items-start gap-3 p-4 hover:bg-slate-50 transition-all text-left border-b border-slate-50 last:border-0"
                      >
                        <span className="material-symbols-outlined text-slate-400 mt-1">location_on</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-900 leading-tight truncate">{res.structured_formatting.main_text}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5 truncate">{res.structured_formatting.secondary_text}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowManualForm(true)}
                className="w-full py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">edit_note</span>
                Add Full Address Manually
              </button>
            </div>

            {/* Map / Manual Form Container */}
            <div className="flex-1 relative overflow-hidden">
              <AnimatePresence mode="wait">
                {!showManualForm ? (
                  <motion.div 
                    key="map"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full"
                  >
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={mapCenter}
                      zoom={15}
                      options={{
                        disableDefaultUI: true,
                        zoomControl: false,
                        clickableIcons: false
                      }}
                    >
                      <Marker 
                        position={markerPos} 
                        draggable={true} 
                        onDragEnd={onMarkerDragEnd}
                        animation={window.google.maps.Animation.DROP}
                      />
                    </GoogleMap>
                    
                    {/* Map Overlays */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full px-6 space-y-4">
                      <div className="bg-white/90 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-xl border border-white/20 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>beenhere</span>
                          </div>
                          <div className="space-y-1 flex-1">
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 opacity-80">Selected Address</label>
                            <p className="text-xs font-black text-slate-900 leading-snug truncate">
                              {addressPreview || 'Drag marker to refine...'}
                            </p>
                          </div>
                        </div>
                        
                        <button 
                          onClick={handleConfirm}
                          disabled={isConfirming || !addressPreview}
                          className="w-full py-5 bg-slate-900 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isConfirming ? 'Saving...' : 'Confirm & Continue'}
                          <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="form"
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    className="w-full h-full bg-white p-8 flex flex-col gap-6 overflow-y-auto hide-scrollbar"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <button onClick={() => setShowManualForm(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                        <span className="material-symbols-outlined">arrow_back</span>
                      </button>
                      <h4 className="text-xl font-black tracking-tighter">Enter Address Details</h4>
                    </div>

                    <div className="space-y-4">
                      <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                        {['HOME', 'OFFICE', 'OTHER'].map(type => (
                          <button
                            key={type}
                            onClick={() => setManualAddress({...manualAddress, type})}
                            className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${manualAddress.type === type ? 'bg-black text-white shadow-lg' : 'text-slate-400'}`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-4">Flat / House No / Floor</label>
                          <input 
                            type="text"
                            value={manualAddress.line1}
                            onChange={(e) => setManualAddress({...manualAddress, line1: e.target.value})}
                            placeholder="e.g. Flat 402, 4th Floor"
                            className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-black transition-all"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-4">Street / Landmark / Area</label>
                          <input 
                            type="text"
                            value={manualAddress.line2}
                            onChange={(e) => setManualAddress({...manualAddress, line2: e.target.value})}
                            placeholder="e.g. Near Apollo Hospital, Vijay Nagar"
                            className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-black transition-all"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-4">City</label>
                            <input 
                              type="text"
                              value={manualAddress.city}
                              onChange={(e) => setManualAddress({...manualAddress, city: e.target.value})}
                              placeholder="Indore"
                              className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-black transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-4">Pincode</label>
                            <input 
                              type="text"
                              value={manualAddress.pincode}
                              onChange={(e) => setManualAddress({...manualAddress, pincode: e.target.value})}
                              placeholder="452010"
                              className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-black transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        const full = `${manualAddress.line1}, ${manualAddress.line2}, ${manualAddress.city}`;
                        setLocation({
                          fullAddress: full,
                          city: manualAddress.city,
                          area: manualAddress.line2,
                          lat: markerPos.lat,
                          lng: markerPos.lng
                        });
                        setPickerOpen(false);
                        toast.success('Address saved!');
                      }}
                      disabled={!manualAddress.line1 || !manualAddress.line2}
                      className="w-full bg-black text-white py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-black/20 mt-auto disabled:opacity-50"
                    >
                      SAVE FULL ADDRESS
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LocationPicker;
