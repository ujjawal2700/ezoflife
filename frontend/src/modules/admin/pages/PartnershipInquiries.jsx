import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { partnershipApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const PartnershipInquiries = () => {
    const [inquiries, setInquiries] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchInquiries = async () => {
        try {
            setLoading(true);
            const data = await partnershipApi.getAll();
            setInquiries(data);
        } catch (error) {
            toast.error('Failed to fetch partnership inquiries');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInquiries();
    }, []);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter text-slate-900 leading-none">Partnership Inquiries</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 opacity-60">Manage Industrial & B2B Proposals</p>
                </div>
                <div className="px-5 py-2 bg-slate-100 rounded-full">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{inquiries.length} Active Leads</span>
                </div>
            </header>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Company & Contact</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Proposal Details</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Website</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Submitted</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {inquiries.map((inquiry) => (
                                <tr key={inquiry._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-8 align-top">
                                        <div className="flex flex-col">
                                            <span className="text-md font-black text-slate-900">{inquiry.companyName}</span>
                                            <span className="text-xs text-primary font-bold mt-1">{inquiry.email}</span>
                                            <span className="text-[10px] text-slate-500 font-black mt-1 uppercase tracking-wider">{inquiry.phone}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-8 align-top">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <span className="material-symbols-outlined text-sm">location_on</span>
                                            <span className="text-xs font-bold">{inquiry.location}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-8 align-top">
                                        <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-slate-200">
                                            {inquiry.partnershipType}
                                        </span>
                                    </td>
                                    <td className="px-8 py-8 max-w-xs">
                                        <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                                            "{inquiry.proposal}"
                                        </p>
                                    </td>
                                    <td className="px-8 py-8 align-top">
                                        {inquiry.website ? (
                                            <a href={inquiry.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs font-bold">
                                                Visit Site
                                            </a>
                                        ) : (
                                            <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-8 align-top">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-900">{new Date(inquiry.createdAt).toLocaleDateString()}</span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(inquiry.createdAt).toLocaleTimeString()}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {inquiries.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="4" className="px-8 py-40 text-center text-slate-300">
                                        <span className="material-symbols-outlined text-6xl mb-4">handshake</span>
                                        <p className="text-[11px] font-black uppercase tracking-widest">No B2B inquiries yet</p>
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

export default PartnershipInquiries;
