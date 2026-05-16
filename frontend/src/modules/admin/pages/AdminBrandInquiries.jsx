import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { mediaApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const AdminBrandInquiries = () => {
    const [inquiries, setInquiries] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchInquiries = async () => {
        try {
            setLoading(true);
            const data = await mediaApi.getAllInquiries();
            setInquiries(data);
        } catch (error) {
            toast.error('Failed to fetch inquiries');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInquiries();
    }, []);

    return (
        <div className="p-8 space-y-8 max-w-6xl mx-auto">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 leading-none">Brand Inquiries</h1>
                    <p className="text-sm text-slate-500 font-medium mt-2">Manage and track advertising leads from customers</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={fetchInquiries}
                        className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary transition-all shadow-sm"
                    >
                        <span className="material-symbols-outlined text-xl">refresh</span>
                    </button>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                        {inquiries.length} Total Lead(s)
                    </span>
                </div>
            </header>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Brand & Contact</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Budget (₹)</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timeline</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Submitted</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading inquiries...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : inquiries.map((inquiry) => (
                                <tr key={inquiry._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-8">
                                        <div className="flex flex-col">
                                            <span className="text-md font-black text-slate-900">{inquiry.brandName}</span>
                                            <span className="text-xs text-primary font-bold mt-1">{inquiry.email}</span>
                                            <span className="text-[10px] text-slate-500 font-black mt-1 uppercase tracking-wider">{inquiry.phone}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-8">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <span className="material-symbols-outlined text-sm">location_on</span>
                                            <span className="text-xs font-bold">{inquiry.location}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-8">
                                        <span className="text-sm font-black text-slate-900">₹{inquiry.budget?.toLocaleString()}</span>
                                    </td>
                                    <td className="px-8 py-8">
                                        <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-slate-200">
                                            {inquiry.timeline}
                                        </span>
                                    </td>
                                    <td className="px-8 py-8">
                                        <p className="text-xs font-bold text-slate-600">{new Date(inquiry.createdAt).toLocaleDateString('en-GB')}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(inquiry.createdAt).toLocaleTimeString()}</p>
                                    </td>
                                </tr>
                            ))}
                            {inquiries.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" className="px-8 py-40 text-center text-slate-300">
                                        <span className="material-symbols-outlined text-6xl mb-4 opacity-20">campaign</span>
                                        <p className="text-[11px] font-black uppercase tracking-widest">No brand inquiries yet</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminBrandInquiries;
