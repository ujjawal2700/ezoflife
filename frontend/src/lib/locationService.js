const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const locationService = {
  /**
   * Get current coordinates using Geolocation API
   */
  getCurrentCoordinates: () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          reject(error);
        },
        { 
          enableHighAccuracy: false, // Set to false first for faster response on mobile
          timeout: 20000,           // Increase timeout to 20s
          maximumAge: 30000         // Allow 30s old cached position
        }
      );
    });
  },

  /**
   * Reverse Geocode lat/lng to address using Google Maps API
   */
  reverseGeocode: async (lat, lng) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        
        // Extract city and area
        let city = '';
        let area = '';
        
        const addressComponents = result.address_components;
        
        // Find locality (city)
        const cityComp = addressComponents.find(c => 
          c.types.includes('locality') || c.types.includes('administrative_area_level_2')
        );
        if (cityComp) city = cityComp.long_name;

        // Find sublocality (area)
        const areaComp = addressComponents.find(c => 
          c.types.includes('sublocality_level_1') || c.types.includes('neighborhood')
        );
        if (areaComp) area = areaComp.long_name;

        return {
          fullAddress: result.formatted_address,
          city,
          area,
          lat,
          lng
        };
      }
      throw new Error('No address found for these coordinates');
    } catch (error) {
      console.error('Reverse Geocoding Error:', error);
      throw error;
    }
  },

  /**
   * Search for locations using Google Places Autocomplete
   */
  searchLocations: async (query) => {
    // Note: In a real app, you'd use the Google Maps JS Library for Autocomplete
    // For a stateless service, we'd use the Places API (requires session tokens for cost optimization)
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${API_KEY}`
      );
      const data = await response.json();
      return data.predictions || [];
    } catch (error) {
      console.error('Places Autocomplete Error:', error);
      return [];
    }
  },

  /**
   * Get place details (lat/lng) from Place ID
   */
  getPlaceDetails: async (placeId) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?placeid=${placeId}&key=${API_KEY}`
      );
      const data = await response.json();
      if (data.status === 'OK') {
        const location = data.result.geometry.location;
        return {
          lat: location.lat,
          lng: location.lng,
          address: data.result.formatted_address
        };
      }
      throw new Error('Place details not found');
    } catch (error) {
      console.error('Place Details Error:', error);
      throw error;
    }
  }
};
