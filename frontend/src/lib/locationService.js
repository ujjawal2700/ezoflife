import { waitForGoogleMaps } from './googleMaps';

/**
 * Location & geocoding helpers.
 *
 * These use the Google Maps JavaScript SDK (Geocoder / Places services) rather
 * than the maps.googleapis.com REST endpoints. Those REST endpoints send no
 * CORS headers, so calling them from the browser always fails — they are
 * server-to-server APIs. The SDK equivalents below run in-page and work.
 *
 * Return shapes are unchanged from the previous implementation, since a number
 * of screens destructure these results directly.
 */

/** Pull a named component out of a Geocoder / Places address_components array. */
const findComponent = (components, types) => {
    if (!Array.isArray(components)) return '';
    const match = components.find(c => types.some(t => c.types.includes(t)));
    return match ? match.long_name : '';
};

/** Map a Geocoder result into the shape the app expects. */
const toAddressData = (result, lat, lng) => {
    const components = result.address_components;
    return {
        fullAddress: result.formatted_address,
        city: findComponent(components, ['locality', 'administrative_area_level_2']),
        area: findComponent(components, ['sublocality_level_1', 'neighborhood']),
        state: findComponent(components, ['administrative_area_level_1']),
        pincode: findComponent(components, ['postal_code']),
        subLocal: findComponent(components, ['sublocality_level_2', 'route']),
        lat,
        lng
    };
};

/** Promise wrapper around the callback-based Geocoder. */
const geocode = async (request) => {
    const maps = await waitForGoogleMaps();
    const geocoder = new maps.Geocoder();

    return new Promise((resolve, reject) => {
        geocoder.geocode(request, (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
                resolve(results);
            } else if (status === 'ZERO_RESULTS') {
                reject(new Error('No address found for these coordinates'));
            } else {
                reject(new Error(`Geocoding failed (${status})`));
            }
        });
    });
};

export const locationService = {
    /**
     * Get current coordinates using the browser Geolocation API.
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
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: false, // Set to false first for faster response on mobile
                    timeout: 20000,            // Increase timeout to 20s
                    maximumAge: 30000          // Allow 30s old cached position
                }
            );
        });
    },

    /**
     * Reverse geocode lat/lng to a structured address.
     */
    reverseGeocode: async (lat, lng) => {
        try {
            const results = await geocode({ location: { lat, lng } });
            return toAddressData(results[0], lat, lng);
        } catch (error) {
            console.error('Reverse Geocoding Error:', error);
            throw error;
        }
    },

    /**
     * Geocode an address string to lat/lng.
     */
    geocodeAddress: async (address) => {
        try {
            const results = await geocode({ address });
            const location = results[0].geometry.location;
            return {
                lat: location.lat(),
                lng: location.lng()
            };
        } catch (error) {
            console.error('Geocoding Error:', error);
            throw error;
        }
    },

    /**
     * Autocomplete predictions for a partial address query.
     */
    searchLocations: async (query) => {
        try {
            const maps = await waitForGoogleMaps();
            const service = new maps.places.AutocompleteService();

            return await new Promise((resolve) => {
                service.getPlacePredictions(
                    { input: query, componentRestrictions: { country: 'in' } },
                    (predictions, status) => {
                        if (status === maps.places.PlacesServiceStatus.OK && predictions) {
                            resolve(predictions);
                        } else {
                            resolve([]);
                        }
                    }
                );
            });
        } catch (error) {
            console.error('Places Autocomplete Error:', error);
            return [];
        }
    },

    /**
     * Get place details (lat/lng + formatted address) from a Place ID.
     */
    getPlaceDetails: async (placeId) => {
        try {
            const maps = await waitForGoogleMaps();
            // PlacesService needs a DOM node or map instance to attach to.
            const service = new maps.places.PlacesService(document.createElement('div'));

            return await new Promise((resolve, reject) => {
                service.getDetails(
                    { placeId, fields: ['geometry', 'formatted_address'] },
                    (details, status) => {
                        if (status === maps.places.PlacesServiceStatus.OK && details?.geometry) {
                            resolve({
                                lat: details.geometry.location.lat(),
                                lng: details.geometry.location.lng(),
                                address: details.formatted_address
                            });
                        } else {
                            reject(new Error('Place details not found'));
                        }
                    }
                );
            });
        } catch (error) {
            console.error('Place Details Error:', error);
            throw error;
        }
    }
};
