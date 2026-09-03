import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, Sparkles, ArrowLeft, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { authApi, orderApi } from '../../../lib/api';

const WalletPage = () => {
    const navigate = useNavigate();
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const userId = useMemo(() => {
        const userRaw = localStorage.getItem('user') || '{}';
        const user = JSON.parse(userRaw);
        return user._id || user.id || null;
    }, []);

    useEffect(() => {
        if (userId) {
            const loadData = async () => {
                try {
                    setLoading(true);
                    
                    // Fetch live balance
                    const profile = await authApi.getProfile(userId);
                    setBalance(profile?.walletBalance || 0);

                    // Fetch customer orders to find cashback records
                    const orders = await orderApi.getMyOrders(userId);
                    const cashbackTxList = (orders || [])
                        .filter(o => (o.ledger && o.ledger.customerWalletCredit > 0) || (o.walletAmountDeducted && o.walletAmountDeducted > 0))
                        .map(o => {
                            const isDeduction = o.walletAmountDeducted > 0;
                            return {
                                id: o.orderId || `ORD-${o._id.toString().slice(-6).toUpperCase()}`,
                                type: isDeduction ? 'Order Payment' : 'Promo Cashback',
                                amount: isDeduction ? -o.walletAmountDeducted : o.ledger.customerWalletCredit,
                                date: new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                                status: isDeduction ? 'Debited' : 'Credited'
                            };
                        });

                    setTransactions(cashbackTxList);
                } catch (err) {
                    console.error('Failed to load wallet data:', err);
                } finally {
                    setLoading(false);
                }
            };
            loadData();
        } else {
            setLoading(false);
        }
    }, [userId]);

    const containerVariants = useMemo(() => ({
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { staggerChildren: 0.08 }
        }
    }), []);

    const itemVariants = useMemo(() => ({
        hidden: { y: 15, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } }
    }), []);

    return (
        <div className="bg-[#f8fafc] text-slate-900 min-h-[100dvh] pb-44 sm:pb-36 font-['Poppins',sans-serif]">
            <motion.main 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6"
            >
                {/* Page Subheader */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/60">
                    <button 
                        onClick={() => navigate('/user/profile')}
                        className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 px-2.5 sm:px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                    >
                        <ArrowLeft size={16} />
                        <span>Back to Account</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Spinzyt Wallet</span>
                    </div>
                </div>

                {/* Balance Display Card */}
                <motion.section variants={itemVariants} className="relative">
                    <div className="relative bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl overflow-hidden border border-slate-700/60">
                        {/* Decorative subtle background shapes */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none -ml-16 -mb-16" />

                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/15">
                                        <Wallet size={18} />
                                    </div>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Available Credits</span>
                                </div>
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                                    <ShieldCheck size={12} />
                                    Active Balance
                                </span>
                            </div>

                            <div>
                                <h2 className="text-4xl sm:text-5xl font-bold tracking-tight tabular-nums text-white">
                                    ₹{balance.toLocaleString('en-IN')}
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">
                                    Applicable automatically at checkout toward any laundry or dry cleaning order.
                                </p>
                            </div>

                            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                                <div className="flex items-center gap-1.5 text-slate-300">
                                    <Sparkles size={13} className="text-amber-400" />
                                    <span>Instant checkout when balance covers order total</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* Transaction History */}
                <motion.section variants={itemVariants} className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-slate-500" />
                            <h3 className="text-sm sm:text-base font-bold text-slate-900">Wallet History</h3>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                            {transactions.length} {transactions.length === 1 ? 'Record' : 'Records'}
                        </span>
                    </div>

                    <div className="space-y-2.5">
                        {loading ? (
                            <div className="flex justify-center py-12 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                                <div className="w-7 h-7 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                    <Wallet size={22} />
                                </div>
                                <h4 className="text-sm font-semibold text-slate-800">No transactions yet</h4>
                                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                                    Promotional cashback and refund credits will appear here as you place and receive orders.
                                </p>
                            </div>
                        ) : transactions.map((tx) => (
                            <motion.div 
                                variants={itemVariants}
                                key={tx.id} 
                                className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-colors"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                        tx.amount > 0 
                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}>
                                        {tx.amount > 0 ? <Sparkles size={18} /> : <Wallet size={18} />}
                                    </div>
                                    <div>
                                        <h4 className="text-xs sm:text-sm font-semibold text-slate-900">{tx.type}</h4>
                                        <p className="text-[11px] text-slate-400 mt-0.5">{tx.date} · {tx.id}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm sm:text-base font-bold tabular-nums ${
                                        tx.amount > 0 ? 'text-emerald-600' : 'text-slate-900'
                                    }`}>
                                        {tx.amount > 0 ? `+₹${tx.amount}` : `-₹${Math.abs(tx.amount)}`}
                                    </p>
                                    <span className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full mt-0.5 ${
                                        tx.status === 'Credited' 
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}>
                                        {tx.status}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>
            </motion.main>
        </div>
    );
};

export default WalletPage;
