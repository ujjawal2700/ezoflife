import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BASE_URL } from '../../../lib/api';

const VendorProductQueries = () => {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const vendorDataRaw = localStorage.getItem('vendorData') || localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
    const vendorData = JSON.parse(vendorDataRaw);
    const vendorId = vendorData._id || vendorData.id || vendorData.user?._id || vendorData.user?.id;

    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                if (!vendorId) return;
                const res = await fetch(`${BASE_URL}/vendor-product-queries/suppliers/${vendorId}`);
                const data = await res.json();
                if (res.ok) {
                    setSuppliers(data);
                }
            } catch (err) {
                console.error("Failed to fetch suppliers", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSuppliers();
    }, [vendorId]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-20">
                <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-all active:scale-95">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">Product Queries</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your conversations</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-md mx-auto p-6 space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                    </div>
                ) : suppliers.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm shadow-slate-200/50">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-3xl text-slate-400">forum</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mb-1">No Queries Yet</h3>
                        <p className="text-xs text-slate-500 font-medium">You haven't initiated any product queries with suppliers yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {suppliers.map(supplier => (
                            <motion.button
                                key={supplier._id}
                                onClick={() => navigate(`/vendor/product-queries/${supplier._id}`)}
                                whileTap={{ scale: 0.98 }}
                                className="w-full bg-white p-5 rounded-3xl border border-slate-100 shadow-sm shadow-slate-200/50 flex items-center gap-4 text-left group hover:border-slate-300 transition-all"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-900 transition-colors">store</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm text-slate-900 truncate mb-1">{supplier.businessName || supplier.name || 'Unknown Supplier'}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{supplier.phone}</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-300 group-hover:text-slate-900 transition-colors">chevron_right</span>
                            </motion.button>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default VendorProductQueries;
