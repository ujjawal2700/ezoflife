import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { BASE_URL } from '../../../lib/api';

const AdminSupplierRequestDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    try {
        const response = await fetch(`${BASE_URL}/supplier/requests/${id}`);
        const data = await response.json();
        setRequest(data);
    } catch (error) {
        console.error('Fetch Request Detail Error:', error);
    } finally {
        setLoading(false);
    }
  };

  const handleInitialApprove = async () => {
    try {
        const response = await fetch(`${BASE_URL}/supplier/requests/${id}/approve-initial`, {
            method: 'PATCH'
        });
        if (response.ok) {
            toast.success('Initial Documents Approved! Supplier can now select products.');
            fetchRequest();
        } else {
            toast.error('Operation failed');
        }
    } catch (error) {
        toast.error('Approval failed');
    }
  };

  const handleFinalApprove = async () => {
    try {
        const response = await fetch(`${BASE_URL}/supplier/requests/${id}/approve-final`, {
            method: 'PATCH'
        });
        if (response.ok) {
            toast.success('Supplier officially onboarded!');
            navigate('/admin/supplier-requests');
        } else {
            const err = await response.json();
            toast.error(err.message || 'Final approval failed');
        }
    } catch (error) {
        toast.error('Approval failed');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason) {
        toast.error('Please provide a reason');
        return;
    }
    try {
        const response = await fetch(`${BASE_URL}/supplier/requests/${id}/reject`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: rejectionReason })
        });
        if (response.ok) {
            toast.success('Application rejected');
            navigate('/admin/supplier-requests');
        }
    } catch (error) {
        toast.error('Rejection failed');
    }
  };

  if (loading) return <div className="p-20 text-center font-black uppercase tracking-widest text-slate-300">Loading details...</div>;
  if (!request) return <div className="p-20 text-center font-black uppercase tracking-widest text-rose-500">Request not found</div>;

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-6">
            <button onClick={() => navigate(-1)} className="w-14 h-14 rounded-3xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-all hover:scale-105 active:scale-95">
                <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
                <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Supplier <span className="text-primary">Verification</span></h1>
                <div className="flex items-center gap-3 mt-1">
                    <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg">{request.onboardingStage?.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{request.registeredBusinessName}</span>
                </div>
            </div>
        </div>

        <div className="flex gap-3">
            {request.onboardingStage === 'Initial_Approval_Pending' && (
                <button onClick={handleInitialApprove} className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all">Approve Documents</button>
            )}
            {request.onboardingStage === 'Final_Approval_Pending' && (
                <button onClick={handleFinalApprove} className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all">Final Onboarding</button>
            )}
            {request.status !== 'Rejected' && request.status !== 'Approved' && (
                <button onClick={() => setShowRejectModal(true)} className="px-8 py-4 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-500/20 hover:scale-105 transition-all">Reject</button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left: Info Blocks */}
        <div className="lg:col-span-2 space-y-10">
            {/* Business Card */}
            <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-300 mb-8 flex items-center gap-3">
                    <span className="material-symbols-outlined text-sm">factory</span>
                    Entity Identity
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Registered Name</p>
                        <p className="font-bold text-slate-900">{request.registeredBusinessName}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Type</p>
                        <p className="font-bold text-slate-900">{request.entityType}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">GST Verified</p>
                        <p className={`font-black uppercase text-[10px] ${request.isGstVerified ? 'text-emerald-500' : 'text-rose-500'}`}>{request.isGstVerified ? 'YES' : 'NO'}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Person</p>
                        <p className="font-bold text-slate-900">{request.contactPersonName}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Designation</p>
                        <p className="font-bold text-slate-900">{request.designation}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">PAN Number</p>
                        <p className="font-bold text-slate-900 uppercase">{request.panNumber}</p>
                    </div>
                </div>
            </div>

            {/* Warehouse & Logistics */}
            <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-300 mb-8 flex items-center gap-3">
                    <span className="material-symbols-outlined text-sm">local_shipping</span>
                    Logistics & Infrastructure
                </h3>
                <div className="space-y-8">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Warehouse Address</p>
                        <p className="font-bold text-slate-900">{request.warehouseAddress}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Vehicles</p>
                            <div className="flex flex-wrap gap-2">
                                {request.vehicles?.map(v => <span key={v} className="px-2 py-1 bg-white border border-slate-200 rounded text-[8px] font-black text-slate-600 uppercase">{v}</span>)}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Service Areas</p>
                            <div className="flex flex-wrap gap-2">
                                {request.serviceableAreas?.map(a => <span key={a} className="px-2 py-1 bg-white border border-slate-200 rounded text-[8px] font-black text-slate-600 uppercase">{a}</span>)}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Frequency</p>
                            <div className="flex flex-wrap gap-2">
                                {request.deliveryFrequency?.map(f => <span key={f} className="px-2 py-1 bg-white border border-slate-200 rounded text-[8px] font-black text-slate-600 uppercase">{f}</span>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Selected Products (If Phase >= Final_Approval_Pending) */}
            {(request.onboardingStage === 'Final_Approval_Pending' || request.onboardingStage === 'Onboarded') && (
                <div className="bg-primary/5 rounded-[3rem] p-10 border border-primary/20 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary mb-8 flex items-center gap-3">
                        <span className="material-symbols-outlined text-sm">inventory_2</span>
                        Supply Catalog Selection
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {request.selectedProducts?.map((p, i) => (
                            <div key={i} className="p-5 bg-white rounded-2xl border border-primary/10 flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-black text-slate-900">{p.productName}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{p.category}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-primary uppercase">{p.capacityPerMonth}</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">Monthly Capacity</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Right: Documents & Financials */}
        <div className="space-y-10">
            <div className="bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-8 flex items-center gap-3">
                    <span className="material-symbols-outlined text-sm">account_balance</span>
                    Financials & Compliance
                </h3>
                <div className="space-y-6">
                    <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-[9px] font-black text-white/40 uppercase mb-2">Settlement Account</p>
                        <p className="font-black text-sm">{request.accountNumber?.replace(/./g, '*')}</p>
                        <p className="text-[10px] font-bold text-primary uppercase mt-1">{request.bankName} • {request.ifscCode}</p>
                    </div>
                    <div className="space-y-3">
                        {[
                            { label: 'GST Form', url: request.gstDoc },
                            { label: 'PAN Copy', url: request.panDoc },
                            { label: 'Cancelled Cheque', url: request.cancelledChequeDoc },
                            { label: 'Price List (PDF)', url: request.priceListDoc },
                            { label: 'Auth Letter', url: request.manufacturerAuthDoc },
                        ].map((doc, i) => doc.url && (
                            <a key={i} href={doc.url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                                <span className="text-[9px] font-black uppercase tracking-widest">{doc.label}</span>
                                <span className="material-symbols-outlined text-primary text-sm">visibility</span>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowRejectModal(false)} />
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black tracking-tighter uppercase mb-6">Reason for Rejection</h3>
            <textarea 
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why the application is being rejected..."
              className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-sm outline-none focus:bg-white transition-all h-32 mb-6"
            />
            <div className="flex gap-4">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
              <button onClick={handleReject} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-500/20">Confirm Reject</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminSupplierRequestDetailPage;
