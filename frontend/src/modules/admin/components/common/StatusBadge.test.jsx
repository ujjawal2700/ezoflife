import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';

/**
 * StatusBadge renders order state across the admin panel. Every status in the
 * Order model's enum must render with a deliberate colour rather than silently
 * falling through to the neutral default.
 */

// Mirrors the `status` enum on backend/src/models/Order.js
const ORDER_STATUSES = [
    'ORDER_PLACED', 'PICKUP_ASSIGNED', 'RIDER_ARRIVING', 'IN_TRANSIT',
    'RECEIVED_BY_VENDOR', 'PROCESSING', 'READY_FOR_DISPATCH',
    'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'
];

const NEUTRAL = 'bg-slate-50';

describe('StatusBadge', () => {
    test('renders the status text', () => {
        render(<StatusBadge status="DELIVERED" />);
        expect(screen.getByText('DELIVERED')).toBeInTheDocument();
    });

    test.each(ORDER_STATUSES)('gives %s a deliberate colour, not the fallback', (status) => {
        const { container } = render(<StatusBadge status={status} />);
        const badge = container.firstChild;
        expect(badge.className).not.toContain(NEUTRAL);
    });

    test('falls back to neutral styling for an unknown status', () => {
        const { container } = render(<StatusBadge status="SOMETHING_NEW" />);
        expect(container.firstChild.className).toContain('slate');
    });

    test('does not crash when status is undefined', () => {
        expect(() => render(<StatusBadge />)).not.toThrow();
    });

    test('in-flight states are visually distinguished from terminal ones', () => {
        const { container: transit } = render(<StatusBadge status="IN_TRANSIT" />);
        const { container: delivered } = render(<StatusBadge status="DELIVERED" />);
        expect(transit.firstChild.className).not.toBe(delivered.firstChild.className);
    });

    test('renders a status indicator dot', () => {
        const { container } = render(<StatusBadge status="PROCESSING" />);
        expect(container.querySelector('span.rounded-full')).toBeTruthy();
    });
});
