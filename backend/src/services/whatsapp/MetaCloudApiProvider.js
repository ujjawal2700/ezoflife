import axios from 'axios';
import { WhatsAppProvider } from './WhatsAppProvider.js';

/**
 * WhatsApp Business Platform (Meta Cloud API).
 *
 * Sends the OTP as a WhatsApp template message — WhatsApp does not allow
 * free-text messages to a user who hasn't messaged you first, so the OTP MUST
 * go through a template pre-approved by Meta in the "Authentication" category.
 * Using Utility or Marketing for an OTP risks rejection and costs more per
 * message.
 *
 * This talks to the Cloud API's documented HTTP shape directly
 * (graph.facebook.com/{version}/{phone-number-id}/messages). Most BSPs
 * (360dialog, and several others) proxy that same shape, so pointing
 * WHATSAPP_API_BASE_URL at a BSP endpoint may work unchanged. BSPs with their
 * own proprietary API (Gupshup's older API, Interakt's dashboard-only flow)
 * would need their request built differently — if so, only this file changes.
 *
 * ⚠️ VERIFY BEFORE GOING LIVE:
 *   1. The template name/language must exactly match what Meta approved.
 *   2. Whether your template has a "Copy Code" button — Meta's standard OTP
 *      templates do, and the button component below is required if so.
 *      Set WHATSAPP_OTP_TEMPLATE_HAS_BUTTON=false if yours does not.
 *   3. Send one real OTP to your own phone before enabling this for users.
 */

const DEFAULT_BASE_URL = 'https://graph.facebook.com/v20.0';

/** Turn a 10-digit Indian mobile number into E.164 without the '+'. */
const toWhatsAppNumber = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    return digits; // already E.164-ish; let the API reject it if it's wrong
};

const describeAxiosError = (err) => {
    const status = err?.response?.status;
    const body = err?.response?.data?.error?.message || err?.response?.data;
    const detail = typeof body === 'string' ? body.slice(0, 200) : JSON.stringify(body || {}).slice(0, 200);
    return status ? `WhatsApp API ${status}: ${detail}` : (err?.message || 'unknown error');
};

export class MetaCloudApiProvider extends WhatsAppProvider {
    constructor({
        phoneNumberId,
        accessToken,
        baseUrl,
        templateName,
        templateLang,
        templateHasButton
    } = {}) {
        super();
        this.phoneNumberId = phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID;
        this.accessToken = accessToken ?? process.env.WHATSAPP_ACCESS_TOKEN;
        this.baseUrl = baseUrl ?? process.env.WHATSAPP_API_BASE_URL ?? DEFAULT_BASE_URL;
        this.templateName = templateName ?? process.env.WHATSAPP_OTP_TEMPLATE_NAME ?? 'otp_login';
        this.templateLang = templateLang ?? process.env.WHATSAPP_OTP_TEMPLATE_LANG ?? 'en_US';
        this.templateHasButton = templateHasButton
            ?? (String(process.env.WHATSAPP_OTP_TEMPLATE_HAS_BUTTON ?? 'true').toLowerCase() !== 'false');
    }

    get name() {
        return 'whatsapp-meta-cloud-api';
    }

    get isConfigured() {
        return Boolean(this.phoneNumberId && this.accessToken);
    }

    /** Build the template component list for a one-time-passcode template. */
    buildComponents(otp) {
        const components = [
            { type: 'body', parameters: [{ type: 'text', text: String(otp) }] }
        ];
        if (this.templateHasButton) {
            components.push({
                type: 'button',
                sub_type: 'url',
                index: '0',
                parameters: [{ type: 'text', text: String(otp) }]
            });
        }
        return components;
    }

    async sendOtp(phone, otp) {
        if (!this.isConfigured) {
            return { ok: false, reason: 'WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN not set' };
        }

        const to = toWhatsAppNumber(phone);
        if (to.length < 11) {
            return { ok: false, reason: `phone number does not look valid: "${phone}"` };
        }

        try {
            await axios.post(
                `${this.baseUrl}/${this.phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to,
                    type: 'template',
                    template: {
                        name: this.templateName,
                        language: { code: this.templateLang },
                        components: this.buildComponents(otp)
                    }
                },
                {
                    timeout: 15000,
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log(`✅ [WHATSAPP] OTP delivered to +${to}`);
            return { ok: true, mode: 'live' };
        } catch (err) {
            const reason = describeAxiosError(err);
            console.error(`❌ [WHATSAPP] OTP delivery failed for +${to}: ${reason}`);
            return { ok: false, reason };
        }
    }
}

export default MetaCloudApiProvider;
