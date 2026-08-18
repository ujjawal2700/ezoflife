/**
 * WhatsApp provider port.
 *
 * WhatsApp is the platform's ONLY OTP delivery channel — there is no SMS
 * fallback. Expressed in our domain ("send this OTP to this phone"), not any
 * vendor's API shape, so the transport can be swapped without touching
 * authController.
 *
 * Every method resolves to a plain object and NEVER throws — a gateway outage
 * must degrade to "delivery failed", never crash the login request.
 */
export class WhatsAppProvider {
    /** Human-readable name, used in logs and for provider selection. */
    get name() {
        throw new Error('WhatsAppProvider.name must be implemented');
    }

    /**
     * Send a one-time passcode to a phone number.
     * @param {string} phone  10-digit Indian mobile number (no country code)
     * @param {string} otp    the code to deliver
     * @returns {Promise<{ok:boolean, mode?:string, reason?:string}>}
     */
    // eslint-disable-next-line no-unused-vars
    async sendOtp(phone, otp) {
        throw new Error('sendOtp must be implemented');
    }
}

export default WhatsAppProvider;
