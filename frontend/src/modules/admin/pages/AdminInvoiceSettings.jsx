import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { adminApi } from '../../../lib/api';
import { toast } from 'react-hot-toast';

const AdminInvoiceSettings = () => {
    const [settings, setSettings] = useState({
        showLogo: true,
        showVendorDetails: true,
        showTerms: true,
        customTerms: 'Thank you for taking our services..',
        invoiceNote: 'This is a computer generated invoice.',
        showTaxes: false,
        showServiceFee: true,
        showDeliveryFee: true,
        showSurge: true,
        showDiscount: true,
        showAdvance: true,
        accentColor: '#000000',
        businessName: 'SPINZYT',
        contactEmail: 'support@spinzyt.com'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const configs = await adminApi.getConfig();
            const invoiceConfig = configs.find(c => c.key === 'invoice_settings');
            if (invoiceConfig) {
                setSettings(invoiceConfig.value);
            }
        } catch (err) {
            console.error('Failed to fetch invoice settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await adminApi.updateConfig('invoice_settings', settings);
            toast.success('Invoice settings updated successfully');
        } catch (err) {
            toast.error('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    if (loading) return <div className="p-8 text-center opacity-40">Loading settings...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-10">
                <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Invoice Customization</h1>
                <p className="text-slate-500 font-medium mt-2">Configure how your customer invoices look and feel.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Configuration Panel */}
                <div className="space-y-8">
                    <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">settings</span>
                            General Settings
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Business Name</label>
                                <input 
                                    type="text" 
                                    value={settings.businessName}
                                    onChange={(e) => handleChange('businessName', e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-slate-900/10 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Contact Email</label>
                                <input 
                                    type="email" 
                                    value={settings.contactEmail}
                                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-slate-900/10 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-4">
                            <button 
                                onClick={() => handleChange('showLogo', !settings.showLogo)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${settings.showLogo ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined text-sm">{settings.showLogo ? 'check_circle' : 'circle'}</span>
                                Show Logo
                            </button>
                            <button 
                                onClick={() => handleChange('showVendorDetails', !settings.showVendorDetails)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${settings.showVendorDetails ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined text-sm">{settings.showVendorDetails ? 'check_circle' : 'circle'}</span>
                                Show Vendor
                            </button>
                            <button 
                                onClick={() => handleChange('showTaxes', !settings.showTaxes)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${settings.showTaxes ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined text-sm">{settings.showTaxes ? 'check_circle' : 'circle'}</span>
                                Taxes
                            </button>
                            <button 
                                onClick={() => handleChange('showServiceFee', !settings.showServiceFee)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${settings.showServiceFee ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined text-sm">{settings.showServiceFee ? 'check_circle' : 'circle'}</span>
                                Service Fee
                            </button>
                            <button 
                                onClick={() => handleChange('showDeliveryFee', !settings.showDeliveryFee)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${settings.showDeliveryFee ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined text-sm">{settings.showDeliveryFee ? 'check_circle' : 'circle'}</span>
                                Delivery Fee
                            </button>
                            <button 
                                onClick={() => handleChange('showSurge', !settings.showSurge)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${settings.showSurge ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined text-sm">{settings.showSurge ? 'check_circle' : 'circle'}</span>
                                Surge/Urgency
                            </button>
                            <button 
                                onClick={() => handleChange('showDiscount', !settings.showDiscount)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${settings.showDiscount ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined text-sm">{settings.showDiscount ? 'check_circle' : 'circle'}</span>
                                Discount
                            </button>
                            <button 
                                onClick={() => handleChange('showAdvance', !settings.showAdvance)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${settings.showAdvance ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined text-sm">{settings.showAdvance ? 'check_circle' : 'circle'}</span>
                                Advance Paid
                            </button>
                        </div>
                    </section>

                    <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">description</span>
                            Footer & Terms
                        </h2>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Invoice Terms</label>
                            <textarea 
                                rows="3"
                                value={settings.customTerms}
                                onChange={(e) => handleChange('customTerms', e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-slate-900/10 transition-all resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Invoice Note (Small Print)</label>
                            <input 
                                type="text" 
                                value={settings.invoiceNote}
                                onChange={(e) => handleChange('invoiceNote', e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-slate-900/10 transition-all"
                            />
                        </div>

                        <div className="pt-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-3">Accent Color</label>
                            <div className="flex gap-3">
                                {['#000000', '#1e293b', '#2563eb', '#16a34a', '#dc2626', '#d97706'].map(color => (
                                    <button 
                                        key={color}
                                        onClick={() => handleChange('accentColor', color)}
                                        className={`w-10 h-10 rounded-full border-2 transition-all ${settings.accentColor === color ? 'border-slate-900 scale-110 shadow-lg' : 'border-transparent'}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                                <input 
                                    type="color" 
                                    value={settings.accentColor}
                                    onChange={(e) => handleChange('accentColor', e.target.value)}
                                    className="w-10 h-10 rounded-full border-none p-0 overflow-hidden cursor-pointer bg-transparent"
                                />
                            </div>
                        </div>
                    </section>

                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 flex items-center justify-center gap-3 hover:scale-[1.02] transition-all disabled:opacity-50"
                    >
                        {saving ? (
                            <span className="animate-spin material-symbols-outlined">refresh</span>
                        ) : (
                            <span className="material-symbols-outlined">save</span>
                        )}
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>

                {/* Preview Panel */}
                <div className="sticky top-8 h-fit">
                    <h2 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400 mb-6 px-4">Live Preview</h2>
                    <div className="bg-white rounded-[2rem] p-10 shadow-2xl border border-slate-100 transform scale-[0.9] origin-top overflow-hidden">
                        {/* Mock Invoice Rendering based on Settings */}
                        <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-10" style={{ borderColor: settings.accentColor }}>
                            <div className="text-3xl font-black tracking-tighter" style={{ display: settings.showLogo ? 'block' : 'none' }}>{settings.businessName}.</div>
                            <div className="text-xl font-black text-slate-400 uppercase tracking-widest">Invoice</div>
                        </div>

                        <div className="grid grid-cols-2 gap-10 mb-10">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-[9px] uppercase tracking-widest text-slate-400 font-black mb-1">Order ID</h4>
                                    <p className="text-sm font-black">#SPZ-SAMPLE-2024</p>
                                </div>
                                <div>
                                    <h4 className="text-[9px] uppercase tracking-widest text-slate-400 font-black mb-1">Date</h4>
                                    <p className="text-sm font-black">May 05, 2024</p>
                                </div>
                            </div>
                            <div className="space-y-4 text-right">
                                <div>
                                    <h4 className="text-[9px] uppercase tracking-widest text-slate-400 font-black mb-1">Billed To</h4>
                                    <p className="text-sm font-black">Sample Customer</p>
                                </div>
                                <div style={{ display: settings.showVendorDetails ? 'block' : 'none' }}>
                                    <h4 className="text-[9px] uppercase tracking-widest text-slate-400 font-black mb-1">Vendor</h4>
                                    <p className="text-sm font-black">Luxury Dry Cleaning Hub</p>
                                </div>
                            </div>
                        </div>

                        <table className="w-full mb-10">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="text-left py-4 px-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">Item</th>
                                    <th className="text-center py-4 px-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">Qty</th>
                                    <th className="text-right py-4 px-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-slate-50">
                                    <td className="py-4 px-4 text-sm font-bold text-slate-700">Premium Wash & Fold</td>
                                    <td className="py-4 px-4 text-center text-sm font-bold text-slate-700">2</td>
                                    <td className="py-4 px-4 text-right text-sm font-black">₹400.00</td>
                                </tr>
                                <tr className="border-b border-slate-50">
                                    <td className="py-4 px-4 text-sm font-bold text-slate-700">Silk Saree Dry Clean</td>
                                    <td className="py-4 px-4 text-center text-sm font-bold text-slate-700">1</td>
                                    <td className="py-4 px-4 text-right text-sm font-black">₹850.00</td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="w-full flex flex-col items-end gap-2 border-t-2 border-slate-900 pt-6" style={{ borderColor: settings.accentColor }}>
                            <div className="flex justify-between w-64 text-sm font-bold text-slate-500">
                                <span>Subtotal</span>
                                <span>₹1250.00</span>
                            </div>
                            <div className="flex justify-between w-64 text-sm font-bold text-slate-500" style={{ display: settings.showServiceFee ? 'flex' : 'none' }}>
                                <span>Service Fee</span>
                                <span>₹45.00</span>
                            </div>
                            <div className="flex justify-between w-64 text-sm font-bold text-slate-500" style={{ display: settings.showDeliveryFee ? 'flex' : 'none' }}>
                                <span>Logistics Fee</span>
                                <span>₹50.00</span>
                            </div>
                            <div className="flex justify-between w-64 text-sm font-bold text-rose-500" style={{ display: settings.showSurge ? 'flex' : 'none' }}>
                                <span>Surge (1.5x)</span>
                                <span>₹120.00</span>
                            </div>
                            <div className="flex justify-between w-64 text-sm font-bold text-emerald-500" style={{ display: settings.showDiscount ? 'flex' : 'none' }}>
                                <span>Discount</span>
                                <span>- ₹50.00</span>
                            </div>
                            <div className="flex justify-between w-64 text-sm font-bold text-slate-500" style={{ display: settings.showTaxes ? 'flex' : 'none' }}>
                                <span>Taxes (18%)</span>
                                <span>₹225.00</span>
                            </div>
                            <div className="flex justify-between w-64 text-xl font-black text-slate-900 mt-2">
                                <span>Grand Total</span>
                                <span style={{ color: settings.accentColor }}>₹1640.00</span>
                            </div>
                            <div className="flex justify-between w-64 text-sm font-black text-emerald-600 border-t border-slate-100 pt-2" style={{ display: settings.showAdvance ? 'flex' : 'none' }}>
                                <span>Advance Paid</span>
                                <span>₹500.00</span>
                            </div>
                            <div className="flex justify-between w-64 text-sm font-black text-rose-600" style={{ display: settings.showAdvance ? 'flex' : 'none' }}>
                                <span>Due at Delivery</span>
                                <span>₹1140.00</span>
                            </div>
                        </div>

                        <div className="mt-16 pt-8 border-t border-slate-100 text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ display: settings.showTerms ? 'block' : 'none' }}>{settings.customTerms}</p>
                            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">{settings.invoiceNote}</p>
                            <p className="text-[8px] font-black text-slate-400 mt-4 uppercase tracking-[0.3em]">{settings.contactEmail}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminInvoiceSettings;
