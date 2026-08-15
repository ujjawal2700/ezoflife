import { LogisticsProvider, DeliveryStatus } from './LogisticsProvider.js';

/**
 * Deterministic in-process provider.
 *
 * Used for local development and by the whole test suite, so nothing books a
 * real courier. Behaviour mirrors the old ShiprocketService mock, but returns
 * the domain shape rather than Shiprocket's wire format.
 *
 * Task ids are prefixed MOCK- so a mock booking is never mistaken for a real
 * one in the database or in support tickets.
 */
export class MockProvider extends LogisticsProvider {
    get name() {
        return 'mock';
    }

    async checkServiceability(from, to) {
        return {
            ok: true,
            available: true,
            etaMinutes: 45,
            price: 40,
            partnerName: 'Mock Hyperlocal'
        };
    }

    async requestPickup(req) {
        const taskId = `MOCK-${req.leg}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        console.log('\n────────────────────────────────────────');
        console.log(`🧪 [LOGISTICS:MOCK] ${req.leg} task booked`);
        console.log(`   order   : ${req.referenceId}`);
        console.log(`   from    : ${req.from?.address || '?'}`);
        console.log(`   to      : ${req.to?.address || '?'}`);
        console.log(`   task    : ${taskId}`);
        console.log('────────────────────────────────────────\n');

        return {
            ok: true,
            taskId,
            trackingRef: taskId,
            partner: {
                name: 'Mock Rider',
                phone: '9000000000'
            }
        };
    }

    async cancelTask(taskId) {
        console.log(`🧪 [LOGISTICS:MOCK] cancelled ${taskId}`);
        return { ok: true };
    }

    async getStatus(taskId) {
        return {
            ok: true,
            status: DeliveryStatus.PARTNER_ASSIGNED,
            partner: { name: 'Mock Rider', phone: '9000000000' }
        };
    }

    parseWebhook(payload) {
        // Mirrors the canonical shape so webhook tests can run without a provider.
        if (!payload?.referenceId && !payload?.taskId) {
            return { ok: false, reason: 'payload missing referenceId and taskId' };
        }
        const status = payload.status;
        if (!Object.values(DeliveryStatus).includes(status)) {
            return { ok: false, reason: `unknown status "${status}"` };
        }
        return {
            ok: true,
            referenceId: payload.referenceId,
            taskId: payload.taskId,
            status,
            partner: payload.partner
        };
    }
}

export default MockProvider;
