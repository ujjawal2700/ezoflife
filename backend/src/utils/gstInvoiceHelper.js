import SystemConfig from '../models/SystemConfig.js';

export const GST_SCENARIOS = Object.freeze({ RD_RD: 'RD_RD', URD_RD: 'URD_RD', URD_URD: 'URD_URD', BLOCKED: 'BLOCKED' });

export class GstConfigurationError extends Error {
    constructor(message) { super(message); this.name = 'GstConfigurationError'; this.status = 503; }
}

export class GstEligibilityError extends Error {
    constructor(message = 'A GST-registered customer can only place an order with a GST-registered vendor.') {
        super(message); this.name = 'GstEligibilityError'; this.status = 403; this.code = 'GST_VENDOR_INELIGIBLE';
    }
}

export const normalizeGstin = value => String(value || '').replace(/\s+/g, '').toUpperCase();
export const isValidGstin = value => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(normalizeGstin(value));
export const customerGstin = customer => normalizeGstin(customer?.gstNumber || customer?.customerSnapshot?.gstNumber);
export const vendorGstin = vendor => normalizeGstin(vendor?.shopDetails?.gst || vendor?.gstNumber || vendor?.vendorSnapshot?.gstNumber);
export const checkCustomerRD = customer => isValidGstin(customerGstin(customer));
export const checkVendorRD = vendor => isValidGstin(vendorGstin(vendor));

export const resolveGstScenario = (customer, vendor) => {
    const customerRegistered = checkCustomerRD(customer);
    const vendorRegistered = checkVendorRD(vendor);
    if (customerRegistered && vendorRegistered) return GST_SCENARIOS.RD_RD;
    if (customerRegistered) return GST_SCENARIOS.BLOCKED;
    if (vendorRegistered) return GST_SCENARIOS.URD_RD;
    return GST_SCENARIOS.URD_URD;
};

const configuredRate = (value, key) => {
    if (value === '' || value === null || value === undefined) throw new GstConfigurationError(`Missing financial configuration: ${key}`);
    const rate = Number(value);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new GstConfigurationError(`Invalid financial configuration: ${key}`);
    return rate;
};

export const validateGstConfigs = configMap => {
    const spinzytGstin = normalizeGstin(configMap.spinzyt_gstin || configMap.invoice_settings?.gstNumber);
    if (!isValidGstin(spinzytGstin)) throw new GstConfigurationError('Missing or invalid financial configuration: spinzyt_gstin');
    const platformFeeFixed = configMap.platform_fee_fixed == null ? 0 : Number(configMap.platform_fee_fixed);
    if (!Number.isFinite(platformFeeFixed) || platformFeeFixed < 0) throw new GstConfigurationError('Invalid financial configuration: platform_fee_fixed');
    return {
        gstPercent: configuredRate(configMap.gst_percent, 'gst_percent'),
        platformFeeFixed,
        platformFeeGstPercent: configuredRate(configMap.platform_fee_gst_percent, 'platform_fee_gst_percent'),
        logisticsFeeGstPercent: configuredRate(configMap.logistics_fee_gst_percent, 'logistics_fee_gst_percent'),
        spinzytGstin,
        invoiceSettings: configMap.invoice_settings || {}
    };
};

export const getGstConfigs = async () => {
    const keys = ['gst_percent', 'platform_fee_fixed', 'platform_fee_gst_percent', 'logistics_fee_gst_percent', 'spinzyt_gstin', 'invoice_settings'];
    const configs = await SystemConfig.find({ key: { $in: keys } }).lean();
    return validateGstConfigs(Object.fromEntries(configs.map(config => [config.key, config.value])));
};

const money = value => Math.round((Number(value) || 0) * 100) / 100;

export const buildGstSnapshot = ({ customer, vendor, configs, scenario }) => ({
    scenario,
    customerRegistered: checkCustomerRD(customer),
    customerGstin: customerGstin(customer),
    vendorRegistered: checkVendorRD(vendor),
    vendorGstin: vendorGstin(vendor),
    spinzytGstin: configs.spinzytGstin,
    gstPercent: configs.gstPercent,
    platformFeeGstPercent: configs.platformFeeGstPercent,
    logisticsFeeGstPercent: configs.logisticsFeeGstPercent,
    customerName: customer?.businessName || customer?.displayName || '',
    customerAddress: customer?.businessAddress || customer?.address || '',
    vendorName: vendor?.shopDetails?.name || vendor?.businessName || vendor?.displayName || '',
    vendorAddress: vendor?.shopDetails?.address || vendor?.businessAddress || vendor?.address || '',
    capturedAt: new Date()
});

export const generateOrderInvoices = async ({ order, customer, vendor, configs = null, vendorPromoValue = 0 }) => {
    const activeConfigs = configs ? validateGstConfigs({
        gst_percent: configs.gstPercent,
        platform_fee_fixed: configs.platformFeeFixed,
        platform_fee_gst_percent: configs.platformFeeGstPercent,
        logistics_fee_gst_percent: configs.logisticsFeeGstPercent,
        spinzyt_gstin: configs.spinzytGstin,
        invoice_settings: configs.invoiceSettings
    }) : await getGstConfigs();
    const scenario = resolveGstScenario(customer || order.customerSnapshot, vendor || order.vendorSnapshot);
    if (scenario === GST_SCENARIOS.BLOCKED) throw new GstEligibilityError();

    const snapshot = buildGstSnapshot({ customer, vendor, configs: activeConfigs, scenario });
    const baseWithArea = Number(order.priceBreakdown?.baseWithArea || 0);
    const expressSurcharge = Number(order.priceBreakdown?.expressSurcharge || 0);
    const platformFee = Number(order.priceBreakdown?.platformFee ?? activeConfigs.platformFeeFixed ?? 0);
    const logisticsFee = Number(order.priceBreakdown?.logisticsFee ?? order.deliveryCharge ?? 0);
    const serviceValue = money(baseWithArea + expressSurcharge + platformFee + logisticsFee);
    const totalPromoDiscount = money(vendorPromoValue);
    const customerWalletShare = money(totalPromoDiscount * 0.5);
    const spinzytPromoShare = money(totalPromoDiscount - customerWalletShare);
    const taxable = scenario !== GST_SCENARIOS.URD_URD;
    const storedCheckoutTax = order.orderType !== 'Walk-In' && Number.isFinite(Number(order.priceBreakdown?.gstAmount))
        ? Number(order.priceBreakdown.gstAmount)
        : null;
    const itemRates = [...new Set((order.items || []).map(item => Number(item.gstPercent)).filter(Number.isFinite))];
    const taxAmount = taxable ? money(storedCheckoutTax ?? (serviceValue * activeConfigs.gstPercent / 100)) : 0;
    // A single rate is shown only when every line has that rate. Mixed-rate
    // orders retain their exact configured tax amount without inventing a rate.
    const taxPercent = taxable ? (itemRates.length === 1 ? itemRates[0] : activeConfigs.gstPercent) : 0;
    const invoice1Total = money(serviceValue + taxAmount);
    const legacyScenario = scenario === GST_SCENARIOS.RD_RD ? 'A' : scenario === GST_SCENARIOS.URD_RD ? 'B' : 'C';
    const orderSeq = (order.orderId || String(order._id)).replace('#', '');
    const display = scenario === GST_SCENARIOS.RD_RD ? ['Customer GSTIN', snapshot.customerGstin]
        : scenario === GST_SCENARIOS.URD_RD ? ['Vendor GSTIN', snapshot.vendorGstin] : ['Spinzyt GSTIN', snapshot.spinzytGstin];
    const customerInvoice = {
        invoiceNo: `SZ-CUST-${orderSeq}`, scenario: legacyScenario, gstScenario: scenario,
        issuerName: snapshot.vendorName, supplierGstin: snapshot.vendorGstin, recipientGstin: snapshot.customerGstin,
        serviceValue, taxPercent, taxAmount, displayGstinLabel: display[0], displayGstinNo: display[1],
        customerWalletCredit: customerWalletShare, totalAmount: invoice1Total, generatedAt: new Date()
    };

    const platformFeeTax = money(platformFee * activeConfigs.platformFeeGstPercent / 100);
    const logisticsFeeTax = money(logisticsFee * activeConfigs.logisticsFeeGstPercent / 100);
    const normalInvoice2Charges = money(platformFee + platformFeeTax + logisticsFee + logisticsFeeTax);
    const totalInvoice2Amount = money(normalInvoice2Charges + spinzytPromoShare);
    const platformInvoice = {
        invoiceNo: `SZ-PLAT-${orderSeq}`, issuerName: 'Spinzyt', recipientName: snapshot.vendorName,
        recipientGstin: snapshot.vendorGstin, platformFee, platformFeeTaxPercent: activeConfigs.platformFeeGstPercent,
        platformFeeTax, logisticsFee, logisticsFeeTaxPercent: activeConfigs.logisticsFeeGstPercent,
        logisticsFeeTax, spinzytGstin: snapshot.spinzytGstin, spinzytPromoShare,
        totalInvoiceAmount: totalInvoice2Amount, generatedAt: new Date()
    };

    // Invoice 2 includes Spinzyt's half; subtract the wallet half separately so the full promotion is deducted once.
    const vendorNetPayout = money(invoice1Total - totalInvoice2Amount - customerWalletShare);
    const ledger = {
        vendorNetPayout, customerWalletCredit: customerWalletShare, platformFee,
        spinzytCombinedRevenue: totalInvoice2Amount, appliedPromoValue: totalPromoDiscount,
        promoOwnerType: totalPromoDiscount > 0 ? 'VENDOR' : 'NONE', invoice1Total,
        invoice2Total: totalInvoice2Amount, spinzytPromoShare
    };
    return { customerInvoice, platformInvoice, ledger, gstSnapshot: snapshot };
};
