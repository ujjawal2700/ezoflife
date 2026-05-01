import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useLocationStore = create(
  persist(
    (set) => ({
      location: null, // { lat, lng, city, area, fullAddress }
      zone: null,
      pricingFactor: 1, // Default multiplier
      permissionStatus: 'prompt', // 'prompt', 'granted', 'denied'
      isPromptOpen: false,
      isPickerOpen: false,

      setLocation: (location) => set({ location }),
      setZoneData: (data) => set({ zone: data.name, pricingFactor: data.pricingFactor || 1 }),
      setPermissionStatus: (status) => set({ permissionStatus: status }),
      setPromptOpen: (isOpen) => set({ isPromptOpen: isOpen }),
      setPickerOpen: (isOpen) => set({ isPickerOpen: isOpen }),

      clearLocation: () => set({ location: null, zone: null, pricingFactor: 1, permissionStatus: 'prompt' }),
    }),
    {
      name: 'ez-location-storage',
    }
  )
);
