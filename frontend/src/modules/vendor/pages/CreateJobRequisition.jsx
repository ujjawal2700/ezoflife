import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { jobApi } from '../../../lib/api';
import toast from 'react-hot-toast';

// Master templates for pre-populated roles
const ROLE_TEMPLATES = {
  'Ironing Specialist': {
    name: 'Ironing Specialist',
    description: 'Responsible for high-quality pressing and steam finishing of all garments.',
    responsibilities: [
      'Iron and steam press garments to meet quality standards',
      'Inspect garments for stains or damage before pressing',
      'Organize ironed clothes neatly on hangers or folded packs',
      'Follow safety protocols while handling hot equipment'
    ]
  },
  'Delivery Rider': {
    name: 'Delivery Rider',
    description: 'Responsible for timely pickup and delivery of garments while ensuring customer satisfaction.',
    responsibilities: [
      'Deliver orders safely and on time',
      'Handle customer interactions professionally',
      'Maintain delivery records and receipts',
      'Follow assigned delivery schedules and route guidelines'
    ]
  },
  'Shop Assistant': {
    name: 'Shop Assistant',
    description: 'Handles customer walk-ins, garment intake, tagging, and general storefront support.',
    responsibilities: [
      'Greet customers and register incoming garments',
      'Use shop software to generate receipts and tags',
      'Explain services, pricing, and promotional offers to customers',
      'Hand over completed orders and process payments'
    ]
  },
  'Dry Clean Technician': {
    name: 'Dry Clean Technician',
    description: 'Operates dry cleaning machinery and handles delicate fabrics using specialized chemicals.',
    responsibilities: [
      'Categorize and inspect garments for dry clean compatibility',
      'Apply stain-treatment solvents and operate cleaning equipment',
      'Maintain chemicals and machine filters in compliance with standards',
      'Quality control check post dry-cleaning cycle'
    ]
  },
  'Packing Staff': {
    name: 'Packing Staff',
    description: 'Performs final checks, folding, sorting, and neat packaging of processed garments.',
    responsibilities: [
      'Verify orders against customer lists or invoices',
      'Professionally fold and pack garments to prevent wrinkling',
      'Affix barcode stickers or tags on final delivery bags',
      'Keep packaging station clean and stocked with supplies'
    ]
  },
  'Laundry Helper': {
    name: 'Laundry Helper',
    description: 'Assists with washing, sorting, and loading garments into commercial washing machines.',
    responsibilities: [
      'Sort garments by color, fabric type, and washing instructions',
      'Load and unload commercial washing machines and dryers',
      'Measure detergent, bleach, and other laundry additives',
      'Assist senior staff with daily operational duties'
    ]
  }
};

const CreateJobRequisition = () => {
  const navigate = useNavigate();

  // Vendor context retrieval
  const vendorDataRaw = localStorage.getItem('vendorData') || localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
  const vendorData = JSON.parse(vendorDataRaw);
  const vendorId = vendorData._id || vendorData.id || vendorData.user?._id || vendorData.user?.id;
  const shopName = vendorData.shopDetails?.name || vendorData.user?.shopDetails?.name || vendorData.shopDetails?.shopName || vendorData.user?.shopDetails?.shopName || 'Partner Laundry';

  // Form states
  const [roleTemplates, setRoleTemplates] = useState([]);
  const [selectedRoleKey, setSelectedRoleKey] = useState('');
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [shiftStartTime, setShiftStartTime] = useState('');
  const [shiftEndTime, setShiftEndTime] = useState('');
  const [responsibility, setResponsibility] = useState('');
  
  const [city, setCity] = useState(vendorData.shopDetails?.city || vendorData.user?.shopDetails?.city || vendorData.city || '');
  const [area, setArea] = useState(vendorData.shopDetails?.address || vendorData.user?.shopDetails?.address || vendorData.address || '');
  const [pincode, setPincode] = useState(vendorData.shopDetails?.pincode || vendorData.user?.shopDetails?.pincode || vendorData.pincode || '');
  const hideAddress = false;
  const [status, setStatus] = useState('Open'); // Open, Paused, Draft

  // UI state controllers
  const [loadingRole, setLoadingRole] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch templates from MongoDB on load
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await jobApi.getRoleTemplates();
        if (Array.isArray(data) && data.length > 0) {
          setRoleTemplates(data);
        } else {
          setRoleTemplates(Object.values(ROLE_TEMPLATES));
        }
      } catch (error) {
        console.error('Failed to fetch role templates:', error);
        setRoleTemplates(Object.values(ROLE_TEMPLATES));
      }
    };
    fetchTemplates();
  }, []);

  // Filter dropdown options based on search input
  const filteredRoles = roleTemplates.filter(role => 
    role.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle pre-populated roles selection with animations
  const handleRoleSelect = (template) => {
    setSelectedRoleKey(template.name);
    setSearchTerm(template.name);
    setDropdownOpen(false);
    setLoadingRole(true);

    // Simulate smooth loading/fade animation
    setTimeout(() => {
      setRoleName(template.name);
      setRoleDescription(template.description);
      setResponsibility(Array.isArray(template.responsibilities) ? template.responsibilities.join('\n') : '');
      setLoadingRole(false);
    }, 450);
  };

  // Form validations (mandatory field checking)
  const isFormValid = () => {
    return (
      selectedRoleKey &&
      minSalary &&
      maxSalary &&
      shiftStartTime &&
      shiftEndTime &&
      city.trim() &&
      area.trim() &&
      pincode.trim()
    );
  };

  // Form Submission
  const handleSubmit = async (submitStatus = null) => {
    if (!isFormValid() && submitStatus !== 'Draft') {
      toast.error('Please complete all mandatory fields.');
      return;
    }

    setSubmitting(true);
    try {
      const finalStatus = submitStatus || status;
      const jobData = {
        title: roleName || selectedRoleKey,
        description: roleDescription,
        requirements: responsibility.split('\n').map(r => r.trim()).filter(r => r !== ''),
        minSalary: Number(minSalary),
        maxSalary: Number(maxSalary),
        salary: `₹${Number(minSalary).toLocaleString('en-IN')} - ₹${Number(maxSalary).toLocaleString('en-IN')}`,
        shiftStartTime,
        shiftEndTime,
        city,
        area,
        pincode,
        location: pincode.trim() ? `${area}, ${city} - ${pincode}` : `${area}, ${city}`,
        hideAddress: false,
        status: finalStatus,
        vendorId,
        companyName: shopName,
        creatorRole: 'Vendor'
      };

      await jobApi.create(jobData);
      
      if (finalStatus === 'Draft') {
        toast.success('Job requisition saved as Draft.');
        navigate('/vendor/labor-request');
      } else {
        setShowSuccess(true);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit requisition. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-36 text-slate-900 font-body relative">
      
      {/* 🚀 Top Navigation / Header */}
      <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-40 px-6 py-5 border-b border-slate-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-slate-50 rounded-full flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-slate-600">arrow_back</span>
          </motion.button>
          <div>
            <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <span>Dashboard</span>
              <span className="material-symbols-outlined text-[10px]">chevron_right</span>
              <span>Hire Talent</span>
              <span className="material-symbols-outlined text-[10px]">chevron_right</span>
              <span className="text-primary font-black">Create Job</span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-950 mt-1">Create Job Requisition</h1>
          </div>
        </div>
      </header>

      {/* 🚀 Main Form Container */}
      <main className="max-w-xl mx-auto px-6 pt-8 space-y-6">

        {/* SECTION 2: JOB ROLE SELECTION */}
        <section className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-lg">badge</span>
            </div>
            <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider">Select Job Role</h2>
          </div>

          <div className="relative">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Select Role <span className="text-red-500">*</span></label>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left font-bold text-sm text-slate-700 hover:bg-slate-100/50 transition-colors"
            >
              <span className={selectedRoleKey ? 'text-slate-900' : 'text-slate-400'}>
                {selectedRoleKey || 'Search or select a predefined role'}
              </span>
              <span className={`material-symbols-outlined text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute left-0 right-0 mt-2 z-50 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                  <div className="p-3 border-b border-slate-50 sticky top-0 bg-white">
                    <input
                      type="text"
                      placeholder="Search roles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold focus:bg-white outline-none"
                    />
                  </div>
                  {filteredRoles.length > 0 ? (
                    filteredRoles.map((role) => (
                      <button
                        key={role._id || role.name}
                        onClick={() => handleRoleSelect(role)}
                        className="w-full text-left px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                      >
                        {role.name}
                      </button>
                    ))
                  ) : (
                    <div className="p-5 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                      No roles match your search
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* SECTION 3: AUTO-FILLED ROLE DETAILS */}
        <AnimatePresence mode="wait">
          {selectedRoleKey && (
            <motion.section
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-5"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500">
                    <span className="material-symbols-outlined text-lg">info</span>
                  </div>
                  <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider">Role Information</h2>
                </div>
                <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0">
                  <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
                  Auto Filled
                </div>
              </div>

              {loadingRole ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Retrieving Template...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Role Name */}
                  <div className="space-y-2 relative group">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Role Name</label>
                      <div className="relative group/tooltip">
                        <span className="material-symbols-outlined text-[12px] text-slate-300 cursor-pointer">info</span>
                        <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/tooltip:block bg-slate-900 text-white text-[8px] font-bold uppercase tracking-widest p-2 rounded-lg whitespace-nowrap z-10">
                          Data fetched from master role templates.
                        </div>
                      </div>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={roleName}
                      className="w-full bg-indigo-50/30 border border-indigo-100/30 text-slate-800 font-black rounded-2xl p-4 text-sm outline-none cursor-not-allowed"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                      <div className="relative group/tooltip">
                        <span className="material-symbols-outlined text-[12px] text-slate-300 cursor-pointer">info</span>
                        <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/tooltip:block bg-slate-900 text-white text-[8px] font-bold uppercase tracking-widest p-2 rounded-lg whitespace-nowrap z-10">
                          Description of the role. Pre-populated from template.
                        </div>
                      </div>
                    </div>
                    <textarea
                      rows="4"
                      value={roleDescription}
                      onChange={(e) => setRoleDescription(e.target.value)}
                      placeholder="Enter job description..."
                      className="w-full bg-slate-50 border border-slate-100 text-slate-700 font-bold rounded-2xl p-4 text-xs focus:ring-4 focus:ring-slate-200 focus:bg-white outline-none transition-all resize-none leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* SECTION 4: VENDOR CUSTOM INPUTS */}
        <section className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-lg">custom_typography</span>
            </div>
            <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider">Job Requirements</h2>
          </div>

          <div className="space-y-4">
            {/* Salary Range */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Salary Range (Monthly) <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    value={minSalary}
                    onChange={(e) => setMinSalary(e.target.value)}
                    placeholder="Min Salary"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-9 pr-4 text-xs font-bold focus:ring-4 focus:ring-slate-200 focus:bg-white outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    value={maxSalary}
                    onChange={(e) => setMaxSalary(e.target.value)}
                    placeholder="Max Salary"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-9 pr-4 text-xs font-bold focus:ring-4 focus:ring-slate-200 focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Shift Timings */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Shift Timing <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-slate-400 uppercase ml-1 block">Start Time</span>
                  <input
                    type="time"
                    value={shiftStartTime}
                    onChange={(e) => setShiftStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold focus:ring-4 focus:ring-slate-200 focus:bg-white outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-slate-400 uppercase ml-1 block">End Time</span>
                  <input
                    type="time"
                    value={shiftEndTime}
                    onChange={(e) => setShiftEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold focus:ring-4 focus:ring-slate-200 focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Responsibility */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Responsibility</label>
                <span className={`text-[8px] font-black uppercase ${responsibility.length > 900 ? 'text-red-500 animate-pulse' : 'text-slate-300'}`}>
                  {responsibility.length} / 1000
                </span>
              </div>
              <textarea
                rows="4"
                maxLength="1000"
                value={responsibility}
                onChange={(e) => setResponsibility(e.target.value)}
                placeholder="Enter job responsibilities (e.g. Ironing clothes, operating steam press, maintaining washing machines...)"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold focus:ring-4 focus:ring-slate-200 focus:bg-white outline-none transition-all resize-none leading-relaxed"
              />
            </div>
          </div>
        </section>

        {/* SECTION 5: JOB LOCATION */}
        <section className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-lg">location_on</span>
            </div>
            <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider">Job Location</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">City <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Gurugram"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold focus:ring-4 focus:ring-slate-200 focus:bg-white outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Area / Geofence <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. Sector 45"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold focus:ring-4 focus:ring-slate-200 focus:bg-white outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Pincode <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  maxLength="6"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 122003"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold focus:ring-4 focus:ring-slate-200 focus:bg-white outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </section>



      </main>

      {/* SECTION 7: ACTION BUTTONS (STICKY BOTTOM BAR) */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-md border-t border-slate-100 py-5 px-6 shadow-2xl flex justify-center">
        <div className="max-w-xl w-full flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSubmit('Draft')}
            disabled={submitting}
            className="flex-1 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
          >
            Save Draft
          </button>
          
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="flex-1 py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all"
          >
            Preview Job
          </button>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!isFormValid() || submitting}
            className={`flex-[1.5] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              isFormValid() && !submitting
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 hover:scale-[1.02] active:scale-95'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">rocket_launch</span>
                Submit
              </>
            )}
          </button>
        </div>
      </footer>

      {/* 🚀 PREVIEW MODAL */}
      <AnimatePresence>
        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-100 w-full max-w-md rounded-[3rem] p-6 shadow-2xl space-y-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-[80px] -mr-24 -mt-24 pointer-events-none"></div>

              <div className="flex justify-between items-center relative z-10">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Careers Page Preview</h3>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 hover:bg-slate-200"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Simulated Public Careers Page Card */}
              <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm space-y-4 relative z-10">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-base tracking-tight text-slate-900 truncate">
                      {roleName || selectedRoleKey || 'Job Title'}
                    </h3>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600">
                      {shopName}
                    </span>
                  </div>
                  <div className="bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/50 flex items-center gap-1 shrink-0 max-w-[180px]">
                    <span className="material-symbols-outlined text-[12px] text-indigo-500 shrink-0">location_on</span>
                    <span className="text-[8px] font-black uppercase tracking-wider truncate">
                      {area || 'Area'}, {city || 'City'}{pincode ? ` - ${pincode}` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-500">
                    <span className="material-symbols-outlined text-[11px]">group</span>
                    0 Applicants
                  </span>
                  <span className="inline-flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-500">
                    <span className="material-symbols-outlined text-[11px]">schedule</span>
                    Full Time
                  </span>
                  {minSalary && maxSalary && (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-emerald-600">
                      <span className="material-symbols-outlined text-[11px]">payments</span>
                      ₹{Number(minSalary).toLocaleString('en-IN')} - ₹{Number(maxSalary).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                {roleDescription && (
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic line-clamp-3">
                    "{roleDescription}"
                  </p>
                )}

                {responsibility && (
                  <div className="pt-2 border-t border-slate-50">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsibilities</p>
                    <div className="space-y-1 max-h-24 overflow-y-auto no-scrollbar">
                      {responsibility.split('\n').map((line, idx) => (
                        <p key={idx} className="text-[10px] font-bold text-slate-600 flex items-start gap-1">
                          <span className="w-1 h-1 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                          <span>{line}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="w-full py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-center"
                >
                  Apply Now
                </button>
              </div>

              <div className="flex justify-center text-[9px] font-black text-slate-400 uppercase tracking-widest gap-2">
                <span className="material-symbols-outlined text-[14px]">public</span>
                Public Listing
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🚀 SUCCESS CONFIRMATION MODAL */}
      <AnimatePresence>
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl text-center space-y-6"
            >
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <span className="material-symbols-outlined text-3xl font-black">check_circle</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Requisition Submitted</h3>
                <p className="text-xs font-bold text-slate-500 leading-relaxed">
                  Job requisition submitted successfully.
                </p>
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-wider">
                  The vacancy is now live on the public careers page.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSuccess(false);
                  navigate('/vendor/labor-request');
                }}
                className="w-full py-4 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all shadow-lg"
              >
                Go to Staffing Hub
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default CreateJobRequisition;
