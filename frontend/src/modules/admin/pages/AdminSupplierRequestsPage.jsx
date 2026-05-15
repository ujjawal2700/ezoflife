import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    RotateCw, 
    ShieldCheck, 
    UserPlus, 
    MapPin, 
    Briefcase,
    Clock,
    Eye,
    CheckCircle2,
    Factory
} from 'lucide-react';
import { BASE_URL } from '../../../lib/api';
import PageHeader from '../components/common/PageHeader';

const AdminSupplierRequestsPage = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${BASE_URL}/supplier/requests`);
            const data = await response.json();
            if (Array.isArray(data)) {
                setRequests(data);
            } else {
                setRequests([]);
            }
        } catch (error) {
            console.error('Fetch Supplier Requests Error:', error);
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const getStageColor = (stage) => {
        switch (stage) {
            case 'Initial_Approval_Pending': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'Product_Selection_Phase': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'Final_Approval_Pending': return 'bg-purple-50 text-purple-600 border-purple-100';
            case 'Onboarded': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    const formatStageName = (stage) => {
        return stage?.replace(/_/g, ' ') || 'Unknown';
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
            <PageHeader 
                title="Supplier Onboarding" 
                actions={[{ label: 'Refresh Queue', icon: RotateCw, variant: 'secondary', onClick: fetchRequests }]}
            />

            {/* Status Matrix */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-[1600px] mx-auto w-full px-8 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Supplier Onboarding Engine</span>
                        </div>
                        <div className="h-4 w-px bg-slate-200" />
                        <div className="flex gap-4">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Requests: <span className="text-slate-900">{requests.length}</span></span>
                        </div>
                    </div>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Multi-Stage Application Management</p>
                </div>
            </div>

            <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
                {/* Header Information */}
                <div className="flex flex-col">
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                        Supplier Pipeline
                        <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black tracking-widest rounded-sm">
                            {requests.length} ACTIVE
                        </span>
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Audit and process multi-phase supplier applications</p>
                </div>

                {/* Table Container */}
                <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier Identity</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Application Date</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Onboarding Status</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Phase</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syncing Supplier Data...</p>
                                    </td>
                                </tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-32 text-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-4">
                                            <Factory size={32} />
                                        </div>
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Pipeline Empty</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">No active supplier requests found.</p>
                                    </td>
                                </tr>
                            ) : (
                                requests.map((req) => (
                                    <tr key={req._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                                    <Factory size={18} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-900 tracking-tight uppercase">{req.registeredBusinessName}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{req.contactPersonName} • {req.user?.phone || 'No Phone'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-slate-300" />
                                                <span className="text-[11px] font-bold text-slate-600 tabular-nums">
                                                    {new Date(req.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                {req.status === 'Approved' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border w-fit ${getStageColor(req.onboardingStage)}`}>
                                                    {formatStageName(req.onboardingStage)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button 
                                                onClick={() => navigate(`/admin/supplier-requests/${req._id}`)}
                                                className="h-10 px-6 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary transition-all shadow-lg active:scale-95"
                                            >
                                                <Eye size={14} />
                                                Process Phase
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminSupplierRequestsPage;
