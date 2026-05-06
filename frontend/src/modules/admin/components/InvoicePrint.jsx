import React from 'react';

const InvoicePrint = ({ order, settings = {} }) => {
    if (!order) return null;

    // Use settings or fallbacks
    const accentColor = settings.accentColor || '#5B21B6';
    const businessName = settings.businessName || 'EZOFLIFE TECHNOLOGY LLP';
    const contactEmail = settings.contactEmail || 'connect@spinzyt.com';

    return (
        <div className="bg-white p-12 max-w-[850px] mx-auto font-sans text-slate-900" id="invoice-content">
            {/* Header Section */}
            <div className="bg-[#f3f4f6] p-10 flex justify-between items-center relative overflow-hidden rounded-t-sm border border-slate-200">
                <div className="relative z-10 space-y-4">
                    <h1 className="text-[32px] font-black tracking-tight leading-none text-slate-900">{businessName}</h1>
                    <div className="space-y-1 text-[13px] font-bold text-slate-600">
                        <p className="tracking-tight">www.spinzyt.com</p>
                        <p className="tracking-tight">{contactEmail}</p>
                        <p className="tracking-tight">GST # {settings.gstNumber || 'ZA1223324435435'}</p>
                    </div>
                </div>
                {settings.showLogo !== false && (
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg mb-3">
                            <img 
                                src="https://spinzyt.com/wp-content/uploads/2023/12/spinzyt-logo-new.png" 
                                alt="Logo" 
                                className="w-12 h-12 object-contain"
                            />
                        </div>
                        <span className="text-2xl font-black tracking-[0.2em] leading-none text-slate-900">SPINZYT</span>
                    </div>
                )}
                {/* Subtle Geometric Background Pattern */}
                <div className="absolute inset-0 opacity-[0.01] pointer-events-none">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M0 40L40 0H20L0 20V40Z" fill="#000000"/>
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#pattern)" />
                    </svg>
                </div>
            </div>

            {/* Order Info Section */}
            <div className="py-10 px-2 flex justify-between items-start border-x border-slate-200">
                <div className="space-y-2">
                    <p className="text-[13px] font-black uppercase tracking-tight text-slate-900">Invoice No: <span className="font-bold text-slate-600 ml-2">{order.invoiceNo || `SZ-CUST-2026-${order.id?.slice(-4) || '1001'}`}</span></p>
                    <p className="text-[13px] font-black uppercase tracking-tight text-slate-900">Customer Name: <span className="font-bold text-slate-600 ml-2">{order.user?.name || '[Customer Name]'}</span></p>
                    {settings.showVendorDetails !== false && (
                        <p className="text-[13px] font-black uppercase tracking-tight text-slate-900">Vendor ID : <span className="font-bold text-slate-600 ml-2">{order.vendor?.id || 'VEN-001'}</span></p>
                    )}
                </div>
                <div className="space-y-2 text-right">
                    <p className="text-[13px] font-black uppercase tracking-tight text-slate-900">Order No: <span className="font-bold text-slate-600 ml-2">{order.orderNo || order.id || '#SPZ-98765'}</span></p>
                    <p className="text-[13px] font-black uppercase tracking-tight text-slate-900">Date: <span className="font-bold text-slate-600 ml-2">{order.date || 'May 05, 2026'}</span></p>
                </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 border-t-0">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-y border-slate-200">
                            <th className="border-r border-slate-200 px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Item Description</th>
                            <th className="border-r border-slate-200 px-4 py-4 text-center text-[11px] font-black uppercase tracking-widest text-slate-400 w-20">SAC</th>
                            <th className="border-r border-slate-200 px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">Service Type</th>
                            <th className="border-r border-slate-200 px-4 py-4 text-center text-[11px] font-black uppercase tracking-widest text-slate-400 w-28">Qty / Weight</th>
                            <th className="border-r border-slate-200 px-6 py-4 text-right text-[11px] font-black uppercase tracking-widest text-slate-400 w-32">Unit Price</th>
                            <th className="px-6 py-4 text-right text-[11px] font-black uppercase tracking-widest text-slate-400 w-32">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {(order.items || []).map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                                <td className="border-r border-slate-200 px-6 py-4 text-[13px] font-bold text-slate-700">{item.name}</td>
                                <td className="border-r border-slate-200 px-4 py-4 text-center text-[13px] font-bold text-slate-500">9994</td>
                                <td className="border-r border-slate-200 px-6 py-4 text-[13px] font-bold text-slate-600">{item.serviceType || 'Laundry'}</td>
                                <td className="border-r border-slate-200 px-4 py-4 text-center text-[13px] font-bold text-slate-700">{item.qty}</td>
                                <td className="border-r border-slate-200 px-6 py-4 text-right text-[13px] font-bold text-slate-700">₹{(item.price / parseFloat(item.qty || 1)).toFixed(2)}</td>
                                <td className="px-6 py-4 text-right text-[13px] font-black text-slate-900">₹{item.price.toFixed(2)}</td>
                            </tr>
                        ))}
                        {/* Empty rows for layout */}
                        {[...Array(Math.max(0, 4 - (order.items?.length || 0)))].map((_, i) => (
                            <tr key={`blank-${i}`}>
                                <td className="border-r border-slate-200 px-6 py-8" colSpan={6}></td>
                            </tr>
                        ))}
                        
                        {/* Calculations Section */}
                        <tr className="border-t-2 border-slate-900">
                            <td colSpan={5} className="border-r border-slate-200 px-6 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-500">Subtotal Services</td>
                            <td className="px-6 py-3 text-right text-[13px] font-black text-slate-900">₹{(order.total * 0.8).toFixed(2)}</td>
                        </tr>
                        {settings.showDeliveryFee !== false && (
                            <tr>
                                <td colSpan={5} className="border-r border-slate-200 px-6 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-500">Logistics Fee</td>
                                <td className="px-6 py-3 text-right text-[13px] font-black text-slate-900">₹40.00</td>
                            </tr>
                        )}
                        {settings.showServiceFee !== false && (
                            <tr>
                                <td colSpan={5} className="border-r border-slate-200 px-6 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-500">Platform Fee (2%)</td>
                                <td className="px-6 py-3 text-right text-[13px] font-black text-slate-900">₹{(order.total * 0.02).toFixed(2)}</td>
                            </tr>
                        )}
                        {settings.showSurge !== false && (
                            <tr>
                                <td colSpan={5} className="border-r border-slate-200 px-6 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-500">Surge Charge (1.5x)</td>
                                <td className="px-6 py-3 text-right text-[13px] font-black text-slate-900">₹120.00</td>
                            </tr>
                        )}
                        {settings.showDiscount !== false && (
                            <tr>
                                <td colSpan={5} className="border-r border-slate-200 px-6 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-500">Promotional Discount</td>
                                <td className="px-6 py-3 text-right text-[13px] font-black text-slate-900">- ₹50.00</td>
                            </tr>
                        )}
                        {settings.showTaxes !== false && (
                            <tr>
                                <td colSpan={5} className="border-r border-slate-200 px-6 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-500">GST</td>
                                <td className="px-6 py-3 text-right text-[13px] font-black text-slate-900">₹{(order.total * 0.18).toFixed(2)}</td>
                            </tr>
                        )}
                        <tr className="bg-slate-900 text-white">
                            <td colSpan={5} className="px-6 py-4 text-left text-[12px] font-black uppercase tracking-[0.2em]">Grand Total</td>
                            <td className="px-6 py-4 text-right text-[16px] font-black tracking-tight">₹{order.total.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Footer Section */}
            <div className="mt-12 text-center space-y-4">
                <div className="py-4 border-y border-slate-100">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">{settings.invoiceNote || 'This is a computer generated invoice and does not require a physical signature.'}</p>
                </div>
                <div className="pt-2">
                    {settings.showTerms !== false && (
                        <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest italic">{settings.customTerms}</p>
                    )}
                    <h3 className="text-[12px] font-black tracking-[0.3em] uppercase text-slate-900">{businessName}</h3>
                </div>
            </div>
        </div>
    );
};

export default InvoicePrint;
