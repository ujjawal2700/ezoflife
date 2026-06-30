import React, { useEffect, useState, useMemo } from 'react';
import { 
  Users as UsersIcon, Mail, Phone, MoreHorizontal, ShieldAlert, UserCheck, 
  Activity, Zap, Search, Filter, Eye, Edit2, Trash2, CheckCircle, XCircle, 
  UserPlus, X, Save, Check, Ban, Clock, Info, RotateCw, ChevronDown, FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { adminApi, BASE_URL, serviceApi } from '../../../lib/api';
import PageHeader from '../components/common/PageHeader';
import DataGrid from '../components/tables/DataGrid';
import StatusBadge from '../components/common/StatusBadge';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All'); 
  const [selectedName, setSelectedName] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  
  // Modals state
  const [editingUser, setEditingUser] = useState(null);
  const [rejectionModal, setRejectionModal] = useState(null); // { userId, serviceId }
  const [rejectionReason, setRejectionReason] = useState('');
  const [customServices, setCustomServices] = useState([]); // Services from 'Service' collection for current editing user
  const [isSaving, setIsSaving] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

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

  useEffect(() => {
    fetchMasterServices();
  }, []);

  useEffect(() => {
    fetchUsers();
    setPage(1); // Reset page on tab change
    setSelectedName('All');
    setSelectedLocation('All');
    setSelectedStatus('All');
    setStartDate('');
    setEndDate('');
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

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
        try {
            await adminApi.deleteUser(userId);
            fetchUsers();
            toast.success('User deleted');
        } catch (err) {
            console.error('Delete user error:', err);
        }
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

  const uniqueNames = useMemo(() => {
    const names = users.map(u => u.displayName).filter(Boolean);
    return ['All', ...new Set(names)].sort();
  }, [users]);

  const uniqueLocations = useMemo(() => {
    const locations = users.map(u => u.address).filter(Boolean);
    return ['All', ...new Set(locations)].sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchName = selectedName === 'All' || u.displayName === selectedName;
      const matchLocation = selectedLocation === 'All' || u.address === selectedLocation;
      
      let matchStatus = true;
      if (selectedStatus !== 'All') {
        const userStatusText = u.status === 'approved' ? 'Active' : u.status === 'rejected' ? 'Blocked' : 'Pending';
        if (userStatusText !== selectedStatus) matchStatus = false;
      }

      let matchDate = true;
      if (u.createdAt) {
        const userDate = new Date(u.createdAt);
        userDate.setHours(0, 0, 0, 0);
        
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (userDate < start) matchDate = false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (userDate > end) matchDate = false;
        }
      } else if (startDate || endDate) {
        matchDate = false;
      }
      
      return matchName && matchLocation && matchStatus && matchDate;
    });
  }, [users, selectedName, selectedLocation, selectedStatus, startDate, endDate]);

  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filteredUsers, page]);

  const columns = useMemo(() => [
    { 
      header: 'Name', 
      key: 'displayName',
      render: (val) => (
        <span className="font-black text-slate-900 text-[11px] uppercase tracking-tight">
          {val || 'Unnamed User'}
        </span>
      )
    },
    {
      header: 'Contact Number',
      key: 'phone',
      render: (val) => (
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider tabular-nums">
          {val || 'N/A'}
        </span>
      )
    },
    {
      header: 'Role',
      key: 'role',
      render: (val) => (
        <span className="text-[10px] text-slate-900 font-black uppercase tracking-widest bg-slate-100 border border-slate-200 px-2.5 py-1 rounded">
          {val || 'Customer'}
        </span>
      )
    },

    {
      header: 'Location',
      key: 'address',
      render: (val) => (
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide truncate max-w-[200px]" title={val}>
          {val || 'No Address Set'}
        </span>
      )
    },
    { 
      header: 'Registration', 
      key: 'createdAt',
      render: (val) => (
        <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">
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
        <div className="flex items-center justify-end gap-2">
          <button 
            onClick={() => setEditingUser(JSON.parse(JSON.stringify(row)))} // Deep clone for editing
            title="Edit Full Profile" 
            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm"
          >
            <Edit2 size={14} />
          </button>
          
          <button 
            onClick={() => handleToggleStatus(row._id)}
            title={row.status === 'approved' ? 'Block User' : 'Unblock User'}
            className={`p-2.5 rounded-xl border transition-all shadow-sm ${row.status === 'approved' ? 'bg-rose-50 border-rose-100 text-rose-500 hover:bg-rose-600 hover:text-white hover:border-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-500 hover:bg-emerald-600 hover:text-white hover:border-emerald-600'}`}
          >
            {row.status === 'approved' ? <ShieldAlert size={14} /> : <UserCheck size={14} />}
          </button>
          
          <button 
            onClick={() => handleDelete(row._id)} 
            title="Delete Account" 
            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ], [users]);

  const handleExportFile = (format) => {
    try {
      const headers = [
        "Name", "Contact Number", "Role", "Location", "Registration Date", "Status"
      ];
      
      const rows = filteredUsers.map(u => [
        u.displayName || 'Unnamed User',
        u.phone || 'N/A',
        u.role || 'Customer',
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
          leftContent={
            <div className="flex items-center gap-2">
              <input 
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200/80 rounded-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 hover:bg-slate-100/50 focus:border-slate-300 outline-none cursor-pointer transition-all"
              />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">to</span>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200/80 rounded-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 hover:bg-slate-100/50 focus:border-slate-300 outline-none cursor-pointer transition-all"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setPage(1);
                  }}
                  className="px-3 py-1.5 bg-rose-50 border border-rose-100 text-rose-500 hover:bg-rose-600 hover:text-white hover:border-rose-600 rounded-sm transition-all text-[9px] font-black uppercase tracking-wider"
                >
                  Clear
                </button>
              )}
            </div>
          }
          columns={columns}
          data={paginatedUsers}
          loading={loading}
          showSearch={false}
          showFilter={false}
          actions={
            <div className="flex items-center gap-3 justify-end">
              {/* Role Filter */}
              <div className="relative flex items-center w-[160px]">
                  <select
                      value={activeTab}
                      onChange={(e) => setActiveTab(e.target.value)}
                      className="w-full appearance-none bg-slate-50 border border-slate-200/80 rounded-sm pl-4 pr-10 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 hover:bg-slate-100/50 focus:border-slate-300 outline-none cursor-pointer transition-all"
                  >
                      {tabs.map(tab => (
                          <option key={tab} value={tab}>{tab}s</option>
                      ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 pointer-events-none text-slate-400" />
              </div>

              {/* Name Filter */}
              <div className="relative flex items-center w-[160px]">
                  <select
                      value={selectedName}
                      onChange={(e) => {
                          setSelectedName(e.target.value);
                          setPage(1);
                      }}
                      className="w-full appearance-none bg-slate-50 border border-slate-200/80 rounded-sm pl-4 pr-10 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 hover:bg-slate-100/50 focus:border-slate-300 outline-none cursor-pointer transition-all"
                  >
                      <option value="All">All Names</option>
                      {uniqueNames.filter(name => name !== 'All').map(name => (
                          <option key={name} value={name}>{name}</option>
                      ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 pointer-events-none text-slate-400" />
              </div>

              {/* Location Filter */}
              <div className="relative flex items-center w-[160px]">
                  <select
                      value={selectedLocation}
                      onChange={(e) => {
                          setSelectedLocation(e.target.value);
                          setPage(1);
                      }}
                      className="w-full appearance-none bg-slate-50 border border-slate-200/80 rounded-sm pl-4 pr-10 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 hover:bg-slate-100/50 focus:border-slate-300 outline-none cursor-pointer transition-all"
                  >
                      <option value="All">All Locations</option>
                      {uniqueLocations.filter(loc => loc !== 'All').map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                      ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 pointer-events-none text-slate-400" />
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
                      <option value="All">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Blocked">Blocked</option>
                      <option value="Pending">Pending</option>
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
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setEditingUser(null)}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col overflow-hidden"
                >
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
                                <Edit2 size={24} />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Edit Partner Profile</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Role: {editingUser.role} · ID: {editingUser._id}</p>
                            </div>
                        </div>
                        <button onClick={() => setEditingUser(null)} className="p-3 hover:bg-white rounded-full transition-colors border border-slate-200 shadow-sm">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-10 space-y-12">
                        {/* Basic Information */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs">01</span>
                                <h4 className="font-black text-sm uppercase tracking-widest text-slate-900">Personal & Business Details</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <input 
                                        value={editingUser.displayName || ''} 
                                        onChange={(e) => setEditingUser({...editingUser, displayName: e.target.value})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-slate-900 transition-all" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input 
                                        disabled
                                        value={editingUser.phone || ''} 
                                        className="w-full p-4 bg-slate-100 border border-slate-100 rounded-2xl text-xs font-bold text-slate-400 cursor-not-allowed" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <input 
                                        value={editingUser.email || ''} 
                                        onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-slate-900 transition-all" 
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Address</label>
                                    <input 
                                        value={editingUser.address || ''} 
                                        onChange={(e) => setEditingUser({...editingUser, address: e.target.value})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-slate-900 transition-all" 
                                    />
                                </div>
                                {(editingUser.role === 'Vendor' || editingUser.role === 'Supplier') && (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Shop/Business Name</label>
                                            <input 
                                                value={editingUser.role === 'Vendor' ? (editingUser.shopDetails?.name || '') : (editingUser.supplierDetails?.businessName || '')} 
                                                onChange={(e) => {
                                                    if(editingUser.role === 'Vendor') {
                                                        setEditingUser({...editingUser, shopDetails: {...editingUser.shopDetails, name: e.target.value}});
                                                    } else {
                                                        setEditingUser({...editingUser, supplierDetails: {...editingUser.supplierDetails, businessName: e.target.value}});
                                                    }
                                                }}
                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-slate-900 transition-all" 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">GST Number</label>
                                            <input 
                                                value={editingUser.role === 'Vendor' ? (editingUser.shopDetails?.gst || '') : (editingUser.supplierDetails?.gst || '')} 
                                                onChange={(e) => {
                                                    if(editingUser.role === 'Vendor') {
                                                        setEditingUser({...editingUser, shopDetails: {...editingUser.shopDetails, gst: e.target.value}});
                                                    } else {
                                                        setEditingUser({...editingUser, supplierDetails: {...editingUser.supplierDetails, gst: e.target.value}});
                                                    }
                                                }}
                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-slate-900 transition-all" 
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </section>

                        {/* Services Auditing (ONLY FOR VENDORS) */}
                        {editingUser.role === 'Vendor' && (
                            <section className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <h4 className="font-black text-sm uppercase tracking-widest text-slate-900">Service Nodes & Pricing Approval</h4>
                                        <button 
                                            onClick={() => {
                                                console.log('🔄 Manual Sync Triggered');
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
                                            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-900 transition-all active:rotate-180 duration-500"
                                            title="Sync Services"
                                        >
                                            <RotateCw size={12} />
                                        </button>
                                    </div>
                                    <span className="px-3 py-1 bg-slate-100 text-[9px] font-black text-slate-500 rounded-full uppercase tracking-widest">
                                        {(editingUser.shopDetails?.services?.length || 0) + customServices.length} Nodes Found
                                    </span>
                                </div>

                                <div className="bg-slate-50 border border-slate-100 rounded-3xl overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-200/50 border-b border-slate-200">
                                                <th className="p-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                                                <th className="p-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Service Node</th>
                                                <th className="p-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Vendor Rate</th>
                                                <th className="p-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Current Status</th>
                                                <th className="p-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Moderation</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200/50">
                                            {/* 1. Master Services from ShopDetails */}
                                            {editingUser.shopDetails?.services?.map((svc, idx) => (
                                                <tr key={`master-${idx}`} className="hover:bg-white/50 transition-colors">
                                                    <td className="p-5">
                                                        <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[7px] font-black uppercase tracking-widest">Master</span>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{getServiceName(svc.id)}</span>
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ID: {svc.id?.slice(-6).toUpperCase()}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-center text-xs font-black text-slate-900 tabular-nums">₹{svc.vendorRate}</td>
                                                    <td className="p-5 text-center">
                                                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${svc.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : svc.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                                                            {svc.status || 'pending'}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {svc.status !== 'approved' && (
                                                                <button 
                                                                    onClick={() => handleUpdateServiceStatus(editingUser._id, svc.id, 'approved')}
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-white border border-slate-200 text-slate-300 hover:text-emerald-500 hover:border-emerald-200 hover:bg-emerald-50"
                                                                >
                                                                    <Check size={14} />
                                                                </button>
                                                            )}
                                                            {svc.status !== 'rejected' && (
                                                                <button 
                                                                    onClick={() => handleUpdateServiceStatus(editingUser._id, svc.id, 'rejected')}
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-white border border-slate-200 text-slate-300 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50"
                                                                >
                                                                    <Ban size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* 2. Custom Services from Collection */}
                                            {customServices.map((svc, idx) => (
                                                <tr key={`custom-${idx}`} className="hover:bg-white/50 transition-colors">
                                                    <td className="p-5">
                                                        <span className="px-2 py-0.5 bg-indigo-500 text-white rounded text-[7px] font-black uppercase tracking-widest">Custom</span>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{svc.name}</span>
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">CATEGORY: {svc.category}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-center text-xs font-black text-slate-900 tabular-nums">₹{svc.basePrice}</td>
                                                    <td className="p-5 text-center">
                                                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${svc.approvalStatus === 'Approved' ? 'bg-emerald-50 text-emerald-600' : svc.approvalStatus === 'Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                                                            {svc.approvalStatus || 'Pending'}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {svc.approvalStatus !== 'Approved' && (
                                                                <button 
                                                                    onClick={() => handleUpdateServiceStatus(editingUser._id, svc._id, 'approved')}
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-white border border-slate-200 text-slate-300 hover:text-emerald-500 hover:border-emerald-200 hover:bg-emerald-50"
                                                                >
                                                                    <Check size={14} />
                                                                </button>
                                                            )}
                                                            {svc.approvalStatus !== 'Rejected' && (
                                                                <button 
                                                                    onClick={() => handleUpdateServiceStatus(editingUser._id, svc._id, 'rejected')}
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-white border border-slate-200 text-slate-300 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50"
                                                                >
                                                                    <Ban size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!editingUser.shopDetails?.services?.length && !customServices.length) && (
                                                <tr>
                                                    <td colSpan={5} className="p-10 text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">No service nodes configured for this vendor</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {/* Settlement Information */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black text-xs">03</span>
                                <h4 className="font-black text-sm uppercase tracking-widest text-slate-900">Settlement & Bank Configuration</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Holder</label>
                                    <input 
                                        value={editingUser.bankDetails?.accountHolder || ''} 
                                        onChange={(e) => setEditingUser({...editingUser, bankDetails: {...editingUser.bankDetails, accountHolder: e.target.value}})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-slate-900 transition-all" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Bank Name</label>
                                    <input 
                                        value={editingUser.bankDetails?.bankName || ''} 
                                        onChange={(e) => setEditingUser({...editingUser, bankDetails: {...editingUser.bankDetails, bankName: e.target.value}})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-slate-900 transition-all" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Number</label>
                                    <input 
                                        value={editingUser.bankDetails?.accountNumber || ''} 
                                        onChange={(e) => setEditingUser({...editingUser, bankDetails: {...editingUser.bankDetails, accountNumber: e.target.value}})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-slate-900 transition-all" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">IFSC Code</label>
                                    <input 
                                        value={editingUser.bankDetails?.ifscCode || ''} 
                                        onChange={(e) => setEditingUser({...editingUser, bankDetails: {...editingUser.bankDetails, ifscCode: e.target.value}})}
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-slate-900 transition-all" 
                                    />
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="p-8 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Info size={14} />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Audited by System Admin · Secure Session</span>
                        </div>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setEditingUser(null)}
                                className="px-10 py-4 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isSaving ? <RotateCw size={14} className="animate-spin" /> : <Save size={14} />}
                                {isSaving ? 'Synchronizing...' : 'Save Changes'}
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
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rejection Reason</label>
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
    </div>
  );
}


