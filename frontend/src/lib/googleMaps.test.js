import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_LOADER_OPTIONS, waitForGoogleMaps } from './googleMaps';

/**
 * The loader options are shared by nine call sites. If any of these invariants
 * break, `@react-google-maps/api` throws "Loader must not be called again with
 * different options" and every map in the app stops rendering.
 */

describe('GOOGLE_MAPS_LOADER_OPTIONS', () => {
    test('exposes a stable object identity across imports', async () => {
        const again = await import('./googleMaps');
        expect(again.GOOGLE_MAPS_LOADER_OPTIONS).toBe(GOOGLE_MAPS_LOADER_OPTIONS);
    });

    test('the libraries array is a stable reference, not a fresh literal', async () => {
        const again = await import('./googleMaps');
        // A new array each render is what silently breaks the loader.
        expect(again.GOOGLE_MAPS_LIBRARIES).toBe(GOOGLE_MAPS_LIBRARIES);
        expect(GOOGLE_MAPS_LOADER_OPTIONS.libraries).toBe(GOOGLE_MAPS_LIBRARIES);
    });

    test('carries the id and version every call site must share', () => {
        expect(GOOGLE_MAPS_LOADER_OPTIONS.id).toBe('google-map-script');
        expect(GOOGLE_MAPS_LOADER_OPTIONS.version).toBeTruthy();
    });

    test('includes the libraries the app actually uses', () => {
        for (const lib of ['drawing', 'places', 'geometry']) {
            expect(GOOGLE_MAPS_LIBRARIES).toContain(lib);
        }
    });

    test('reads the API key from the Vite env', () => {
        expect(GOOGLE_MAPS_LOADER_OPTIONS).toHaveProperty('googleMapsApiKey');
    });
});

describe('waitForGoogleMaps', () => {
    beforeEach(() => { delete window.google; });
    afterEach(() => { delete window.google; vi.useRealTimers(); });

    test('resolves immediately when the SDK is already present', async () => {
        window.google = { maps: { Geocoder: class {}, places: {} } };
        await expect(waitForGoogleMaps()).resolves.toBe(window.google.maps);
    });

    test('resolves once the SDK appears later', async () => {
        const pending = waitForGoogleMaps(5000);
        const maps = { Geocoder: class {}, places: {} };
        setTimeout(() => { window.google = { maps }; }, 150);
        await expect(pending).resolves.toBe(maps);
    });

    test('waits while the namespace exists but libraries are still loading', async () => {
        // The bootstrap creates google.maps before Geocoder/places are attached.
        window.google = { maps: {} };
        const pending = waitForGoogleMaps(5000);
        let settled = false;
        pending.then(() => { settled = true; });

        await new Promise(r => setTimeout(r, 250));
        expect(settled).toBe(false);

        window.google.maps.Geocoder = class {};
        window.google.maps.places = {};
        await expect(pending).resolves.toBe(window.google.maps);
    });

    test('times out if the libraries never finish loading', async () => {
        window.google = { maps: {} };
        await expect(waitForGoogleMaps(300)).rejects.toThrow(/did not load/);
    });

    test('rejects with an actionable message when the SDK never loads', async () => {
        await expect(waitForGoogleMaps(300)).rejects.toThrow(/VITE_GOOGLE_MAPS_API_KEY/);
    });

    test('does not hang forever — the timeout is honoured', async () => {
        const started = Date.now();
        await waitForGoogleMaps(250).catch(() => {});
        expect(Date.now() - started).toBeLessThan(3000);
    });
});
