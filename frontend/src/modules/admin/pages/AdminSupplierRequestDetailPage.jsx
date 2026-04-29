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

  const handleApprove = async () => {
    try {
        const response = await fetch(`${BASE_URL}/supplier/requests/${id}/approve`, {
            method: 'PATCH'
        });
        if (response.ok) {
            toast.success('Supplier approved successfully');
            navigate('/admin/supplier-requests');
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
    <div className="p-8 pb-32 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-all"><span className="material-symbols-outlined">arrow_back</span></button>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Review <span className="text-primary">Application</span></h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">{request.businessName} • {request.status}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Info Sections */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section 1: Personal */}
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 mb-8 pb-4 border-b border-slate-50 flex items-center gap-3">
              <span className="material-symbols-outlined text-sm">person</span>
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Name</p>
                <p className="font-bold text-slate-900">{request.fullName}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                <p className="font-bold text-slate-900">{request.phone}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                <p className="font-bold text-slate-900">{request.email}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Address</p>
                <p className="font-bold text-slate-900">{request.address}</p>
              </div>
            </div>
          </div>

          {/* Section 2: Bank */}
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 mb-8 pb-4 border-b border-slate-50 flex items-center gap-3">
              <span className="material-symbols-outlined text-sm">account_balance</span>
              Banking Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Holder Name</p>
                <p className="font-bold text-slate-900">{request.bankAccountName}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bank Name</p>
                <p className="font-bold text-slate-900">{request.bankName}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Account Number</p>
                <p className="font-bold text-slate-900">{request.bankAccountNumber}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">IFSC Code</p>
                <p className="font-bold text-slate-900 uppercase">{request.ifscCode}</p>
              </div>
            </div>
          </div>

          {/* Section 3: Business */}
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 mb-8 pb-4 border-b border-slate-50 flex items-center gap-3">
              <span className="material-symbols-outlined text-sm">factory</span>
              Business Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Business Name</p>
                <p className="font-bold text-slate-900">{request.businessName}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Type</p>
                <p className="font-bold text-slate-900">{request.businessType}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">GST Number</p>
                <p className="font-bold text-slate-900 uppercase">{request.gstNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Business Address</p>
                <p className="font-bold text-slate-900">{request.businessAddress}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Documents & Actions */}
        <div className="space-y-8">
          <div className="bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-2xl">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-8 flex items-center gap-3">
              <span className="material-symbols-outlined text-sm">description</span>
              Uploaded Documents
            </h3>
            <div className="space-y-4">
              {[
                { label: 'GST Certificate', url: request.gstDoc },
                { label: 'Udyog Aadhaar', url: request.udyogAadharDoc },
                { label: 'Aadhaar Card', url: request.aadharDoc },
                { label: 'Address Proof', url: request.addressProofDoc },
              ].map((doc, i) => doc.url && (
                <a key={i} href={doc.url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary">visibility</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">{doc.label}</span>
                  </div>
                  <span className="material-symbols-outlined text-white/20 group-hover:text-white transition-colors">open_in_new</span>
                </a>
              ))}
            </div>
          </div>

          {request.status === 'Pending' && (
            <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">Review Decisions</h3>
              <button 
                onClick={handleApprove}
                className="w-full py-6 bg-emerald-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                Approve Application <span className="material-symbols-outlined text-lg">check_circle</span>
              </button>
              <button 
                onClick={() => setShowRejectModal(true)}
                className="w-full py-6 bg-rose-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-rose-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                Reject Application <span className="material-symbols-outlined text-lg">cancel</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reject Reason Modal */}
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
