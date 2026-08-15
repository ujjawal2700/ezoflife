import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import VendorHeader from '../components/VendorHeader';
import { authApi, vendorPaymentApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const EMPTY_BANK = { beneficiary: '', accountNumber: '', ifsc: '', bankName: '' };

const PayoutSettings = () => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [bankData, setBankData] = useState(EMPTY_BANK);
    const [earnings, setEarnings] = useState(null);

    const vendorId = useMemo(() => {
        try {
            const v = JSON.parse(localStorage.getItem('vendorData') || localStorage.getItem('user') || '{}');
            return v._id || v.id || null;
        } catch { return null; }
    }, []);

    const payoutFields = useMemo(() => [
        { id: 'beneficiary', label: 'Beneficiary', icon: 'account_circle' },
        { id: 'accountNumber', label: 'Account number', icon: 'credit_card' },
        { id: 'ifsc', label: 'IFSC Code', icon: 'verified' },
        { id: 'bankName', label: 'Bank Name', icon: 'account_balance' }
    ], []);

    const load = useCallback(async () => {
        if (!vendorId) { setIsLoading(false); return; }
        try {
            const [profile, summary] = await Promise.all([
                authApi.getProfile(vendorId).catch(() => null),
                vendorPaymentApi.getEarningsSummary?.(vendorId).catch(() => null)
            ]);

            const bank = profile?.bankDetails || profile?.user?.bankDetails || {};
            setBankData({
                beneficiary: bank.accountHolderName || '',
                accountNumber: bank.accountNumber || '',
                ifsc: bank.ifscCode || '',
                bankName: bank.bankName || ''
            });
            setEarnings(summary || null);
        } catch (err) {
            console.error('Failed to load payout settings:', err);
            toast.error('Could not load payout details');
        } finally {
            setIsLoading(false);
        }
    }, [vendorId]);

    useEffect(() => { load(); }, [load]);

    // Settlements run weekly on Friday (see backend settlement cycle).
    const nextSettlementDate = useMemo(() => {
        const d = new Date();
        const daysUntilFriday = (5 - d.getDay() + 7) % 7 || 7;
        d.setDate(d.getDate() + daysUntilFriday);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }, []);

    const handleSave = async () => {
        if (!vendorId) return toast.error('No vendor session found');
        try {
            setIsSaving(true);
            await authApi.updateProfile(vendorId, {
                bankDetails: {
                    accountHolderName: bankData.beneficiary,
                    accountNumber: bankData.accountNumber,
                    ifscCode: bankData.ifsc,
                    bankName: bankData.bankName
                }
            });
            toast.success('Payout details saved');
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to save payout details:', err);
            toast.error(err.message || 'Could not save payout details');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-background text-on-background min-h-screen pb-32 font-body overflow-x-hidden">
            <VendorHeader title="Bank & Payouts" showBack={true} />

            {/* Hero Section */}
            <motion.section 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="vendor-gradient px-6 py-10 text-white relative flex flex-col items-center text-center"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -ml-32 -mb-32"></div>
                
                <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">Available for Settlement</p>
                <h2 className="text-4xl font-bold tracking-tighter mb-8">
                    {isLoading
                        ? '—'
                        : `₹${Number(
                            earnings?.pendingSettlement ?? earnings?.availableBalance ?? earnings?.totalEarnings ?? 0
                          ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </h2>
                
                <div className="flex items-center gap-12">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Status</p>
                        <div className="flex items-center justify-center gap-2">
                            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                            <span className="text-sm font-bold">Verified</span>
                        </div>
                    </div>
                    <div className="w-[1px] h-6 bg-white/20"></div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Next Cycle</p>
                        <p className="text-sm font-bold">{nextSettlementDate}</p>
                    </div>
                </div>
            </motion.section>

            <motion.main 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto px-6 py-12 space-y-14"
            >
                {/* Bank Account Section */}
                <section className="space-y-8">
                    <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-primary">Linked Bank Account</h3>
                        <button 
                            onClick={() => setIsEditing(!isEditing)}
                            className="text-[11px] font-black text-on-surface-variant hover:text-primary transition-colors uppercase tracking-widest"
                        >
                            {isEditing ? 'Cancel Edit' : 'Update Details'}
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                        {payoutFields.map((field) => (
                            <div key={field.id} className="space-y-2 group">
                                <div className="flex items-center gap-2 text-primary/40 mb-1 group-hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">{field.icon}</span>
                                    <p className="text-[10px] font-bold uppercase tracking-widest">{field.label}</p>
                                </div>
                                {isEditing ? (
                                    <input 
                                        type="text"
                                        value={bankData[field.id]}
                                        onChange={(e) => setBankData({...bankData, [field.id]: e.target.value})}
                                        className="w-full bg-surface-container-low border-b-2 border-primary/10 py-2 px-1 text-base font-bold text-on-surface focus:outline-none focus:border-primary transition-all"
                                    />
                                ) : (
                                    <p className="text-base font-bold text-on-surface tracking-tight pl-6">
                                        {field.id === 'accountNumber' && bankData[field.id]
                                            ? `${bankData[field.id].slice(0, 4)} •••• •••• ${bankData[field.id].slice(-4)}`
                                            : (bankData[field.id] || '—')}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    <AnimatePresence>
                        {isEditing && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="pt-6"
                            >
                                <button 
                                    onClick={handleSave}
                                    className="w-full py-4 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
                                >
                                    Save Bank Details
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* Policies Section */}
                <section className="space-y-8">
                    <div className="border-b border-outline-variant/10 pb-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-primary">Payout Cycles & Policies</h3>
                    </div>
                    <div className="space-y-10">
                        <div className="flex gap-6 group">
                            <span className="text-3xl font-black text-on-background/10 group-hover:text-primary/10 transition-colors">01</span>
                            <div className="space-y-2">
                                <h4 className="text-sm font-bold text-on-surface">Weekly Settlements</h4>
                                <p className="text-xs text-on-surface-variant font-medium leading-relaxed max-w-sm">All earnings from completed orders are automatically settled to your bank account every <span className="text-on-surface font-bold">Friday morning</span>.</p>
                            </div>
                        </div>
                        <div className="flex gap-6 group">
                            <span className="text-3xl font-black text-on-background/10 group-hover:text-primary/10 transition-colors">02</span>
                            <div className="space-y-2">
                                <h4 className="text-sm font-bold text-on-surface">Release Threshold</h4>
                                <p className="text-xs text-on-surface-variant font-medium leading-relaxed max-w-sm">A minimum balance of <span className="text-on-surface font-bold">₹500</span> is required for the system to initiate an automatic release. Smaller balances are carried forward.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer Actions */}
                <section className="pt-12 border-t border-outline-variant/10 flex flex-col items-center gap-8">
                    <div className="text-center space-y-2">
                        <h4 className="text-base font-bold text-on-surface tracking-tight">Financial Support Needed?</h4>
                        <p className="text-xs text-on-surface-variant font-medium max-w-xs mx-auto">Get in touch with our treasury team for payout discrepancies or bank updates.</p>
                    </div>
                    <button className="px-10 py-4 bg-surface-container text-on-surface font-bold text-xs uppercase tracking-widest rounded-full transition-all border border-outline-variant/10">
                        Connect with Helpdesk
                    </button>
                    <div className="flex items-center gap-2 opacity-20">
                        <span className="material-symbols-outlined text-sm">security</span>
                        <span className="text-[9px] font-black uppercase tracking-widest">Secured by AES-256 Vault Encryption</span>
                    </div>
                </section>
            </motion.main>
        </div>
    );
};

export default PayoutSettings;
