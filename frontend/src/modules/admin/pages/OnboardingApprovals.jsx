import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileCheck, 
  ShieldCheck, 
  XCircle, 
  MapPin, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  ChevronRight, 
  UserPlus, 
  ShieldAlert, 
  ArrowRight, 
  RotateCw, 
  Eye,
  Check,
  X,
  Clock,
  LayoutGrid,
  Filter,
  MoreVertical,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { adminApi } from '../../../lib/api';
import * as XLSX from 'xlsx';
import PageHeader from '../components/common/PageHeader';

export default function OnboardingApprovals() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') === 'Supplier' ? 'Supplier' : 'Vendor';

  const [rawUsers, setRawUsers] = useState([]);
  const [unfilteredUsers, setUnfilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isProcessing, setIsProcessing] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showDocSelector, setShowDocSelector] = useState(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [selectedPhone, setSelectedPhone] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch full unfiltered pending list for dropdowns
  const fetchUnfiltered = async () => {
    try {
      const allPending = await adminApi.getPendingApprovals();
      setUnfilteredUsers(allPending);
    } catch (err) {
      console.error('Fetch Unfiltered Error:', err);
    }
  };

  // Fetch filtered list from backend
  const fetchPending = async (filters = {}) => {
    setLoading(true);
    try {
      const pending = await adminApi.getPendingApprovals(filters);
      setRawUsers(pending);
    } catch (err) {
      console.error('Fetch Pending Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load unfiltered list once on mount
  useEffect(() => {
    fetchUnfiltered();
  }, []);

  // Fetch pending list whenever filters change
  useEffect(() => {
    const filters = {};
    if (selectedVendor) filters.vendorName = selectedVendor;
    if (selectedBusiness) filters.businessName = selectedBusiness;
    if (selectedPhone) filters.phone = selectedPhone;
    
    fetchPending(filters);
    setPage(1); // Reset to page 1 on filter changes
  }, [selectedVendor, selectedBusiness, selectedPhone]);

  // Reset dropdown filters when tab changes
  useEffect(() => {
    setSelectedVendor('');
    setSelectedBusiness('');
    setSelectedPhone('');
  }, [activeTab]);

  useEffect(() => {
    const tabFromUrl = new URLSearchParams(location.search).get('tab') === 'Supplier' ? 'Supplier' : 'Vendor';
    setActiveTab(tabFromUrl);
    setPage(1); // Reset page on tab change
  }, [location.search]);

  const handleTabChange = (tab) => {
    navigate(`/admin/vendors/approvals?tab=${tab}`);
  };

  const handleAction = async (id, status, role) => {
    setIsProcessing(id);
    try {
      if (status === 'approved') {
        role === 'Supplier' ? await adminApi.approveSupplier(id) : await adminApi.approveVendor(id);
      } else {
        role === 'Supplier' ? await adminApi.rejectSupplier(id) : await adminApi.rejectVendor(id);
      }
      
      // Refresh options and list in background
      fetchUnfiltered();
      const filters = {};
      if (selectedVendor) filters.vendorName = selectedVendor;
      if (selectedBusiness) filters.businessName = selectedBusiness;
      if (selectedPhone) filters.phone = selectedPhone;
      fetchPending(filters);

      // Adjust page if current page becomes empty
      const remainingItems = filteredData.length - 1;
      const totalPages = Math.ceil(remainingItems / itemsPerPage) || 1;
      if (page > totalPages) setPage(totalPages);
    } catch (err) {
      console.error('Action Error:', err);
      alert('Action failed. Try again.');
    } finally {
      setIsProcessing(null);
    }
  };

  const allTabItems = useMemo(() => {
    return rawUsers
      .filter(u => u.role === activeTab)
      .map(v => ({
        id: v._id,
        role: v.role,
        vendorName: v.displayName || 'Unnamed User',
        shopName: v.role === 'Supplier' ? (v.supplierDetails?.businessName || 'N/A') : (v.shopDetails?.name || 'N/A'),
        address: (v.role === 'Supplier' ? v.supplierDetails?.address : v.shopDetails?.address) || 'No Address Provided',
        date: new Date(v.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        docs: v.documents && v.documents.length > 0 ? v.documents : [],
        phone: v.phone || '',
        status: v.status ? (v.status.charAt(0).toUpperCase() + v.status.slice(1)) : 'Pending'
      }));
  }, [rawUsers, activeTab]);

  const allUnfilteredTabItems = useMemo(() => {
    return unfilteredUsers
      .filter(u => u.role === activeTab)
      .map(v => ({
        vendorName: v.displayName || 'Unnamed User',
        shopName: v.role === 'Supplier' ? (v.supplierDetails?.businessName || 'N/A') : (v.shopDetails?.name || 'N/A'),
        phone: v.phone || ''
      }));
  }, [unfilteredUsers, activeTab]);

  const uniqueVendors = useMemo(() => {
    const names = allUnfilteredTabItems.map(item => item.vendorName).filter(Boolean);
    return [...new Set(names)].sort();
  }, [allUnfilteredTabItems]);

  const uniqueBusinesses = useMemo(() => {
    const names = allUnfilteredTabItems.map(item => item.shopName).filter(name => name && name !== 'N/A');
    return [...new Set(names)].sort();
  }, [allUnfilteredTabItems]);

  const uniquePhones = useMemo(() => {
    const phones = allUnfilteredTabItems.map(item => item.phone).filter(Boolean);
    return [...new Set(phones)].sort();
  }, [allUnfilteredTabItems]);

  const filteredData = useMemo(() => {
    return allTabItems.filter(item => {
      const originalUser = rawUsers.find(u => u._id === item.id);
      if (!originalUser || !originalUser.createdAt) return !startDate && !endDate;
      
      const userDate = new Date(originalUser.createdAt);
      userDate.setHours(0, 0, 0, 0);

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (userDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (userDate > end) return false;
      }
      return true;
    });
  }, [allTabItems, rawUsers, startDate, endDate]);

  const paginatedData = useMemo(() => {
    return filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filteredData, page]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  const handleExportFile = (format) => {
    console.log(`Exporting ${format} for onboarding approvals (${activeTab})`);
    try {
      const headers = [
        "Name", "Business/Shop Name", "Contact Number", 
        "Location Address", "Application Date", "Verification Status", "Role"
      ];
      
      const rows = filteredData.map(row => [
        row.vendorName || '',
        row.shopName || '',
        row.phone || '',
        row.address || '',
        row.date || '',
        row.status || 'Pending',
        row.role || ''
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
        // Set column width with a minimum of 12 and maximum of 50 characters
        return { wch: Math.min(Math.max(maxLen + 3, 12), 50) };
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${activeTab} Onboarding`);

      if (format === 'excel') {
        XLSX.writeFile(wb, `${activeTab}_Onboarding_Approvals_${new Date().getTime()}.xlsx`);
      } else if (format === 'csv') {
        XLSX.writeFile(wb, `${activeTab}_Onboarding_Approvals_${new Date().getTime()}.csv`, { bookType: 'csv' });
      }
      alert(`${format.toUpperCase()} export downloaded successfully`);
    } catch (err) {
      console.error(`Export ${format} error:`, err);
      alert(`Error exporting to ${format}`);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50/50 pb-20">
      <PageHeader 
        title={activeTab === 'Vendor' ? 'Vendor Registration Request' : 'Supplier Registration Request'} 
        actions={[
          {
            customComponent: (
              <div className="relative">
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="px-3 py-1.5 rounded-sm font-bold text-[9px] uppercase tracking-[0.2em] transition-all flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <FileText size={13} />
                  Export Onboarding Requests
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
        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
            {/* Grid Header Strip with Filters on the Right */}
            <div className="px-8 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between bg-white gap-4">
                {/* Date Filters on the Left */}
                <div className="flex items-center gap-2">
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                    className="bg-slate-50 border border-slate-200/80 rounded-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 hover:bg-slate-100/50 focus:border-slate-300 outline-none cursor-pointer transition-all"
                  />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">to</span>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="bg-slate-50 border border-slate-200/80 rounded-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 hover:bg-slate-100/50 focus:border-slate-300 outline-none cursor-pointer transition-all"
                  />
                  {(startDate || endDate) && (
                    <button
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                        setPage(1);
                      }}
                      className="px-3 py-1.5 bg-rose-50 border border-rose-100 text-rose-500 hover:bg-rose-600 hover:text-white hover:border-rose-600 rounded-sm transition-all text-[9px] font-black uppercase tracking-wider"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Dropdown Filters on the Right */}
                <div className="flex flex-wrap items-center gap-2 justify-end">
                    <select
                        value={selectedVendor}
                        onChange={(e) => setSelectedVendor(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-[10px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none w-36 uppercase tracking-wider cursor-pointer"
                    >
                        <option value="">All Vendors</option>
                        {uniqueVendors.map(name => (
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
                    {(selectedVendor || selectedBusiness || selectedPhone) && (
                        <button
                            onClick={() => {
                                setSelectedVendor('');
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
                            <th className="w-[15%] min-w-[130px] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Vendor Info</th>
                            <th className="w-[15%] min-w-[140px] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Business/Shop</th>
                            <th className="w-[12%] min-w-[100px] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Contact Number</th>
                            <th className="w-[20%] min-w-[160px] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Location</th>
                            <th className="w-[12%] min-w-[100px] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Application Date</th>
                            <th className="w-[10%] min-w-[90px] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">Verification</th>
                            <th className="w-[16%] min-w-[200px] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="py-20 text-center">
                                    <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synchronizing Application Data...</p>
                                </td>
                            </tr>
                        ) : filteredData.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-32 text-center">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-4">
                                        <ShieldCheck size={32} />
                                    </div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Queue Clear</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">No pending {activeTab} requests at this time.</p>
                                </td>
                            </tr>
                        ) : paginatedData.map((req) => (
                            <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-5">
                                    <span className="text-sm font-black text-slate-900 tracking-tight whitespace-nowrap">{req.vendorName}</span>
                                </td>
                                <td className="px-6 py-5 whitespace-normal break-words">
                                    <span className="text-xs font-black text-slate-700 tracking-tight">{req.shopName}</span>
                                </td>
                                <td className="px-6 py-5">
                                    <span className="text-xs font-bold text-slate-600 tabular-nums whitespace-nowrap">{req.phone || 'No Phone'}</span>
                                </td>
                                <td className="px-6 py-5 whitespace-normal break-words">
                                    <div className="flex items-start gap-1.5 text-xs text-slate-600 font-bold">
                                        <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" />
                                        <span>{req.address}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                        <Calendar size={14} className="text-slate-300" />
                                        <span className="text-[11px] font-bold text-slate-600 tabular-nums">{req.date}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap ${
                                        req.status.toLowerCase() === 'approved'
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            : req.status.toLowerCase() === 'rejected'
                                                ? 'bg-rose-50 text-rose-600 border-rose-100'
                                                : 'bg-amber-50 text-amber-600 border-amber-100'
                                    }`}>
                                        {req.status.toLowerCase() === 'approved' ? <CheckCircle2 size={10} /> : (req.status.toLowerCase() === 'rejected' ? <XCircle size={10} /> : <Clock size={10} />)}
                                        {req.status}
                                    </span>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                                        {activeTab === 'Vendor' ? (
                                            <button 
                                                onClick={() => navigate(`/admin/vendors/requests/${req.id}`)}
                                                className="h-10 px-4 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary transition-all shadow-lg active:scale-95 whitespace-nowrap cursor-pointer"
                                            >
                                                <Eye size={14} />
                                                Review Application
                                            </button>
                                        ) : (
                                            <>
                                                {/* Document Button for Suppliers */}
                                                <div className="relative">
                                                    <button 
                                                        onClick={() => setShowDocSelector(showDocSelector === req.id ? null : req.id)}
                                                        className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all border border-slate-100 shadow-sm cursor-pointer"
                                                        title="View Documents"
                                                    >
                                                        <FileText size={18} />
                                                    </button>
                                                    
                                                    <AnimatePresence>
                                                        {showDocSelector === req.id && (
                                                            <motion.div 
                                                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                                className="absolute bottom-full right-0 mb-4 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 overflow-hidden"
                                                            >
                                                                 <div className="px-3 py-2 border-b border-slate-50 mb-2">
                                                                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Compliance Dossier</p>
                                                                 </div>
                                                                 {req.docs.length > 0 ? req.docs.map((doc, idx) => (
                                                                     <button 
                                                                         key={idx}
                                                                         onClick={() => {
                                                                             setSelectedDoc(doc);
                                                                             setShowDocSelector(null);
                                                                         }}
                                                                         className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all group/doc cursor-pointer"
                                                                     >
                                                                         <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight group-hover/doc:text-slate-900">{doc.type || 'Document'}</span>
                                                                         <ExternalLink size={12} className="text-slate-300 group-hover/doc:text-primary" />
                                                                     </button>
                                                                 )) : <p className="p-4 text-[9px] text-slate-300 italic text-center">No documents found</p>}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
 
                                                 <button 
                                                     onClick={() => handleAction(req.id, 'rejected', req.role)}
                                                     disabled={isProcessing === req.id}
                                                     className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all border border-rose-100 shadow-sm cursor-pointer"
                                                     title="Reject Application"
                                                 >
                                                     <X size={18} />
                                                 </button>
                                                 <button 
                                                     onClick={() => handleAction(req.id, 'approved', req.role)}
                                                     disabled={isProcessing === req.id}
                                                     className="h-10 px-4 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg active:scale-95 whitespace-nowrap cursor-pointer"
                                                 >
                                                     {isProcessing === req.id ? <RotateCw size={14} className="animate-spin" /> : <Check size={14} />}
                                                     {isProcessing === req.id ? 'Wait...' : 'Approve'}
                                                 </button>
                                             </>
                                         )}
                                     </div>
                                 </td>
                             </tr>
                         ))}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination Controls */}
            {filteredData.length > 0 && (
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

        {/* Document Viewer Modal Overlay */}
        <AnimatePresence>
            {selectedDoc && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={() => setSelectedDoc(null)} 
                        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" 
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                        className="bg-white w-full max-w-4xl h-[80vh] relative z-10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
                    >
                        <div className="p-8 bg-slate-900 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                                    <FileCheck size={24} />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-lg font-black uppercase tracking-tighter leading-none">Compliance Verification</h3>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">{selectedDoc.type || 'Legal Document'} · Secure Session</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedDoc(null)} className="p-3 hover:bg-white/10 rounded-full transition-colors">
                                <XCircle size={28} />
                            </button>
                        </div>
                        
                        <div className="flex-1 bg-slate-50 flex items-center justify-center p-6 overflow-y-auto">
                            {selectedDoc.url && selectedDoc.url !== '#' ? (
                                selectedDoc.url.toLowerCase().endsWith('.pdf') ? (
                                    <iframe 
                                        src={selectedDoc.url} 
                                        title="PDF Document" 
                                        className="w-full h-full rounded-2xl border-4 border-white shadow-2xl bg-white"
                                    />
                                ) : (
                                    <img src={selectedDoc.url} alt="Document" className="max-w-full max-h-full object-contain shadow-2xl border-4 border-white rounded-2xl" />
                                )
                            ) : (
                                <div className="text-center p-20 border-4 border-dashed border-slate-200 bg-white rounded-3xl">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-6">
                                        <FileText size={40} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Secure Preview Unavailable</p>
                                    <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-2 italic">Ref: Placeholder Scan System 4.0</p>
                                </div>
                            )}
                        </div>

                        <div className="p-8 border-t border-slate-100 flex justify-between items-center bg-white">
                             <div className="flex items-center gap-2 text-slate-400">
                                <Clock size={12} />
                                <span className="text-[9px] font-bold uppercase tracking-widest">End-to-End Encrypted Access</span>
                             </div>
                             <button onClick={() => setSelectedDoc(null)} className="px-10 py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary rounded-2xl transition-all shadow-xl shadow-slate-900/10">Terminate Session</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
}
