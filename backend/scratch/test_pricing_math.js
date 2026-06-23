import { calculateOrderPrice } from '../src/utils/pricingEngine.js';

function testMath() {
    const baseRate = 100;
    const areaMultiplier = 1.2;
    const expressMultiplier = 1.5;
    const platformMultiplier = 1.1;
    const logisticsFee = 50;
    const gstPercent = 18;

    const result = calculateOrderPrice({
        baseRate,
        areaMultiplier,
        expressMultiplier,
        platformMultiplier,
        logisticsFee,
        gstPercent
    });

    console.log('--- Pricing Engine Result ---');
    console.log(JSON.stringify(result, null, 2));

    const grossServiceCost = baseRate;
    const baseWithArea = result.breakdown.baseWithArea;
    const expressSurcharge = result.breakdown.expressSurcharge;
    const platformFee = result.breakdown.platformFee;
    
    const platformGst = platformFee * (gstPercent / 100);
    const vendorGst = (baseWithArea + expressSurcharge) * (gstPercent / 100);
    const totalPayable = result.total;

    console.log('\n--- Calculations ---');
    console.log('Gross Service Cost (raw):', grossServiceCost);
    console.log('Logistics Fee:', logisticsFee);
    console.log('Platform GST Amount:', platformGst);
    console.log('Vendor GST Amount:', vendorGst);
    
    const sumToCheck = grossServiceCost + logisticsFee + platformGst + vendorGst;
    console.log('Sum (grossServiceCost + logisticsFee + platformGst + vendorGst):', sumToCheck);
    console.log('Total Customer Payable (from pricing engine):', totalPayable);
    console.log('Are they equal?', sumToCheck === totalPayable);

    // Let's check the correct formula:
    // finalV = baseWithArea * expressMultiplier * platformMultiplier + logisticsFee
    // totalGst = (baseWithArea + expressSurcharge + platformFee + logisticsFee) * (gstPercent / 100)?
    // Wait, let's see what is finalV:
    const V = result.V;
    const calculatedGst = result.gstAmount;
    console.log('\n--- Correct Components ---');
    console.log('V (Taxable Value):', V);
    console.log('GST Amount:', calculatedGst);
    console.log('V + GST:', V + calculatedGst);
}

testMath();
