import React, { useEffect, useState, useMemo } from 'react';
import { 
  Users as UsersIcon, Mail, Phone, MoreHorizontal, ShieldAlert, UserCheck, 
  Activity, Zap, Search, Filter, Eye, Edit2, Trash2, CheckCircle, XCircle, 
  UserPlus, X, Save, Check, Ban, Clock, Info, RotateCw, ChevronDown, FileText, MapPin,
  AlertTriangle, Archive, Loader2, Building2, User, CreditCard, Lock, Shield, Copy, Sparkles, Landmark
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSearchParams } from 'react-router-dom';
import { adminApi, BASE_URL, serviceApi } from '../../../lib/api';
import PageHeader from '../components/common/PageHeader';
import DataGrid from '../components/tables/DataGrid';
import StatusBadge from '../components/common/StatusBadge';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, UserAvatarCell, TagBadge } from '@/shared/components/ui/table';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const typeParam = searchParams.get('type');
  const vendorTypeParam = searchParams.get('vendorType');
  const [activeTab, setActiveTab] = useState(roleParam || 'All');
  const [selectedCustomerType, setSelectedCustomerType] = useState(typeParam || 'All');
  const [selectedVendorType, setSelectedVendorType] = useState(vendorTypeParam || 'All');

  useEffect(() => {
    if (roleParam && ['All', 'Customer', 'Vendor', 'Supplier'].includes(roleParam)) {
      setActiveTab(roleParam);
    } else if (!roleParam) {
      setActiveTab('All');
    }
  }, [roleParam]);

  useEffect(() => {
    if (typeParam && ['individual', 'retail'].includes(typeParam)) {
      setSelectedCustomerType(typeParam);
    } else {
      setSelectedCustomerType('All');
    }
  }, [typeParam]);

  useEffect(() => {
    if (vendorTypeParam && ['All', 'registered', 'unregistered'].includes(vendorTypeParam)) {
      setSelectedVendorType(vendorTypeParam);
    } else {
      setSelectedVendorType('All');
    }
  }, [vendorTypeParam]);    
  const [selectedName, setSelectedName] = useState('All');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedPincode, setSelectedPincode] = useState('All');

  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');

  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState('');

  const [showPincodeDropdown, setShowPincodeDropdown] = useState(false);
  const [pincodeSearchQuery, setPincodeSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [geofences, setGeofences] = useState([]);
  const [selectedGeofence, setSelectedGeofence] = useState('All');
  const [showGeofenceDropdown, setShowGeofenceDropdown] = useState(false);
  const [geofenceSearchQuery, setGeofenceSearchQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  
  // Modals state
  const [editingUser, setEditingUser] = useState(null);
  const [selectedAddressForModal, setSelectedAddressForModal] = useState(null);
  const [rejectionModal, setRejectionModal] = useState(null); // { userId, serviceId }
  const [rejectionReason, setRejectionReason] = useState('');
  const [customServices, setCustomServices] = useState([]); // Services from 'Service' collection for current editing user
  const [isSaving, setIsSaving] = useState(false);
  const [deleteModalUser, setDeleteModalUser] = useState(null);
  const [deleteRelatedData, setDeleteRelatedData] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [nameSearchQuery, setNameSearchQuery] = useState('');

  const tabs = ['All', 'Customer', 'Vendor', 'Supplier'];

  const [masterServices, setMasterServices] = useState([]);

  const fetchMasterServices = async () => {
    try {
      const msRes = await fetch(`${BASE_URL}/master-services`);
      const msData = await msRes.json();
      console.log('📦 [ADMIN_DEBUG] Loaded Master Services:', msData.length);
      setMasterServices(Array.isArray(msData) ? msData : []);
    } catch (err) {
      console.error('Fetch master services error:', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const role = activeTab === 'All' ? null : activeTab;
      const res = await adminApi.getAllUsers(role);
      setUsers(res);
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGeofences = async () => {
    try {
      const res = await fetch(`${BASE_URL}/geofence/areas`);
      const data = await res.json();
      setGeofences(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch geofences error:', err);
    }
  };

  useEffect(() => {
    fetchMasterServices();
    fetchGeofences();
  }, []);

  useEffect(() => {
    fetchUsers();
    setPage(1); // Reset page on tab change
    setSelectedName('All');
    setSelectedCity('All');
    setSelectedState('All');
    setSelectedPincode('All');
    setSelectedStatus('All');
    setSelectedGeofence('All');
    if (activeTab !== 'Customer') {
      setSelectedCustomerType('All');
    }
    if (activeTab !== 'Vendor') {
      setSelectedVendorType('All');
    }
  }, [activeTab]);

  useEffect(() => {
    setPage(1); // Reset page on search change
  }, [searchQuery]);

  useEffect(() => {
    // REFRESHED VENDOR SERVICE FETCHER
    const fetchVendorCustomServices = async () => {
        if (editingUser && editingUser.role === 'Vendor') {
            console.log('🔄 [SYNC] Fetching custom services for vendor:', editingUser._id);
            try {
                const res = await serviceApi.getAll({ vendorId: editingUser._id });
                console.log('✨ [SYNC] Custom services retrieved:', res.length);
                setCustomServices(res);
            } catch (err) {
                console.error('🔥 [SYNC] Fetch custom services error:', err);
            }
        } else {
            setCustomServices([]);
        }
    };
    fetchVendorCustomServices();
  }, [editingUser?._id]);

  const getServiceName = (id) => {
    if (!id) return 'Unknown';
    if (!masterServices || masterServices.length === 0) return `Node: ${id.toString().slice(-6).toUpperCase()}`;
    
    const service = masterServices.find(s => 
        (s._id && s._id.toString() === id.toString()) || 
        (s.id && s.id.toString() === id.toString())
    );
    
    return service ? service.name : `Node: ${id.toString().slice(-6).toUpperCase()}`;
  };

  const handleToggleStatus = async (userId) => {
    try {
        await adminApi.toggleUserStatus(userId);
        fetchUsers();
        toast.success('Status updated');
    } catch (err) {
        console.error('Toggle status error:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalUser) return;
    try {
      setIsDeleting(true);
      const res = await adminApi.deleteUser(deleteModalUser._id, deleteRelatedData);
      toast.success(res.message || 'User deleted successfully');
      setDeleteModalUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Delete user error:', err);
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('CRITICAL ACTION: This will delete ALL users (Customers, Vendors, Suppliers). Are you absolutely sure?')) {
        try {
            setLoading(true);
            const response = await fetch(`${BASE_URL}/admin/users-clear-all`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (response.ok) {
                toast.success(result.message);
                fetchUsers();
            } else {
                toast.error(result.message || 'Operation failed');
            }
        } catch (err) {
            console.error('Clear users error:', err);
            toast.error('Failed to clear users');
        } finally {
            setLoading(false);
        }
    }
  };

  const handleUpdateServiceStatus = async (userId, serviceId, status, message = '') => {
    if (status === 'rejected' && !message) {
        setRejectionModal({ userId, serviceId });
        return;
    }

    try {
        await adminApi.updateServiceStatus(userId, serviceId, { status, message });
        toast.success(`Service ${status}`);
        
        // Update local state for immediate UI feedback
        setEditingUser(prev => {
            if (!prev || prev._id !== userId) return prev;
            const updatedServices = prev.shopDetails.services.map(s => 
                s.id === serviceId ? { ...s, status, rejectionReason: message } : s
            );
            return { ...prev, shopDetails: { ...prev.shopDetails, services: updatedServices } };
        });

        // Also update main list
        setUsers(prev => prev.map(u => {
            if (u._id !== userId) return u;
            const updatedServices = u.shopDetails.services.map(s => 
                s.id === serviceId ? { ...s, status, rejectionReason: message } : s
            );
            return { ...u, shopDetails: { ...u.shopDetails, services: updatedServices } };
        }));

        setRejectionModal(null);
        setRejectionReason('');
    } catch (err) {
        toast.error('Failed to update service status');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
        setIsSaving(true);
        await adminApi.updateUserProfile(editingUser._id, editingUser);
        toast.success('Profile updated successfully');
        setEditingUser(null);
        fetchUsers();
    } catch (err) {
        toast.error('Failed to save profile');
    } finally {
        setIsSaving(false);
    }
  };

  const getUserLocationDetails = (u) => {
    let city = u.city || '';
    let state = u.state || '';
    let pincode = u.pincode || '';

    if (u.role === 'Customer') {
      const defAddr = u.addresses?.find(a => a.isDefault) || u.addresses?.[0];
      if (defAddr) {
        city = defAddr.city || city;
        state = defAddr.state || state;
        pincode = defAddr.pincode || pincode;
      }
    } else if (u.role === 'Vendor') {
      city = u.shopDetails?.city || city;
      state = u.shopDetails?.state || state;
      pincode = u.shopDetails?.pincode || pincode;
    } else if (u.role === 'Supplier') {
      city = u.supplierDetails?.city || city;
      state = u.supplierDetails?.state || state;
      pincode = u.supplierDetails?.pincode || pincode;
    }
    return { 
      city: city.trim(), 
      state: state.trim(), 
      pincode: pincode.toString().trim() 
    };
  };

  const uniqueNames = useMemo(() => {
    const names = users.map(u => u.displayName).filter(Boolean);
    return ['All', ...new Set(names)].sort();
  }, [users]);

  const uniqueCities = useMemo(() => {
    const cities = users.map(u => getUserLocationDetails(u).city).filter(Boolean);
    return ['All', ...new Set(cities)].sort();
  }, [users]);

  const uniqueStates = useMemo(() => {
    const states = users.map(u => getUserLocationDetails(u).state).filter(Boolean);
    return ['All', ...new Set(states)].sort();
  }, [users]);

  const uniquePincodes = useMemo(() => {
    const pincodes = users.map(u => getUserLocationDetails(u).pincode).filter(Boolean);
    return ['All', ...new Set(pincodes)].sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchName = selectedName === 'All' || u.displayName === selectedName;
      const loc = getUserLocationDetails(u);
      const matchCity = selectedCity === 'All' || loc.city === selectedCity;
      const matchState = selectedState === 'All' || loc.state === selectedState;
      const matchPincode = selectedPincode === 'All' || loc.pincode === selectedPincode;
      
      let matchStatus = true;
      if (selectedStatus !== 'All') {
        const userStatusText = u.status === 'approved' ? 'Active' : u.status === 'rejected' ? 'Blocked' : 'Pending';
        if (userStatusText !== selectedStatus) matchStatus = false;
      }

      let matchGeofence = true;
      if (selectedGeofence !== 'All') {
        const targetGeofence = geofences.find(g => (g.areaName || g.name) === selectedGeofence);
        if (targetGeofence) {
          const userPin = loc.pincode;
          matchGeofence = targetGeofence.pincodes?.includes(userPin);
        } else {
          matchGeofence = false;
        }
      }

      let matchCustomerType = true;
      if (u.role === 'Customer' && selectedCustomerType !== 'All') {
        matchCustomerType = u.customerType === selectedCustomerType;
      }

      let matchVendorType = true;
      if (u.role === 'Vendor' && selectedVendorType !== 'All') {
        const isRegistered = ['Pvt Ltd', 'Franchise'].includes(u.businessType);
        if (selectedVendorType === 'registered') {
          matchVendorType = isRegistered;
        } else if (selectedVendorType === 'unregistered') {
          matchVendorType = !isRegistered;
        }
      }
      
      return matchName && matchCity && matchState && matchPincode && matchStatus && matchGeofence && matchCustomerType && matchVendorType;
    });
  }, [users, selectedName, selectedCity, selectedState, selectedPincode, selectedStatus, selectedGeofence, geofences, selectedCustomerType, selectedVendorType]);

  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filteredUsers, page]);

  const columns = useMemo(() => {
    const baseCols = [
      { 
        header: 'Name', 
        key: 'displayName',
        render: (val, row) => {
          const displayVal = (row.role === 'Vendor' && row.ownerName) ? row.ownerName : (val || 'Unnamed User');
          return (
            <UserAvatarCell
              name={displayVal}
              subtitle={row.email || row.phone}
            />
          );
        }
      },
      {
        header: 'Email address',
        key: 'email',
        render: (val) => (
          <span className="text-[12px] text-slate-700 font-medium">
            {val || '—'}
          </span>
        )
      }
    ];

    if (activeTab === 'Vendor') {
      baseCols.push({
        header: 'Facility name',
        key: 'facilityName',
        render: (val, row) => (
          <span className="text-[12px] font-medium text-slate-900">
            {row.facilityName || '—'}
          </span>
        )
      });
    }

    baseCols.push({
      header: 'Contact number',
      key: 'phone',
      render: (val) => (
        <span className="text-[12px] text-slate-700 font-medium tabular-nums">
          {val || '—'}
        </span>
      )
    });

    if (activeTab !== 'Vendor') {
      baseCols.push({
        header: 'Role',
        key: 'role',
        render: (val) => (
          <TagBadge
            label={val || 'Customer'}
            color={val === 'Vendor' ? 'purple' : val === 'Supplier' ? 'blue' : 'slate'}
          />
        )
      });
    }

    if (activeTab !== 'Supplier') {
      baseCols.push({
        header: 'Type',
        key: 'customerType',
        render: (val, row) => {
          if (row.role === 'Vendor') {
            return (
              <TagBadge label={row.businessType || 'N/A'} color="slate" />
            );
          }
          if (row.role !== 'Customer') {
            return <span className="text-[12px] text-slate-400 font-medium">N/A</span>;
          }
          const isBusiness = val === 'retail';
          return (
            <TagBadge
              label={isBusiness ? 'Business' : 'Individual'}
              color={isBusiness ? 'indigo' : 'slate'}
            />
          );
        }
      });
    }

    if (activeTab === 'Supplier') {
      baseCols.push(
        {
          header: 'Type',
          key: 'supplierDetails',
          render: (val) => (
            <TagBadge label={val?.entityType || 'N/A'} color="slate" />
          )
        },
        {
          header: 'Designation',
          key: 'supplierDetails',
          render: (val) => (
            <span className="text-[12px] text-slate-600 font-medium">
              {val?.designation || '—'}
            </span>
          )
        },
        {
          header: 'GST number',
          key: 'supplierDetails',
          render: (val) => (
            <span className="text-[12px] text-slate-600 font-medium tabular-nums">
              {val?.gst || '—'}
            </span>
          )
        },
        {
          header: 'Business PAN',
          key: 'supplierDetails',
          render: (val) => (
            <span className="text-[12px] text-slate-600 font-medium tabular-nums">
              {val?.panNumber || '—'}
            </span>
          )
        },
        {
          header: 'Aadhaar number',
          key: 'supplierDetails',
          render: (val) => (
            <span className="text-[12px] text-slate-600 font-medium tabular-nums">
              {val?.aadhaarNumber || '—'}
            </span>
          )
        },
        {
          header: 'Bank name',
          key: 'bankDetails',
          render: (val) => (
            <span className="text-[12px] text-slate-600 font-medium">
              {val?.bankName || '—'}
            </span>
          )
        },
        {
          header: 'Account number',
          key: 'bankDetails',
          render: (val) => (
            <span className="text-[12px] text-slate-600 font-medium tabular-nums">
              {val?.accountNumber || '—'}
            </span>
          )
        },
        {
          header: 'IFSC code',
          key: 'bankDetails',
          render: (val) => (
            <span className="text-[12px] text-slate-600 font-medium tabular-nums">
              {val?.ifscCode || '—'}
            </span>
          )
        },
        {
          header: 'Categories',
          key: 'supplierDetails',
          render: (val) => {
            const categories = val?.supplyCategories || [];
            if (categories.length === 0) return <span className="text-[12px] text-slate-400 font-medium">—</span>;
            return (
              <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                {categories.map((cat, index) => (
                  <TagBadge key={index} label={cat} color="blue" />
                ))}
              </div>
            );
          }
        }
      );
    }

    if (activeTab === 'Customer' && selectedCustomerType === 'retail') {
      baseCols.push(
        {
          header: 'Business Name',
          key: 'businessName',
          render: (val, row) => {
            if (row.role !== 'Customer' || row.customerType !== 'retail') {
              return <span className="text-[10px] text-slate-400 font-bold uppercase">N/A</span>;
            }
            return (
              <span className="text-[10px] text-slate-900 font-black uppercase tracking-tight truncate max-w-[150px]" title={val}>
                {val || 'N/A'}
              </span>
            );
          }
        },
        {
          header: 'GST Number',
          key: 'gstNumber',
          render: (val, row) => {
            if (row.role !== 'Customer' || row.customerType !== 'retail') {
              return <span className="text-[10px] text-slate-400 font-bold uppercase">N/A</span>;
            }
            return (
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider tabular-nums">
                {val || 'N/A'}
              </span>
            );
          }
        },
        {
          header: 'Business Address',
          key: 'businessAddress',
          render: (val, row) => {
            if (row.role !== 'Customer' || row.customerType !== 'retail') {
              return <span className="text-[10px] text-slate-400 font-bold uppercase">N/A</span>;
            }
            return (
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide truncate max-w-[200px]" title={val}>
                {val || 'N/A'}
              </span>
            );
          }
        }
      );
    }


    if (activeTab === 'Vendor' && selectedVendorType === 'registered') {
      baseCols.push(
        {
          header: 'PAN Card Number',
          key: 'panNumber',
          render: (val, row) => (
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider tabular-nums">
              {row.panNumber || 'N/A'}
            </span>
          )
        },
        {
          header: 'GST Number',
          key: 'gstNumber',
          render: (val, row) => {
            const gstVal = row.gstNumber || row.shopDetails?.gst;
            return (
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider tabular-nums">
                {gstVal || 'N/A'}
              </span>
            );
          }
        }
      );
    }

    if (activeTab === 'Vendor' && selectedVendorType === 'unregistered') {
      baseCols.push(
        {
          header: 'Aadhaar Number',
          key: 'aadharNumber',
          render: (val, row) => (
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider tabular-nums">
              {row.aadharNumber || 'N/A'}
            </span>
          )
        }
      );
    }

    if (activeTab === 'Vendor') {
      baseCols.push(
        {
          header: 'Bank Name',
          key: 'bankDetails',
          render: (val) => (
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wide">
              {val?.bankName || 'N/A'}
            </span>
          )
        },
        {
          header: 'Account Number',
          key: 'bankDetails',
          render: (val) => (
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider tabular-nums">
              {val?.accountNumber || 'N/A'}
            </span>
          )
        },
        {
          header: 'Bank IFSC Code',
          key: 'bankDetails',
          render: (val) => (
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider tabular-nums">
              {val?.ifscCode || 'N/A'}
            </span>
          )
        }
      );
    }

    if (activeTab === 'Customer' && selectedCustomerType === 'individual') {
      baseCols.push({
        header: 'Location',
        key: 'addresses',
        render: (val, row) => {
          const addresses = row.addresses || [];
          if (addresses.length === 0) {
            if (row.address) {
              return (
                <button
                  onClick={() => setSelectedAddressForModal({ type: 'Home', address: row.address })}
                  className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all cursor-pointer"
                >
                  Home
                </button>
              );
            }
            return <span className="text-[10px] text-slate-400 font-bold uppercase">No Address Set</span>;
          }
          return (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {addresses.map((addr, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedAddressForModal(addr)}
                  className="px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-900 hover:text-white hover:border-blue-900 transition-all cursor-pointer shadow-sm"
                >
                  {addr.type || 'Home'}
                </button>
              ))}
            </div>
          );
        }
      });
    } else if (activeTab === 'Vendor' || activeTab === 'Supplier') {
      baseCols.push({
        header: 'Location',
        key: 'address',
        render: (val, row) => {
          const isSupplier = row.role === 'Supplier';
          const addressVal = isSupplier 
            ? (row.supplierDetails?.address || row.address || val)
            : (row.shopDetails?.address || row.address || val);
            
          if (!addressVal) {
            return <span className="text-[10px] text-slate-400 font-bold uppercase">No Address Set</span>;
          }
          
          const cityVal = isSupplier ? (row.supplierDetails?.city || row.city) : (row.shopDetails?.city || row.city);
          const stateVal = isSupplier ? (row.supplierDetails?.state || row.state) : (row.shopDetails?.state || row.state);
          const pincodeVal = isSupplier ? (row.supplierDetails?.pincode || row.pincode) : (row.shopDetails?.pincode || row.pincode);

          return (
            <button
              onClick={() => setSelectedAddressForModal({
                type: 'Default',
                address: addressVal,
                city: cityVal,
                state: stateVal,
                pincode: pincodeVal,
                location: row.location
              })}
              className="px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-900 hover:text-white hover:border-blue-900 transition-all cursor-pointer shadow-sm"
            >
              Default
            </button>
          );
        }
      });
    } else {
      baseCols.push({
        header: 'Location',
        key: 'address',
        render: (val) => (
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide truncate max-w-[200px]" title={val}>
            {val || 'No Address Set'}
          </span>
        )
      });
    }

    baseCols.push(
      { 
        header: 'Registration', 
        key: 'createdAt',
        render: (val) => (
          <span className="text-[12px] text-slate-700 font-medium tabular-nums">
            {new Date(val).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )
      },
      { 
        header: 'Status', 
        key: 'status', 
        render: (val) => <StatusBadge status={val === 'approved' ? 'Active' : val === 'rejected' ? 'Blocked' : 'Pending'} /> 
      },
      { 
        header: 'Actions', 
        key: 'actions', 
        align: 'right',
        render: (_, row) => (
          <div className="flex items-center justify-end gap-1.5">
            <button 
              onClick={() => setEditingUser(JSON.parse(JSON.stringify(row)))}
              title="Edit Full Profile" 
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Edit2 size={16} />
            </button>
            <button 
              onClick={() => {
                setDeleteModalUser(row);
                setDeleteRelatedData(false);
              }}
              title="Delete User" 
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )
      }
    );

    return baseCols;
  }, [selectedCustomerType, activeTab, selectedVendorType]);

  const handleExportFile = (format) => {
    try {
      const headers = [
        "Name", "Contact Number", "Role", "Type", "Business Name", "GST Number", "Business Address", "Location", "Registration Date", "Status"
      ];
      
      const rows = filteredUsers.map(u => [
        u.displayName || 'Unnamed User',
        u.phone || 'N/A',
        u.role || 'Customer',
        u.role === 'Customer' ? (u.customerType === 'retail' ? 'Business' : 'Individual') : 'N/A',
        (u.role === 'Customer' && u.customerType === 'retail') ? (u.businessName || 'N/A') : 'N/A',
        (u.role === 'Customer' && u.customerType === 'retail') ? (u.gstNumber || 'N/A') : 'N/A',
        (u.role === 'Customer' && u.customerType === 'retail') ? (u.businessAddress || 'N/A') : 'N/A',
        u.address || 'No Address Set',
        new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        u.status === 'approved' ? 'Active' : u.status === 'rejected' ? 'Blocked' : 'Pending'
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

      // Auto-fit column widths to prevent text clipping in Excel
      ws['!cols'] = headers.map((header, colIndex) => {
        let maxLen = header.length;
        rows.forEach(row => {
          const val = row[colIndex];
          if (val !== undefined && val !== null) {
            const strVal = String(val);
            if (strVal.length > maxLen) {
              maxLen = strVal.length;
            }
          }
        });
        return { wch: Math.min(Math.max(maxLen + 3, 12), 50) };
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Users");

      if (format === 'excel') {
        XLSX.writeFile(wb, `${activeTab}_Users_Export_${new Date().getTime()}.xlsx`);
      } else if (format === 'csv') {
        XLSX.writeFile(wb, `${activeTab}_Users_Export_${new Date().getTime()}.csv`, { bookType: 'csv' });
      }
      toast.success(`${format.toUpperCase()} export downloaded successfully`);
    } catch (err) {
      console.error(`Export ${format} error:`, err);
      toast.error(`Error exporting to ${format}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
      <PageHeader 
        title="" 
        actions={[
          {
            customComponent: (
              <div className="relative">
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="px-3 py-1.5 rounded-sm font-bold text-[9px] uppercase tracking-[0.2em] transition-all flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <FileText size={13} />
                  Export Users List
                  <ChevronDown size={12} className={`transition-transform duration-200 ${showExportDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showExportDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowExportDropdown(false)} />
                    <div className="absolute right-0 mt-1.5 w-32 bg-white border border-slate-200 rounded-sm shadow-lg z-50 py-1 text-left">
                      <button
                        onClick={() => {
                          setShowExportDropdown(false);
                          handleExportFile('excel');
                        }}
                        className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                      >
                        Excel
                      </button>
                      <button
                        onClick={() => {
                          setShowExportDropdown(false);
                          handleExportFile('csv');
                        }}
                        className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                      >
                        CSV
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          }
        ]}
      />



      <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        <DataGrid 
          title=""
          showTotalEntities={false}
          leftContent={null}
          columns={columns}
          data={paginatedUsers}
          loading={loading}
          showSearch={false}
          showFilter={false}
          actions={
            <div className="flex items-center gap-3 justify-end">
              {/* Geofence Filter (Searchable Custom Dropdown) */}
              <div className="relative flex items-center w-[160px] z-[40]">
                  <button
                      onClick={() => setShowGeofenceDropdown(!showGeofenceDropdown)}
                      className="w-full flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 hover:bg-slate-100/50 focus:border-slate-300 outline-none cursor-pointer transition-all"
                  >
                      <span className="truncate">{selectedGeofence === 'All' ? 'Geofences' : selectedGeofence}</span>
                      <ChevronDown size={12} className="text-slate-400" />
                  </button>
                  {showGeofenceDropdown && (
                      <>
                          <div className="fixed inset-0 z-40" onClick={() => {
                              setShowGeofenceDropdown(false);
                              setGeofenceSearchQuery('');
                          }} />
                          <div className="absolute left-0 top-full mt-1 w-[200px] bg-white border border-slate-200 rounded-sm shadow-lg z-50 py-1 text-left flex flex-col max-h-[250px] overflow-hidden">
                              <div className="p-1.5 border-b border-slate-100">
                                  <input 
                                      type="text"
                                      placeholder="Search geofence..."
                                      value={geofenceSearchQuery}
                                      onChange={(e) => setGeofenceSearchQuery(e.target.value)}
                                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-sm outline-none focus:border-slate-300 text-[10px] font-bold"
                                      autoFocus
                                  />
                              </div>
                              <div className="overflow-y-auto flex-1 text-[10px] font-bold uppercase tracking-wider">
                                  <button
                                      onClick={() => {
                                          setSelectedGeofence('All');
                                          setPage(1);
                                          setShowGeofenceDropdown(false);
                                          setGeofenceSearchQuery('');
                                      }}
                                      className={`w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors ${selectedGeofence === 'All' ? 'bg-slate-100 text-slate-900' : 'text-slate-700'}`}
                                  >
                                      Geofences
                                  </button>
                                  {geofences
                                      .map(g => g.areaName || g.name)
                                      .filter(Boolean)
                                      .filter(name => name.toLowerCase().includes(geofenceSearchQuery.toLowerCase()))
                                      .map(name => (
                                          <button
                                              key={name}
                                              onClick={() => {
                                                  setSelectedGeofence(name);
                                                  setPage(1);
                                                  setShowGeofenceDropdown(false);
                                                  setGeofenceSearchQuery('');
                                              }}
                                              className={`w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors truncate ${selectedGeofence === name ? 'bg-slate-100 text-slate-900' : 'text-slate-700'}`}
                                              title={name}
                                          >
                                              {name}
                                          </button>
                                      ))
                                  }
                              </div>
                          </div>
                      </>
                  )}
              </div>

              {/* Role Filter */}
              {!roleParam && (
                  <div className="relative flex items-center w-[160px]">
                      <select
                          value={activeTab}
                          onChange={(e) => {
                              const val = e.target.value;
                              setActiveTab(val);
                              setSearchParams(val === 'All' ? {} : { role: val });
                          }}
                          className="w-full appearance-none bg-slate-50 border border-slate-200/80 rounded-sm pl-4 pr-10 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 hover:bg-slate-100/50 focus:border-slate-300 outline-none cursor-pointer transition-all"
                      >
                          {tabs.map(tab => (
                              <option key={tab} value={tab}>{tab === 'All' ? 'Role' : `${tab}s`}</option>
                          ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 pointer-events-none text-slate-400" />
                  </div>
              )}

              {/* Customer Type Filter (Visible only when on Customer Tab) */}
              {activeTab === 'Customer' && !typeParam && (
                  <div className="relative flex items-center w-[160px]">
                      <select
                          value={selectedCustomerType}
                          onChange={(e) => {
                              const val = e.target.value;
                              setSelectedCustomerType(val);
                              setSearchParams(val === 'All' ? { role: 'Customer' } : { role: 'Customer', type: val });
                          }}
                          className="w-full appearance-none bg-slate-50 border border-slate-200/80 rounded-sm pl-4 pr-10 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 hover:bg-slate-100/50 focus:border-slate-300 outline-none cursor-pointer transition-all"
                      >
                          <option value="All">Customers</option>
                          <option value="individual">Individual</option>
                          <option value="retail">Business</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-3 pointer-events-none text-slate-400" />
                  </div>
              )}

              {/* Vendor Type Filter (Visible only when on Vendor Tab) */}
              {activeTab === 'Vendor' && !vendorTypeParam && (
                  <div className="relative flex items-center w-[160px]">
                      <select
                          value={selectedVendorType}
                          onChange={(e) => {
                              const val = e.target.value;
                              setSelectedVendorType(val);
                              setSearchParams(val === 'All' ? { role: 'Vendor' } : { role: 'Vendor', vendorType: val });
                          }}
                          className="w-full appearance-none bg-slate-50 border border-slate-200/80 rounded-sm pl-4 pr-10 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 hover:bg-slate-100/50 focus:border-slate-300 outline-none cursor-pointer transition-all"
                      >
                          <option value="All">Vendors</option>
                          <option value="registered">Registered</option>
                          <option value="unregistered">Unregistered</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-3 pointer-events-none text-slate-400" />
                  </div>
              )}

              {/* Name Filter (Searchable Custom Dropdown) */}
              <div className="relative flex items-center w-[160px] z-[40]">
                  <button
                      onClick={() => setShowNameDropdown(!showNameDropdown)}
                      className="w-full flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-sm px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 hover:bg-slate-100/50 focus:border-slate-300 outline-none cursor-pointer transition-all"
                  >
                      <span className="truncate">{selectedName === 'All' ? 'Names' : selectedName}</span>
                      <ChevronDown size={12} className="text-slate-400" />
                  </button>
                  {showNameDropdown && (
                      <>
                          <div className="fixed inset-0 z-40" onClick={() => {
                              setShowNameDropdown(false);
                              setNameSearchQuery('');
                          }} />
                          <div className="absolute left-0 top-full mt-1 w-[200px] bg-white border border-slate-200 rounded-sm shadow-lg z-50 py-1 text-left flex flex-col max-h-[250px] overflow-hidden">
                              <div className="p-1.5 border-b border-slate-100">
                                  <input 
                                      type="text"
                                      placeholder="Search name..."
                                      value={nameSearchQuery}
                                      onChange={(e) => setNameSearchQuery(e.target.value)}
                                      className="w-full px-2 py-1.5 text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-sm outline-none focus:border-slate-300"
                                      autoFocus
                                  />
                              </div>
                              <div className="overflow-y-auto flex-1 text-[10px] font-bold uppercase tracking-wider">
                                  <button
                                      onClick={() => {
                                          setSelectedName('All');
                                          setPage(1);
                                          setShowNameDropdown(false);
                                          setNameSearchQuery('');
                                      }}
                                      className={`w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors ${selectedName === 'All' ? 'bg-slate-100 text-slate-900' : 'text-slate-700'}`}
                                  >
                                      Names
                                  </button>
                                  {uniqueNames
                                      .filter(name => name !== 'All')
                                      .filter(name => name.toLowerCase().includes(nameSearchQuery.toLowerCase()))
                                      .map(name => (
                                          <button
                                              key={name}
                                              onClick={() => {
                                                  setSelectedName(name);
                                                  setPage(1);
                                                  setShowNameDropdown(false);
                                                  setNameSearchQuery('');
                                              }}
                                              className={`w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors truncate ${selectedName === name ? 'bg-slate-100 text-slate-900' : 'text-slate-700'}`}
                                              title={name}
                                          >
                                              {name}
                                          </button>
                                      ))
                                  }
                              </div>
                          </div>
                      </>
                  )}
              </div>

              {/* City Filter (Searchable Custom Dropdown) */}
              <div className="relative flex items-center w-[130px] z-[40]">
                  <button
                      onClick={() => setShowCityDropdown(!showCityDropdown)}
                      className="w-full flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 hover:bg-slate-100/50 focus:border-slate-300 outline-none cursor-pointer transition-all"
                  >
                      <span className="truncate">{selectedCity === 'All' ? 'Cities' : selectedCity}</span>
                      <ChevronDown size={12} className="text-slate-400" />
                  </button>
                  {showCityDropdown && (
                      <>
                          <div className="fixed inset-0 z-40" onClick={() => {
                              setShowCityDropdown(false);
                              setCitySearchQuery('');
                          }} />
                          <div className="absolute left-0 top-full mt-1 w-[160px] bg-white border border-slate-200 rounded-sm shadow-lg z-50 py-1 text-left flex flex-col max-h-[250px] overflow-hidden">
                              <div className="p-1.5 border-b border-slate-100">
                                  <input 
                                      type="text"
                                      placeholder="Search city..."
                                      value={citySearchQuery}
                                      onChange={(e) => setCitySearchQuery(e.target.value)}
                                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-sm outline-none focus:border-slate-300 text-[10px] font-bold"
                                      autoFocus
                                  />
                              </div>
                              <div className="overflow-y-auto flex-1 text-[10px] font-bold uppercase tracking-wider">
                                  <button
                                      onClick={() => {
                                          setSelectedCity('All');
                                          setPage(1);
                                          setShowCityDropdown(false);
                                          setCitySearchQuery('');
                                      }}
                                      className={`w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors ${selectedCity === 'All' ? 'bg-slate-100 text-slate-900' : 'text-slate-700'}`}
                                  >
                                      Cities
                                  </button>
                                  {uniqueCities
                                      .filter(city => city !== 'All')
                                      .filter(city => city.toLowerCase().includes(citySearchQuery.toLowerCase()))
                                      .map(city => (
                                          <button
                                              key={city}
                                              onClick={() => {
                                                  setSelectedCity(city);
                                                  setPage(1);
                                                  setShowCityDropdown(false);
                                                  setCitySearchQuery('');
                                              }}
                                              className={`w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors truncate ${selectedCity === city ? 'bg-slate-100 text-slate-900' : 'text-slate-700'}`}
                                              title={city}
                                          >
                                              {city}
                                          </button>
                                      ))
                                  }
                              </div>
                          </div>
                      </>
                  )}
              </div>

              {/* State Filter (Searchable Custom Dropdown) */}
              <div className="relative flex items-center w-[130px] z-[40]">
                  <button
                      onClick={() => setShowStateDropdown(!showStateDropdown)}
                      className="w-full flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 hover:bg-slate-100/50 focus:border-slate-300 outline-none cursor-pointer transition-all"
                  >
                      <span className="truncate">{selectedState === 'All' ? 'States' : selectedState}</span>
                      <ChevronDown size={12} className="text-slate-400" />
                  </button>
                  {showStateDropdown && (
                      <>
                          <div className="fixed inset-0 z-40" onClick={() => {
                              setShowStateDropdown(false);
                              setStateSearchQuery('');
                          }} />
                          <div className="absolute left-0 top-full mt-1 w-[160px] bg-white border border-slate-200 rounded-sm shadow-lg z-50 py-1 text-left flex flex-col max-h-[250px] overflow-hidden">
                              <div className="p-1.5 border-b border-slate-100">
                                  <input 
                                      type="text"
                                      placeholder="Search state..."
                                      value={stateSearchQuery}
                                      onChange={(e) => setStateSearchQuery(e.target.value)}
                                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-sm outline-none focus:border-slate-300 text-[10px] font-bold"
                                      autoFocus
                                  />
                              </div>
                              <div className="overflow-y-auto flex-1 text-[10px] font-bold uppercase tracking-wider">
                                  <button
                                      onClick={() => {
                                          setSelectedState('All');
                                          setPage(1);
                                          setShowStateDropdown(false);
                                          setStateSearchQuery('');
                                      }}
                                      className={`w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors ${selectedState === 'All' ? 'bg-slate-100 text-slate-900' : 'text-slate-700'}`}
                                  >
                                      States
                                  </button>
                                  {uniqueStates
                                      .filter(state => state !== 'All')
                                      .filter(state => state.toLowerCase().includes(stateSearchQuery.toLowerCase()))
                                      .map(state => (
                                          <button
                                              key={state}
                                              onClick={() => {
                                                  setSelectedState(state);
                                                  setPage(1);
                                                  setShowStateDropdown(false);
                                                  setStateSearchQuery('');
                                              }}
                                              className={`w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors truncate ${selectedState === state ? 'bg-slate-100 text-slate-900' : 'text-slate-700'}`}
                                              title={state}
                                          >
                                              {state}
                                          </button>
                                      ))
                                  }
                              </div>
                          </div>
                      </>
                  )}
              </div>

              {/* Pincode Filter (Searchable Custom Dropdown) */}
              <div className="relative flex items-center w-[130px] z-[40]">
                  <button
                      onClick={() => setShowPincodeDropdown(!showPincodeDropdown)}
                      className="w-full flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 hover:bg-slate-100/50 focus:border-slate-300 outline-none cursor-pointer transition-all"
                  >
                      <span className="truncate">{selectedPincode === 'All' ? 'Pincodes' : selectedPincode}</span>
                      <ChevronDown size={12} className="text-slate-400" />
                  </button>
                  {showPincodeDropdown && (
                      <>
                          <div className="fixed inset-0 z-40" onClick={() => {
                              setShowPincodeDropdown(false);
                              setPincodeSearchQuery('');
                          }} />
                          <div className="absolute left-0 top-full mt-1 w-[160px] bg-white border border-slate-200 rounded-sm shadow-lg z-50 py-1 text-left flex flex-col max-h-[250px] overflow-hidden">
                              <div className="p-1.5 border-b border-slate-100">
                                  <input 
                                      type="text"
                                      placeholder="Search pincode..."
                                      value={pincodeSearchQuery}
                                      onChange={(e) => setPincodeSearchQuery(e.target.value)}
                                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-sm outline-none focus:border-slate-300 text-[10px] font-bold"
                                      autoFocus
                                  />
                              </div>
                              <div className="overflow-y-auto flex-1 text-[10px] font-bold uppercase tracking-wider">
                                  <button
                                      onClick={() => {
                                          setSelectedPincode('All');
                                          setPage(1);
                                          setShowPincodeDropdown(false);
                                          setPincodeSearchQuery('');
                                      }}
                                      className={`w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors ${selectedPincode === 'All' ? 'bg-slate-100 text-slate-900' : 'text-slate-700'}`}
                                  >
                                      Pincodes
                                  </button>
                                  {uniquePincodes
                                      .filter(pin => pin !== 'All')
                                      .filter(pin => pin.toLowerCase().includes(pincodeSearchQuery.toLowerCase()))
                                      .map(pin => (
                                          <button
                                              key={pin}
                                              onClick={() => {
                                                  setSelectedPincode(pin);
                                                  setPage(1);
                                                  setShowPincodeDropdown(false);
                                                  setPincodeSearchQuery('');
                                              }}
                                              className={`w-full text-left px-4 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors truncate ${selectedPincode === pin ? 'bg-slate-100 text-slate-900' : 'text-slate-700'}`}
                                              title={pin}
                                          >
                                              {pin}
                                          </button>
                                      ))
                                  }
                              </div>
                          </div>
                      </>
                  )}
              </div>

              {/* Status Filter */}
              <div className="relative flex items-center w-[130px]">
                  <select
                      value={selectedStatus}
                      onChange={(e) => {
                          setSelectedStatus(e.target.value);
                          setPage(1);
                      }}
                      className="w-full appearance-none bg-slate-50 border border-slate-200/80 rounded-sm pl-4 pr-10 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 hover:bg-slate-100/50 focus:border-slate-300 outline-none cursor-pointer transition-all"
                  >
                      <option value="All">Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Blocked">Blocked</option>
                      {activeTab !== 'Customer' && <option value="Pending">Pending</option>}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 pointer-events-none text-slate-400" />
              </div>
            </div>
          }
          pagination={{
            page,
            totalPages: Math.ceil(filteredUsers.length / itemsPerPage) || 1,
            total: filteredUsers.length
          }}
          onPageChange={setPage}
        />
      </div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    onClick={() => setEditingUser(null)}
                    className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="bg-white w-full max-w-5xl max-h-[92vh] rounded-3xl sm:rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col overflow-hidden border border-slate-200/80"
                >
                    {/* Modal Header */}
                    <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-900/20 shrink-0">
                                <Edit2 size={20} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">Edit Partner Profile</h3>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                        editingUser.role === 'Vendor' 
                                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                                            : editingUser.role === 'Customer'
                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}>
                                        {editingUser.role}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs font-semibold text-slate-400">
                                    <span>Account ID:</span>
                                    <span className="font-mono text-slate-700 font-bold">{editingUser._id}</span>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(editingUser._id);
                                            toast.success('Account ID copied to clipboard');
                                        }}
                                        className="text-slate-400 hover:text-slate-700 p-0.5 transition-colors cursor-pointer"
                                        title="Copy Account ID"
                                    >
                                        <Copy size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setEditingUser(null)} 
                            className="w-10 h-10 rounded-full hover:bg-slate-200/70 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors border border-slate-200/80 shadow-2xs shrink-0 cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-10">
                        {/* Section 01: Personal & Business Details */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-black text-xs">
                                    01
                                </span>
                                <div>
                                    <h4 className="font-black text-sm uppercase tracking-wide text-slate-900">Personal & Business Details</h4>
                                    <p className="text-xs text-slate-400 font-medium">Primary profile, identity, and registered contact credentials</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {editingUser.role === 'Vendor' && !['Pvt Ltd', 'Franchise'].includes(editingUser.businessType) ? (
                                    <>
                                        {/* Owner Name */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Owner Full Name</label>
                                            <div className="relative flex items-center rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                                <div className="pl-3.5 pr-2 text-slate-400">
                                                    <User size={16} />
                                                </div>
                                                <input 
                                                    value={editingUser.ownerName || ''} 
                                                    onChange={(e) => setEditingUser({...editingUser, ownerName: e.target.value})}
                                                    placeholder="Owner name"
                                                    className="w-full py-3 pr-3.5 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-300" 
                                                />
                                            </div>
                                        </div>

                                        {/* Facility Name */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Facility / Store Name</label>
                                            <div className="relative flex items-center rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                                <div className="pl-3.5 pr-2 text-slate-400">
                                                    <Building2 size={16} />
                                                </div>
                                                <input 
                                                    value={editingUser.facilityName || ''} 
                                                    onChange={(e) => setEditingUser({...editingUser, facilityName: e.target.value})}
                                                    placeholder="Store or facility name"
                                                    className="w-full py-3 pr-3.5 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-300" 
                                                />
                                            </div>
                                        </div>

                                        {/* Business Entity Type */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Business Entity Type</label>
                                            <div className="relative flex items-center rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                                <div className="pl-3.5 pr-2 text-slate-400">
                                                    <Building2 size={16} />
                                                </div>
                                                <select
                                                    value={editingUser.businessType || 'Proprietorship'}
                                                    onChange={(e) => setEditingUser({...editingUser, businessType: e.target.value})}
                                                    className="w-full py-3 pr-8 bg-transparent text-sm font-semibold text-slate-900 outline-none cursor-pointer"
                                                >
                                                    <option value="Proprietorship">Proprietorship</option>
                                                    <option value="Partnership">Partnership</option>
                                                    <option value="Unregistered/Local">Unregistered/Local</option>
                                                </select>
                                                <ChevronDown size={15} className="absolute right-3 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* Phone Number (Read-only) */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                                <span>Phone Number</span>
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                                    <Lock size={10} /> Verified
                                                </span>
                                            </label>
                                            <div className="relative flex items-center rounded-xl bg-slate-50 border border-slate-200/70 shadow-2xs cursor-not-allowed">
                                                <div className="pl-3.5 pr-2 text-slate-400">
                                                    <Phone size={16} />
                                                </div>
                                                <input 
                                                    disabled
                                                    value={editingUser.phone || ''} 
                                                    className="w-full py-3 pr-3.5 bg-transparent text-sm font-bold text-slate-500 outline-none cursor-not-allowed font-mono" 
                                                />
                                            </div>
                                        </div>

                                        {/* Aadhaar Number */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Aadhaar Number</label>
                                            <div className="relative flex items-center rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                                <div className="pl-3.5 pr-2 text-slate-400">
                                                    <Shield size={16} />
                                                </div>
                                                <input 
                                                    value={editingUser.aadharNumber || ''} 
                                                    onChange={(e) => setEditingUser({...editingUser, aadharNumber: e.target.value})}
                                                    placeholder="12-digit Aadhaar number"
                                                    className="w-full py-3 pr-3.5 bg-transparent text-sm font-mono font-semibold text-slate-900 outline-none placeholder:text-slate-300" 
                                                />
                                            </div>
                                        </div>

                                        {/* Address */}
                                        <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
                                            <label className="text-xs font-bold text-slate-700">Registered Facility Address</label>
                                            <div className="relative flex items-center rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                                <div className="pl-3.5 pr-2 text-slate-400">
                                                    <MapPin size={16} />
                                                </div>
                                                <input 
                                                    value={editingUser.address || ''} 
                                                    onChange={(e) => setEditingUser({...editingUser, address: e.target.value})}
                                                    placeholder="Enter full address..."
                                                    className="w-full py-3 pr-3.5 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-300" 
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Full Name */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Full Name</label>
                                            <div className="relative flex items-center rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                                <div className="pl-3.5 pr-2 text-slate-400">
                                                    <User size={16} />
                                                </div>
                                                <input 
                                                    value={editingUser.displayName || ''} 
                                                    onChange={(e) => setEditingUser({...editingUser, displayName: e.target.value})}
                                                    placeholder="Partner name"
                                                    className="w-full py-3 pr-3.5 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-300" 
                                                />
                                            </div>
                                        </div>

                                        {/* Phone Number (Read-only) */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                                <span>Phone Number</span>
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                                    <Lock size={10} /> Verified
                                                </span>
                                            </label>
                                            <div className="relative flex items-center rounded-xl bg-slate-50 border border-slate-200/70 shadow-2xs cursor-not-allowed">
                                                <div className="pl-3.5 pr-2 text-slate-400">
                                                    <Phone size={16} />
                                                </div>
                                                <input 
                                                    disabled
                                                    value={editingUser.phone || ''} 
                                                    className="w-full py-3 pr-3.5 bg-transparent text-sm font-bold text-slate-500 outline-none cursor-not-allowed font-mono" 
                                                />
                                            </div>
                                        </div>

                                        {/* Email Address */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Email Address</label>
                                            <div className="relative flex items-center rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                                <div className="pl-3.5 pr-2 text-slate-400">
                                                    <Mail size={16} />
                                                </div>
                                                <input 
                                                    value={editingUser.email || ''} 
                                                    onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                                                    placeholder="partner@example.com"
                                                    className="w-full py-3 pr-3.5 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-300" 
                                                />
                                            </div>
                                        </div>

                                        {!(editingUser.role === 'Customer' && editingUser.customerType === 'individual') && (
                                            <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
                                                <label className="text-xs font-bold text-slate-700">Address</label>
                                                <div className="relative flex items-center rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                                    <div className="pl-3.5 pr-2 text-slate-400">
                                                        <MapPin size={16} />
                                                    </div>
                                                    <input 
                                                        value={editingUser.address || ''} 
                                                        onChange={(e) => setEditingUser({...editingUser, address: e.target.value})}
                                                        placeholder="Enter complete address..."
                                                        className="w-full py-3 pr-3.5 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-300" 
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {(editingUser.role === 'Vendor' || editingUser.role === 'Supplier') && (
                                            <>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-700">Shop / Business Name</label>
                                                    <div className="relative flex items-center rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                                        <div className="pl-3.5 pr-2 text-slate-400">
                                                            <Building2 size={16} />
                                                        </div>
                                                        <input 
                                                            value={editingUser.role === 'Vendor' ? (editingUser.shopDetails?.name || '') : (editingUser.supplierDetails?.businessName || '')} 
                                                            onChange={(e) => {
                                                                if(editingUser.role === 'Vendor') {
                                                                    setEditingUser({...editingUser, shopDetails: {...editingUser.shopDetails, name: e.target.value}});
                                                                } else {
                                                                    setEditingUser({...editingUser, supplierDetails: {...editingUser.supplierDetails, businessName: e.target.value}});
                                                                }
                                                            }}
                                                            placeholder="Registered business name"
                                                            className="w-full py-3 pr-3.5 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-300" 
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-700">GST Number</label>
                                                    <div className="relative flex items-center rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                                        <div className="pl-3.5 pr-2 text-slate-400">
                                                            <FileText size={16} />
                                                        </div>
                                                        <input 
                                                            value={editingUser.role === 'Vendor' ? (editingUser.shopDetails?.gst || '') : (editingUser.supplierDetails?.gst || '')} 
                                                            onChange={(e) => {
                                                                const val = e.target.value.toUpperCase();
                                                                if(editingUser.role === 'Vendor') {
                                                                    setEditingUser({...editingUser, shopDetails: {...editingUser.shopDetails, gst: val}});
                                                                } else {
                                                                    setEditingUser({...editingUser, supplierDetails: {...editingUser.supplierDetails, gst: val}});
                                                                }
                                                            }}
                                                            placeholder="15-digit GSTIN"
                                                            className="w-full py-3 pr-3.5 bg-transparent text-sm font-mono uppercase font-semibold text-slate-900 outline-none placeholder:text-slate-300" 
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {editingUser.role === 'Customer' && (
                                            <>
                                                {/* Customer Type Indicator */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                                        <span>Customer Type</span>
                                                        <span className="text-[10px] font-bold text-slate-400">Account Classification</span>
                                                    </label>
                                                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
                                                            {editingUser.customerType === 'retail' ? <Building2 size={16} /> : <User size={16} />}
                                                        </div>
                                                        <div>
                                                            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide block">
                                                                {editingUser.customerType === 'retail' ? 'Business (Retail)' : 'Individual Account'}
                                                            </span>
                                                            <span className="text-[10px] font-medium text-slate-400">
                                                                {editingUser.customerType === 'retail' ? 'Commercial B2B Buyer' : 'Consumer B2C Buyer'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Individual Customer Addresses */}
                                                {editingUser.customerType === 'individual' && (
                                                    <div className="md:col-span-2 lg:col-span-3 space-y-3 pt-2">
                                                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                                            <MapPin size={14} className="text-rose-500" />
                                                            Saved Delivery Address{(!editingUser.addresses || editingUser.addresses.length <= 1) ? '' : 'es'}
                                                        </label>
                                                        {(!editingUser.addresses || editingUser.addresses.length === 0) ? (
                                                            <div className="relative flex items-center rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                                                <div className="pl-3.5 pr-2 text-slate-400">
                                                                    <MapPin size={16} />
                                                                </div>
                                                                <input 
                                                                    value={editingUser.address || ''} 
                                                                    onChange={(e) => setEditingUser({...editingUser, address: e.target.value})}
                                                                    placeholder="Enter complete residential address..."
                                                                    className="w-full py-3 pr-3.5 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-300" 
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {editingUser.addresses.map((addr, idx) => (
                                                                    <div key={idx} className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-2">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                                                                <MapPin size={12} className="text-indigo-600" />
                                                                                Address 0{idx + 1}
                                                                            </span>
                                                                            <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded-md text-[10px] font-bold uppercase">
                                                                                {addr.type || 'Home'}
                                                                            </span>
                                                                        </div>
                                                                        <input 
                                                                            value={addr.address || ''} 
                                                                            onChange={(e) => {
                                                                                const updatedAddresses = [...(editingUser.addresses || [])];
                                                                                updatedAddresses[idx] = { ...addr, address: e.target.value };
                                                                                setEditingUser({ ...editingUser, addresses: updatedAddresses });
                                                                            }}
                                                                            className="w-full p-2.5 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 transition-all" 
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Retail Business Customer Details */}
                                                {editingUser.customerType === 'retail' && (
                                                    <>
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-bold text-slate-700">Business Name</label>
                                                            <div className="relative flex items-center rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                                                <div className="pl-3.5 pr-2 text-slate-400">
                                                                    <Building2 size={16} />
                                                                </div>
                                                                <input 
                                                                    value={editingUser.businessName || ''} 
                                                                    onChange={(e) => setEditingUser({...editingUser, businessName: e.target.value})}
                                                                    placeholder="Retail enterprise name"
                                                                    className="w-full py-3 pr-3.5 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-300" 
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-bold text-slate-700">GST Number</label>
                                                            <div className="relative flex items-center rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                                                <div className="pl-3.5 pr-2 text-slate-400">
                                                                    <FileText size={16} />
                                                                </div>
                                                                <input 
                                                                    value={editingUser.gstNumber || ''} 
                                                                    onChange={(e) => setEditingUser({...editingUser, gstNumber: e.target.value.toUpperCase()})}
                                                                    placeholder="15-digit GSTIN"
                                                                    className="w-full py-3 pr-3.5 bg-transparent text-sm font-mono uppercase font-semibold text-slate-900 outline-none placeholder:text-slate-300" 
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
                                                            <label className="text-xs font-bold text-slate-700">Business Address</label>
                                                            <div className="relative flex items-center rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                                                <div className="pl-3.5 pr-2 text-slate-400">
                                                                    <MapPin size={16} />
                                                                </div>
                                                                <input 
                                                                    value={editingUser.businessAddress || ''} 
                                                                    onChange={(e) => setEditingUser({...editingUser, businessAddress: e.target.value})}
                                                                    placeholder="Commercial registered address"
                                                                    className="w-full py-3 pr-3.5 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-300" 
                                                                />
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </section>

                        {/* Services Auditing (ONLY FOR REGISTERED VENDORS) */}
                        {editingUser.role === 'Vendor' && ['Pvt Ltd', 'Franchise'].includes(editingUser.businessType) && (
                            <section className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-black text-xs">02</span>
                                        <div>
                                            <h4 className="font-black text-sm uppercase tracking-wide text-slate-900">Service Nodes & Pricing Approval</h4>
                                            <p className="text-xs text-slate-400 font-medium">Verify custom menu items and tier-based commission rates</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const fetchVendorCustomServices = async () => {
                                                if (editingUser && editingUser.role === 'Vendor') {
                                                    try {
                                                        const res = await serviceApi.getAll({ vendorId: editingUser._id });
                                                        setCustomServices(res);
                                                        toast.success('Services synchronized');
                                                    } catch (err) {
                                                        console.error('Fetch error:', err);
                                                    }
                                                }
                                            };
                                            fetchVendorCustomServices();
                                        }}
                                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                                    >
                                        <RotateCw size={13} />
                                        Sync Services
                                    </button>
                                </div>
                                <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
                                    <Table>
                                        <TableHeader className="bg-slate-50/80">
                                            <TableRow>
                                                <TableHead className="font-black text-[10px] uppercase tracking-wider text-slate-500">Service Title</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase tracking-wider text-slate-500">Category</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase tracking-wider text-slate-500">Base Price</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase tracking-wider text-slate-500">Audit Status</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase tracking-wider text-slate-500 text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {((customServices.length > 0 ? customServices : editingUser.shopDetails?.services) || []).map((svc, idx) => (
                                                <TableRow key={svc._id || idx} className="hover:bg-slate-50/50">
                                                    <TableCell className="font-bold text-xs text-slate-900">{svc.title}</TableCell>
                                                    <TableCell><TagBadge color="slate">{svc.category}</TagBadge></TableCell>
                                                    <TableCell className="font-black text-xs font-mono text-slate-800">₹{svc.price}</TableCell>
                                                    <TableCell>
                                                        <StatusBadge 
                                                            status={svc.approvalStatus || 'Pending'} 
                                                            color={
                                                                svc.approvalStatus === 'Approved' ? 'emerald' :
                                                                svc.approvalStatus === 'Rejected' ? 'rose' : 'amber'
                                                            } 
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {svc.approvalStatus !== 'Approved' && (
                                                                <button 
                                                                    onClick={() => handleUpdateServiceStatus(editingUser._id, svc._id, 'approved')}
                                                                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
                                                                    title="Approve Service"
                                                                >
                                                                    <Check size={13} />
                                                                </button>
                                                            )}
                                                            {svc.approvalStatus !== 'Rejected' && (
                                                                <button 
                                                                    onClick={() => handleUpdateServiceStatus(editingUser._id, svc._id, 'rejected')}
                                                                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                                                                    title="Reject Service"
                                                                >
                                                                    <Ban size={13} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {(!editingUser.shopDetails?.services?.length && !customServices.length) && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="p-8 text-center text-xs font-semibold text-slate-400 italic">No custom services configured for this vendor</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </section>
                        )}

                        {/* Settlement & Bank Configuration */}
                        {!(editingUser.role === 'Customer' && editingUser.customerType === 'individual') && (
                            <section className="space-y-4 pt-2">
                                <div className="flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-black text-xs">
                                        {editingUser.role === 'Vendor' && ['Pvt Ltd', 'Franchise'].includes(editingUser.businessType) ? '03' : '02'}
                                    </span>
                                    <div>
                                        <h4 className="font-black text-sm uppercase tracking-wide text-slate-900">Settlement & Bank Configuration</h4>
                                        <p className="text-xs text-slate-400 font-medium">Payout disbursement account credentials and IFSC verification</p>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                        {/* Account Holder */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Account Holder Name</label>
                                            <div className="relative flex items-center rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                                <div className="pl-3.5 pr-2 text-slate-400">
                                                    <User size={16} />
                                                </div>
                                                <input 
                                                    value={editingUser.bankDetails?.accountHolder || ''} 
                                                    onChange={(e) => setEditingUser({...editingUser, bankDetails: {...editingUser.bankDetails, accountHolder: e.target.value}})}
                                                    placeholder="Account holder"
                                                    className="w-full py-3 pr-3.5 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-300" 
                                                />
                                            </div>
                                        </div>

                                        {/* Bank Name */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Bank Name</label>
                                            <div className="relative flex items-center rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                                <div className="pl-3.5 pr-2 text-slate-400">
                                                    <Landmark size={16} />
                                                </div>
                                                <input 
                                                    value={editingUser.bankDetails?.bankName || ''} 
                                                    onChange={(e) => setEditingUser({...editingUser, bankDetails: {...editingUser.bankDetails, bankName: e.target.value}})}
                                                    placeholder="e.g. HDFC Bank"
                                                    className="w-full py-3 pr-3.5 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-300" 
                                                />
                                            </div>
                                        </div>

                                        {/* Account Number */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Account Number</label>
                                            <div className="relative flex items-center rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                                <div className="pl-3.5 pr-2 text-slate-400">
                                                    <CreditCard size={16} />
                                                </div>
                                                <input 
                                                    value={editingUser.bankDetails?.accountNumber || ''} 
                                                    onChange={(e) => setEditingUser({...editingUser, bankDetails: {...editingUser.bankDetails, accountNumber: e.target.value}})}
                                                    placeholder="Account number"
                                                    className="w-full py-3 pr-3.5 bg-transparent text-sm font-mono font-semibold text-slate-900 outline-none placeholder:text-slate-300" 
                                                />
                                            </div>
                                        </div>

                                        {/* Bank IFSC Code */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Bank IFSC Code</label>
                                            <div className="relative flex items-center rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                                                <div className="pl-3.5 pr-2 text-slate-400">
                                                    <FileText size={16} />
                                                </div>
                                                <input 
                                                    value={editingUser.bankDetails?.ifscCode || ''} 
                                                    onChange={(e) => setEditingUser({...editingUser, bankDetails: {...editingUser.bankDetails, ifscCode: e.target.value.toUpperCase()}})}
                                                    placeholder="HDFC0001234"
                                                    className="w-full py-3 pr-3.5 bg-transparent text-sm font-mono uppercase font-semibold text-slate-900 outline-none placeholder:text-slate-300" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Modal Footer */}
                    <div className="p-6 sm:p-8 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => {
                                    const nextStatus = editingUser.status === 'rejected' ? 'approved' : 'rejected';
                                    setEditingUser({ ...editingUser, status: nextStatus });
                                    toast.success(nextStatus === 'rejected' ? 'Partner marked as Blocked' : 'Partner marked as Active');
                                }}
                                className={`w-full sm:w-auto px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer ${
                                    editingUser.status === 'rejected'
                                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                }`}
                            >
                                {editingUser.status === 'rejected' ? <CheckCircle size={15} /> : <Ban size={15} />}
                                {editingUser.status === 'rejected' ? 'Unblock Partner' : 'Block Partner'}
                            </button>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                            <button 
                                onClick={() => setEditingUser(null)}
                                className="flex-1 sm:flex-initial px-6 py-3 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="flex-1 sm:flex-initial px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-slate-900/20 hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                            >
                                {isSaving ? <RotateCw size={14} className="animate-spin" /> : <Save size={14} />}
                                {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Custom Rejection Modal */}
      <AnimatePresence>
        {rejectionModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setRejectionModal(null)}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden"
                >
                    <div className="p-8 bg-rose-600 text-white flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                                <Ban size={24} />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tighter">Service Rejection</h3>
                        </div>
                        <button onClick={() => setRejectionModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-10 space-y-6">
                        <div className="space-y-2">
                             <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Rejection Reason</label>
                             <textarea 
                                autoFocus
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="PLEASE EXPLAIN WHY THIS SERVICE IS BEING REJECTED..."
                                className="w-full h-32 p-5 bg-slate-50 border border-slate-100 rounded-3xl text-xs font-bold outline-none focus:border-rose-500 transition-all resize-none uppercase tracking-wider"
                             />
                        </div>
                        
                        <div className="flex items-start gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                             <ShieldAlert size={16} className="text-rose-500 mt-1 shrink-0" />
                             <p className="text-[9px] text-rose-600 font-bold leading-relaxed uppercase tracking-widest">
                                This message will be sent directly to the vendor. Clear communication helps partners resolve issues faster.
                             </p>
                        </div>
                    </div>

                    <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                        <button 
                            onClick={() => setRejectionModal(null)}
                            className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white transition-all"
                        >
                            Dismiss
                        </button>
                        <button 
                            onClick={() => handleUpdateServiceStatus(rejectionModal.userId, rejectionModal.serviceId, 'rejected', rejectionReason)}
                            disabled={!rejectionReason.trim()}
                            className="flex-[2] py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-rose-600/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                            Confirm Rejection
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Address Details Modal */}
      <AnimatePresence>
        {selectedAddressForModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAddressForModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col overflow-hidden border border-slate-100"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                    <MapPin size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Address Details</span>
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{selectedAddressForModal.type || 'Home'}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedAddressForModal(null)} 
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors border border-slate-200 shadow-sm bg-white"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 text-left">
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Full Address</span>
                  <span className="text-xs font-bold text-slate-800 block leading-relaxed uppercase">{selectedAddressForModal.address}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">City</span>
                    <span className="text-xs font-bold text-slate-800 block uppercase">{selectedAddressForModal.city || 'N/A'}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">State</span>
                    <span className="text-xs font-bold text-slate-800 block uppercase">
                      {(() => {
                        if (selectedAddressForModal.state) return selectedAddressForModal.state;
                        const addrText = selectedAddressForModal.address || '';
                        const statesList = [
                          'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
                          'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
                          'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
                          'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
                          'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
                          'Delhi', 'Jammu & Kashmir', 'Jammu and Kashmir', 'Ladakh', 'Puducherry'
                        ];
                        const matched = statesList.find(s => addrText.toLowerCase().includes(s.toLowerCase()));
                        return matched || 'N/A';
                      })()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Pincode</span>
                    <span className="text-xs font-bold text-slate-800 block tracking-wider tabular-nums">{selectedAddressForModal.pincode || 'N/A'}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Coordinates</span>
                    <span className="text-xs font-bold text-slate-800 block tracking-tight tabular-nums">
                      {selectedAddressForModal.location?.lat ? `${selectedAddressForModal.location.lat.toFixed(4)}, ${selectedAddressForModal.location.lng.toFixed(4)}` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedAddressForModal(null)}
                  className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all shadow-md shadow-slate-900/10"
                >
                  Close Window
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {deleteModalUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-sm shrink-0">
                    <Trash2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">Delete User Account</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {deleteModalUser.displayName || deleteModalUser.ownerName || deleteModalUser.shopDetails?.name || 'Unnamed User'} 
                      <span className="mx-1.5 text-slate-300">•</span>
                      <span className="font-bold text-slate-700">{deleteModalUser.role}</span>
                      <span className="mx-1.5 text-slate-300">•</span>
                      <span className="tabular-nums">{deleteModalUser.phone}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !isDeleting && setDeleteModalUser(null)}
                  disabled={isDeleting}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/60 flex items-start gap-3">
                  <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                  <div className="text-xs text-amber-900 leading-relaxed">
                    <span className="font-bold">Attention Admin: </span> 
                    Please choose how you want to handle this user's existing history, orders, and payment data upon deletion.
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                    Do you want to delete the existing data also?
                  </span>

                  {/* Option 1: Preserve History (deleteRelatedData = false) */}
                  <label
                    onClick={() => setDeleteRelatedData(false)}
                    className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      !deleteRelatedData
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                        : 'border-slate-100 bg-slate-50/60 hover:border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deleteOption"
                      checked={!deleteRelatedData}
                      onChange={() => setDeleteRelatedData(false)}
                      className="mt-1 h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">
                          Delete User Only (Preserve History)
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        Deletes the user account from the database, but safely preserves past orders and payments. Related historical records will be updated to display as <strong className="text-slate-800 font-bold">Ex-{deleteModalUser.role}: {deleteModalUser.displayName || deleteModalUser.phone}</strong> for accounting and tracking.
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Delete Everything (deleteRelatedData = true) */}
                  <label
                    onClick={() => setDeleteRelatedData(true)}
                    className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      deleteRelatedData
                        ? 'border-rose-600 bg-rose-50/40 shadow-sm'
                        : 'border-slate-100 bg-slate-50/60 hover:border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deleteOption"
                      checked={deleteRelatedData}
                      onChange={() => setDeleteRelatedData(true)}
                      className="mt-1 h-4 w-4 text-rose-600 border-slate-300 focus:ring-rose-500"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-rose-950">
                          Delete User & All Related Data
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700">
                          Permanent Wipeout
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        Completely purges this user and wipes out all associated order history, payment records, payouts, tickets, and data. <span className="text-rose-600 font-semibold">This cannot be undone.</span>
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteModalUser(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs font-black tracking-wide flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 ${
                    deleteRelatedData
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                  }`}
                >
                  {isDeleting && <Loader2 size={14} className="animate-spin" />}
                  {isDeleting 
                    ? 'Deleting...' 
                    : deleteRelatedData 
                      ? 'Confirm & Purge Everything' 
                      : 'Confirm & Preserve History'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


