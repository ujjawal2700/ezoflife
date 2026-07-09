// Mock settings
const settings = {
    gstNumber: 'SPINZYT_GST_12345'
};

// Simulation of GST display logic from frontend
const resolveGst = (order) => {
    const customerObj = order.user || order.customer;
    const customerGstType = customerObj?.customerType === 'retail' ? 'RD' : 'URD';
    const customerGstin = customerObj?.gstNumber || '';

    const vendorObj = order.vendor;
    const vendorGstin = vendorObj?.shopDetails?.gst || vendorObj?.gstNumber || '';
    const vendorGstType = vendorGstin ? 'RD' : 'URD';

    let displayGstNo = '';
    let displayGstLabel = '';
    let gstNotice = '';

    if (customerGstType === 'RD' && vendorGstType === 'RD') {
        displayGstNo = customerGstin;
        displayGstLabel = "Customer GSTIN";
        gstNotice = "B2B Invoice - Tax Credit Available";
    } else if (customerGstType === 'URD' && vendorGstType === 'RD') {
        displayGstNo = vendorGstin;
        displayGstLabel = "Vendor GSTIN";
        gstNotice = "B2C Invoice";
    } else {
        // Includes URD-URD and fallback
        displayGstNo = settings.gstNumber;
        displayGstLabel = "Spinzyt GSTIN";
        gstNotice = "Marketplace / Platform Invoice";
    }

    return { displayGstLabel, displayGstNo, gstNotice };
};

// Test Cases
const runTests = () => {
    // Case 1: RD Customer + RD Vendor
    const case1 = resolveGst({
        customer: { customerType: 'retail', gstNumber: 'CUST_GSTIN_111' },
        vendor: { shopDetails: { gst: 'VEND_GSTIN_222' } }
    });
    console.assert(case1.displayGstLabel === 'Customer GSTIN', 'Case 1 Label Fail');
    console.assert(case1.displayGstNo === 'CUST_GSTIN_111', 'Case 1 GSTIN Fail');
    console.assert(case1.gstNotice === 'B2B Invoice - Tax Credit Available', 'Case 1 Notice Fail');

    // Case 2: URD Customer + RD Vendor
    const case2 = resolveGst({
        customer: { customerType: 'individual', gstNumber: '' },
        vendor: { shopDetails: { gst: 'VEND_GSTIN_222' } }
    });
    console.assert(case2.displayGstLabel === 'Vendor GSTIN', 'Case 2 Label Fail');
    console.assert(case2.displayGstNo === 'VEND_GSTIN_222', 'Case 2 GSTIN Fail');
    console.assert(case2.gstNotice === 'B2C Invoice', 'Case 2 Notice Fail');

    // Case 3: URD Customer + URD Vendor
    const case3 = resolveGst({
        customer: { customerType: 'individual', gstNumber: '' },
        vendor: { shopDetails: { gst: '' } }
    });
    console.assert(case3.displayGstLabel === 'Spinzyt GSTIN', 'Case 3 Label Fail');
    console.assert(case3.displayGstNo === 'SPINZYT_GST_12345', 'Case 3 GSTIN Fail');
    console.assert(case3.gstNotice === 'Marketplace / Platform Invoice', 'Case 3 Notice Fail');

    console.log('All GST Invoice Resolution test assertions passed!');
};

runTests();
