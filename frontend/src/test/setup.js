import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * Global test setup.
 *
 * The app touches a number of browser APIs that jsdom does not implement, and
 * several modules read Vite env vars at import time. Stubbing them here keeps
 * individual tests focused on behaviour rather than boilerplate.
 */

afterEach(() => cleanup());

// --- Vite env ---
// Modules like lib/googleMaps.js read import.meta.env at module scope.
if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY = 'test-maps-key';
}
if (!import.meta.env.VITE_API_URL) {
    import.meta.env.VITE_API_URL = 'http://localhost:5001/api';
}

// --- browser APIs jsdom lacks ---
global.matchMedia = global.matchMedia || (query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
}));

global.IntersectionObserver = global.IntersectionObserver || class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

global.ResizeObserver = global.ResizeObserver || class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

global.scrollTo = global.scrollTo || vi.fn();

// jsdom has no layout engine; several animation libs probe this.
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || vi.fn();
