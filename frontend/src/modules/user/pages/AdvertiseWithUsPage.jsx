import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Megaphone, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  IndianRupee, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  X, 
  Sparkles, 
  TrendingUp, 
  Users, 
  ShieldCheck,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mediaApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  'Creative Pending Review': { label: 'Submitted', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  'Content Review': { label: 'Under Review', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  'Invoice Generated': { label: 'Payment Required', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  'Scheduled': { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'Running': { label: 'Active Campaign', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  'Campaign Ended': { label: 'Completed', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  'Paused by Admin': { label: 'Paused', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  'Rejected': { label: 'Declined', color: 'bg-rose-50 text-rose-700 border-rose-200' }
};

const AdvertiseWithUsPage = () => {
  const navigate = useNavigate();

  // User Context
  const userDataRaw = localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
  const userData = JSON.parse(userDataRaw);
  const userEmail = userData.email || userData.user?.email || '';

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'track'
  const [myInquiries, setMyInquiries] = useState([]);
  const [fetchingInquiries, setFetchingInquiries] = useState(false);
  const [viewingProposal, setViewingProposal] = useState(null);

  // Location specific states
  const [locationType, setLocationType] = useState('Pan India'); // 'Pan India' or 'Custom'
  const [stateName, setStateName] = useState('');
  const [cityName, setCityName] = useState('');

  const [formData, setFormData] = useState({ 
    brandName: '', 
    email: userEmail || localStorage.getItem('last_b2b_email') || '',
    phone: '', 
    location: 'Pan India',
    budget: '', 
    timeline: 'Launch Boost' 
  });

  const fetchMyInquiries = async () => {
    const emailToQuery = userEmail || localStorage.getItem('last_b2b_email') || formData.email;
    if (!emailToQuery) return;
    try {
      setFetchingInquiries(true);
      const data = await mediaApi.getMyInquiries(emailToQuery);
      setMyInquiries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch inquiries:', error);
    } finally {
      setFetchingInquiries(false);
    }
  };

  useEffect(() => {
    const emailToQuery = userEmail || localStorage.getItem('last_b2b_email') || formData.email;
    if (emailToQuery) {
      fetchMyInquiries();
    }
  }, [userEmail, formData.email]);

  const campaignTypes = useMemo(() => ['Launch Boost', 'Retainer', 'One-Off'], []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const submittedEmail = formData.email || userEmail;
      if (submittedEmail) {
        localStorage.setItem('last_b2b_email', submittedEmail);
      }
      await mediaApi.submitInquiry({ ...formData, email: submittedEmail });
      toast.success('Campaign proposal submitted successfully!');
      fetchMyInquiries();
      setIsSubmitted(true);
      setTimeout(() => {
        setActiveTab('track');
        setIsSubmitted(false);
        setLocationType('Pan India');
        setStateName('');
        setCityName('');
        setFormData({
          brandName: '',
          email: submittedEmail,
          phone: '',
          location: 'Pan India',
          budget: '',
          timeline: 'Launch Boost'
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
                <Megaphone size={13} className="text-slate-700" />
                <span>SPINZYT Brand Partnerships & Media Kit</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Advertise Inside Urban Households
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
                Connect your brand with verified, high-frequency laundry customers through premium eco-packaging sponsorship, in-app brand placements, and targeted metro marketing.
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
                <span>Track Inquiries</span>
                {myInquiries.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-white text-[10px] font-bold">
                    {myInquiries.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
                <Users size={15} />
                <span>50,000+ Monthly Bags</span>
              </div>
              <p className="text-xs text-slate-500 font-normal">Delivered directly into customer wardrobes.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
                <TrendingUp size={15} />
                <span>98.4% Attention Retention</span>
              </div>
              <p className="text-xs text-slate-500 font-normal">Garment covers kept in homes for weeks.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
                <ShieldCheck size={15} />
                <span>100% Brand Safe</span>
              </div>
              <p className="text-xs text-slate-500 font-normal">Exclusive non-compete sponsor categories.</p>
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <AnimatePresence mode="wait">
          {activeTab === 'submit' ? (
            !isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* Left Column: Brand & Contact Info */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                    <div className="pb-3 border-b border-slate-100">
                      <h3 className="text-base font-bold text-slate-900">Brand & Contact Details</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Tell us about your company and primary contact.</p>
                    </div>

                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Brand / Company Name</label>
                        <div className="relative flex items-center">
                          <Building2 size={15} className="absolute left-3.5 text-slate-400" />
                          <input 
                            required
                            type="text"
                            placeholder="e.g. Nike, Urban Company"
                            value={formData.brandName}
                            onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
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
                            placeholder="marketing@yourbrand.com"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Contact Number</label>
                        <div className="relative flex items-center">
                          <Phone size={15} className="absolute left-3.5 text-slate-400" />
                          <input 
                            required
                            type="tel"
                            maxLength={10}
                            placeholder="10-digit mobile number"
                            value={formData.phone}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              if (val.length <= 10) setFormData(prev => ({ ...prev, phone: val }));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-medium text-slate-700">Target Geographic Scope</label>
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
                            Specific Cities
                          </button>
                        </div>

                        {locationType === 'Custom' && (
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <input 
                              type="text" 
                              placeholder="City (e.g. Indore)"
                              value={cityName}
                              onChange={(e) => {
                                setCityName(e.target.value);
                                setFormData(prev => ({ ...prev, location: `${e.target.value}, ${stateName}` }));
                              }}
                              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                            />
                            <input 
                              type="text" 
                              placeholder="State (e.g. MP)"
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

                  {/* Right Column: Campaign Budget & Scope */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                    <div className="pb-3 border-b border-slate-100">
                      <h3 className="text-base font-bold text-slate-900">Campaign Scope & Budget</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Customize your sponsorship tier and timeline.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Estimated Monthly Budget (₹)</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3.5 text-slate-400 font-semibold text-xs">₹</span>
                          <input 
                            required
                            type="number"
                            placeholder="e.g. 50,000"
                            value={formData.budget}
                            onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-700">Campaign Duration & Type</label>
                        <div className="grid grid-cols-3 gap-2">
                          {campaignTypes.map(type => (
                            <button
                              type="button"
                              key={type}
                              onClick={() => setFormData(prev => ({ ...prev, timeline: type }))}
                              className={cn(
                                "py-3 px-2 rounded-xl border text-xs font-medium transition-all text-center cursor-pointer",
                                formData.timeline === type 
                                  ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-semibold" 
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              )}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-2 text-xs">
                        <p className="font-semibold text-slate-800">What happens next?</p>
                        <ul className="space-y-1 text-slate-500 list-disc list-inside">
                          <li>Our brand solutions team reviews your target geo & niche.</li>
                          <li>You receive a bespoke media kit with print & digital mockups.</li>
                          <li>Dedicated campaign execution manager assigned.</li>
                        </ul>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs sm:text-sm transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Megaphone size={16} />
                        <span>{submitting ? 'Submitting Proposal...' : 'Submit Campaign Proposal'}</span>
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
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Proposal Received!</h2>
                <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
                  Our advertising team will review your brand's requirements and reach out with sample mockups and slots within 24 hours.
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
            /* TRACKING INQUIRIES TAB */
            <div className="space-y-4">
              {fetchingInquiries ? (
                <div className="py-20 text-center flex flex-col items-center">
                  <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-medium text-slate-500">Syncing your proposals...</p>
                </div>
              ) : myInquiries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myInquiries.map((inq) => {
                    const rawStatus = inq.status || 'Creative Pending Review';
                    const mapped = STATUS_MAP[rawStatus] || { label: rawStatus, color: 'bg-slate-100 text-slate-800 border-slate-200' };

                    return (
                      <div 
                        key={inq._id} 
                        onClick={() => setViewingProposal(inq)}
                        className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition-all space-y-3 cursor-pointer group"
                      >
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{inq.brandName}</h4>
                            <p className="text-xs text-slate-500">{inq.location || 'Pan India'}</p>
                          </div>
                          <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", mapped.color)}>
                            {mapped.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400">Budget</span>
                            <p className="font-semibold text-slate-800">₹{inq.budget?.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Timeline</span>
                            <p className="font-semibold text-slate-800">{inq.timeline || 'Launch Boost'}</p>
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
                  <Megaphone size={36} className="mx-auto text-slate-300" />
                  <h3 className="text-base font-semibold text-slate-800">No campaigns submitted yet</h3>
                  <p className="text-xs text-slate-500">Submit your brand inquiry to begin partnering with us.</p>
                  <button
                    onClick={() => setActiveTab('submit')}
                    className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Create Proposal
                  </button>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>

        {/* PROPOSAL DETAILS MODAL */}
        <AnimatePresence>
          {viewingProposal && (() => {
            const rawStatus = viewingProposal.status || 'Creative Pending Review';
            const mapped = STATUS_MAP[rawStatus] || { label: rawStatus, color: 'bg-slate-100 text-slate-800 border-slate-200' };

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
                      <h3 className="text-lg font-bold text-slate-900">{viewingProposal.brandName}</h3>
                      <p className="text-xs text-slate-500">Proposal ID: #{viewingProposal._id?.slice(-8)}</p>
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
                      <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", mapped.color)}>
                        {mapped.label}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-500">Target Location</span>
                      <span className="font-semibold text-slate-800">{viewingProposal.location}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-500">Monthly Budget</span>
                      <span className="font-semibold text-slate-800">₹{viewingProposal.budget?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-500">Timeline</span>
                      <span className="font-semibold text-slate-800">{viewingProposal.timeline || 'Launch Boost'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-50">
                      <span className="text-slate-500">Contact Email</span>
                      <span className="font-semibold text-slate-800">{viewingProposal.email}</span>
                    </div>
                    {viewingProposal.notes && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-xs font-semibold text-slate-700">Team Notes:</span>
                        <p className="text-xs text-slate-600 font-normal">{viewingProposal.notes}</p>
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

export default AdvertiseWithUsPage;
