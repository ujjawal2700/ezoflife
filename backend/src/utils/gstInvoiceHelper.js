import SystemConfig from '../models/SystemConfig.js';

/**
 * Helper to fetch relevant system tax and fee configurations
 */
export const getGstConfigs = async () => {
    try {
        const keys = [
            'gst_percent', 
            'platform_fee_fixed', 
            'platform_fee_gst_percent', 
            'logistics_fee_gst_percent', 
            'spinzyt_gstin',
            'invoice_settings'
        ];
        const configs = await SystemConfig.find({ key: { $in: keys } }).lean();
        const configMap = {};
        configs.forEach(c => { configMap[c.key] = c.value; });

        return {
            gstPercent: Number(configMap.gst_percent) || 18,
            platformFeeFixed: Number(configMap.platform_fee_fixed) || 20,
            platformFeeGstPercent: Number(configMap.platform_fee_gst_percent) || 18,
            logisticsFeeGstPercent: Number(configMap.logistics_fee_gst_percent) || 18,
            spinzytGstin: (configMap.spinzyt_gstin || configMap.invoice_settings?.gstNumber || '07AAAAA0000A1Z5').trim(),
            invoiceSettings: configMap.invoice_settings || {}
        };
    } catch (err) {
        console.error('Error fetching GST configs:', err);
        return {
            gstPercent: 18,
            platformFeeFixed: 20,
            platformFeeGstPercent: 18,
            logisticsFeeGstPercent: 18,
            spinzytGstin: '07AAAAA0000A1Z5',
            invoiceSettings: {}
        };
    }
};

/**
 * Checks if a customer qualifies as a Registered Business Customer (RD)
 */
export const checkCustomerRD = (customer) => {
    if (!customer) return false;
    const isRetail = customer.customerType === 'retail';
    const gstin = (customer.gstNumber || '').trim();
    return isRetail && gstin.length >= 10;
};

/**
 * Checks if a vendor qualifies as a Registered Vendor (RD)
 */
export const checkVendorRD = (vendor) => {
    if (!vendor) return false;
    const gstin = (vendor.shopDetails?.gst || vendor.gstNumber || '').trim();
    return gstin.length >= 10;
};

/**
 * Central engine to generate Invoice 1, Invoice 2, and Vendor Payout Ledger
 * according to business requirements.
 */
export const generateOrderInvoices = async ({
    order,
    customer,
    vendor,
    configs = null,
    vendorPromoValue = 0
}) => {
    const activeConfigs = configs || await getGstConfigs();

    const isCustRD = checkCustomerRD(customer || order.customer);
    const isVendRD = checkVendorRD(vendor || order.vendor);

    const customerGstin = (customer?.gstNumber || order.customerSnapshot?.gstNumber || '').trim();
    const vendorGstin = (vendor?.shopDetails?.gst || vendor?.gstNumber || order.vendorSnapshot?.gstNumber || '').trim();
    const spinzytGstin = activeConfigs.spinzytGstin;

    const baseWithArea = Number(order.priceBreakdown?.baseWithArea || 0);
    const expressSurcharge = Number(order.priceBreakdown?.expressSurcharge || 0);
    const platformFee = Number(order.priceBreakdown?.platformFee || activeConfigs.platformFeeFixed || 0);
    const logisticsFee = Number(order.priceBreakdown?.logisticsFee || order.deliveryCharge || 0);

    // Total base service value before tax
    const serviceValue = Math.round((baseWithArea + expressSurcharge + platformFee + logisticsFee) * 100) / 100;

    // Promotion split calculations:
    // 50% goes to Customer's Wallet, 50% goes to Spinzyt account
    const totalPromoDiscount = Number(vendorPromoValue || 0);
    const customerWalletShare = Math.round((totalPromoDiscount * 0.50) * 100) / 100;
    const spinzytPromoShare = Math.round((totalPromoDiscount * 0.50) * 100) / 100;

    // ─── INVOICE 1: Customer Invoice (Raised by Vendor to Customer) ─────────
    let scenario = 'C';
    let taxPercent = 0;
    let taxAmount = 0;
    let displayGstinLabel = 'Spinzyt GSTIN';
    let displayGstinNo = spinzytGstin;
    let invoice1Total = 0;

    if (isCustRD && isVendRD) {
        // Scenario A: Registered Customer (RD) + Registered Vendor (RD)
        scenario = 'A';
        taxPercent = activeConfigs.gstPercent;
        taxAmount = Math.round((serviceValue * (taxPercent / 100)) * 100) / 100;
        displayGstinLabel = 'Customer GSTIN';
        displayGstinNo = customerGstin;
        invoice1Total = Math.round((serviceValue + taxAmount) * 100) / 100;
    } else if (!isCustRD && isVendRD) {
        // Scenario B: Individual Customer (URD) + Registered Vendor (RD)
        scenario = 'B';
        taxPercent = activeConfigs.gstPercent;
        taxAmount = Math.round((serviceValue * (taxPercent / 100)) * 100) / 100;
        displayGstinLabel = 'Vendor GSTIN';
        displayGstinNo = vendorGstin;
        invoice1Total = Math.round((serviceValue + taxAmount) * 100) / 100;
    } else {
        // Scenario C: Individual Customer (URD) + Unregistered Vendor (URD)
        scenario = 'C';
        taxPercent = 0; // 0% GST calculated by unregistered vendor
        taxAmount = 0;
        displayGstinLabel = 'Spinzyt GSTIN';
        displayGstinNo = spinzytGstin;
        invoice1Total = serviceValue; // Total inclusive amount
    }

    const orderSeq = (order.orderId || String(order._id)).replace('#', '');
    const customerInvoice = {
        invoiceNo: `SZ-CUST-${orderSeq}`,
        scenario,
        serviceValue,
        taxPercent,
        taxAmount,
        displayGstinLabel,
        displayGstinNo,
        customerWalletCredit: customerWalletShare, // Displayed on invoice 1 (customer wallet amount only)
        totalAmount: invoice1Total,
        generatedAt: new Date()
    };

    // ─── INVOICE 2: Platform Revenue Invoice (Raised by Spinzyt to Vendor) ──
    const platformFeeTax = Math.round((platformFee * (activeConfigs.platformFeeGstPercent / 100)) * 100) / 100;
    const logisticsFeeTax = Math.round((logisticsFee * (activeConfigs.logisticsFeeGstPercent / 100)) * 100) / 100;

    const totalInvoice2Amount = Math.round(
        (platformFee + platformFeeTax + logisticsFee + logisticsFeeTax + spinzytPromoShare) * 100
    ) / 100;

    const platformInvoice = {
        invoiceNo: `SZ-PLAT-${orderSeq}`,
        platformFee,
        platformFeeTaxPercent: activeConfigs.platformFeeGstPercent,
        platformFeeTax,
        logisticsFee,
        logisticsFeeTaxPercent: activeConfigs.logisticsFeeGstPercent,
        logisticsFeeTax,
        spinzytGstin: spinzytGstin,
        spinzytPromoShare: spinzytPromoShare, // Displayed on invoice 2 (Spinzyt's share)
        totalInvoiceAmount: totalInvoice2Amount,
        generatedAt: new Date()
    };

    // ─── VENDOR PAYOUT CALCULATION ──────────────────────────────────────────
    // "Net Payment" = "Total Customer Payment (Invoice 1)" - "Total Spinzyt Platform Charges (Invoice 2)"
    const netPaymentToVendor = Math.max(0, Math.round((invoice1Total - totalInvoice2Amount) * 100) / 100);

    const ledger = {
        vendorNetPayout: netPaymentToVendor,
        customerWalletCredit: customerWalletShare,
        platformFee: platformFee,
        spinzytCombinedRevenue: totalInvoice2Amount,
        appliedPromoValue: totalPromoDiscount,
        promoOwnerType: totalPromoDiscount > 0 ? 'VENDOR' : 'NONE',
        invoice1Total: invoice1Total,
        invoice2Total: totalInvoice2Amount,
        spinzytPromoShare: spinzytPromoShare
    };

    return {
        customerInvoice,
        platformInvoice,
        ledger
    };
};

