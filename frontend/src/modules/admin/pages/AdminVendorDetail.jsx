import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, Store, MapPin, ShieldCheck, FileText, 
    TrendingUp, Star, Package, CreditCard, AlertTriangle,
    Check, X, MessageSquare, Clock, Plus, FilePlus
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminVendorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [vendor, setVendor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // id of current service being processed
  
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [rejectionMessage, setRejectionMessage] = useState('');

  // Document Upload States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docType, setDocType] = useState('Identity Proof');

  const fetchVendor = async () => {
    try {
      setIsLoading(true);
      const data = await adminApi.getVendorById(id);
      setVendor(data);
    } catch (err) {
      toast.error('Failed to load vendor details');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendor();
  }, [id]);

  const handleStatusUpdate = async (serviceId, status, message = '') => {
    try {
      setActionLoading(serviceId);
      await adminApi.updateServiceStatus(id, serviceId, { status, message });
      toast.success(`Service ${status === 'approved' ? 'Approved' : 'Rejected'}!`);
      setShowRejectModal(false);
      setRejectionMessage('');
      fetchVendor(); // Refresh data
    } catch (err) {
      toast.error('Action failed: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (service) => {
    setSelectedService(service);
    setShowRejectModal(true);
  };

  const handleDocumentUpload = async () => {
    if (!selectedFile) return toast.error('Please select a file');
    
    try {
        setUploadLoading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('type', docType);

        await adminApi.uploadVendorDocument(id, formData);
        toast.success('Document uploaded successfully!');
        setShowUploadModal(false);
        setSelectedFile(null);
        fetchVendor(); // Refresh vendor data
    } catch (err) {
        toast.error('Upload failed: ' + err.message);
    } finally {
        setUploadLoading(false);
    }
  };

  const quickStats = useMemo(() => [
    { label: 'Total Volume', value: vendor?.totalOrders || 0, icon: Package, color: 'text-blue-600' },
    { label: 'Avg Rating', value: vendor?.rating || 'N/A', icon: Star, color: 'text-amber-500' },
    { label: 'Shop Status', value: vendor?.status?.toUpperCase() || '...', icon: ShieldCheck, color: 'text-emerald-600' }
  ], [vendor]);

  if (isLoading) {
    return (
        <div className="h-full w-full flex items-center justify-center p-20">
            <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
        </div>
    );
  }

  if (!vendor) return <div className="p-20 text-center">Vendor not found</div>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <h1 className="font-bold text-slate-900 tracking-tight">Vendor Governance <span className="text-slate-400 font-medium ml-1">#{id.slice(-6)}</span></h1>
          
          <div className="ml-auto flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
              vendor.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
              vendor.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 
              'bg-amber-100 text-amber-700'
            }`}>
              {vendor.status}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickStats.map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-xl font-black text-slate-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} bg-slate-50 p-2.5 rounded-xl`}>
                    <stat.icon size={20} />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
              <div className="flex items-center gap-3 text-slate-900">
                <ShieldCheck size={18} className="text-primary" />
                <span className="text-xs font-black uppercase tracking-widest">Service Catalog Moderation</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {vendor.shopDetails?.services?.length || 0} Total Services
              </span>
            </div>
            <div className="p-0">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Service</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Shop Rate</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendor.shopDetails?.services?.map((service, i) => (
                    <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                  <span className="material-symbols-outlined text-[18px]">{service.icon}</span>
                              </div>
                              <span className="text-sm font-bold text-slate-800 tracking-tight">{service.name}</span>
                          </div>
                      </td>
                      <td className="px-6 py-5">
                          <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-900">₹{service.vendorRate}</span>
                              <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[8px] font-bold text-slate-400 uppercase">N: {service.normalTime || '-'}</span>
                                  <span className="text-[8px] font-bold text-amber-500 uppercase">E: {service.expressTime || '-'}</span>
                              </div>
                          </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] flex items-center justify-center gap-1.5 mx-auto w-fit ${
                          service.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                          service.status === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
                          'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                          {service.status === 'pending' && <Clock size={10} />}
                          {service.status === 'approved' && <ShieldCheck size={10} />}
                          {service.status === 'rejected' && <AlertTriangle size={10} />}
                          {service.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                          {service.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-2">
                                  <button 
                                    disabled={actionLoading === service.id}
                                    onClick={() => handleStatusUpdate(service.id, 'approved')}
                                    className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100"
                                  >
                                      {actionLoading === service.id ? <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
                                  </button>
                                  <button 
                                    disabled={actionLoading === service.id}
                                    onClick={() => openRejectModal(service)}
                                    className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100"
                                  >
                                      <X size={16} />
                                  </button>
                              </div>
                          ) : (
                              <button 
                                onClick={() => openRejectModal(service)}
                                className="text-[10px] font-bold text-slate-400 hover:text-slate-900 underline underline-offset-4 decoration-slate-200"
                              >
                                  Modify Status
                              </button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-6 space-y-6">
             <div className="flex items-center gap-3 text-slate-400">
                <div className="bg-slate-50 p-2 rounded-xl">
                    <Store size={16} />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Partner Node Details</span>
             </div>
             
             <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <MapPin size={20} className="text-slate-400 mt-1" />
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Address</p>
                        <p className="text-xs font-bold text-slate-800 leading-relaxed">{vendor.shopDetails?.address || vendor.address || 'N/A'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Entity Name</p>
                        <p className="text-xs font-black text-slate-900 tracking-tight">{vendor.shopDetails?.name || 'Self Managed'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Registration</p>
                        <p className="text-xs font-black text-slate-900 tracking-tight">{vendor.shopDetails?.gst || 'Individual'}</p>
                    </div>
                </div>
             </div>

             <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compliance Status</span>
                        <button 
                            onClick={() => setShowUploadModal(true)}
                            className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center hover:scale-110 transition-transform"
                            title="Add Document"
                        >
                            <Plus size={12} />
                        </button>
                    </div>
                    <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-tighter border border-emerald-100">Verified Partner</span>
                </div>
                <div className="space-y-2">
                    {vendor.documents?.length > 0 ? (
                        vendor.documents.map((doc, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => window.open(doc.url, '_blank')}
                                className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-primary/20 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <FileText size={14} className="text-slate-300 group-hover:text-primary transition-colors" />
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{doc.type || 'Identity Asset'}</span>
                                </div>
                                <span className="material-symbols-outlined text-slate-300 text-lg">open_in_new</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center py-4 opacity-50 italic">No papers filed</p>
                    )}
                </div>
             </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group shadow-xl">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/10 transition-all" />
             <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2 text-white/40 mb-2">
                    <CreditCard size={14} />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Financial Node</span>
                </div>
                <h3 className="text-2xl font-black tracking-tighter">Settlement Ledger</h3>
                <p className="text-white/60 text-[11px] font-medium leading-relaxed">View all historical transactions and pending payouts for this network node.</p>
                <div className="pt-4">
                    <button className="w-full py-4 bg-white text-slate-900 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-lg active:scale-95">
                        Access Financial Ledger
                    </button>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Upload Document Modal */}
      <AnimatePresence>
          {showUploadModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                 <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative"
                 >
                    <button onClick={() => setShowUploadModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900">
                        <X size={24} />
                    </button>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center text-white">
                            <FilePlus size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tighter text-slate-900">Add Document</h2>
                            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">Expansion of Compliance Dossier</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Document Type</label>
                            <select 
                                value={docType}
                                onChange={(e) => setDocType(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:ring-2 ring-primary/10 text-sm font-bold text-slate-900"
                            >
                                <option>Aadhar Card</option>
                                <option>PAN Card</option>
                                <option>GST Certificate</option>
                                <option>Trade License</option>
                                <option>Identity Proof</option>
                                <option>Other</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Select File (PDF, JPG, PNG)</label>
                            <div className="relative group">
                                <input 
                                    type="file" 
                                    onChange={(e) => setSelectedFile(e.target.files[0])}
                                    className="hidden" 
                                    id="admin-doc-upload"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                />
                                <label 
                                    htmlFor="admin-doc-upload"
                                    className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer group-hover:border-primary/30 transition-all border-spacing-4"
                                >
                                    {selectedFile ? (
                                        <>
                                            <Check size={20} className="text-emerald-500" />
                                            <span className="text-xs font-bold text-emerald-600 truncate max-w-[200px]">{selectedFile.name}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={24} className="text-slate-300" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Click to browse file</span>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        <button 
                            disabled={!selectedFile || uploadLoading}
                            onClick={handleDocumentUpload}
                            className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {uploadLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ShieldCheck size={16} />}
                            {uploadLoading ? 'Verifying & Uploading...' : 'Secure Upload to Profile'}
                        </button>
                    </div>
                 </motion.div>
              </div>
          )}
      </AnimatePresence>

      {/* Rejection Modal */}
      <AnimatePresence>
          {showRejectModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative"
                  >
                      <button 
                        onClick={() => setShowRejectModal(false)}
                        className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                          <X size={24} />
                      </button>

                      <div className="flex items-center gap-4 mb-8">
                          <div className="w-14 h-14 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-600 border border-rose-100">
                              <MessageSquare size={24} />
                          </div>
                          <div>
                              <h2 className="text-2xl font-black tracking-tighter text-slate-900">Service Feedback</h2>
                              <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">Submitting for: {selectedService?.name}</p>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Rejection Reason / Guidance</label>
                          <textarea 
                            value={rejectionMessage}
                            onChange={(e) => setRejectionMessage(e.target.value)}
                            placeholder="Please provide guidance on why this service was rejected (e.g., 'Rate too high, limit to ₹45')..."
                            className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-medium text-slate-800 focus:ring-2 ring-primary/10 focus:border-primary/20 transition-all no-scrollbar resize-none"
                          />
                      </div>

                      <div className="mt-8 flex gap-3">
                          <button 
                            onClick={() => setShowRejectModal(false)}
                            className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all"
                          >
                              Cancel
                          </button>
                          <button 
                            disabled={!rejectionMessage.trim() || actionLoading}
                            onClick={() => handleStatusUpdate(selectedService.id, 'rejected', rejectionMessage)}
                            className="flex-[2] py-4 bg-rose-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                          >
                              {actionLoading ? 'Sending...' : 'Confirm Rejection'}
                          </button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
}
