import React, { useState, useEffect, useMemo } from 'react';
import { partnershipApi } from '../../../lib/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/common/PageHeader';
import DataGrid from '../components/tables/DataGrid';
import * as XLSX from 'xlsx';


const PartnershipInquiries = () => {
    const [inquiries, setInquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    const [filters, setFilters] = useState({ companyName: '', email: '', phone: '', partnershipType: '', submitted: '' });
    const [filterOptions, setFilterOptions] = useState({ companyNames: [], emails: [], phones: [], partnershipTypes: [], dates: [] });

    const fetchInquiries = async (currentFilters = filters) => {
        try {
            setLoading(true);
            const data = await partnershipApi.getAll(currentFilters);
            setInquiries(data);
        } catch (error) {
            toast.error('Failed to fetch partnership inquiries');
        } finally {
            setLoading(false);
        }
    };

    const fetchFilters = async () => {
        try {
            const data = await partnershipApi.getFilters();
            setFilterOptions(data || { companyNames: [], emails: [], phones: [], partnershipTypes: [], dates: [] });
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
        const reset = { companyName: '', email: '', phone: '', partnershipType: '', submitted: '' };
        setFilters(reset);
        setPage(1);
        fetchInquiries(reset);
    };

    const paginatedInquiries = useMemo(() => {
        return inquiries.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    }, [inquiries, page]);

    const totalPages = Math.ceil(inquiries.length / itemsPerPage) || 1;

    const pagination = useMemo(() => ({
        page,
        totalPages,
        total: inquiries.length
    }), [page, totalPages, inquiries.length]);

    const handleDownload = () => {
        if (!inquiries || inquiries.length === 0) {
            toast.error('No inquiries available to download');
            return;
        }
        const headers = ['Company', 'Email', 'Contact', 'Location', 'Partnership Type', 'Proposal', 'Website', 'Submitted At'];
        const rows = inquiries.map(item => [
            item.companyName || '',
            item.email || '',
            item.phone || '',
            item.location || '',
            item.partnershipType || '',
            item.proposal || '',
            item.website || '',
            new Date(item.createdAt).toLocaleString()
        ]);

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Partnership Inquiries');
        XLSX.writeFile(wb, `Partnership_Inquiries_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('Excel downloaded successfully');
    };

    const columns = useMemo(() => [
        {
            header: 'Brand',
            key: 'companyName',
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
            header: 'Type',
            key: 'partnershipType',
            render: (val) => (
                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[9px] font-black rounded-full uppercase tracking-widest border border-slate-200 whitespace-nowrap">
                    {val}
                </span>
            )
        },
        {
            header: 'Proposal Details',
            key: 'proposal',
            render: (val) => (
                <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-xs whitespace-normal break-words">
                    "{val}"
                </p>
            )
        },
        {
            header: 'Website',
            key: 'website',
            render: (val) => val ? (
                <a href={val} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs font-bold">
                    Visit Site
                </a>
            ) : (
                <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest">N/A</span>
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
        }
    ], []);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
            <PageHeader title="Partnership Inquiries" />

            <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
                <DataGrid 
                    title=""
                    showFilter={false}
                    showSearch={false}
                    actions={
                        <div className="flex items-center gap-2">
                            <select
                                value={filters.companyName}
                                onChange={(e) => handleFilterChange('companyName', e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-[10px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none w-36 uppercase tracking-wider cursor-pointer"
                            >
                                <option value="">All Brands</option>
                                {filterOptions.companyNames.map(brand => (
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
                                value={filters.partnershipType}
                                onChange={(e) => handleFilterChange('partnershipType', e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-[10px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none w-32 uppercase tracking-wider cursor-pointer"
                            >
                                <option value="">All Types</option>
                                {filterOptions.partnershipTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                            <select
                                value={filters.submitted}
                                onChange={(e) => handleFilterChange('submitted', e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-[10px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none w-32 uppercase tracking-wider cursor-pointer"
                            >
                                <option value="">All Dates</option>
                                {filterOptions.dates.map(date => (
                                    <option key={date} value={date}>{new Date(date).toLocaleDateString('en-GB')}</option>
                                ))}
                            </select>
                            {(filters.companyName || filters.email || filters.phone || filters.partnershipType || filters.submitted) && (
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

export default PartnershipInquiries;

