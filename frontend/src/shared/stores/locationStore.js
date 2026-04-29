import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useLocationStore = create(
  persist(
    (set) => ({
      location: null, // { lat, lng, city, area, fullAddress }
      permissionStatus: 'prompt', // 'prompt', 'granted', 'denied'
      isPromptOpen: false,
      isPickerOpen: false,

      setLocation: (location) => set({ location }),
      setPermissionStatus: (status) => set({ permissionStatus: status }),
      setPromptOpen: (isOpen) => set({ isPromptOpen: isOpen }),
      setPickerOpen: (isOpen) => set({ isPickerOpen: isOpen }),

      clearLocation: () => set({ location: null, permissionStatus: 'prompt' }),
    }),
    {
      name: 'ez-location-storage',
    }
  )
);
