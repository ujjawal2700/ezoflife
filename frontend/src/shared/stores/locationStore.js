import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useLocationStore = create(
  persist(
    (set) => ({
      location: null, // { lat, lng, city, area, fullAddress }
      zone: null,
      pricingFactor: 1, // Default multiplier
      allowDiscount: true, // Defaults to true
      platformMultiplier: 0, // Default platform fee multiplier
      expressMultiplier: 1, // Default express multiplier
      heritageMultiplier: 1, // Default heritage multiplier
      permissionStatus: 'prompt', // 'prompt', 'granted', 'denied'
      isPromptOpen: false,
      isPickerOpen: false,

      setLocation: (location) => set({ location }),
      setZoneData: (data) => set({ 
        zone: data.name, 
        pricingFactor: data.pricingFactor || 1,
        allowDiscount: data.allowDiscount !== false,
        platformMultiplier: data.platformMultiplier !== undefined ? data.platformMultiplier : 0,
        expressMultiplier: data.expressMultiplier !== undefined ? data.expressMultiplier : 1,
        heritageMultiplier: data.heritageMultiplier !== undefined ? data.heritageMultiplier : 1
      }),
      setPermissionStatus: (status) => set({ permissionStatus: status }),
      setPromptOpen: (isOpen) => set({ isPromptOpen: isOpen }),
      setPickerOpen: (isOpen) => set({ isPickerOpen: isOpen }),

      clearLocation: () => set({ location: null, zone: null, pricingFactor: 1, allowDiscount: true, platformMultiplier: 0, expressMultiplier: 1, heritageMultiplier: 1, permissionStatus: 'prompt' }),
    }),
    {
      name: 'ez-location-storage',
    }
  )
);
