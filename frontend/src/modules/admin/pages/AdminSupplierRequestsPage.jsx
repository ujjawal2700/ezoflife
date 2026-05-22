import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
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
    const [unfilteredRequests, setUnfilteredRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [selectedBusiness, setSelectedBusiness] = useState('');
    const [selectedPhone, setSelectedPhone] = useState('');

    useEffect(() => {
        fetchUnfiltered();
    }, []);

    useEffect(() => {
        const filters = {};
        if (selectedSupplier) filters.supplierName = selectedSupplier;
        if (selectedBusiness) filters.businessName = selectedBusiness;
        if (selectedPhone) filters.phone = selectedPhone;

        fetchRequests(filters);
        setPage(1);
    }, [selectedSupplier, selectedBusiness, selectedPhone]);

    const fetchUnfiltered = async () => {
        try {
            const response = await fetch(`${BASE_URL}/supplier/requests`);
            const data = await response.json();
            if (Array.isArray(data)) {
                setUnfilteredRequests(data);
            }
        } catch (error) {
            console.error('Fetch Unfiltered Supplier Requests Error:', error);
        }
    };

    const fetchRequests = async (filters = {}) => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams(filters).toString();
            const url = `${BASE_URL}/supplier/requests${queryParams ? `?${queryParams}` : ''}`;
            const response = await fetch(url);
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

    const uniqueSuppliers = React.useMemo(() => {
        const names = unfilteredRequests.map(item => item.contactPersonName).filter(Boolean);
        return [...new Set(names)].sort();
    }, [unfilteredRequests]);

    const uniqueBusinesses = React.useMemo(() => {
        const names = unfilteredRequests.map(item => item.registeredBusinessName).filter(Boolean);
        return [...new Set(names)].sort();
    }, [unfilteredRequests]);

    const uniquePhones = React.useMemo(() => {
        const phones = unfilteredRequests.map(item => item.user?.phone).filter(Boolean);
        return [...new Set(phones)].sort();
    }, [unfilteredRequests]);

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

    const paginatedRequests = React.useMemo(() => {
        return requests.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    }, [requests, page]);

    const totalPages = Math.ceil(requests.length / itemsPerPage) || 1;

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
            <PageHeader 
                title="Supplier Onboarding" 
            />

            <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">

                {/* Table Container */}
                <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                    {/* Grid Header Strip with Filters on the Right */}
                    <div className="px-8 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between bg-white gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-slate-900 rounded-sm" />
                            <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.2em] leading-none mb-1">
                                Onboarding Requests
                            </h3>
                            <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-400 text-[10px] font-bold tabular-nums tracking-widest leading-none">
                                {requests.length} REQUESTS
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={selectedSupplier}
                                onChange={(e) => setSelectedSupplier(e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-[10px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none w-36 uppercase tracking-wider cursor-pointer"
                            >
                                <option value="">All Suppliers</option>
                                {uniqueSuppliers.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                            <select
                                value={selectedBusiness}
                                onChange={(e) => setSelectedBusiness(e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-[10px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none w-36 uppercase tracking-wider cursor-pointer"
                            >
                                <option value="">All Businesses</option>
                                {uniqueBusinesses.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                            <select
                                value={selectedPhone}
                                onChange={(e) => setSelectedPhone(e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-[10px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none w-28 uppercase tracking-wider cursor-pointer"
                            >
                                <option value="">All Numbers</option>
                                {uniquePhones.map(phone => (
                                    <option key={phone} value={phone}>{phone}</option>
                                ))}
                            </select>
                            {(selectedSupplier || selectedBusiness || selectedPhone) && (
                                <button
                                    onClick={() => {
                                        setSelectedSupplier('');
                                        setSelectedBusiness('');
                                        setSelectedPhone('');
                                    }}
                                    className="px-3 py-1.5 border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-900 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all bg-white cursor-pointer"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse min-w-[950px]">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="w-[18%] min-w-[130px] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Supplier Name</th>
                                    <th className="w-[20%] min-w-[140px] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Business Name</th>
                                    <th className="w-[12%] min-w-[110px] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Contact Number</th>
                                    <th className="w-[13%] min-w-[110px] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Application Date</th>
                                    <th className="w-[13%] min-w-[110px] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Onboarding Status</th>
                                    <th className="w-[14%] min-w-[120px] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Current Phase</th>
                                    <th className="w-[10%] min-w-[130px] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="py-20 text-center">
                                            <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syncing Supplier Data...</p>
                                        </td>
                                    </tr>
                                ) : requests.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-32 text-center">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-4">
                                                <Factory size={32} />
                                            </div>
                                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Pipeline Empty</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">No active supplier requests found.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedRequests.map((req) => (
                                        <tr key={req._id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-5">
                                                <span className="text-sm font-black text-slate-900 tracking-tight whitespace-nowrap">{req.contactPersonName || req.user?.name || '—'}</span>
                                            </td>
                                            <td className="px-6 py-5 whitespace-normal break-words">
                                                <span className="text-xs font-bold text-slate-600">{req.registeredBusinessName || '—'}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-xs font-bold text-slate-600 tabular-nums whitespace-nowrap">{req.user?.phone || 'No Phone'}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2 whitespace-nowrap">
                                                    <Clock size={14} className="text-slate-300" />
                                                    <span className="text-[11px] font-bold text-slate-600 tabular-nums">
                                                        {new Date(req.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap ${req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                    {req.status === 'Approved' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border w-fit whitespace-nowrap ${getStageColor(req.onboardingStage)}`}>
                                                        {formatStageName(req.onboardingStage)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button 
                                                    onClick={() => navigate(`/admin/supplier-requests/${req._id}`)}
                                                    className="h-10 px-6 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary transition-all shadow-lg active:scale-95 whitespace-nowrap cursor-pointer ml-auto"
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
                    
                    {/* Pagination Controls */}
                    {requests.length > 0 && (
                        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end transition-colors hover:bg-slate-100/30">
                            <div className="flex items-center gap-1">
                                <button 
                                    disabled={page <= 1 || loading}
                                    onClick={() => setPage(p => p - 1)}
                                    className="p-1 px-3 border border-slate-200 text-[9px] font-bold uppercase tracking-widest rounded-sm bg-white hover:bg-slate-950 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Prev
                                </button>
                                <span className="px-4 text-[9px] font-black text-slate-900 tracking-widest tabular-nums bg-slate-200/50 h-6 flex items-center rounded-sm whitespace-nowrap">
                                    PG {String(page).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
                                </span>
                                <button 
                                    disabled={page >= totalPages || loading}
                                    onClick={() => setPage(p => p + 1)}
                                    className="p-1 px-3 border border-slate-200 text-[9px] font-bold uppercase tracking-widest rounded-sm bg-white hover:bg-slate-950 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSupplierRequestsPage;
