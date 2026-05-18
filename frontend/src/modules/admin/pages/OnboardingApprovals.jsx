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
  ExternalLink
} from 'lucide-react';
import { adminApi } from '../../../lib/api';
import PageHeader from '../components/common/PageHeader';

export default function OnboardingApprovals() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') === 'Supplier' ? 'Supplier' : 'Vendor';

  const [rawUsers, setRawUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isProcessing, setIsProcessing] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showDocSelector, setShowDocSelector] = useState(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchPending();
  }, []);

  useEffect(() => {
    const tabFromUrl = new URLSearchParams(location.search).get('tab') === 'Supplier' ? 'Supplier' : 'Vendor';
    setActiveTab(tabFromUrl);
    setPage(1); // Reset page on tab change
  }, [location.search]);

  const handleTabChange = (tab) => {
    navigate(`/admin/vendors/approvals?tab=${tab}`);
  };

  const fetchPending = async () => {
    setLoading(true);
    try {
      const pending = await adminApi.getPendingApprovals();
      setRawUsers(pending);
    } catch (err) {
      console.error('Fetch Pending Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, status, role) => {
    setIsProcessing(id);
    try {
      if (status === 'approved') {
        role === 'Supplier' ? await adminApi.approveSupplier(id) : await adminApi.approveVendor(id);
      } else {
        role === 'Supplier' ? await adminApi.rejectSupplier(id) : await adminApi.rejectVendor(id);
      }
      setRawUsers(prev => prev.filter(req => req._id !== id));
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

  const filteredData = useMemo(() => {
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
        phone: v.phone,
        status: 'Pending'
      }));
  }, [rawUsers, activeTab]);

  const paginatedData = useMemo(() => {
    return filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filteredData, page]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50/50 pb-20">
      <PageHeader 
        title="Network Onboarding" 
        actions={[{ label: 'Refresh Queue', icon: RotateCw, variant: 'secondary', onClick: fetchPending }]}
      />

      {/* Status Matrix */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto w-full px-8 py-2 flex items-center justify-between">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Active Verification Engine</span>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex gap-4">
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Pending: <span className="text-slate-900">{rawUsers.length}</span></span>
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Priority: <span className="text-amber-500">High</span></span>
              </div>
           </div>
           <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Phase 3: Secure Onboarding</p>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        
        {/* Header Information */}
        <div className="flex flex-col">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                Verification Queue
                <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black not-italic tracking-widest rounded-sm">
                    {filteredData.length} REQUESTS
                </span>
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Audit and verify {activeTab.toLowerCase()} documentation</p>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor Info</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Business/Shop</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Application Date</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Verification</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr>
                            <td colSpan={5} className="py-20 text-center">
                                <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synchronizing Application Data...</p>
                            </td>
                        </tr>
                    ) : filteredData.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="py-32 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-4">
                                    <ShieldCheck size={32} />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Queue Clear</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">No pending {activeTab} requests at this time.</p>
                            </td>
                        </tr>
                    ) : paginatedData.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                        <UserPlus size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-slate-900 tracking-tight">{req.vendorName}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{req.phone}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-8 py-6">
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-slate-700 tracking-tight">{req.shopName}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                        <MapPin size={10} className="text-slate-300" /> {req.address.split(',')[0]}
                                    </span>
                                </div>
                            </td>
                            <td className="px-8 py-6">
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-slate-300" />
                                    <span className="text-[11px] font-bold text-slate-600 tabular-nums">{req.date}</span>
                                </div>
                            </td>
                            <td className="px-8 py-6 text-center">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-100">
                                    <Clock size={10} />
                                    {req.status}
                                </span>
                            </td>
                            <td className="px-8 py-6">
                                <div className="flex items-center justify-end gap-3">
                                    {activeTab === 'Vendor' ? (
                                        <button 
                                            onClick={() => navigate(`/admin/vendors/requests/${req.id}`)}
                                            className="h-10 px-6 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary transition-all shadow-lg active:scale-95"
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
                                                    className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all border border-slate-100 shadow-sm"
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
                                                                    className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all group/doc"
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
                                                className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all border border-rose-100 shadow-sm"
                                                title="Reject Application"
                                            >
                                                <X size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleAction(req.id, 'approved', req.role)}
                                                disabled={isProcessing === req.id}
                                                className="h-10 px-6 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
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
