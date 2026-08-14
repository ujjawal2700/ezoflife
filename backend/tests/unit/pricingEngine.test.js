/**
 * Pricing engine — pure calculation, no database.
 *
 * These lock in the client's multiplicative formula:
 *   V     = (Base * Area * Express * Platform) + Logistics
 *   GST   = V * gst%
 *   Total = V + GST
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrderPrice, calculateCartTotal } from '../../src/utils/pricingEngine.js';

const near = (actual, expected, tolerance = 0.01) =>
    assert.ok(
        Math.abs(actual - expected) <= tolerance,
        `expected ${expected} (±${tolerance}) but got ${actual}`
    );

describe('calculateOrderPrice', () => {
    test('applies the multiplicative formula end to end', () => {
        const r = calculateOrderPrice({
            baseRate: 1000,
            areaMultiplier: 1.2,
            expressMultiplier: 1.5,
            platformMultiplier: 1.1,
            logisticsFee: 50,
            gstPercent: 18
        });

        // base*area = 1200; *1.5 = 1800; *1.1 = 1980; +50 logistics = 2030
        near(r.V, 2030);
        near(r.gstAmount, 2030 * 0.18);
        near(r.total, 2030 * 1.18);
    });

    test('is a plain passthrough when every multiplier is neutral', () => {
        const r = calculateOrderPrice({
            baseRate: 500, areaMultiplier: 1, expressMultiplier: 1,
            platformMultiplier: 1, logisticsFee: 0, gstPercent: 0
        });
        near(r.V, 500);
        near(r.gstAmount, 0);
        near(r.total, 500);
    });

    test('express surcharge is zero for a normal-speed order', () => {
        const r = calculateOrderPrice({
            baseRate: 800, expressMultiplier: 1, platformMultiplier: 1.1, gstPercent: 5
        });
        near(r.breakdown.expressSurcharge, 0);
    });

    test('express surcharge appears only when the multiplier exceeds 1', () => {
        const r = calculateOrderPrice({
            baseRate: 1000, expressMultiplier: 1.5, platformMultiplier: 1, gstPercent: 0
        });
        // (base * platform) * (express - 1) = 1000 * 0.5
        near(r.breakdown.expressSurcharge, 500);
    });

    test('platform fee reflects only the platform margin', () => {
        const r = calculateOrderPrice({
            baseRate: 1000, expressMultiplier: 1, platformMultiplier: 1.1, gstPercent: 0
        });
        near(r.breakdown.platformFee, 100);
    });

    test('logistics fee is added once, after multipliers, and is not marked up', () => {
        const withFee = calculateOrderPrice({
            baseRate: 1000, platformMultiplier: 2, logisticsFee: 100, gstPercent: 0
        });
        const withoutFee = calculateOrderPrice({
            baseRate: 1000, platformMultiplier: 2, logisticsFee: 0, gstPercent: 0
        });
        // The fee must not be multiplied by the platform margin.
        near(withFee.V - withoutFee.V, 100);
    });

    test('GST is charged on V, which includes the logistics fee', () => {
        const r = calculateOrderPrice({
            baseRate: 100, logisticsFee: 100, gstPercent: 10
        });
        near(r.V, 200);
        near(r.gstAmount, 20);
    });

    test('uses documented defaults when optional inputs are omitted', () => {
        const r = calculateOrderPrice({ baseRate: 100 });
        near(r.V, 100);
        near(r.gstAmount, 18); // default gstPercent is 18
    });

    test('a zero-rate item produces a zero total', () => {
        const r = calculateOrderPrice({ baseRate: 0, gstPercent: 18 });
        near(r.total, 0);
    });
});

describe('calculateCartTotal', () => {
    test('sums line items and adds logistics exactly once', () => {
        const cfg = {
            areaMultiplier: 1, expressMultiplier: 1,
            platformMultiplier: 1, logisticsFee: 40, gstPercent: 10
        };
        const r = calculateCartTotal(
            [{ baseRate: 100, quantity: 2 }, { baseRate: 50, quantity: 1 }],
            cfg
        );
        // items = 200 + 50 = 250, + 40 logistics = 290
        near(r.v, 290);
        near(r.gst, 29);
        near(r.total, 319);
    });

    test('quantity scales the line linearly', () => {
        const cfg = { areaMultiplier: 1, expressMultiplier: 1, platformMultiplier: 1, logisticsFee: 0, gstPercent: 0 };
        const one = calculateCartTotal([{ baseRate: 100, quantity: 1 }], cfg);
        const three = calculateCartTotal([{ baseRate: 100, quantity: 3 }], cfg);
        near(three.total, one.total * 3);
    });

    test('an empty cart still charges the logistics fee and its GST', () => {
        const r = calculateCartTotal([], {
            areaMultiplier: 1, expressMultiplier: 1,
            platformMultiplier: 1, logisticsFee: 40, gstPercent: 10
        });
        near(r.v, 40);
        near(r.total, 44);
    });
});
