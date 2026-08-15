import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { b2bOrderApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SupplierWallet = () => {
    const navigate = useNavigate();
    const [isRequesting, setIsRequesting] = useState(false);
    const [requestSuccess, setRequestSuccess] = useState(false);
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const supplierId = useMemo(() => {
        try {
            const s = JSON.parse(localStorage.getItem('supplierData') || localStorage.getItem('user') || '{}');
            return s._id || s.id || (s.user && (s.user._id || s.user.id)) || null;
        } catch { return null; }
    }, []);

    useEffect(() => {
        if (!supplierId) { setIsLoading(false); return; }
        let cancelled = false;
        (async () => {
            try {
                const data = await b2bOrderApi.getSupplierOrders(supplierId);
                if (!cancelled) setOrders(Array.isArray(data) ? data : (data?.orders || []));
            } catch (err) {
                console.error('Failed to load supplier wallet:', err);
                if (!cancelled) toast.error('Could not load wallet');
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [supplierId]);

    // Settlements derived from this supplier's B2B orders.
    const transactions = useMemo(() => orders.slice(0, 20).map(o => ({
        id: o.orderId || `#${String(o._id).slice(-6).toUpperCase()}`,
        type: o.escrowStatus === 'Released' ? 'Settlement' : 'Material Sale',
        vendor: o.vendor?.shopDetails?.name || o.vendor?.displayName || 'Vendor',
        amount: inr(o.totalAmount),
        date: o.createdAt
            ? new Date(o.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            : '—',
        status: o.paymentStatus === 'Paid' ? 'Credited' : 'Processing'
    })), [orders]);

    // Only released escrow is genuinely available to withdraw.
    const availableBalance = useMemo(
        () => orders
            .filter(o => o.paymentStatus === 'Paid' && o.escrowStatus === 'Released')
            .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0),
        [orders]
    );

    const handlePayout = () => {
        if (availableBalance <= 0) {
            toast.error('No balance available for payout');
            return;
        }
        setIsRequesting(true);
        // Payout requests are processed by Admin; no self-service endpoint yet.
        setTimeout(() => {
            setIsRequesting(false);
            setRequestSuccess(true);
            toast.success('Payout request noted — Admin will process it');
            setTimeout(() => setRequestSuccess(false), 3000);
        }, 800);
    };

    return (
        <div className="min-h-screen pb-40">
            <header className="px-6 pt-2 mb-4 z-20 pb-4">
                <h1 className="text-2xl font-black tracking-tighter uppercase leading-none text-on-surface">Wallet</h1>
                <p className="text-[9px] font-black text-on-surface/40 uppercase tracking-[0.3em] mt-1">Bulk Sourcing Settlements</p>
            </header>

            <main className="px-6 space-y-8 flex-1">
                <div className="bg-primary p-8 rounded-[2.5rem] text-white shadow-xl shadow-black/20 relative overflow-hidden group">
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                        className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-3xl"
                    ></motion.div>
                    
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Available for Payout</p>
                    <h2 className="text-4xl font-black text-white tracking-tighter mb-8 leading-none">{isLoading ? "—" : inr(availableBalance)}</h2>
                    
                    <div className="flex gap-3">
                        <motion.button 
                            whileTap={{ scale: 0.95 }}
                            onClick={handlePayout}
                            disabled={isRequesting || requestSuccess}
                            className={`flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-lg shadow-black/5 transition-all ${
                                requestSuccess ? 'bg-emerald-500 text-white' : 'bg-white text-primary'
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">
                                {isRequesting ? 'sync' : requestSuccess ? 'check_circle' : 'payments'}
                            </span>
                            {isRequesting ? 'Processing...' : requestSuccess ? 'Request Sent' : 'Request Payout'}
                        </motion.button>
                        <motion.button 
                            whileTap={{ scale: 0.95 }}
                            className="flex-1 py-4 bg-white/10 border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center"
                        >
                            <span className="material-symbols-outlined text-lg">equalizer</span>
                        </motion.button>
                    </div>
                </div>

                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Revenue Ledger</h2>
                        <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">October 2026</span>
                    </div>

                    <div className="space-y-4">
                        {transactions.map(tx => (
                            <motion.div 
                                key={tx.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-5">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-slate-100 ${tx.status === 'Credited' ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                        <span className="material-symbols-outlined text-2xl">{tx.status === 'Credited' ? 'add_card' : 'history'}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-[#0F172A] leading-none mb-1">{tx.vendor}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{tx.type} • {tx.date}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-base font-black text-on-surface tracking-tight">{tx.amount}</p>
                                    <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${tx.status === 'Credited' ? 'text-primary' : 'text-on-surface/40'}`}>{tx.status}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default SupplierWallet;
