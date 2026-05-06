import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi } from '../../../lib/api';
import { toast } from 'react-hot-toast';
import InvoicePrint from '../components/InvoicePrint';
import B2BInvoicePrint from '../../vendor/components/B2BInvoicePrint';

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
        contactEmail: 'support@spinzyt.com',
        gstNumber: 'ZA1223324435435'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('Customer'); // 'Customer' or 'B2B'

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

    const sampleCustomerOrder = {
        id: '#SPZ-98765',
        invoiceNo: 'SZ-CUST-2026-1001',
        date: 'May 05, 2026',
        user: { name: 'Julian Mendoza' },
        vendor: { id: 'VEN-001' },
        items: [
            { name: 'Regular Laundry (Wash & Fold)', qty: '5.0 kg', price: 300.00, serviceType: 'Per Kg' },
            { name: 'Premium Silk Saree', qty: '2 Units', price: 500.00, serviceType: 'Dry Clean' },
            { name: 'Men\'s Formal Shirt', qty: '4 Units', price: 80.00, serviceType: 'Steam Iron' }
        ],
        total: 1320.00
    };

    const sampleB2BOrder = {
        _id: 'b2border_12345678',
        b2bOrderId: 'B2B-436756',
        createdAt: new Date().toISOString(),
        totalAmount: 1500,
        items: [
            { name: 'Industrial Detergent (Batch A)', quantity: 2, price: 500 },
            { name: 'Plastic Packaging Rolls', quantity: 5, price: 100 }
        ],
        supplier: {
            displayName: 'Test Supplier Biz',
            supplierDetails: { businessName: 'Test Supplier Biz', gstNumber: '27AAAEZ1234F1Z1' },
            address: 'Industrial Estate, Phase 2, Delhi - 110020',
            phone: '9999999993',
            email: 'sales@testsupplier.com'
        },
        vendor: {
            shopDetails: { name: 'Laundry Partner Express' },
            address: 'Shop No 4, Main Road, Mumbai',
            phone: '9888888888',
            email: 'partner@express.com'
        }
    };

    if (loading) return <div className="p-8 text-center opacity-40">Loading settings...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-10 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
                <div className="text-center lg:text-left">
                    <h1 className="text-3xl lg:text-4xl font-black tracking-tighter text-slate-900 uppercase leading-none">Invoice Customization</h1>
                    <p className="text-slate-500 font-medium mt-3 text-sm lg:text-base">Configure how your invoices look across the platform.</p>
                </div>
                
                {/* Tab Switcher */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl lg:rounded-[1.2rem] shadow-inner w-full lg:w-auto">
                    {['Customer', 'B2B'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 lg:flex-none px-6 lg:px-8 py-3 lg:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Configuration Panel */}
                <div className="space-y-8">
                    <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">settings</span>
                            General Branding
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
                            <div className="space-y-2 col-span-full">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Global GST Number</label>
                                <input 
                                    type="text" 
                                    value={settings.gstNumber}
                                    onChange={(e) => handleChange('gstNumber', e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-slate-900/10 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-50">
                            <button 
                                onClick={() => handleChange('showLogo', !settings.showLogo)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${settings.showLogo ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
                            >
                                <span className="material-symbols-outlined text-sm">{settings.showLogo ? 'check_circle' : 'circle'}</span>
                                Show Logo
                            </button>
                            {activeTab === 'Customer' && (
                                <>
                                    <button 
                                        onClick={() => handleChange('showVendorDetails', !settings.showVendorDetails)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${settings.showVendorDetails ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
                                    >
                                        <span className="material-symbols-outlined text-sm">{settings.showVendorDetails ? 'check_circle' : 'circle'}</span>
                                        Show Vendor
                                    </button>
                                    <button 
                                        onClick={() => handleChange('showServiceFee', !settings.showServiceFee)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${settings.showServiceFee ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
                                    >
                                        <span className="material-symbols-outlined text-sm">{settings.showServiceFee ? 'check_circle' : 'circle'}</span>
                                        Service Fee
                                    </button>
                                </>
                            )}
                        </div>
                    </section>

                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/40 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                    >
                        {saving ? (
                            <span className="animate-spin material-symbols-outlined">refresh</span>
                        ) : (
                            <span className="material-symbols-outlined">save</span>
                        )}
                        {saving ? 'Syncing...' : 'Save Configuration'}
                    </button>
                </div>

                {/* Preview Panel */}
                <div className="sticky top-8 h-[calc(100vh-100px)] flex flex-col">
                    <div className="flex items-center justify-between mb-4 px-4">
                        <h2 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">{activeTab} Preview</h2>
                        <div className="flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                             <span className="text-[10px] font-black text-slate-900 uppercase">Live Rendering</span>
                        </div>
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-[3rem] border border-slate-100 shadow-inner overflow-hidden flex flex-col items-center">
                        <div className="w-full h-full overflow-y-auto p-4 flex flex-col items-center">
                             <div 
                                style={{ 
                                    transform: 'scale(0.4)',
                                    transformOrigin: 'top center',
                                    width: '850px',
                                    marginBottom: '-500px'
                                }}
                                className="bg-white shadow-2xl shrink-0"
                             >
                                {activeTab === 'Customer' ? (
                                    <InvoicePrint settings={settings} order={sampleCustomerOrder} />
                                ) : (
                                    <B2BInvoicePrint settings={settings} order={sampleB2BOrder} />
                                )}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminInvoiceSettings;

