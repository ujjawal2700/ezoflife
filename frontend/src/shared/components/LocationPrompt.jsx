import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocationStore } from '../stores/locationStore';
import { locationService } from '../../lib/locationService';
import toast from 'react-hot-toast';

import { geofenceApi } from '../../lib/api';

const LocationPrompt = () => {
  const { isPromptOpen, setPromptOpen, setLocation, setPermissionStatus, setPickerOpen, setZoneData } = useLocationStore();
  const [loading, setLoading] = useState(false);

  const handleAllowLocation = async () => {
    setLoading(true);
    try {
      const coords = await locationService.getCurrentCoordinates();
      setPermissionStatus('granted');
      
      const addressData = await locationService.reverseGeocode(coords.lat, coords.lng);
      setLocation(addressData);
      
      // Check for Geofence/Zone
      try {
        const zoneInfo = await geofenceApi.checkAvailability(coords.lat, coords.lng);
        if (zoneInfo.available) {
          setZoneData({ name: zoneInfo.name, pricingFactor: zoneInfo.pricingFactor });
        }
      } catch (zoneErr) {
        console.error('Zone check error:', zoneErr);
      }

      toast.success('Location detected successfully!');
      setPromptOpen(false);
    } catch (error) {
      console.error('Location Error:', error);
      if (error.code === 1) { // PERMISSION_DENIED
        setPermissionStatus('denied');
        toast.error('Location permission denied. Please enter manually.');
      } else {
        toast.error('Failed to get location. Please try manual entry.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = () => {
    setPromptOpen(false);
    setPickerOpen(true);
  };

  return (
    <AnimatePresence>
      {isPromptOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => setPromptOpen(false)}
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden border border-slate-100"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-primary-gradient" />
            
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center text-primary mx-auto mb-2 shadow-inner">
                <span className="material-symbols-outlined text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tighter text-slate-900 leading-tight">Enable Location</h3>
                <p className="text-sm font-bold text-slate-400 leading-relaxed px-4">
                  Allow location access to provide better services and faster delivery near you.
                </p>
              </div>

              <div className="space-y-3 pt-4">
                <button 
                  onClick={handleAllowLocation}
                  disabled={loading}
                  className="w-full py-5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <motion.span 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="material-symbols-outlined text-lg"
                    >
                      sync
                    </motion.span>
                  ) : (
                    <span className="material-symbols-outlined text-lg">my_location</span>
                  )}
                  {loading ? 'Detecting...' : 'Allow Location'}
                </button>
                
                <button 
                  onClick={handleManualEntry}
                  className="w-full py-5 bg-white text-slate-900 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                  Enter Location Manually
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LocationPrompt;
