/**
 * Slot-time parsing.
 *
 * Regression guard: an unparseable slot must return null, never an Invalid Date.
 * An Invalid Date passes silently through setHours(), then fails Mongoose casting
 * and turns the whole order request into a 500.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTriggerTime } from '../../src/utils/timeUtils.js';

const isValidDate = v => v instanceof Date && !Number.isNaN(v.valueOf());

describe('calculateTriggerTime — production slot formats', () => {
    // These are the slot strings the app actually offers.
    for (const slot of [
        '02:00 PM - 04:00 PM',
        '06:00 PM - 08:00 PM',
        '09:00 AM - 11:00 AM',
        '12:00 PM - 02:00 PM',
        '12:00 AM - 02:00 AM'
    ]) {
        test(`parses "${slot}" to a valid date`, () => {
            assert.ok(isValidDate(calculateTriggerTime('2026-09-20', slot)));
        });
    }

    test('triggers exactly two hours before the slot start', () => {
        const t = calculateTriggerTime('2026-09-20', '02:00 PM - 04:00 PM');
        assert.equal(t.getHours(), 12);
        assert.equal(t.getMinutes(), 0);
    });

    test('handles 12 PM as noon, not midnight', () => {
        const t = calculateTriggerTime('2026-09-20', '12:00 PM - 02:00 PM');
        assert.equal(t.getHours(), 10); // noon minus 2h
        assert.equal(t.getDate(), 20);
    });

    test('handles 12 AM as midnight, rolling to the previous day', () => {
        const t = calculateTriggerTime('2026-09-20', '12:00 AM - 02:00 AM');
        assert.equal(t.getHours(), 22);
        assert.equal(t.getDate(), 19);
    });
});

describe('calculateTriggerTime — malformed input degrades safely', () => {
    // Each of these previously produced an Invalid Date and 500'd order creation.
    for (const bad of ['Morning', 'Afternoon', '2 PM - 4 PM', 'not a time', '::: - :::']) {
        test(`returns null (never Invalid Date) for "${bad}"`, () => {
            const r = calculateTriggerTime('2026-09-20', bad);
            assert.equal(r, null, `expected null, got ${r}`);
        });
    }

    test('returns null for an unparseable date', () => {
        assert.equal(calculateTriggerTime('not-a-date', '02:00 PM - 04:00 PM'), null);
    });

    test('returns null when either argument is missing', () => {
        assert.equal(calculateTriggerTime(null, '02:00 PM - 04:00 PM'), null);
        assert.equal(calculateTriggerTime('2026-09-20', null), null);
        assert.equal(calculateTriggerTime('2026-09-20', ''), null);
    });

    test('never returns an Invalid Date for any input', () => {
        const inputs = [
            ['2026-09-20', 'Morning'], ['2026-09-20', '25:00 XX - 26:00 XX'],
            ['', ''], ['2026-09-20', '  '], ['garbage', 'garbage']
        ];
        for (const [d, t] of inputs) {
            const r = calculateTriggerTime(d, t);
            assert.ok(r === null || isValidDate(r), `Invalid Date leaked for (${d}, ${t})`);
        }
    });
});
