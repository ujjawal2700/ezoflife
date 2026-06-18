import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { jobApi, authApi } from '../../../lib/api';
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

const SALARY_OPTIONS = [
  1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000,
  11000, 12000, 13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000,
  25000, 30000, 35000, 40000, 45000, 50000, 60000, 70000, 80000, 90000, 100000
];

const TIME_OPTIONS_48 = [
  '12:00 AM', '12:30 AM', '01:00 AM', '01:30 AM', '02:00 AM', '02:30 AM',
  '03:00 AM', '03:30 AM', '04:00 AM', '04:30 AM', '05:00 AM', '05:30 AM',
  '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM',
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM',
  '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
];

const format24hTo12h = (time24) => {
  if (!time24) return '';
  let [hours, minutes] = time24.split(':');
  let hr = parseInt(hours, 10);
  let ampm = 'AM';
  if (hr >= 12) {
    ampm = 'PM';
    if (hr > 12) hr -= 12;
  } else if (hr === 0) {
    hr = 12;
  }
  return `${hr.toString().padStart(2, '0')}:${minutes} ${ampm}`;
};

const format12hTo24h = (time12) => {
  if (!time12) return '';
  let [timeStr, ampm] = time12.split(' ');
  let [hours, minutes] = timeStr.split(':');
  let hr = parseInt(hours, 10);
  if (ampm === 'PM' && hr !== 12) {
    hr += 12;
  } else if (ampm === 'AM' && hr === 12) {
    hr = 0;
  }
  return `${hr.toString().padStart(2, '0')}:${minutes}`;
};

const getStateFromAddress = (address) => {
  if (!address) return 'Haryana';
  const states = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
    'Uttarakhand', 'West Bengal', 'Delhi'
  ];
  for (const st of states) {
    if (address.toLowerCase().includes(st.toLowerCase())) {
      return st;
    }
  }
  return 'Haryana';
};

const getCityFromAddress = (address) => {
  if (!address) return '';
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  
  const statesList = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
    'Uttarakhand', 'West Bengal', 'Delhi'
  ];

  // Find which part contains a state name
  let stateIndex = -1;
  for (let i = 0; i < parts.length; i++) {
    const partLower = parts[i].toLowerCase();
    const hasState = statesList.some(state => partLower.includes(state.toLowerCase()));
    if (hasState) {
      stateIndex = i;
      break;
    }
  }

  // If we found a part containing a state, the city is likely the part just before it
  if (stateIndex > 0) {
    return parts[stateIndex - 1];
  }

  // Fallback: if there's no state found but we have multiple parts, or if state is the first part
  let targetIndex = parts.length - 2;
  if (parts.length >= 3) {
    const lastPart = parts[parts.length - 1].toLowerCase();
    if (lastPart === 'india') {
      targetIndex = parts.length - 3;
    }
  }
  if (targetIndex >= 0 && targetIndex < parts.length) {
    return parts[targetIndex];
  }
  return parts[0] || '';
};

const getPincodeFromAddress = (address) => {
  if (!address) return '';
  const match = address.match(/\b\d{6}\b/);
  return match ? match[0] : '';
};

const CreateJobRequisition = () => {
  const navigate = useNavigate();

  // Vendor context retrieval
  const vendorDataRaw = localStorage.getItem('vendorData') || localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
  const vendorData = JSON.parse(vendorDataRaw);
  const vendorId = vendorData._id || vendorData.id || vendorData.user?._id || vendorData.user?.id;
  const shopName = vendorData.shopDetails?.name || vendorData.user?.shopDetails?.name || vendorData.shopDetails?.shopName || vendorData.user?.shopDetails?.shopName || 'Partner Laundry';

  // Extract address info
  const fullAddress = vendorData.shopDetails?.address || vendorData.user?.shopDetails?.address || vendorData.address || '';
  const vendorCity = vendorData.shopDetails?.city || vendorData.user?.shopDetails?.city || vendorData.city || getCityFromAddress(fullAddress);
  const vendorState = getStateFromAddress(fullAddress);
  const vendorPincode = vendorData.shopDetails?.pincode || vendorData.user?.shopDetails?.pincode || vendorData.pincode || getPincodeFromAddress(fullAddress);

  // Form states
  const [roleTemplates, setRoleTemplates] = useState([]);
  const [selectedRoleKey, setSelectedRoleKey] = useState('');
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [shiftStartTime, setShiftStartTime] = useState('09:00');
  const [shiftEndTime, setShiftEndTime] = useState('18:00');
  const [responsibility, setResponsibility] = useState('');
  const [additionalRequirements, setAdditionalRequirements] = useState('');
  
  const [city, setCity] = useState(vendorCity || 'Gurugram');
  const [area, setArea] = useState(vendorState || 'Haryana');
  const [pincode, setPincode] = useState(vendorPincode || '122003');
  const hideAddress = false;
  const [status, setStatus] = useState('Open'); // Open, Paused, Draft
  
  // UI state controllers
  const [loadingRole, setLoadingRole] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [minDropdownOpen, setMinDropdownOpen] = useState(false);
  const [maxDropdownOpen, setMaxDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isEditingInPreview, setIsEditingInPreview] = useState(false);
  const [tempForm, setTempForm] = useState({
    roleName: '',
    roleDescription: '',
    responsibility: '',
    additionalRequirements: '',
    minSalary: '',
    maxSalary: '',
    shiftStartTime: '',
    shiftEndTime: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Custom Time Dropdown states
  const [startTimeDropdownOpen, setStartTimeDropdownOpen] = useState(false);
  const [endTimeDropdownOpen, setEndTimeDropdownOpen] = useState(false);

  // Fetch fresh vendor profile on mount to get the correct shop details and location
  useEffect(() => {
    const fetchVendorProfile = async () => {
      try {
        if (vendorId) {
          const profile = await authApi.getProfile(vendorId);
          if (profile) {
            // Update address details in states
            const address = profile.shopDetails?.address || profile.address || '';
            const freshCity = profile.shopDetails?.city || profile.city || getCityFromAddress(address) || 'Gurugram';
            const freshState = getStateFromAddress(address) || 'Haryana';
            const freshPincode = profile.shopDetails?.pincode || profile.pincode || getPincodeFromAddress(address) || '122003';

            setCity(freshCity);
            setArea(freshState);
            setPincode(freshPincode);

            // Sync fresh profile to local storage cache to keep it fresh
            const rawStored = localStorage.getItem('user') || localStorage.getItem('vendorData') || localStorage.getItem('userData');
            if (rawStored) {
              try {
                const parsed = JSON.parse(rawStored);
                let merged;
                if (parsed.user) {
                  merged = { ...parsed, user: { ...parsed.user, ...profile } };
                } else {
                  merged = { ...parsed, ...profile };
                }
                localStorage.setItem('user', JSON.stringify(merged));
                localStorage.setItem('vendorData', JSON.stringify(merged));
                localStorage.setItem('userData', JSON.stringify(merged));
              } catch (e) {
                console.error('LocalStorage sync error:', e);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch fresh vendor profile:', error);
      }
    };
    fetchVendorProfile();
  }, [vendorId]);

  // Fetch templates from MongoDB on load
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await jobApi.getRoleTemplates('Vendor');
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
      const prepReqs = responsibility.split('\n').map(r => r.trim()).filter(Boolean);
      const customReqs = additionalRequirements.split('\n').map(r => r.trim()).filter(Boolean);
      const combinedRequirements = [...prepReqs, ...customReqs];

      const jobData = {
        title: roleName || selectedRoleKey,
        description: roleDescription,
        requirements: combinedRequirements,
        minSalary: Number(minSalary),
        maxSalary: Number(maxSalary),
        salary: `₹${Number(minSalary).toLocaleString('en-IN')} - ₹${Number(maxSalary).toLocaleString('en-IN')}`,
        shiftStartTime,
        shiftEndTime,
        city,
        area,
        pincode,
        location: `${city}, ${area}`,
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
    <div className="bg-slate-50 min-h-screen pb-12 text-slate-900 font-body relative">
      
      {/* 🚀 Top Navigation / Header */}
      <header className="bg-white/80 backdrop-blur-xl sticky top-[64px] z-40 px-6 py-4 border-b border-slate-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-slate-50 rounded-full flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-slate-600">arrow_back</span>
          </motion.button>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-950">Create Job Requisition</h1>
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

          <div className={`relative ${dropdownOpen ? 'z-50' : 'z-0'}`}>
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
                      readOnly
                      value={roleDescription}
                      placeholder="Pre-populated job description..."
                      className="w-full bg-indigo-50/30 border border-indigo-100/30 text-slate-600 font-bold rounded-2xl p-4 text-xs outline-none resize-none leading-relaxed cursor-not-allowed"
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
                {/* Min Salary Dropdown */}
                <div className={`relative ${minDropdownOpen ? 'z-50' : 'z-0'}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setMinDropdownOpen(!minDropdownOpen);
                      setMaxDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left font-bold text-xs text-slate-700 hover:bg-slate-100/50 transition-colors"
                  >
                    <span className={minSalary ? 'text-slate-900 font-black' : 'text-slate-400 font-bold'}>
                      {minSalary ? `₹${Number(minSalary).toLocaleString('en-IN')}` : 'Min Salary'}
                    </span>
                    <span className={`material-symbols-outlined text-slate-400 transition-transform ${minDropdownOpen ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>
 
                  {minDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMinDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 mt-2 z-50 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                        {SALARY_OPTIONS.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setMinSalary(opt.toString());
                              setMinDropdownOpen(false);
                              // Clear maxSalary if it's less than or equal to the new min
                              if (maxSalary && Number(maxSalary) <= opt) {
                                setMaxSalary('');
                              }
                            }}
                            className="w-full text-left px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                          >
                            ₹{opt.toLocaleString('en-IN')}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
 
                {/* Max Salary Dropdown */}
                <div className={`relative ${maxDropdownOpen ? 'z-50' : 'z-0'}`}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!minSalary) return;
                      setMaxDropdownOpen(!maxDropdownOpen);
                      setMinDropdownOpen(false);
                    }}
                    disabled={!minSalary}
                    className={`w-full flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left font-bold text-xs transition-colors ${
                      !minSalary ? 'cursor-not-allowed opacity-60 text-slate-400' : 'text-slate-700 hover:bg-slate-100/50'
                    }`}
                  >
                    <span className={maxSalary ? 'text-slate-900 font-black' : 'text-slate-400 font-bold'}>
                      {maxSalary ? `₹${Number(maxSalary).toLocaleString('en-IN')}` : (!minSalary ? 'Select Min First' : 'Max Salary')}
                    </span>
                    <span className={`material-symbols-outlined text-slate-400 transition-transform ${maxDropdownOpen ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>
 
                  {maxDropdownOpen && minSalary && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMaxDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 mt-2 z-50 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                        {SALARY_OPTIONS
                          .filter((opt) => opt > Number(minSalary))
                          .map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setMaxSalary(opt.toString());
                                setMaxDropdownOpen(false);
                              }}
                              className="w-full text-left px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                            >
                              ₹{opt.toLocaleString('en-IN')}
                            </button>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Shift Timings */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Shift Timing <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-4">
                {/* Start Time */}
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-slate-400 uppercase ml-1 block">Start Time</span>
                  <div className={`relative ${startTimeDropdownOpen ? 'z-50' : 'z-0'}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setStartTimeDropdownOpen(!startTimeDropdownOpen);
                        setEndTimeDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left font-bold text-xs text-slate-700 hover:bg-slate-100/50 transition-colors"
                    >
                      <span className={shiftStartTime ? 'text-slate-900 font-black' : 'text-slate-400 font-bold'}>
                        {shiftStartTime ? format24hTo12h(shiftStartTime) : '09:00 AM'}
                      </span>
                      <span className={`material-symbols-outlined text-slate-400 transition-transform ${startTimeDropdownOpen ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>

                    {startTimeDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setStartTimeDropdownOpen(false)} />
                        <div className="absolute left-0 right-0 mt-2 z-50 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                          {TIME_OPTIONS_48.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setShiftStartTime(format12hTo24h(opt));
                                setStartTimeDropdownOpen(false);
                              }}
                              className="w-full text-left px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* End Time */}
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-slate-400 uppercase ml-1 block">End Time</span>
                  <div className={`relative ${endTimeDropdownOpen ? 'z-50' : 'z-0'}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setEndTimeDropdownOpen(!endTimeDropdownOpen);
                        setStartTimeDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left font-bold text-xs text-slate-700 hover:bg-slate-100/50 transition-colors"
                    >
                      <span className={shiftEndTime ? 'text-slate-900 font-black' : 'text-slate-400 font-bold'}>
                        {shiftEndTime ? format24hTo12h(shiftEndTime) : '06:00 PM'}
                      </span>
                      <span className={`material-symbols-outlined text-slate-400 transition-transform ${endTimeDropdownOpen ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>

                    {endTimeDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setEndTimeDropdownOpen(false)} />
                        <div className="absolute left-0 right-0 mt-2 z-50 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                          {TIME_OPTIONS_48.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setShiftEndTime(format12hTo24h(opt));
                                setEndTimeDropdownOpen(false);
                              }}
                              className="w-full text-left px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
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
                readOnly
                value={responsibility}
                placeholder="Pre-populated job responsibilities..."
                className="w-full bg-indigo-50/30 border border-indigo-100/30 text-slate-600 font-bold rounded-2xl p-4 text-xs outline-none resize-none leading-relaxed cursor-not-allowed"
              />
            </div>

            {/* Additional Requirements */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Additional Requirements (Optional)</label>
              <textarea
                rows="3"
                value={additionalRequirements}
                onChange={(e) => setAdditionalRequirements(e.target.value)}
                placeholder="Enter any custom requirements or benefits from your side (One per line)..."
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-slate-300 transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                disabled={!isFormValid() || submitting}
                className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  isFormValid() && !submitting
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:bg-black active:scale-[0.98]'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span className="material-symbols-outlined text-sm">visibility</span>
                Preview
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* 🚀 PREVIEW MODAL */}
      <AnimatePresence>
        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-50 border border-slate-200 w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl space-y-6 relative overflow-hidden text-slate-900"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-slate-200/30 rounded-full blur-[80px] -mr-24 -mt-24 pointer-events-none"></div>

              <div className="flex justify-between items-center relative z-10">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  {isEditingInPreview ? 'Edit Requisition' : 'Careers Page Preview'}
                </h3>
                {!isEditingInPreview && (
                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                )}
              </div>

              {/* The Single Box Container */}
              <div className="bg-white rounded-[2rem] p-6 border border-slate-200/80 shadow-sm space-y-4 relative z-10 max-h-[60vh] overflow-y-auto no-scrollbar">
                {isEditingInPreview ? (
                  // EDITING MODE
                  <div className="space-y-4">
                    {/* Job Title / Role Name */}
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Title</label>
                      <input
                        type="text"
                        value={tempForm.roleName}
                        onChange={(e) => setTempForm({ ...tempForm, roleName: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                      <textarea
                        value={tempForm.roleDescription}
                        onChange={(e) => setTempForm({ ...tempForm, roleDescription: e.target.value })}
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 resize-none leading-relaxed transition-all"
                      />
                    </div>

                    {/* Responsibilities */}
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsibilities (One per line)</label>
                      <textarea
                        value={tempForm.responsibility}
                        onChange={(e) => setTempForm({ ...tempForm, responsibility: e.target.value })}
                        rows={4}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 resize-none leading-relaxed transition-all"
                      />
                    </div>

                    {/* Additional Requirements */}
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Additional Requirements</label>
                      <textarea
                        value={tempForm.additionalRequirements}
                        onChange={(e) => setTempForm({ ...tempForm, additionalRequirements: e.target.value })}
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 resize-none leading-relaxed transition-all"
                      />
                    </div>

                    {/* Salary Range (Min / Max) */}
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Salary Range (Monthly)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-[8px] text-slate-400 font-bold ml-1">Min</span>
                          <select
                            value={tempForm.minSalary}
                            onChange={(e) => {
                              const newMin = e.target.value;
                              let newMax = tempForm.maxSalary;
                              if (newMax && Number(newMax) <= Number(newMin)) {
                                newMax = '';
                              }
                              setTempForm({ ...tempForm, minSalary: newMin, maxSalary: newMax });
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-slate-400 transition-all"
                          >
                            <option value="">Select Min</option>
                            {SALARY_OPTIONS.map(val => (
                              <option key={val} value={val}>₹{val.toLocaleString('en-IN')}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] text-slate-400 font-bold ml-1">Max</span>
                          <select
                            value={tempForm.maxSalary}
                            disabled={!tempForm.minSalary}
                            onChange={(e) => setTempForm({ ...tempForm, maxSalary: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none disabled:opacity-50 focus:border-slate-400 transition-all"
                          >
                            <option value="">Select Max</option>
                            {SALARY_OPTIONS
                              .filter(val => val > Number(tempForm.minSalary || 0))
                              .map(val => (
                                <option key={val} value={val}>₹{val.toLocaleString('en-IN')}</option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Shift Timings */}
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Shift Timings</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold ml-1">Start Time</span>
                          <select
                            value={tempForm.shiftStartTime}
                            onChange={(e) => setTempForm({ ...tempForm, shiftStartTime: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-slate-400 transition-all"
                          >
                            {TIME_OPTIONS_48.map(t => (
                              <option key={t} value={format12hTo24h(t)}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold ml-1">End Time</span>
                          <select
                            value={tempForm.shiftEndTime}
                            onChange={(e) => setTempForm({ ...tempForm, shiftEndTime: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-slate-400 transition-all"
                          >
                            {TIME_OPTIONS_48.map(t => (
                              <option key={t} value={format12hTo24h(t)}>{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // PREVIEW VIEW
                  <div className="space-y-4">
                    {/* Role Title */}
                    <div>
                      <h3 className="font-black text-base tracking-tight text-slate-900 leading-tight">
                        {roleName || selectedRoleKey || 'Job Title'}
                      </h3>
                      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 block mt-1">
                        {shopName}
                      </span>
                      <span className="inline-flex items-center gap-1 mt-2 text-[9px] font-black uppercase tracking-wider text-slate-700">
                        <span className="material-symbols-outlined text-[11px] text-slate-900">location_on</span>
                        {city || 'City'}, {area || 'State'} {pincode ? `- ${pincode}` : ''}
                      </span>
                    </div>

                    {/* Description */}
                    {roleDescription && (
                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic border-l-2 border-slate-200 pl-3 block py-0.5">
                        "{roleDescription}"
                      </p>
                    )}

                    {/* Responsibilities */}
                    {(responsibility || additionalRequirements) && (
                      <div className="pt-4 border-t border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Responsibilities</p>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar">
                          {responsibility && responsibility.split('\n').map((line, idx) => (
                            <p key={idx} className="text-[10px] font-medium text-slate-600 flex items-start gap-2 leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 mt-1.5 shrink-0" />
                              <span>{line}</span>
                            </p>
                          ))}
                          {additionalRequirements && additionalRequirements.split('\n').map((line, idx) => (
                            <p key={`add-${idx}`} className="text-[10px] font-medium text-slate-600 flex items-start gap-2 leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 mt-1.5 shrink-0" />
                              <span>{line}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Salary Range */}
                    {minSalary && maxSalary && (
                      <div className="pt-4 border-t border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Salary Range</p>
                        <span className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-xl text-[9px] font-black tracking-wider text-slate-800">
                          <span className="material-symbols-outlined text-xs text-slate-500">payments</span>
                          ₹{Number(minSalary).toLocaleString('en-IN')} - ₹{Number(maxSalary).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    {/* Shift Timings */}
                    {shiftStartTime && shiftEndTime && (
                      <div className="pt-4 border-t border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Shift Timings</p>
                        <span className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-xl text-[9px] font-black tracking-wider text-slate-800">
                          <span className="material-symbols-outlined text-xs text-slate-500">schedule</span>
                          {format24hTo12h(shiftStartTime)} - {format24hTo12h(shiftEndTime)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons: Edit & Submit / Cancel & Save */}
              <div className="pt-3 relative z-10 flex gap-3">
                {isEditingInPreview ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingInPreview(false);
                      }}
                      className="flex-1 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Save temp values to main state
                        setRoleName(tempForm.roleName);
                        setRoleDescription(tempForm.roleDescription);
                        setResponsibility(tempForm.responsibility);
                        setAdditionalRequirements(tempForm.additionalRequirements);
                        setMinSalary(tempForm.minSalary);
                        setMaxSalary(tempForm.maxSalary);
                        setShiftStartTime(tempForm.shiftStartTime);
                        setShiftEndTime(tempForm.shiftEndTime);
                        setIsEditingInPreview(false);
                      }}
                      disabled={
                        !tempForm.roleName.trim() ||
                        !tempForm.minSalary ||
                        !tempForm.maxSalary ||
                        !tempForm.shiftStartTime ||
                        !tempForm.shiftEndTime
                      }
                      className="flex-1 py-3.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 active:scale-95 transition-all"
                    >
                      Save
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        // Initialize temp state with current values
                        setTempForm({
                          roleName,
                          roleDescription,
                          responsibility,
                          additionalRequirements,
                          minSalary,
                          maxSalary,
                          shiftStartTime,
                          shiftEndTime
                        });
                        setIsEditingInPreview(true);
                      }}
                      className="flex-1 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSubmit()}
                      disabled={submitting}
                      className="flex-[2] py-3.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-[0.98] transition-all shadow-lg shadow-slate-950/10 flex items-center justify-center gap-2 disabled:opacity-30"
                    >
                      {submitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">rocket_launch</span>
                          Submit
                        </>
                      )}
                    </button>
                  </>
                )}
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
              <div className="w-16 h-16 bg-slate-950 text-white rounded-full flex items-center justify-center mx-auto shadow-lg">
                <span className="material-symbols-outlined text-3xl font-black">check_circle</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Requisition Submitted</h3>
                <p className="text-xs font-bold text-slate-500 leading-relaxed">
                  Job requisition submitted successfully.
                </p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
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
