import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { jobApi, authApi } from '../../../lib/api';
import toast from 'react-hot-toast';

// Master templates for pre-populated supplier roles
const ROLE_TEMPLATES = {
  'Warehouse Helper': {
    name: 'Warehouse Helper',
    description: 'Responsible for managing and organizing supply materials in the warehouse, loading/unloading, and picking lists.',
    responsibilities: [
      'Organize and stack supply inventory neatly in warehouse bays',
      'Follow picking lists to prepare shipments for dispatch',
      'Assist in unloading material shipments and verifying quantities',
      'Perform periodic stock counting and inventory reporting'
    ]
  },
  'Delivery Driver': {
    name: 'Delivery Driver',
    description: 'Responsible for delivering wholesale orders to vendor locations safely and on time.',
    responsibilities: [
      'Load materials safely onto delivery vehicles',
      'Drive and deliver wholesale orders to local laundry vendors',
      'Verify delivered items with vendor receipts and return sheets',
      'Perform daily vehicle maintenance and safety checks'
    ]
  },
  'Inventory Coordinator': {
    name: 'Inventory Coordinator',
    description: 'Responsible for cataloging supply inventory, tracking stock levels, and coordinate orders.',
    responsibilities: [
      'Maintain accurate digital registers of raw supply inventory',
      'Track stock thresholds and alert procurement team for refills',
      'Coordinate with suppliers for delivery schedules and invoicing',
      'Monitor and report material usage trends in the facility'
    ]
  },
  'Sales Executive': {
    name: 'Sales Executive',
    description: 'Responsible for reaching out to new laundry vendors and promoting wholesale laundry products.',
    responsibilities: [
      'Visit local laundry shops to present wholesale catalogs',
      'Explain benefits of wholesale pricing and bulk discount slabs',
      'Manage relations with registered vendors and resolve disputes',
      'Track monthly sales targets and generate vendor accounts'
    ]
  },
  'Machine Operator': {
    name: 'Machine Operator',
    description: 'Responsible for operating chemical mixers or packaging machinery in the facility.',
    responsibilities: [
      'Set up and calibrate packaging or mixing machines',
      'Load chemicals, detergents, and packages into machinery',
      'Monitor machinery runs to ensure uniform packaging sizes',
      'Follow strict safety, hazardous handling, and chemical mixing SOPs'
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

  let stateIndex = -1;
  for (let i = 0; i < parts.length; i++) {
    const partLower = parts[i].toLowerCase();
    const hasState = statesList.some(state => partLower.includes(state.toLowerCase()));
    if (hasState) {
      stateIndex = i;
      break;
    }
  }

  if (stateIndex > 0) {
    return parts[stateIndex - 1];
  }

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

const SupplierCreateJobRequisition = () => {
  const navigate = useNavigate();

  // Supplier context retrieval
  const supplierDataRaw = localStorage.getItem('supplierData') || localStorage.getItem('user') || localStorage.getItem('userData') || '{}';
  const supplierData = JSON.parse(supplierDataRaw);
  const supplierId = supplierData._id || supplierData.id || supplierData.user?._id || supplierData.user?.id;
  const companyName = supplierData.supplierDetails?.businessName || supplierData.user?.supplierDetails?.businessName || 'Spinzyt Supplier';

  // Extract address info
  const fullAddress = supplierData.supplierDetails?.address || supplierData.user?.supplierDetails?.address || supplierData.address || '';
  const supplierCity = supplierData.supplierDetails?.city || supplierData.user?.supplierDetails?.city || supplierData.city || getCityFromAddress(fullAddress);
  const supplierState = getStateFromAddress(fullAddress);
  const supplierPincode = supplierData.supplierDetails?.pincode || supplierData.user?.supplierDetails?.pincode || supplierData.pincode || getPincodeFromAddress(fullAddress);

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
  
  const [city, setCity] = useState(supplierCity || 'Gurugram');
  const [area, setArea] = useState(supplierState || 'Haryana');
  const [pincode, setPincode] = useState(supplierPincode || '122003');
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

  // Fetch fresh profile on mount to get the correct details
  useEffect(() => {
    const fetchSupplierProfile = async () => {
      try {
        if (supplierId) {
          const profile = await authApi.getProfile(supplierId);
          if (profile) {
            const address = profile.supplierDetails?.address || profile.address || '';
            const freshCity = profile.supplierDetails?.city || profile.city || getCityFromAddress(address) || 'Gurugram';
            const freshState = getStateFromAddress(address) || 'Haryana';
            const freshPincode = profile.supplierDetails?.pincode || profile.pincode || getPincodeFromAddress(address) || '122003';

            setCity(freshCity);
            setArea(freshState);
            setPincode(freshPincode);
          }
        }
      } catch (error) {
        console.error('Failed to fetch fresh supplier profile:', error);
      }
    };
    fetchSupplierProfile();
  }, [supplierId]);

  // Load Templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await jobApi.getRoleTemplates('Supplier');
        if (Array.isArray(data) && data.length > 0) {
          setRoleTemplates(data);
        } else {
          setRoleTemplates(Object.values(ROLE_TEMPLATES));
        }
      } catch (error) {
        console.error('Failed to fetch supplier templates:', error);
        setRoleTemplates(Object.values(ROLE_TEMPLATES));
      }
    };
    fetchTemplates();
  }, []);

  // Filter dropdown options based on search input
  const filteredRoles = roleTemplates.filter(role => 
    role.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle pre-populated roles selection
  const handleRoleSelect = (template) => {
    setSelectedRoleKey(template.name);
    setSearchTerm(template.name);
    setDropdownOpen(false);
    setLoadingRole(true);

    setTimeout(() => {
      setRoleName(template.name);
      setRoleDescription(template.description);
      setResponsibility(Array.isArray(template.responsibilities) ? template.responsibilities.join('\n') : '');
      setLoadingRole(false);
    }, 450);
  };

  // Form validations
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
        vendorId: supplierId, // Map supplier's UserObjectId to vendor field in model
        companyName: companyName,
        creatorRole: 'Supplier'
      };

      await jobApi.create(jobData);
      
      if (finalStatus === 'Draft') {
        toast.success('Job requisition saved as Draft.');
        navigate('/supplier/labor-request');
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
      <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-40 px-6 py-4 border-b border-slate-100 flex items-center justify-between shadow-sm">
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
                <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-900 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0">
                  <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
                  Auto Filled
                </div>
              </div>

              {loadingRole ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
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
                      className="w-full bg-slate-50 border border-slate-100 text-slate-800 font-black rounded-2xl p-4 text-sm outline-none cursor-not-allowed"
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
                      className="w-full bg-slate-50 border border-slate-100 text-slate-600 font-bold rounded-2xl p-4 text-xs outline-none resize-none leading-relaxed cursor-not-allowed"
                    />
                  </div>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* SECTION 4: CUSTOM INPUTS */}
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
                className="w-full bg-slate-50 border border-slate-100 text-slate-600 font-bold rounded-2xl p-4 text-xs outline-none resize-none leading-relaxed cursor-not-allowed"
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
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-950 flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-900">rate_review</span>
                  Requisition Preview
                </h3>
                <button 
                  onClick={() => {
                    setIsEditingInPreview(false);
                    setShowPreview(false);
                  }} 
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {/* Preview Body */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-5 relative z-10 shadow-sm max-h-[50vh] overflow-y-auto custom-scrollbar">
                {isEditingInPreview ? (
                  <div className="space-y-4 text-left">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">Role Name</label>
                      <input 
                        type="text" 
                        value={tempForm.roleName}
                        onChange={(e) => setTempForm({ ...tempForm, roleName: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">Role Description</label>
                      <textarea 
                        rows="3"
                        value={tempForm.roleDescription}
                        onChange={(e) => setTempForm({ ...tempForm, roleDescription: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:bg-white resize-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">Responsibilities</label>
                      <textarea 
                        rows="4"
                        value={tempForm.responsibility}
                        onChange={(e) => setTempForm({ ...tempForm, responsibility: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:bg-white resize-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">Additional Requirements</label>
                      <textarea 
                        rows="2"
                        value={tempForm.additionalRequirements}
                        onChange={(e) => setTempForm({ ...tempForm, additionalRequirements: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:bg-white resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">Min Salary</label>
                        <input 
                          type="number" 
                          value={tempForm.minSalary}
                          onChange={(e) => setTempForm({ ...tempForm, minSalary: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">Max Salary</label>
                        <input 
                          type="number" 
                          value={tempForm.maxSalary}
                          onChange={(e) => setTempForm({ ...tempForm, maxSalary: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">Start Time</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 09:00"
                          value={tempForm.shiftStartTime}
                          onChange={(e) => setTempForm({ ...tempForm, shiftStartTime: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">End Time</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 18:00"
                          value={tempForm.shiftEndTime}
                          onChange={(e) => setTempForm({ ...tempForm, shiftEndTime: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 text-left">
                    {/* Header */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-ping" />
                        <span className="text-[8px] font-black text-slate-900 uppercase tracking-widest">Active Broadcasting</span>
                      </div>
                      <h4 className="text-xl font-black text-slate-900 mt-2 tracking-tight leading-none uppercase">{roleName || selectedRoleKey}</h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">{companyName}</p>
                      
                      <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[8px] font-black uppercase mt-4">
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
                  navigate('/supplier/labor-request');
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

export default SupplierCreateJobRequisition;
