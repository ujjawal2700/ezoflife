import React from "react";

const PlatformRevenueInvoicePrint = ({
  order,
  invoice = null,
  settings = {},
}) => {
  if (!order) return null;

  const platInv = invoice || order.invoices?.platformInvoice || {};

  const businessName = settings.businessName || "EZOFLIFE TECHNOLOGY LLP";
  const contactEmail = settings.contactEmail || "connect@spinzyt.com";
  const spinzytGstin =
    platInv.spinzytGstin || settings.gstNumber || "07AAAAA0000A1Z5";

  const platformFee =
    platInv.platformFee !== undefined
      ? platInv.platformFee
      : order.priceBreakdown?.platformFee || 20;
  const platformFeeTaxPercent = platInv.platformFeeTaxPercent || 18;
  const platformFeeTax =
    platInv.platformFeeTax !== undefined
      ? platInv.platformFeeTax
      : Math.round(platformFee * (platformFeeTaxPercent / 100) * 100) / 100;

  const logisticsFee =
    platInv.logisticsFee !== undefined
      ? platInv.logisticsFee
      : order.priceBreakdown?.logisticsFee || order.deliveryCharge || 0;
  const logisticsFeeTaxPercent = platInv.logisticsFeeTaxPercent || 18;
  const logisticsFeeTax =
    platInv.logisticsFeeTax !== undefined
      ? platInv.logisticsFeeTax
      : Math.round(logisticsFee * (logisticsFeeTaxPercent / 100) * 100) / 100;

  const spinzytPromoShare =
    platInv.spinzytPromoShare || order.ledger?.spinzytPromoShare || 0;

  const totalInvoiceAmount =
    platInv.totalInvoiceAmount !== undefined
      ? platInv.totalInvoiceAmount
      : Math.round(
          (platformFee +
            platformFeeTax +
            logisticsFee +
            logisticsFeeTax +
            spinzytPromoShare) *
            100,
        ) / 100;

  const vendorObj = order.vendor || {};
  const vendorName =
    vendorObj.displayName ||
    order.vendorSnapshot?.displayName ||
    "Partner Vendor";
  const shopName =
    vendorObj.shopDetails?.name ||
    order.vendorSnapshot?.shopName ||
    "Partner Shop";
  const vendorGstin =
    vendorObj.shopDetails?.gst ||
    vendorObj.gstNumber ||
    order.vendorSnapshot?.gstNumber ||
    "URD (Unregistered)";

  const invoiceNo =
    platInv.invoiceNo ||
    `SZ-PLAT-${order.orderId ? order.orderId.replace("#", "") : String(order._id || "1001").slice(-6)}`;
  const orderNo = order.orderId || order.orderNo || order._id || "N/A";
  const invoiceDate = platInv.generatedAt
    ? new Date(platInv.generatedAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

  return (
    <div
      className="bg-white p-12 max-w-[850px] mx-auto font-sans text-slate-900"
      id="platform-invoice-content">
      {/* Header Section */}
      <div className="bg-[#1e293b] p-10 flex justify-between items-center relative overflow-hidden rounded-t-sm text-white">
        <div className="relative z-10 space-y-3">
          <div className="inline-block bg-blue-500/20 border border-blue-400/30 text-blue-300 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest">
            Invoice 2 • Platform Revenue Invoice
          </div>
          <h1 className="text-[28px] font-black tracking-tight leading-none text-white">
            {businessName}
          </h1>
          <div className="space-y-0.5 text-[12px] font-medium text-slate-300">
            <p>Facilitating E-Commerce Marketplace Operator</p>
            <p className="font-bold text-white tracking-wide">
              Spinzyt GSTIN: {spinzytGstin}
            </p>
            <p>{contactEmail} • www.spinzyt.com</p>
          </div>
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-2">
            <img
              src="https://spinzyt.com/wp-content/uploads/2023/12/spinzyt-logo-new.png"
              alt="Logo"
              className="w-10 h-10 object-contain"
            />
          </div>
          <span className="text-xl font-black tracking-[0.2em] text-white">
            SPINZYT
          </span>
        </div>
      </div>

      {/* Invoice & Vendor Meta Section */}
      <div className="py-8 px-6 flex justify-between items-start border-x border-slate-200 bg-slate-50/50">
        <div className="space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Billed To (Vendor)
          </span>
          <p className="text-[14px] font-black text-slate-900">
            {shopName}{" "}
            <span className="font-semibold text-slate-600">({vendorName})</span>
          </p>
          <p className="text-[12px] font-bold text-slate-700">
            Vendor GSTIN:{" "}
            <span className="font-black text-slate-900">{vendorGstin}</span>
          </p>
          <p className="text-[11px] font-medium text-slate-500">
            Vendor ID: {vendorObj._id || order.vendor || "N/A"}
          </p>
        </div>
        <div className="space-y-1.5 text-right">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Invoice Details
          </span>
          <p className="text-[13px] font-black text-slate-900">
            Invoice No:{" "}
            <span className="font-mono text-blue-600">{invoiceNo}</span>
          </p>
          <p className="text-[12px] font-bold text-slate-700">
            Order Ref:{" "}
            <span className="font-mono text-slate-900">{orderNo}</span>
          </p>
          <p className="text-[12px] font-medium text-slate-500">
            Date: {invoiceDate}
          </p>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="border border-slate-200">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th className="px-6 py-3.5 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">
                Fee Component
              </th>
              <th className="px-4 py-3.5 text-center text-[11px] font-black uppercase tracking-widest text-slate-600 w-24">
                SAC Code
              </th>
              <th className="px-6 py-3.5 text-right text-[11px] font-black uppercase tracking-widest text-slate-600 w-32">
                Taxable Value
              </th>
              <th className="px-6 py-3.5 text-right text-[11px] font-black uppercase tracking-widest text-slate-600 w-28">
                GST Rate
              </th>
              <th className="px-6 py-3.5 text-right text-[11px] font-black uppercase tracking-widest text-slate-600 w-28">
                Tax Amount
              </th>
              <th className="px-6 py-3.5 text-right text-[11px] font-black uppercase tracking-widest text-slate-600 w-32">
                Total (INR)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[13px]">
            {/* 1. Platform Fee */}
            <tr className="hover:bg-slate-50/50">
              <td className="px-6 py-4">
                <span className="font-black text-slate-900 block">
                  Platform Facilitation Fee
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  Technology & marketplace service fee charged to vendor
                </span>
              </td>
              <td className="px-4 py-4 text-center font-mono text-slate-600">
                998311
              </td>
              <td className="px-6 py-4 text-right font-bold text-slate-700">
                ₹{platformFee.toFixed(2)}
              </td>
              <td className="px-6 py-4 text-right font-bold text-slate-600">
                {platformFeeTaxPercent}%
              </td>
              <td className="px-6 py-4 text-right font-bold text-slate-700">
                ₹{platformFeeTax.toFixed(2)}
              </td>
              <td className="px-6 py-4 text-right font-black text-slate-900">
                ₹{(platformFee + platformFeeTax).toFixed(2)}
              </td>
            </tr>

            {/* 2. Logistics Fee */}
            <tr className="hover:bg-slate-50/50">
              <td className="px-6 py-4">
                <span className="font-black text-slate-900 block">
                  Logistics / Transportation Fee
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  Pickup, transit & doorstep delivery fulfillment fee
                </span>
              </td>
              <td className="px-4 py-4 text-center font-mono text-slate-600">
                996511
              </td>
              <td className="px-6 py-4 text-right font-bold text-slate-700">
                ₹{logisticsFee.toFixed(2)}
              </td>
              <td className="px-6 py-4 text-right font-bold text-slate-600">
                {logisticsFeeTaxPercent}%
              </td>
              <td className="px-6 py-4 text-right font-bold text-slate-700">
                ₹{logisticsFeeTax.toFixed(2)}
              </td>
              <td className="px-6 py-4 text-right font-black text-slate-900">
                ₹{(logisticsFee + logisticsFeeTax).toFixed(2)}
              </td>
            </tr>

            {/* 3. Promotional Share (if applicable) */}
            {spinzytPromoShare > 0 && (
              <tr className="hover:bg-slate-50/50 bg-amber-50/30">
                <td className="px-6 py-4">
                  <span className="font-black text-amber-900 block">
                    Spinzyt Promo Share
                  </span>
                  <span className="text-[11px] font-medium text-amber-700">
                    50% platform share of vendor promotional discount
                  </span>
                </td>
                <td className="px-4 py-4 text-center font-mono text-slate-500">
                  9983
                </td>
                <td className="px-6 py-4 text-right font-bold text-amber-900">
                  ₹{spinzytPromoShare.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right font-bold text-slate-500">
                  0%
                </td>
                <td className="px-6 py-4 text-right font-bold text-slate-500">
                  ₹0.00
                </td>
                <td className="px-6 py-4 text-right font-black text-amber-900">
                  ₹{spinzytPromoShare.toFixed(2)}
                </td>
              </tr>
            )}

            {/* Summary / Total Section */}
            <tr className="border-t-2 border-slate-900 bg-slate-900 text-white">
              <td
                colSpan={5}
                className="px-6 py-4 text-left text-[12px] font-black uppercase tracking-[0.2em]">
                Total Spinzyt Platform Charges (Invoice 2)
              </td>
              <td className="px-6 py-4 text-right text-[17px] font-black tracking-tight text-white">
                ₹{totalInvoiceAmount.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payout Formula Notice Box */}
      <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600 text-[18px]">
            account_balance_wallet
          </span>
          <h4 className="text-[12px] font-black uppercase tracking-wider text-slate-900">
            Settlement & Payout Accounting
          </h4>
        </div>
        <p className="text-[12px] text-slate-600 leading-relaxed">
          As per the platform settlement rules:
          <br />
          <strong className="text-slate-900">
            Net Payment to Vendor = Total Customer Payment (Invoice 1) - Total
            Spinzyt Platform Charges (Invoice 2)
          </strong>
          <br />
          The total amount of ₹{totalInvoiceAmount.toFixed(2)} is withheld by
          Spinzyt from the customer collection, and the Net Payment is routed to
          the Vendor's account.
        </p>
      </div>

      {/* Footer Section */}
      <div className="mt-10 text-center space-y-2 text-slate-400">
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">
          This is a computer-generated tax invoice issued by {businessName} to
          the registered service vendor.
        </p>
        <p className="text-[11px] font-bold text-slate-600 tracking-wider">
          SPINZYT TECHNOLOGY • ALL RIGHTS RESERVED
        </p>
      </div>
    </div>
  );
};

export default PlatformRevenueInvoicePrint;
