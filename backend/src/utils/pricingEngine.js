/**
 * Pricing Engine based on Client Multiplicative Formula
 * V = (Base Rate * Area Multiplier * Express Multiplier * Platform Multiplier) + Logistic Fee
 * GST_Amount = V * GST %
 * Total = V + GST_Amount
 */

export const calculateOrderPrice = ({
    baseRate,
    areaMultiplier = 1,
    expressMultiplier = 1,
    platformMultiplier = 1,
    logisticsFee = 0,
    gstPercent = 18
}) => {
    // 1. Base + Area Calculation
    const baseWithArea = baseRate * areaMultiplier;

    // 2. Apply Service Multipliers (Express & Platform)
    // Note: We apply them cumulatively as per the formula V = (Base * A * E * P)
    const subtotalWithMultipliers = baseWithArea * expressMultiplier * platformMultiplier;

    // 3. Add Logistics Fee to get V
    const V = subtotalWithMultipliers + logisticsFee;

    // 4. Calculate GST
    const gstAmount = V * (gstPercent / 100);

    // 5. Calculate Final Total
    const total = V + gstAmount;

    // Return detailed breakdown
    return {
        breakdown: {
            baseWithArea,
            expressSurcharge: (baseWithArea * platformMultiplier) * (expressMultiplier - 1),
            platformFee: (baseWithArea * expressMultiplier) * (platformMultiplier - 1),
            logisticsFee,
            gstAmount,
            baseSubtotal: subtotalWithMultipliers // This is the component before logistics and GST
        },
        V,
        gstAmount,
        total
    };
};

export const calculateCartTotal = (items, config) => {
    // items: array of { baseRate, quantity }
    // config: { areaMultiplier, expressMultiplier, platformMultiplier, logisticsFee, gstPercent }
    
    let totalV = 0;
    const itemBreakdowns = items.map(item => {
        const res = calculateOrderPrice({
            baseRate: item.baseRate * item.quantity,
            areaMultiplier: config.areaMultiplier,
            expressMultiplier: config.expressMultiplier,
            platformMultiplier: config.platformMultiplier,
            logisticsFee: 0, // Logistics is added once at the end of V
            gstPercent: config.gstPercent
        });
        totalV += res.V;
        return res;
    });

    const finalV = totalV + config.logisticsFee;
    const finalGst = finalV * (config.gstPercent / 100);
    const finalTotal = finalV + finalGst;

    return {
        items: itemBreakdowns,
        v: finalV,
        gst: finalGst,
        total: finalTotal,
        breakdown: {
            logisticsFee: config.logisticsFee,
            gstAmount: finalGst,
            totalAmount: finalTotal
        }
    };
};
