import React, { useState, useEffect, useMemo } from 'react';
import { mediaApi } from '../../../lib/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/common/PageHeader';
import DataGrid from '../components/tables/DataGrid';
import * as XLSX from 'xlsx';


const AdminBrandInquiries = () => {
    const [inquiries, setInquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    const [filters, setFilters] = useState({ brandName: '', email: '', phone: '', budget: '' });
    const [filterOptions, setFilterOptions] = useState({ brands: [], emails: [], phones: [], budgets: [] });

    const fetchInquiries = async (currentFilters = filters) => {
        try {
            setLoading(true);
            const data = await mediaApi.getAllInquiries(currentFilters);
            setInquiries(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error('Failed to fetch inquiries');
            setInquiries([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchFilters = async () => {
        try {
            const data = await mediaApi.getInquiryFilters();
            setFilterOptions(data || { brands: [], emails: [], phones: [], budgets: [] });
        } catch (error) {
            console.error('Failed to fetch filters:', error);
        }
    };

    useEffect(() => {
        fetchInquiries();
        fetchFilters();
    }, []);

    const handleFilterChange = (key, value) => {
        const updatedFilters = { ...filters, [key]: value };
        setFilters(updatedFilters);
        setPage(1);
        fetchInquiries(updatedFilters);
    };

    const handleResetFilters = () => {
        const reset = { brandName: '', email: '', phone: '', budget: '' };
        setFilters(reset);
        setPage(1);
        fetchInquiries(reset);
    };

    const paginatedInquiries = useMemo(() => {
        const list = Array.isArray(inquiries) ? inquiries : [];
        return list.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    }, [inquiries, page]);

    const totalPages = Math.ceil((Array.isArray(inquiries) ? inquiries.length : 0) / itemsPerPage) || 1;

    const pagination = useMemo(() => ({
        page,
        totalPages,
        total: Array.isArray(inquiries) ? inquiries.length : 0
    }), [page, totalPages, inquiries]);

    const handleDownload = () => {
        const list = Array.isArray(inquiries) ? inquiries : [];
        if (list.length === 0) {
            toast.error('No inquiries available to download');
            return;
        }
        const headers = ['Brand', 'Email', 'Contact', 'Location', 'Budget (INR)', 'Timeline', 'Status', 'Submitted At'];
        const rows = list.map(item => [
            item.brandName || '',
            item.email || '',
            item.phone || '',
            item.location || '',
            item.budget || '',
            item.timeline || '',
            item.status || 'New Application',
            new Date(item.createdAt).toLocaleString()
        ]);

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Brand Inquiries');
        XLSX.writeFile(wb, `Brand_Inquiries_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('Excel downloaded successfully');
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this inquiry?')) return;
        try {
            await mediaApi.deleteInquiry(id);
            toast.success('Inquiry deleted successfully');
            fetchInquiries();
            fetchFilters();
        } catch (error) {
            toast.error('Failed to delete inquiry');
        }
    };

    const columns = useMemo(() => [
        {
            header: 'Brand',
            key: 'brandName',
            render: (val) => (
                <span className="font-bold text-slate-800 uppercase tracking-tight text-[11px]">{val}</span>
            )
        },
        {
            header: 'Email',
            key: 'email',
            render: (val) => (
                <span className="text-xs text-primary font-bold">{val}</span>
            )
        },
        {
            header: 'Contact',
            key: 'phone',
            render: (val) => (
                <span className="text-xs text-slate-700 font-bold">{val}</span>
            )
        },
        {
            header: 'Location',
            key: 'location',
            render: (val) => (
                <div className="flex items-center gap-2 text-slate-600">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    <span className="text-xs font-medium">{val}</span>
                </div>
            )
        },
        {
            header: 'Budget (₹)',
            key: 'budget',
            render: (val) => (
                <span className="text-xs font-bold text-slate-900">₹{val?.toLocaleString()}</span>
            )
        },
        {
            header: 'Timeline',
            key: 'timeline',
            render: (val) => (
                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[9px] font-black rounded-full uppercase tracking-widest border border-slate-200 whitespace-nowrap">
                    {val}
                </span>
            )
        },
        {
            header: 'Submitted',
            key: 'createdAt',
            render: (val) => (
                <div>
                    <p className="text-xs font-bold text-slate-600">{new Date(val).toLocaleDateString('en-GB')}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(val).toLocaleTimeString()}</p>
                </div>
            )
        },
        {
            header: 'Status',
            key: 'status',
            render: (val) => {
                const status = val || 'New Application';
                let colors = 'bg-slate-100 text-slate-800 border-slate-200'; // Default / New Application
                if (status === 'Requested More Info') {
                    colors = 'bg-amber-50 text-amber-700 border-amber-200';
                } else if (status === 'Scheduled Meeting') {
                    colors = 'bg-blue-50 text-blue-700 border-blue-200';
                } else if (status === 'Final Proposal') {
                    colors = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                }
                return (
                    <span className={`px-2.5 py-1 text-[9px] font-black rounded-full uppercase tracking-wider border whitespace-nowrap ${colors}`}>
                        {status}
                    </span>
                );
            }
        },
        {
            header: 'Actions',
            key: '_id',
            align: 'right',
            render: (val, row) => (
                <select
                    value={row.status || 'New Application'}
                    onChange={async (e) => {
                        const newStatus = e.target.value;
                        try {
                            await mediaApi.updateInquiryStatus(val, newStatus);
                            toast.success('Stage updated successfully');
                            fetchInquiries();
                        } catch (error) {
                            toast.error('Failed to update stage');
                        }
                    }}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-sm text-[10px] font-bold text-slate-900 focus:border-slate-900 transition-all outline-none cursor-pointer uppercase tracking-wider"
                >
                    <option value="New Application">New Application</option>
                    <option value="Requested More Info">Requested More Info</option>
                    <option value="Scheduled Meeting">Scheduled Meeting</option>
                    <option value="Final Proposal">Final Proposal</option>
                </select>
            )
        }
    ], [fetchInquiries]);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
            <PageHeader title="Advertise" />

            <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
                <DataGrid 
                    title=""
                    showFilter={false}
                    showSearch={false}
                    actions={
                        <div className="flex items-center flex-wrap gap-2">
                            <select
                                value={filters.brandName}
                                onChange={(e) => handleFilterChange('brandName', e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-[10px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none w-36 uppercase tracking-wider cursor-pointer"
                            >
                                <option value="">All Brands</option>
                                {filterOptions.brands.map(brand => (
                                    <option key={brand} value={brand}>{brand}</option>
                                ))}
                            </select>
                            <select
                                value={filters.email}
                                onChange={(e) => handleFilterChange('email', e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-[10px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none w-36 uppercase tracking-wider cursor-pointer"
                            >
                                <option value="">All Emails</option>
                                {filterOptions.emails.map(email => (
                                    <option key={email} value={email}>{email}</option>
                                ))}
                            </select>
                            <select
                                value={filters.phone}
                                onChange={(e) => handleFilterChange('phone', e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-[10px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none w-36 uppercase tracking-wider cursor-pointer"
                            >
                                <option value="">All Contacts</option>
                                {filterOptions.phones.map(phone => (
                                    <option key={phone} value={phone}>{phone}</option>
                                ))}
                            </select>
                            <select
                                value={filters.budget}
                                onChange={(e) => handleFilterChange('budget', e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-[10px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none w-32 uppercase tracking-wider cursor-pointer"
                            >
                                <option value="">All Budgets</option>
                                {filterOptions.budgets.map(budget => (
                                    <option key={budget} value={budget}>₹{budget.toLocaleString()}</option>
                                ))}
                            </select>
                            {(filters.brandName || filters.email || filters.phone || filters.budget) && (
                                <button 
                                    onClick={handleResetFilters}
                                    className="px-3 py-1.5 border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-900 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all bg-white cursor-pointer animate-fade-in"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    }
                    columns={columns}
                    data={paginatedInquiries}
                    loading={loading}
                    pagination={pagination}
                    onPageChange={(newPage) => setPage(newPage)}
                    onDownload={handleDownload}
                />
            </div>
        </div>
    );
};

export default AdminBrandInquiries;
