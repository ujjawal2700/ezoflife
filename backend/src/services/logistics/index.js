import { MockProvider } from './MockProvider.js';
import { ShiprocketQuickProvider } from './ShiprocketQuickProvider.js';

export { LogisticsProvider, DeliveryStatus } from './LogisticsProvider.js';
export { MockProvider } from './MockProvider.js';
export { ShiprocketQuickProvider } from './ShiprocketQuickProvider.js';

/**
 * Provider selection.
 *
 * The live provider is opt-in via SHIPROCKET_ENABLED. Anything else — unset,
 * "false", missing credentials — falls back to the mock, so a misconfigured
 * deployment books nothing rather than failing in an unpredictable way.
 */
let cached = null;

export const getLogisticsProvider = ({ refresh = false } = {}) => {
    if (cached && !refresh) return cached;

    const enabled = String(process.env.SHIPROCKET_ENABLED || '').toLowerCase() === 'true';

    if (!enabled) {
        cached = new MockProvider();
        return cached;
    }

    const live = new ShiprocketQuickProvider();
    if (!live.isConfigured) {
        console.warn(
            '⚠️  [LOGISTICS] SHIPROCKET_ENABLED=true but SHIPROCKET_EMAIL/PASSWORD are missing — using mock provider.'
        );
        cached = new MockProvider();
        return cached;
    }

    console.log('🚚 [LOGISTICS] using provider: shiprocket-quick');
    cached = live;
    return cached;
};

/** Test helper — drops the memoised provider. */
export const resetLogisticsProvider = () => { cached = null; };
