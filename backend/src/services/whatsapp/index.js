import { MockWhatsAppProvider } from './MockWhatsAppProvider.js';
import { MetaCloudApiProvider } from './MetaCloudApiProvider.js';

export { WhatsAppProvider } from './WhatsAppProvider.js';
export { MockWhatsAppProvider } from './MockWhatsAppProvider.js';
export { MetaCloudApiProvider } from './MetaCloudApiProvider.js';

/**
 * Provider selection.
 *
 * The live provider is opt-in via WHATSAPP_ENABLED. Anything else — unset,
 * "false", missing credentials — falls back to the demo provider, so a
 * half-configured deployment sends nothing (and OTP stays the fixed demo
 * value) rather than failing unpredictably.
 */
let cached = null;

export const getWhatsAppProvider = ({ refresh = false } = {}) => {
    if (cached && !refresh) return cached;

    const enabled = String(process.env.WHATSAPP_ENABLED || '').toLowerCase() === 'true';

    if (!enabled) {
        cached = new MockWhatsAppProvider();
        return cached;
    }

    const live = new MetaCloudApiProvider();
    if (!live.isConfigured) {
        console.warn(
            '⚠️  [WHATSAPP] WHATSAPP_ENABLED=true but WHATSAPP_PHONE_NUMBER_ID/WHATSAPP_ACCESS_TOKEN ' +
            'are missing — falling back to the demo provider (OTP stays 123456).'
        );
        cached = new MockWhatsAppProvider();
        return cached;
    }

    console.log('📲 [WHATSAPP] using provider: whatsapp-meta-cloud-api');
    cached = live;
    return cached;
};

/** True once a live, configured provider is actually selected. */
export const isWhatsAppLive = () => getWhatsAppProvider().name !== 'mock';

/** Test helper — drops the memoised provider. */
export const resetWhatsAppProvider = () => { cached = null; };
