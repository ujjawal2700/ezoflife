import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, Building2, ShieldCheck, CheckCircle2, XCircle, 
  AlertTriangle, FileText, Truck, ExternalLink, Clock, 
  CreditCard, MapPin, RotateCcw, Copy, Check, Eye, 
  Layers, Calendar, User, Phone, Mail, FileCheck, X, 
  ChevronRight, Store, Tag, ChevronDown, CheckSquare, Square
} from 'lucide-react';
import { BASE_URL } from '../../../lib/api';

const REVISION_FLAGS = [
  { id: 'registeredBusinessName', label: 'Business Name' },
  { id: 'contactPersonName', label: 'Contact Person Name' },
  { id: 'designation', label: 'Designation' },
  { id: 'entityType', label: 'Entity Type' },
  { id: 'supplyCategories', label: 'Supply Categories' },
  { id: 'panNumber', label: 'PAN Number' },
  { id: 'panDoc', label: 'PAN Document' },
  { id: 'gstNumber', label: 'GST Number' },
  { id: 'gstDoc', label: 'GST Document' },
  { id: 'msmeDoc', label: 'MSME Document' },
  { id: 'manufacturerAuthDoc', label: 'Auth Letter' },
  { id: 'warehouseAddress', label: 'Warehouse Address' },
  { id: 'serviceableAreas', label: 'Serviceable Areas' },
  { id: 'vehicles', label: 'Vehicle Infrastructure' },
  { id: 'deliveryFrequency', label: 'Delivery Frequency' },
  { id: 'warehousePhotos', label: 'Warehouse Photos' },
  { id: 'dispatchPhoto', label: 'Dispatch Photo' },
  { id: 'ownerAadhaar', label: 'Owner Aadhaar' },
  { id: 'bankName', label: 'Account Holder Name' },
  { id: 'accountNumber', label: 'Account Number' },
  { id: 'ifscCode', label: 'IFSC Code' },
  { id: 'cancelledChequeDoc', label: 'Cancelled Cheque' },
  { id: 'priceListDoc', label: 'Product Catalog / Price List' }
];

const AdminSupplierRequestDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [rejectionForm, setRejectionForm] = useState({
    status: 'Revision_Required',
    reason: '',
    rejectionFlags: []
  });

  const toggleFlag = (flagId) => {
    setRejectionForm(prev => {
      const flags = prev.rejectionFlags.includes(flagId)
        ? prev.rejectionFlags.filter(f => f !== flagId)
        : [...prev.rejectionFlags, flagId];
      return { ...prev, rejectionFlags: flags };
    });
  };

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const getAdminToken = () => localStorage.getItem('adminToken') || localStorage.getItem('token') || localStorage.getItem('user_auth_token') || '';

  const fetchRequest = async () => {
    try {
      const response = await fetch(`${BASE_URL}/supplier/requests/${id}`, {
        headers: { 'Authorization': `Bearer ${getAdminToken()}` }
      });
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
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${getAdminToken()}` }
      });
      if (response.ok) {
        toast.success('Initial Documents Approved! Supplier can now select products.');
        fetchRequest();
      } else {
        const err = await response.json();
        toast.error(err.message || 'Operation failed');
      }
    } catch (error) {
      toast.error('Approval failed');
    }
  };

  const handleFinalApprove = async () => {
    try {
      const response = await fetch(`${BASE_URL}/supplier/requests/${id}/approve-final`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${getAdminToken()}` }
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
    if (!rejectionForm.reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/supplier/requests/${id}/reject`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAdminToken()}`
        },
        body: JSON.stringify(rejectionForm)
      });
      if (response.ok) {
        toast.success(rejectionForm.status === 'Revision_Required' ? 'Clarification request sent to supplier' : 'Supplier application rejected');
        navigate('/admin/supplier-requests');
      } else {
        const err = await response.json();
        toast.error(err.message || 'Operation failed');
      }
    } catch (error) {
      toast.error('Rejection failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center animate-spin">
          <RotateCcw size={22} className="text-indigo-600" />
        </div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Verification Dossier...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
          <AlertTriangle size={28} />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Request Not Found</h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">This supplier verification application may have been archived or deleted.</p>
        </div>
        <button 
          onClick={() => navigate('/admin/supplier-requests')}
          className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all cursor-pointer"
        >
          Return to Supplier Queue
        </button>
      </div>
    );
  }

  const stageFormatted = request.onboardingStage?.replace(/_/g, ' ') || 'Pending';
  const isInitialStage = request.onboardingStage === 'Initial_Approval_Pending';
  const isFinalStage = request.onboardingStage === 'Final_Approval_Pending';
  const isOnboarded = request.onboardingStage === 'Onboarded' || request.status === 'Approved';
  const isRejected = request.status === 'Rejected';

  const documents = [
    { label: 'GST Certificate', url: request.gstDoc, type: 'Tax Registration' },
    { label: 'PAN Card Copy', url: request.panDoc, type: 'Entity Identity' },
    { label: 'Cancelled Cheque', url: request.cancelledChequeDoc, type: 'Bank Mandate' },
    { label: 'Catalog / Price List', url: request.priceListDoc, type: 'Product Pricing' },
    { label: 'Authorization Letter', url: request.manufacturerAuthDoc, type: 'Brand Authorization' },
    { label: 'MSME Certificate', url: request.msmeDoc, type: 'Industry Registration' }
  ].filter(doc => Boolean(doc.url));

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-8 pb-32">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Top Header & Breadcrumb Bar */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <button 
              onClick={() => navigate('/admin/supplier-requests')}
              className="hover:text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
            >
              Supplier Queue
            </button>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="text-slate-600 font-extrabold">Verification Dossier</span>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="text-indigo-600 font-extrabold uppercase tracking-wider truncate max-w-[200px]">
              {request.registeredBusinessName}
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
            <div className="flex items-start gap-4 sm:gap-5">
              <button 
                onClick={() => navigate('/admin/supplier-requests')} 
                className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200/70 border border-slate-200/60 flex items-center justify-center text-slate-700 shadow-xs transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
                title="Back to supplier requests"
              >
                <ArrowLeft size={20} />
              </button>
              
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                    {request.registeredBusinessName}
                  </h1>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    isOnboarded 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : isRejected
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      isOnboarded ? 'bg-emerald-500' : isRejected ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
                    }`} />
                    {stageFormatted}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-slate-500 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Building2 size={14} className="text-slate-400" />
                    Entity: <span className="font-bold text-slate-800">{request.entityType || 'Supplier'}</span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1">
                    <User size={14} className="text-slate-400" />
                    Contact: <span className="font-bold text-slate-800">{request.contactPersonName || '—'}</span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1">
                    <Tag size={14} className="text-slate-400" />
                    ID: <span className="font-mono text-slate-700 font-bold">{request._id}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
              {isInitialStage && (
                <button 
                  onClick={handleInitialApprove} 
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  Approve Documents
                </button>
              )}

              {isFinalStage && (
                <button 
                  onClick={handleFinalApprove} 
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck size={16} />
                  Complete Onboarding
                </button>
              )}

              {!isRejected && !isOnboarded && (
                <button 
                  onClick={() => setShowRejectModal(true)} 
                  className="px-5 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 hover:-translate-y-0.5 cursor-pointer"
                >
                  <AlertTriangle size={15} />
                  Reject / Revision
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Grid Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Columns (2 cols): Core Details & Logistics */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Entity Identity Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase tracking-tight text-slate-900">Entity Identity</h2>
                    <p className="text-xs font-semibold text-slate-400">Legal registration and ownership credentials</p>
                  </div>
                </div>
                
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase ${
                  request.isGstVerified 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {request.isGstVerified ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                  GST {request.isGstVerified ? 'Verified' : 'Unverified'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Registered Entity Name</p>
                  <p className="text-sm font-bold text-slate-900 break-words">{request.registeredBusinessName}</p>
                </div>

                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Organization Type</p>
                  <p className="text-sm font-bold text-slate-900">{request.entityType || 'Supplier'}</p>
                </div>

                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">PAN Card Number</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black font-mono text-slate-900 uppercase">{request.panNumber || '—'}</p>
                    {request.panNumber && (
                      <button 
                        onClick={() => copyToClipboard(request.panNumber, 'PAN Number')}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                        title="Copy PAN"
                      >
                        {copiedField === 'PAN Number' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Primary Contact Person</p>
                  <p className="text-sm font-bold text-slate-900">{request.contactPersonName || '—'}</p>
                </div>

                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Designation</p>
                  <p className="text-sm font-bold text-slate-900">{request.designation || '—'}</p>
                </div>

                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Owner Aadhaar</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold font-mono text-slate-900">{request.ownerAadhaar || '—'}</p>
                    {request.ownerAadhaar && (
                      <button 
                        onClick={() => copyToClipboard(request.ownerAadhaar, 'Aadhaar')}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                        title="Copy Aadhaar"
                      >
                        {copiedField === 'Aadhaar' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Supply Categories */}
              <div className="pt-2">
                <p className="text-xs font-black uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                  <Tag size={14} className="text-indigo-600" />
                  Product & Supply Categories ({request.supplyCategories?.length || 0})
                </p>
                <div className="flex flex-wrap gap-2">
                  {request.supplyCategories && request.supplyCategories.length > 0 ? (
                    request.supplyCategories.map((c, i) => (
                      <span 
                        key={i} 
                        className="px-3.5 py-1.5 bg-indigo-50/70 text-indigo-800 border border-indigo-200/80 rounded-xl text-xs font-bold uppercase tracking-wide"
                      >
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No supply categories provided.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Warehouse & Logistics Infrastructure Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Truck size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-tight text-slate-900">Logistics & Infrastructure</h2>
                  <p className="text-xs font-semibold text-slate-400">Warehouse location, fleet capabilities, and delivery frequency</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                    <MapPin size={14} className="text-rose-500" />
                    Registered Warehouse Address
                  </div>
                  <p className="text-sm font-bold text-slate-800">{request.warehouseAddress || 'Address not specified'}</p>

                  <div className="grid grid-cols-3 gap-3 pt-3 mt-2 border-t border-slate-200/60">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">City</span>
                      <span className="text-xs font-bold text-slate-800 uppercase">{request.city || '—'}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Zone / Area</span>
                      <span className="text-xs font-bold text-slate-800 uppercase">{request.zone || '—'}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Pincode</span>
                      <span className="text-xs font-bold font-mono text-slate-800">{request.pincode || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">Transport Fleet</span>
                    <div className="flex flex-wrap gap-1.5">
                      {request.vehicles?.length ? (
                        request.vehicles.map((v, i) => (
                          <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase">
                            {v}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">None specified</span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">Serviceable Areas</span>
                    <div className="flex flex-wrap gap-1.5">
                      {request.serviceableAreas?.length ? (
                        request.serviceableAreas.map((a, i) => (
                          <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase">
                            {a}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">None specified</span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">Delivery Schedules</span>
                    <div className="flex flex-wrap gap-1.5">
                      {request.deliveryFrequency?.length ? (
                        request.deliveryFrequency.map((f, i) => (
                          <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase">
                            {f}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">Standard</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Products Catalog (Final Onboarding Phase) */}
            {(isFinalStage || isOnboarded) && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100">
                      <Layers size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-black uppercase tracking-tight text-slate-900">Supply Catalog Selection</h2>
                      <p className="text-xs font-semibold text-slate-400">Products committed for platform wholesale distribution</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-violet-700 bg-violet-50 px-3 py-1 rounded-full border border-violet-200">
                    {request.selectedProducts?.length || 0} Products
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {request.selectedProducts?.map((p, i) => (
                    <div key={i} className="p-5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-black text-slate-900">{p.productName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{p.category}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-violet-100/70 text-violet-800 border border-violet-200">
                          {p.capacityPerMonth || '—'} / mo
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/60 text-center">
                        <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Rate</p>
                          <p className="text-xs font-extrabold text-slate-900">
                            {p.wholesaleRate && p.wholesaleRate !== '-' ? `₹${p.wholesaleRate}` : '—'}
                          </p>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Discount</p>
                          <p className="text-xs font-extrabold text-slate-900">
                            {p.bulkDiscount ? `${p.bulkDiscount}%` : '—'}
                          </p>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Min MOV</p>
                          <p className="text-xs font-extrabold text-slate-900">
                            {p.movFreeDelivery && p.movFreeDelivery !== '-' ? `₹${p.movFreeDelivery}` : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column (1 col): Financials & KYC Documents */}
          <div className="space-y-8">
            
            {/* Financials & Settlement Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase tracking-tight text-slate-900">Settlement Bank</h2>
                    <p className="text-xs font-semibold text-slate-400">Escrow and payout configuration</p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  request.isBankVerified 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {request.isBankVerified ? 'Verified' : 'Pending'}
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-md space-y-4">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span className="font-bold tracking-widest uppercase text-[10px]">Business Account</span>
                  <ShieldCheck size={16} className={request.isBankVerified ? "text-emerald-400" : "text-amber-400"} />
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Number</p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-base sm:text-lg font-black tracking-wider text-white">
                      {request.accountNumber || '•••• •••• ••••'}
                    </p>
                    {request.accountNumber && (
                      <button 
                        onClick={() => copyToClipboard(request.accountNumber, 'Account Number')}
                        className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                        title="Copy Account Number"
                      >
                        {copiedField === 'Account Number' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Bank Name</span>
                    <span className="font-bold text-slate-100 uppercase truncate block">{request.bankName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">IFSC Code</span>
                    <span className="font-mono font-bold text-slate-100 uppercase truncate block">{request.ifscCode || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* KYC & Compliance Documents Hub */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase tracking-tight text-slate-900">KYC Documents</h2>
                    <p className="text-xs font-semibold text-slate-400">Uploaded legal verification artifacts</p>
                  </div>
                </div>
                <span className="text-xs font-black text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                  {documents.length} Files
                </span>
              </div>

              <div className="space-y-3">
                {documents.length > 0 ? (
                  documents.map((doc, idx) => (
                    <div 
                      key={idx} 
                      className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between gap-3 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 group-hover:border-indigo-300 group-hover:text-indigo-600 transition-colors">
                          <FileCheck size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{doc.label}</p>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{doc.type}</p>
                        </div>
                      </div>

                      <a 
                        href={doc.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-2xs shrink-0 cursor-pointer"
                      >
                        <span>View</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                    <FileText size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-500">No verification documents attached</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Modern Reject & Revision Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowRejectModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-200"
            >
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight text-white">Action Required</h3>
                    <p className="text-xs font-medium text-slate-400">Request revision or reject supplier onboarding</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowRejectModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-6 sm:p-7 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Action Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'Revision_Required', label: 'Request Revision', desc: 'Allow supplier to edit files', icon: RotateCcw },
                      { id: 'Rejected', label: 'Permanent Reject', desc: 'Disqualify application', icon: XCircle }
                    ].map(opt => {
                      const Icon = opt.icon;
                      const isSelected = rejectionForm.status === opt.id;
                      return (
                        <button 
                          key={opt.id}
                          type="button"
                          onClick={() => setRejectionForm({...rejectionForm, status: opt.id})}
                          className={`p-4 rounded-2xl border-2 transition-all flex flex-col text-left gap-1.5 cursor-pointer ${
                            isSelected 
                              ? opt.id === 'Rejected'
                                ? 'border-rose-500 bg-rose-50/50 text-rose-950'
                                : 'border-indigo-600 bg-indigo-50/50 text-indigo-950' 
                              : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                          }`}
                        >
                          <Icon size={18} className={isSelected ? (opt.id === 'Rejected' ? 'text-rose-600' : 'text-indigo-600') : 'text-slate-400'} />
                          <span className="text-xs font-black uppercase tracking-tight">{opt.label}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{opt.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Reason / Admin Explanation</label>
                  <textarea 
                    value={rejectionForm.reason}
                    onChange={(e) => setRejectionForm({...rejectionForm, reason: e.target.value})}
                    placeholder="E.g., Bank statement is not legible, or business name does not match the GST Certificate..."
                    className="w-full h-24 bg-white border border-slate-200 rounded-2xl p-4 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none shadow-2xs"
                  />
                </div>

                {rejectionForm.status === 'Revision_Required' && (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Flag Fields for Correction</label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 border border-slate-200 rounded-2xl bg-slate-50/50">
                      {REVISION_FLAGS.map(flag => {
                        const isFlagged = rejectionForm.rejectionFlags.includes(flag.id);
                        return (
                          <button 
                            key={flag.id}
                            type="button"
                            onClick={() => toggleFlag(flag.id)}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                              isFlagged 
                                ? 'border-indigo-300 bg-indigo-50 text-indigo-900 font-bold' 
                                : 'border-slate-200/70 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {isFlagged ? (
                              <CheckSquare size={14} className="text-indigo-600 shrink-0" />
                            ) : (
                              <Square size={14} className="text-slate-400 shrink-0" />
                            )}
                            <span className="text-[10px] font-bold uppercase tracking-tight truncate">{flag.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowRejectModal(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleReject}
                    className={`flex-1 py-3 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer ${
                      rejectionForm.status === 'Rejected'
                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                    }`}
                  >
                    Submit Decision
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminSupplierRequestDetailPage;
