import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, ShieldCheck, MapPin, FileText, 
    Image as ImageIcon, Video, CreditCard, Check, X,
    Award, Factory, Info, ExternalLink, PlayCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi, geofenceApi, BASE_URL } from '../../../lib/api';
import { GoogleMap, useJsApiLoader, Polygon, Marker } from '@react-google-maps/api';

const mapLibraries = ['drawing', 'places', 'geometry'];

const getYouTubeEmbedUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) 
    ? `https://www.youtube.com/embed/${match[2]}`
    : null;
};

const AdminVendorRequestDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState('Standard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionForm, setRejectionForm] = useState({
      status: 'revision_required',
      reason: '',
      rejectionFlags: []
  });
  const [matchedArea, setMatchedArea] = useState(null);
  const [checkingArea, setCheckingArea] = useState(false);
  const [areas, setAreas] = useState([]);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    version: '3.64',
    libraries: mapLibraries
  });

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await fetch(`${BASE_URL}/geofence/areas`);
        const data = await res.json();
        setAreas(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load service areas', err);
      }
    };
    fetchAreas();
  }, []);

  useEffect(() => {
    if (vendor && vendor.location && vendor.location.lat && vendor.location.lng) {
      const checkGeo = async () => {
        setCheckingArea(true);
        try {
          const res = await geofenceApi.checkAvailability(vendor.location.lat, vendor.location.lng);
          if (res.available) {
            setMatchedArea(res.name);
          } else {
            setMatchedArea('OUTSIDE_SERVICE_AREA');
          }
        } catch (err) {
          console.error('Error checking geofence availability:', err);
          setMatchedArea('ERROR_CHECKING');
        } finally {
          setCheckingArea(false);
        }
      };
      checkGeo();
    }
  }, [vendor]);

  const REVISION_FLAGS = [
    { id: 'ownerName', label: 'Owner Name' },
    { id: 'businessType', label: 'Entity Type' },
    { id: 'facilityName', label: 'Facility Name' },
    { id: 'panNumber', label: 'PAN Number' },
    { id: 'panDoc', label: 'PAN Document' },
    { id: 'gstNumber', label: 'GST Number' },
    { id: 'gstDoc', label: 'GST Document' },
    { id: 'aadharNumber', label: 'Aadhaar Number' },
    { id: 'aadharDoc', label: 'Aadhaar Document' },
    { id: 'msmeDoc', label: 'MSME Document' },
    { id: 'franchiseDoc', label: 'Franchise Document' },
    { id: 'location', label: 'GPS Location' },
    { id: 'businessAddress', label: 'Address' },
    { id: 'exteriorPhoto', label: 'Exterior Photo' },
    { id: 'interiorPhotos', label: 'Interior Photos' },
    { id: 'bankDetails', label: 'Bank Details' },
    { id: 'chequeDoc', label: 'Cheque Document' }
  ];

  const toggleFlag = (flagId) => {
    setRejectionForm(prev => {
        const flags = prev.rejectionFlags.includes(flagId)
            ? prev.rejectionFlags.filter(f => f !== flagId)
            : [...prev.rejectionFlags, flagId];
        return { ...prev, rejectionFlags: flags };
    });
  };

  useEffect(() => {
    fetchVendor();
  }, [id]);

  const fetchVendor = async () => {
    try {
        const data = await adminApi.getVendorRequestById(id);
        setVendor(data);
        if (data.tier) setTier(data.tier);
    } catch (error) {
        console.error('Fetch Vendor Error:', error);
        toast.error('Failed to load vendor details');
    } finally {
        setLoading(false);
    }
  };

  const handleInitialApprove = async () => {
    try {
        setIsProcessing(true);
        const result = await adminApi.approveInitialVendor(id, tier);
        if (result.vendor) {
            toast.success('Initial Application Approved! Sent to vendor for service selection.');
            navigate('/admin/vendors/approvals?tab=Vendor');
        } else {
            toast.error('Approval failed');
        }
    } catch (error) {
        toast.error('Service unavailable');
    } finally {
        setIsProcessing(false);
    }
  };

  const handleFinalApprove = async () => {
    try {
        setIsProcessing(true);
        const result = await adminApi.approveFinalVendor(id);
        if (result.vendor) {
            toast.success('Vendor officially onboarded! Account is now LIVE.');
            navigate('/admin/vendors/approvals?tab=Vendor');
        } else {
            toast.error('Final approval failed');
        }
    } catch (error) {
        toast.error('Service unavailable');
    } finally {
        setIsProcessing(false);
    }
  };

  const handleRejectSubmit = async () => {
      if (!rejectionForm.reason.trim()) return toast.error('Please provide a reason');
      try {
          setIsProcessing(true);
          const result = await adminApi.rejectVendor(id, rejectionForm);
          toast.success(rejectionForm.status === 'revision_required' ? 'Clarification request sent to vendor' : 'Vendor application rejected');
          navigate('/admin/vendors/approvals?tab=Vendor');
      } catch (error) {
          toast.error('Failed to process rejection');
      } finally {
          setIsProcessing(false);
          setShowRejectModal(false);
      }
  };

  if (loading) return <div className="p-20 text-center font-black uppercase tracking-widest text-slate-300">Loading Vendor Dossier...</div>;
  if (!vendor) return <div className="p-20 text-center font-black uppercase tracking-widest text-rose-500">Vendor Request not found</div>;

  const currentStage = vendor.onboardingStage || 'INITIAL_REVIEW';

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto min-h-screen bg-slate-50/30">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
        <div className="flex items-center gap-6">
            <button onClick={() => navigate(-1)} className="w-14 h-14 rounded-3xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-all hover:scale-105 active:scale-95">
                <ArrowLeft size={24} />
            </button>
            <div>
                <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Vendor <span className="text-primary">Audit</span></h1>
                <div className="flex items-center gap-3 mt-1">
                    <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg">
                        {currentStage.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{vendor.facilityName || vendor.displayName}</span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm w-full md:w-auto">
            {currentStage === 'INITIAL_REVIEW' && (
                <div className="flex flex-col px-4">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Assign Tier</span>
                    <select 
                        value={tier}
                        onChange={(e) => setTier(e.target.value)}
                        className="bg-transparent font-black text-sm text-slate-900 outline-none uppercase"
                    >
                        <option value="Economy">Economy</option>
                        <option value="Standard">Standard</option>
                        <option value="Gold">Gold</option>
                    </select>
                </div>
            )}
            
            {currentStage === 'INITIAL_REVIEW' && (
                <button 
                    onClick={handleInitialApprove}
                    disabled={isProcessing}
                    className="px-10 py-4 bg-primary text-on-primary rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {isProcessing ? 'Processing...' : 'Initial Approve'}
                    <Check size={16} />
                </button>
            )}

            {currentStage === 'FINAL_REVIEW' && (
                <button 
                    onClick={handleFinalApprove}
                    disabled={isProcessing}
                    className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {isProcessing ? 'Onboarding...' : 'Final Approve & Live'}
                    <ShieldCheck size={16} />
                </button>
            )}

            {currentStage === 'SERVICE_SELECTION' && (
                <div className="px-8 py-4 bg-amber-50 text-amber-600 rounded-2xl font-black text-[10px] uppercase tracking-widest">
                    Waiting for Vendor Service Selection
                </div>
            )}

            <button 
                onClick={() => setShowRejectModal(true)}
                className="px-6 py-4 bg-white text-rose-500 border border-rose-100 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-50 transition-all flex items-center gap-2 ml-2"
            >
                Reject / Clarification
                <X size={16} />
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
            {/* Step 1: Profile */}
            <section className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 blur-3xl" />
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-300 mb-10 flex items-center gap-3 relative z-10">
                    <Factory size={16} className="text-blue-500" />
                    Phase 01: Entity Profile
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-10 relative z-10">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Owner Name</p>
                        <p className="font-bold text-slate-900 text-lg tracking-tight uppercase">{vendor.ownerName || vendor.displayName}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Business Type</p>
                        <p className="font-black text-primary text-sm uppercase">{vendor.businessType || 'Proprietorship'}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Facility Name</p>
                        <p className="font-bold text-slate-900 text-sm uppercase">{vendor.facilityName || 'N/A'}</p>
                    </div>
                </div>
            </section>

            {/* Step 2: Verification */}
            <section className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-300 mb-10 flex items-center gap-3">
                    <ShieldCheck size={16} className="text-purple-500" />
                    Phase 02: Business KYV
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">PAN Card</p>
                            <p className="text-sm font-black text-slate-900 uppercase tracking-widest">{vendor.panNumber || 'NOT PROVIDED'}</p>
                        </div>
                        {vendor.panDoc && (
                            <button onClick={() => window.open(vendor.panDoc, '_blank')} className="w-10 h-10 rounded-xl bg-white text-primary flex items-center justify-center shadow-sm border border-slate-100 hover:scale-110 transition-transform">
                                <ExternalLink size={18} />
                            </button>
                        )}
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">GST Number</p>
                            <p className="text-sm font-black text-slate-900 uppercase tracking-widest">{vendor.gstNumber || 'NOT PROVIDED'}</p>
                        </div>
                        {vendor.gstDoc && (
                            <button onClick={() => window.open(vendor.gstDoc, '_blank')} className="w-10 h-10 rounded-xl bg-white text-primary flex items-center justify-center shadow-sm border border-slate-100 hover:scale-110 transition-transform">
                                <ExternalLink size={18} />
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Other Compliance Papers</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { label: 'Aadhaar Card', url: vendor.aadharDoc },
                            { label: 'MSME Certificate', url: vendor.msmeDoc },
                            { label: 'Franchise NOC', url: vendor.franchiseDoc }
                        ].map((doc, idx) => doc.url && (
                            <button 
                                key={idx} 
                                onClick={() => window.open(doc.url, '_blank')}
                                className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl hover:border-primary transition-all group"
                            >
                                <FileText size={18} className="text-slate-300 group-hover:text-primary" />
                                <span className="text-[9px] font-black text-slate-600 uppercase truncate">{doc.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Step 3: Facility Audit */}
            <section className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-300 mb-10 flex items-center gap-3">
                    <MapPin size={16} className="text-emerald-500" />
                    Phase 03: Facility Logistics
                </h3>
                <div className="space-y-10">
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1 space-y-6">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Operational Location</p>
                                <p className="text-xs font-bold text-slate-800 leading-relaxed uppercase">{vendor.businessAddress || 'No address provided'}</p>
                            </div>
                            {vendor.location && vendor.location.lat !== 0 && (
                                <div className="space-y-3">
                                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                                        <MapPin size={16} className="text-emerald-600" />
                                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                                            GPS CAPTURED: {vendor.location.lat?.toFixed(6) || '0.00'}, {vendor.location.lng?.toFixed(6) || '0.00'}
                                        </span>
                                    </div>
                                    {checkingArea ? (
                                        <div className="p-4 bg-slate-50 text-slate-500 border border-slate-100 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                                            <span className="animate-spin material-symbols-outlined text-sm">sync</span>
                                            Checking Service Area Coverage...
                                        </div>
                                    ) : matchedArea === 'OUTSIDE_SERVICE_AREA' ? (
                                        <div className="space-y-3">
                                            <div className="p-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm">warning</span>
                                                Outside Service Area Coverage
                                            </div>
                                            <button
                                                onClick={() => navigate(`/admin/geofencing?lat=${vendor.location.lat}&lng=${vendor.location.lng}&name=${encodeURIComponent(vendor.displayName || vendor.name || 'Vendor')}`)}
                                                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-black transition-all shadow-sm"
                                            >
                                                <MapPin size={12} /> Draw Zone around Vendor
                                            </button>
                                        </div>
                                    ) : matchedArea === 'ERROR_CHECKING' ? (
                                        <div className="p-4 bg-amber-50 text-amber-600 border border-amber-100 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">error</span>
                                            Failed to verify service area geofence
                                        </div>
                                    ) : matchedArea ? (
                                        <div className="p-4 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">check_circle</span>
                                            Service Area Matched: {matchedArea}
                                        </div>
                                    ) : null}

                                    {/* Google Map showing vendor and geofences */}
                                    <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm h-60 w-full relative mt-4">
                                        {isLoaded ? (
                                            <GoogleMap
                                                mapContainerStyle={{ width: '100%', height: '100%' }}
                                                center={{ lat: vendor.location.lat, lng: vendor.location.lng }}
                                                zoom={14}
                                                options={{
                                                    disableDefaultUI: false,
                                                    zoomControl: true,
                                                    mapTypeControl: false,
                                                    streetViewControl: false,
                                                    fullscreenControl: false
                                                }}
                                            >
                                                <Marker
                                                    position={{ lat: vendor.location.lat, lng: vendor.location.lng }}
                                                    title={vendor.displayName || vendor.name || 'Vendor Location'}
                                                />
                                                {areas.map(area => {
                                                    const getCoords = (a) => a?.boundary?.coordinates?.[0] || [];
                                                    const toLatLng = (coords) => coords.map(c => ({ lat: c[1], lng: c[0] }));
                                                    const paths = toLatLng(getCoords(area));
                                                    const isMatched = matchedArea === area.areaName;
                                                    return (
                                                        <Polygon
                                                            key={area._id}
                                                            paths={paths}
                                                            options={{
                                                                fillColor: area.color || '#3b82f6',
                                                                fillOpacity: isMatched ? 0.35 : 0.15,
                                                                strokeColor: area.color || '#3b82f6',
                                                                strokeWeight: isMatched ? 3 : 1.5,
                                                                strokeOpacity: 0.8,
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </GoogleMap>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                Loading Map...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="w-full md:w-64 aspect-video rounded-[2rem] bg-slate-100 overflow-hidden relative group">
                            {vendor.exteriorPhoto ? (
                                <>
                                    <img src={vendor.exteriorPhoto} alt="Exterior" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                        <button onClick={() => window.open(vendor.exteriorPhoto, '_blank')} className="px-4 py-2 bg-white rounded-full text-[9px] font-black uppercase tracking-widest">View Exterior</button>
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                                    <ImageIcon size={32} />
                                    <span className="text-[8px] font-black uppercase tracking-widest">No Exterior Photo</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Machine & Infrastructure Shots</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {vendor.interiorPhotos?.map((url, idx) => (
                                <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 group relative">
                                    <img src={url} alt={`Interior ${idx+1}`} className="w-full h-full object-cover" />
                                    <button onClick={() => window.open(url, '_blank')} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                        <ExternalLink size={20} className="text-white" />
                                    </button>
                                </div>
                            ))}
                            {vendor.walkthroughVideo && (() => {
                                const ytUrl = getYouTubeEmbedUrl(vendor.walkthroughVideo);
                                return (
                                    <div className="col-span-2 aspect-video rounded-2xl bg-slate-900 overflow-hidden relative group">
                                        {ytUrl ? (
                                            <div 
                                                className="w-full h-full relative z-10"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <iframe 
                                                    src={ytUrl} 
                                                    className="w-full h-full" 
                                                    frameBorder="0" 
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                                    allowFullScreen 
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <video src={vendor.walkthroughVideo} className="w-full h-full object-cover opacity-60" />
                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                                    <PlayCircle size={48} className="text-white cursor-pointer hover:scale-110 transition-transform" onClick={() => window.open(vendor.walkthroughVideo, '_blank')} />
                                                    <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Walkthrough Audit</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <div className="space-y-10">
            {/* Step 4: Financials */}
            <section className="bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-primary/20 rounded-full -mr-20 -mb-20 blur-3xl" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-10 flex items-center gap-3">
                    <CreditCard size={16} className="text-amber-500" />
                    Phase 04: Settlement Dossier
                </h3>
                <div className="space-y-8">
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4">
                        <div>
                            <p className="text-[9px] font-black text-white/40 uppercase mb-2 tracking-widest">Bank Account Number</p>
                            <p className="font-black text-xl tracking-tighter text-amber-400 tabular-nums">{vendor.bankDetails?.accountNumber || vendor.bankAccountNumber || 'N/A'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                            <div>
                                <p className="text-[8px] font-black text-white/30 uppercase mb-1">IFSC Code</p>
                                <p className="text-xs font-bold uppercase">{vendor.bankDetails?.ifscCode || vendor.ifscCode || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[8px] font-black text-white/30 uppercase mb-1">Status</p>
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                                    <ShieldCheck size={12} />
                                    {vendor.bankDetails?.isVerified ? 'VERIFIED' : 'PENDING'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest px-1">Proof of Account</p>
                        {vendor.chequeDoc ? (
                            <button 
                                onClick={() => window.open(vendor.chequeDoc, '_blank')}
                                className="w-full flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <ImageIcon size={18} className="text-white/20 group-hover:text-amber-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Cancelled Cheque / Passbook</span>
                                </div>
                                <ArrowLeft size={16} className="rotate-180 text-white/20" />
                            </button>
                        ) : (
                            <div className="p-10 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-white/20 gap-3">
                                <Info size={24} />
                                <span className="text-[9px] font-black uppercase tracking-widest">No Cheque Provided</span>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Step 5: Service Catalog (Visible after initial audit) */}
            {(vendor?.shopDetails?.services?.length > 0 || vendor?.onboardingStage === 'FINAL_REVIEW') && (
                <section className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-300 mb-10 flex items-center gap-3">
                        <Award size={16} className="text-primary" />
                        Phase 05: Service Catalog
                    </h3>
                    <div className="space-y-4">
                        {vendor.shopDetails.services.map((svc, idx) => (
                            <div key={idx} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-primary transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-primary shadow-sm">
                                        <Factory size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service ID: {svc.id.slice(-6)}</p>
                                        <p className="font-bold text-slate-900 uppercase">{svc.name || 'Catalog Item'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Proposed Rate</p>
                                    <p className="text-lg font-black text-primary tracking-tighter">₹{svc.vendorRate}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {vendor.shopDetails.services.length === 0 && (
                        <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Catalog Pending Selection</p>
                        </div>
                    )}
                </section>
            )}
        </div>
      </div>

      {/* Rejection Modal */}
      <AnimatePresence>
          {showRejectModal && (
              <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    onClick={() => setShowRejectModal(false)}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden"
                  >
                      <div className="p-8 bg-slate-900 text-white">
                          <h3 className="text-xl font-black uppercase tracking-tighter">Action Required</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Request revision or reject application</p>
                      </div>
                      
                      <div className="p-8 space-y-6">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Status</label>
                              <div className="grid grid-cols-2 gap-3">
                                  {[
                                      { id: 'revision_required', label: 'Revision Required', icon: 'history' },
                                      { id: 'rejected', label: 'Permanent Reject', icon: 'cancel' }
                                  ].map(opt => (
                                      <button 
                                        key={opt.id}
                                        onClick={() => setRejectionForm({...rejectionForm, status: opt.id})}
                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${rejectionForm.status === opt.id ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}
                                      >
                                          <span className="material-symbols-outlined text-primary">{opt.icon}</span>
                                          <span className={`text-[9px] font-black uppercase tracking-tight ${rejectionForm.status === opt.id ? 'text-primary' : 'text-slate-400'}`}>{opt.label}</span>
                                      </button>
                                  ))}
                              </div>
                          </div>

                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason / Admin Notes</label>
                              <textarea 
                                value={rejectionForm.reason}
                                onChange={(e) => setRejectionForm({...rejectionForm, reason: e.target.value})}
                                placeholder="E.g. Aadhar card is blurry, please re-upload or shop name mismatch..."
                                className="w-full h-24 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all resize-none"
                              />
                          </div>

                          {rejectionForm.status === 'revision_required' && (
                              <div className="space-y-3">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Items for Revision</label>
                                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-100 rounded-2xl custom-scrollbar">
                                      {REVISION_FLAGS.map(flag => (
                                          <button 
                                              key={flag.id}
                                              onClick={() => toggleFlag(flag.id)}
                                              className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left ${rejectionForm.rejectionFlags.includes(flag.id) ? 'border-primary bg-primary/5 text-primary' : 'border-slate-50 bg-slate-50 text-slate-400'}`}
                                          >
                                              <span className="material-symbols-outlined text-xs">
                                                  {rejectionForm.rejectionFlags.includes(flag.id) ? 'check_box' : 'check_box_outline_blank'}
                                              </span>
                                              <span className="text-[8px] font-black uppercase tracking-tight">{flag.label}</span>
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          )}

                          <div className="flex gap-3 pt-4">
                              <button 
                                onClick={() => setShowRejectModal(false)}
                                className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={handleRejectSubmit}
                                disabled={isProcessing}
                                className="flex-1 py-4 bg-slate-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50"
                              >
                                {isProcessing ? 'Processing...' : 'Submit Action'}
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

export default AdminVendorRequestDetailPage;
