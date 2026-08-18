import { WhatsAppProvider } from './WhatsAppProvider.js';

/**
 * Demo provider — used until a live WhatsApp Business account is configured.
 *
 * Prints the OTP to the server console instead of delivering it, and always
 * succeeds. This is what makes the app fully usable end-to-end (and testable)
 * with zero WhatsApp credentials: the OTP is the fixed demo value '123456'
 * whenever this provider is selected (see authController.generateOTP).
 */
export class MockWhatsAppProvider extends WhatsAppProvider {
    get name() {
        return 'mock';
    }

    async sendOtp(phone, otp) {
        console.log('\n' + '📱'.repeat(20));
        console.log('🧪 [WHATSAPP:DEMO] OTP — no live WhatsApp account configured');
        console.log(`📲 TO  : +91 ${phone}`);
        console.log(`🔑 OTP : ${otp}`);
        console.log('📱'.repeat(20) + '\n');

        return { ok: true, mode: 'demo' };
    }
}

export default MockWhatsAppProvider;
