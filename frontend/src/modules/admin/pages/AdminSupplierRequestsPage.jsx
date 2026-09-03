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
    Factory,
    FileText,
    ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { BASE_URL } from '../../../lib/api';
import PageHeader from '../components/common/PageHeader';
import { TableRowSkeleton } from '../components/skeletons/TableSkeleton';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TablePagination, StatusBadge, UserAvatarCell } from '@/shared/components/ui/table';

const AdminSupplierRequestsPage = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [unfilteredRequests, setUnfilteredRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [selectedBusiness, setSelectedBusiness] = useState('');
    const [selectedPhone, setSelectedPhone] = useState('');
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

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
        const names = unfilteredRequests
            .filter(req => req.status !== 'Approved' && req.onboardingStage !== 'Onboarded')
            .map(item => item.contactPersonName).filter(Boolean);
        return [...new Set(names)].sort();
    }, [unfilteredRequests]);

    const uniqueBusinesses = React.useMemo(() => {
        const names = unfilteredRequests
            .filter(req => req.status !== 'Approved' && req.onboardingStage !== 'Onboarded')
            .map(item => item.registeredBusinessName).filter(Boolean);
        return [...new Set(names)].sort();
    }, [unfilteredRequests]);

    const uniquePhones = React.useMemo(() => {
        const phones = unfilteredRequests
            .filter(req => req.status !== 'Approved' && req.onboardingStage !== 'Onboarded')
            .map(item => item.user?.phone).filter(Boolean);
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

    const getStageName = (stage) => {
        switch (stage) {
            case 'Initial_Approval_Pending': return 'Initial Review';
            case 'Product_Selection_Phase': return 'Product Selection';
            case 'Final_Approval_Pending': return 'Final Review';
            case 'Onboarded': return 'Onboarded';
            default: return stage || 'Pending';
        }
    };

    useEffect(() => {
        setPage(1);
    }, [startDate, endDate]);

    const formatStageName = (stage) => {
        return stage?.replace(/_/g, ' ') || 'Unknown';
    };

    const filteredRequests = React.useMemo(() => {
        return requests.filter(req => {
            // Strictly exclude already verified & onboarded suppliers
            if (req.status === 'Approved' || req.onboardingStage === 'Onboarded') {
                return false;
            }

            // 1. Text Search Filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchesName = (req.contactPersonName || req.user?.name || '').toLowerCase().includes(query);
                const matchesPhone = (req.user?.phone || '').toLowerCase().includes(query);
                const matchesBusiness = (req.registeredBusinessName || '').toLowerCase().includes(query);
                const matchesAddress = (req.warehouseAddress || '').toLowerCase().includes(query);
                const matchesCity = (req.city || '').toLowerCase().includes(query);
                const matchesPincode = (req.pincode || '').toLowerCase().includes(query);
                if (!matchesName && !matchesPhone && !matchesBusiness && !matchesAddress && !matchesCity && !matchesPincode) {
                    return false;
                }
            }

            // 2. Date Filter
            if (!req.createdAt) return !startDate && !endDate;

            const reqDate = new Date(req.createdAt);
            reqDate.setHours(0, 0, 0, 0);

            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                if (reqDate < start) return false;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (reqDate > end) return false;
            }
            return true;
        });
    }, [requests, startDate, endDate, searchQuery]);

    const paginatedRequests = React.useMemo(() => {
        return filteredRequests.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    }, [filteredRequests, page]);

    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage) || 1;

    const handleExportFile = (format) => {
        try {
            const headers = [
                "Supplier Name", "Business Name", "Contact Number", 
                "Application Date", "Onboarding Status", "Current Phase"
            ];
            
            const rows = filteredRequests.map(req => [
                req.contactPersonName || req.user?.name || '—',
                req.registeredBusinessName || '—',
                req.user?.phone || 'No Phone',
                new Date(req.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                req.status || 'Pending',
                req.onboardingStage?.replace(/_/g, ' ') || 'Unknown'
            ]);

            const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

            // Auto-fit column widths to prevent text clipping in Excel
            ws['!cols'] = headers.map((header, colIndex) => {
                let maxLen = header.length;
                rows.forEach(row => {
                    const val = row[colIndex];
                    if (val !== undefined && val !== null) {
                        const strVal = String(val);
                        if (strVal.length > maxLen) {
                            maxLen = strVal.length;
                        }
                    }
                });
                return { wch: Math.min(Math.max(maxLen + 3, 12), 50) };
            });

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Supplier Requests");

            if (format === 'excel') {
                XLSX.writeFile(wb, `Supplier_Requests_${new Date().getTime()}.xlsx`);
            } else if (format === 'csv') {
                XLSX.writeFile(wb, `Supplier_Requests_${new Date().getTime()}.csv`, { bookType: 'csv' });
            }
            alert(`${format.toUpperCase()} export downloaded successfully`);
        } catch (err) {
            console.error(`Export ${format} error:`, err);
            alert(`Error exporting to ${format}`);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
            <PageHeader 
                title="Supplier Registration Request" 
                actions={[
                    {
                        customComponent: (
                            <div className="relative">
                                <button
                                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                                    className="px-3 py-1.5 rounded-sm font-bold text-[9px] uppercase tracking-[0.2em] transition-all flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                                >
                                    <FileText size={13} />
                                    Export Supplier Requests
                                    <ChevronDown size={12} className={`transition-transform duration-200 ${showExportDropdown ? 'rotate-180' : ''}`} />
                                </button>
                                {showExportDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowExportDropdown(false)} />
                                        <div className="absolute right-0 mt-1.5 w-32 bg-white border border-slate-200 rounded-sm shadow-lg z-50 py-1 text-left">
                                            <button
                                                onClick={() => {
                                                    setShowExportDropdown(false);
                                                    handleExportFile('excel');
                                                }}
                                                className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                                            >
                                                Excel
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowExportDropdown(false);
                                                    handleExportFile('csv');
                                                }}
                                                className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                                            >
                                                CSV
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    }
                ]}
            />

            <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">

                {/* Table Container */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs font-['Poppins',sans-serif]">
                    {/* Grid Header Strip with Filters on the Right */}
                    <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between bg-white gap-4">
                        {/* Date & Text Search Filters on the Left */}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="relative">
                            <input 
                              type="text"
                              placeholder="Search Supplier..."
                              value={searchQuery}
                              onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPage(1);
                              }}
                              className="bg-slate-50 border border-slate-200/80 rounded-sm px-3 py-1.5 pl-8 text-[10px] font-bold text-slate-800 focus:bg-white focus:border-slate-900 outline-none w-56 transition-all"
                            />
                            <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                        </div>

                        {/* Dropdown Filters on the Right */}
                        <div className="flex flex-wrap items-center gap-2 justify-end">
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
                            {(selectedSupplier || selectedBusiness || selectedPhone || searchQuery) && (
                                <button
                                    onClick={() => {
                                        setSelectedSupplier('');
                                        setSelectedBusiness('');
                                        setSelectedPhone('');
                                        setSearchQuery('');
                                    }}
                                    className="px-3 py-1.5 border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-900 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all bg-white cursor-pointer"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto w-full">
                        <Table style={{ minWidth: '950px' }}>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="min-w-[130px]">Supplier Name</TableHead>
                                    <TableHead className="min-w-[140px]">Business Name</TableHead>
                                    <TableHead className="min-w-[110px]">Contact Number</TableHead>
                                    <TableHead className="min-w-[110px]">Application Date</TableHead>
                                    <TableHead className="min-w-[110px]">Onboarding Status</TableHead>
                                    <TableHead className="min-w-[120px]">Current Phase</TableHead>
                                    <TableHead className="min-w-[130px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <TableRowSkeleton key={i} cols={7} />
                                    ))
                                ) : filteredRequests.length === 0 ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={7} className="h-48 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                                                    <Factory size={28} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-slate-800">Pipeline Empty</h3>
                                                    <p className="text-xs text-slate-400 font-medium mt-1">No active supplier requests found.</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedRequests.map((req) => (
                                        <TableRow key={req._id} className="group hover:bg-slate-50/70 transition-colors border-b border-slate-200/70">
                                            <TableCell>
                                                <UserAvatarCell
                                                    name={req.contactPersonName || req.user?.name || '—'}
                                                    subtitle={req.user?.email || req.user?.phone}
                                                />
                                            </TableCell>
                                            <TableCell className="whitespace-normal">
                                                <span className="text-[14.5px] text-slate-700 font-normal">{req.registeredBusinessName || '—'}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-[14.5px] text-slate-700 tabular-nums whitespace-nowrap">{req.user?.phone || 'No Phone'}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 whitespace-nowrap">
                                                    <Clock size={15} className="text-slate-400" />
                                                    <span className="text-[14.5px] text-slate-700 tabular-nums">
                                                        {new Date(req.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={req.status} />
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border w-fit whitespace-nowrap ${getStageColor(req.onboardingStage)}`}>
                                                    {formatStageName(req.onboardingStage)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <button 
                                                    onClick={() => navigate(`/admin/supplier-requests/${req._id}`)}
                                                    className="h-9 px-4 rounded-lg bg-slate-900 text-white text-xs font-medium inline-flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer shadow-xs ml-auto"
                                                >
                                                    <Eye size={14} />
                                                    Process Phase
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    
                    {/* Pagination Controls */}
                    {filteredRequests.length > 0 && (
                        <TablePagination
                            page={page}
                            totalPages={totalPages}
                            onPageChange={setPage}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSupplierRequestsPage;
