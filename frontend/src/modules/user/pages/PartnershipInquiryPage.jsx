import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Handshake, 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  Truck, 
  Boxes, 
  Megaphone, 
  Cpu, 
  CheckCircle2, 
  ChevronRight, 
  X, 
  FileText,
  MapPin,
  TrendingUp,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { partnershipApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const STATUS_MAPPING = {
  'New Application': { label: 'Submitted', colors: 'bg-slate-100 text-slate-800 border-slate-200' },
  'Contacted': { label: 'In Review', colors: 'bg-blue-50 text-blue-700 border-blue-200' },
  'In Negotiation': { label: 'Negotiation', colors: 'bg-amber-50 text-amber-700 border-amber-200' },
  'Approved': { label: 'Approved', colors: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'Active Partner': { label: 'Active Partner', colors: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  'Rejected': { label: 'Declined', colors: 'bg-rose-50 text-rose-700 border-rose-200' }
};

const PartnershipInquiryPage = () => {
  const navigate = useNavigate();

  // User Context
  const userDataRaw = localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
  const userData = JSON.parse(userDataRaw);
  const userEmail = userData.email || userData.user?.email || '';

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'track'
  const [myProposals, setMyProposals] = useState([]);
  const [fetchingProposals, setFetchingProposals] = useState(false);
  const [viewingProposal, setViewingProposal] = useState(null);

  // Location specific states
  const [locationType, setLocationType] = useState('Pan India'); // 'Pan India' or 'Custom'
  const [stateName, setStateName] = useState('');
  const [cityName, setCityName] = useState('');

  const [formData, setFormData] = useState({
    companyName: '',
    email: userEmail || localStorage.getItem('last_b2b_email') || '',
    phone: '',
    location: 'Pan India',
    website: '',
    partnershipType: 'Logistics',
    proposal: ''
  });

  const fetchMyProposals = async () => {
    const emailToQuery = userEmail || localStorage.getItem('last_b2b_email') || formData.email;
    if (!emailToQuery) return;
    try {
      setFetchingProposals(true);
      const data = await partnershipApi.getMyInquiries(emailToQuery);
      setMyProposals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    } finally {
      setFetchingProposals(false);
    }
  };

  useEffect(() => {
    const emailToQuery = userEmail || localStorage.getItem('last_b2b_email') || formData.email;
    if (emailToQuery) {
      fetchMyProposals();
    }
  }, [userEmail, formData.email]);

  const partnershipTypes = useMemo(() => [
    { label: 'Logistics & Fleet', icon: Truck, value: 'Logistics' },
    { label: 'Raw Materials & Chemicals', icon: Boxes, value: 'Supplies' },
    { label: 'Co-Marketing & Media', icon: Megaphone, value: 'Marketing' },
    { label: 'Technology & Hardware', icon: Cpu, value: 'Technology' },
  ], []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const submittedEmail = formData.email || userEmail;
      if (submittedEmail) {
        localStorage.setItem('last_b2b_email', submittedEmail);
      }
      await partnershipApi.submit({ ...formData, email: submittedEmail });
      toast.success('Partnership proposal submitted successfully!');
      fetchMyProposals();
      setIsSubmitted(true);
      setTimeout(() => {
        setActiveTab('track');
        setIsSubmitted(false);
        setLocationType('Pan India');
        setStateName('');
        setCityName('');
        setFormData({
          companyName: '',
          email: submittedEmail,
          phone: '',
          location: 'Pan India',
          website: '',
          partnershipType: 'Logistics',
          proposal: ''
        });
      }, 2000);
    } catch (error) {
      toast.error('Failed to submit proposal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col font-['Poppins',sans-serif] text-slate-900 bg-[#f8fafc]">
      <main className="flex-1 pb-36 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        
        {/* HERO SECTION */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
                <Handshake size={13} className="text-slate-700" />
                <span>B2B & Strategic Enterprise Alliances</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Partner With SPINZYT
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
                Collaborate with our hyper-local laundry network. We actively partner with logistics operators, bulk chemical suppliers, enterprise hotel chains, and technology innovators.
              </p>
            </div>

            {/* Segmented Switcher */}
            <div className="bg-slate-100/90 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/80 shrink-0 self-start md:self-auto">
              <button
                onClick={() => setActiveTab('submit')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer",
                  activeTab === 'submit' ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Submit Proposal
              </button>
              <button
                onClick={() => setActiveTab('track')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5",
                  activeTab === 'track' ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
                )}
              >
                <span>Track Proposals</span>
                {myProposals.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-white text-[10px] font-bold">
                    {myProposals.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Key Value Props */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
                <Truck size={15} />
                <span>Last-Mile Fleet Integration</span>
              </div>
              <p className="text-xs text-slate-500 font-normal">Dedicated high-density pickup & drop routes.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
                <Boxes size={15} />
                <span>Bulk Supply Procurement</span>
              </div>
              <p className="text-xs text-slate-500 font-normal">Guaranteed monthly orders for verified chemical distributors.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
                <ShieldCheck size={15} />
                <span>Enterprise SLA & Terms</span>
              </div>
              <p className="text-xs text-slate-500 font-normal">Transparent escrow contracts and timely disbursements.</p>
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <AnimatePresence mode="wait">
          {activeTab === 'submit' ? (
            !isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* Left Column: Organization Details */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                    <div className="pb-3 border-b border-slate-100">
                      <h3 className="text-base font-bold text-slate-900">Organization & Contact Info</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Please provide your business credentials.</p>
                    </div>

                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Company / Organization Name</label>
                        <div className="relative flex items-center">
                          <Building2 size={15} className="absolute left-3.5 text-slate-400" />
                          <input 
                            required
                            type="text"
                            placeholder="e.g. Apex Logistics Pvt Ltd"
                            value={formData.companyName}
                            onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Official Work Email</label>
                        <div className="relative flex items-center">
                          <Mail size={15} className="absolute left-3.5 text-slate-400" />
                          <input 
                            required
                            type="email"
                            placeholder="partnerships@company.com"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Phone Number</label>
                        <div className="relative flex items-center">
                          <Phone size={15} className="absolute left-3.5 text-slate-400" />
                          <input 
                            required
                            type="tel"
                            maxLength={10}
                            placeholder="10-digit phone number"
                            value={formData.phone}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              if (val.length <= 10) setFormData(prev => ({ ...prev, phone: val }));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Website or LinkedIn (Optional)</label>
                        <div className="relative flex items-center">
                          <Globe size={15} className="absolute left-3.5 text-slate-400" />
                          <input 
                            type="url"
                            placeholder="https://yourcompany.com"
                            value={formData.website}
                            onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-medium text-slate-700">Operational Geographic Scope</label>
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => {
                              setLocationType('Pan India');
                              setFormData(prev => ({ ...prev, location: 'Pan India' }));
                            }}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                              locationType === 'Pan India' ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            Pan India
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLocationType('Custom');
                              setFormData(prev => ({ ...prev, location: cityName ? `${cityName}, ${stateName}` : stateName }));
                            }}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                              locationType === 'Custom' ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            Regional / Specific Cities
                          </button>
                        </div>

                        {locationType === 'Custom' && (
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <input 
                              type="text" 
                              placeholder="City"
                              value={cityName}
                              onChange={(e) => {
                                setCityName(e.target.value);
                                setFormData(prev => ({ ...prev, location: `${e.target.value}, ${stateName}` }));
                              }}
                              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                            />
                            <input 
                              type="text" 
                              placeholder="State"
                              value={stateName}
                              onChange={(e) => {
                                setStateName(e.target.value);
                                setFormData(prev => ({ ...prev, location: `${cityName}, ${e.target.value}` }));
                              }}
                              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Partnership Proposal Details */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                    <div className="pb-3 border-b border-slate-100">
                      <h3 className="text-base font-bold text-slate-900">Partnership Domain & Proposal</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Select how your organization wishes to align.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-700">Partnership Domain</label>
                        <div className="grid grid-cols-2 gap-2">
                          {partnershipTypes.map((item) => {
                            const IconComponent = item.icon;
                            const isSelected = formData.partnershipType === item.value;
                            return (
                              <button
                                type="button"
                                key={item.value}
                                onClick={() => setFormData(prev => ({ ...prev, partnershipType: item.value }))}
                                className={cn(
                                  "p-3 rounded-xl border text-xs font-medium transition-all text-left flex items-start gap-2.5 cursor-pointer",
                                  isSelected 
                                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-semibold" 
                                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                )}
                              >
                                <IconComponent size={16} className={isSelected ? "text-white mt-0.5" : "text-slate-500 mt-0.5"} />
                                <span className="leading-tight">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Proposal Summary & Capabilities</label>
                        <textarea 
                          required
                          rows={4}
                          placeholder="Briefly describe your fleet capacity, materials catalogue, or software integration idea..."
                          value={formData.proposal}
                          onChange={(e) => setFormData(prev => ({ ...prev, proposal: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs sm:text-sm transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Handshake size={16} />
                        <span>{submitting ? 'Submitting Proposal...' : 'Submit Partnership Proposal'}</span>
                      </button>
                    </div>
                  </div>

                </div>
              </form>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-200">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Proposal Submitted!</h2>
                <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
                  Our corporate development team will review your organization's pitch and schedule an exploratory call.
                </p>
                <button
                  onClick={() => setActiveTab('track')}
                  className="mt-2 px-6 py-2.5 bg-slate-900 text-white text-xs sm:text-sm font-medium rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Track Proposal Status
                </button>
              </div>
            )
          ) : (
            /* TRACKING PROPOSALS TAB */
            <div className="space-y-4">
              {fetchingProposals ? (
                <div className="py-20 text-center flex flex-col items-center">
                  <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-medium text-slate-500">Syncing your proposals...</p>
                </div>
              ) : myProposals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myProposals.map((prop) => {
                    const statusKey = prop.status || 'New Application';
                    const mapped = STATUS_MAPPING[statusKey] || { label: statusKey, colors: 'bg-slate-100 text-slate-800 border-slate-200' };

                    return (
                      <div 
                        key={prop._id} 
                        onClick={() => setViewingProposal(prop)}
                        className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition-all space-y-3 cursor-pointer group"
                      >
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{prop.companyName}</h4>
                            <p className="text-xs text-slate-500">{prop.location || 'Pan India'}</p>
                          </div>
                          <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", mapped.colors)}>
                            {mapped.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400">Domain</span>
                            <p className="font-semibold text-slate-800">{prop.partnershipType || 'Logistics'}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Website</span>
                            <p className="font-semibold text-slate-800 truncate">{prop.website || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                          <span>Click to view details</span>
                          <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-md mx-auto space-y-3">
                  <Handshake size={36} className="mx-auto text-slate-300" />
                  <h3 className="text-base font-semibold text-slate-800">No proposals submitted yet</h3>
                  <p className="text-xs text-slate-500">Submit a B2B alliance proposal to explore synergies.</p>
                  <button
                    onClick={() => setActiveTab('submit')}
                    className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Submit Proposal
                  </button>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>

        {/* PROPOSAL DETAILS MODAL */}
        <AnimatePresence>
          {viewingProposal && (() => {
            const statusKey = viewingProposal.status || 'New Application';
            const mapped = STATUS_MAPPING[statusKey] || { label: statusKey, colors: 'bg-slate-100 text-slate-800 border-slate-200' };

            return (
              <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                <div 
                  onClick={() => setViewingProposal(null)} 
                  className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" 
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-200 space-y-5"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{viewingProposal.companyName}</h3>
                      <p className="text-xs text-slate-500">Proposal #{viewingProposal._id?.slice(-8)}</p>
                    </div>
                    <button 
                      onClick={() => setViewingProposal(null)} 
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm">
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-500">Status</span>
                      <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", mapped.colors)}>
                        {mapped.label}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-500">Partnership Domain</span>
                      <span className="font-semibold text-slate-800">{viewingProposal.partnershipType}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-500">Coverage Location</span>
                      <span className="font-semibold text-slate-800">{viewingProposal.location}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-500">Email</span>
                      <span className="font-semibold text-slate-800">{viewingProposal.email}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-500">Phone</span>
                      <span className="font-semibold text-slate-800">{viewingProposal.phone}</span>
                    </div>
                    {viewingProposal.proposal && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-xs font-semibold text-slate-700">Proposal Summary:</span>
                        <p className="text-xs text-slate-600 font-normal leading-relaxed">{viewingProposal.proposal}</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setViewingProposal(null)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default PartnershipInquiryPage;
