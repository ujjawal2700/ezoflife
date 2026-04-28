/**
 * Safe Storage Utility
 * Prevents crashes on iOS/Browsers where localStorage might be restricted 
 * or throwing SecurityError.
 */

const isStorageAvailable = () => {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
};

const storageAvailable = isStorageAvailable();

export const safeStorage = {
    getItem: (key) => {
        if (!storageAvailable) return null;
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn(`[SafeStorage] Error getting ${key}:`, e);
            return null;
        }
    },
    setItem: (key, value) => {
        if (!storageAvailable) return;
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn(`[SafeStorage] Error setting ${key}:`, e);
        }
    },
    removeItem: (key) => {
        if (!storageAvailable) return;
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn(`[SafeStorage] Error removing ${key}:`, e);
        }
    },
    clear: () => {
        if (!storageAvailable) return;
        try {
            localStorage.clear();
        } catch (e) {
            console.warn('[SafeStorage] Error clearing storage:', e);
        }
    }
};
