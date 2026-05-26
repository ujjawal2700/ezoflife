import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardList, 
  Check, 
  X, 
  RotateCw,
  MessageSquare,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import { serviceApi } from '../../../lib/api';
import PageHeader from '../components/common/PageHeader';

export default function VendorServiceRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(null);
  const [selectedVendorName, setSelectedVendorName] = useState('');
  const [selectedItemName, setSelectedItemName] = useState('');
  const [selectedPrice, setSelectedPrice] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Fetch custom services (isMaster=false) that are pending approval
      const data = await serviceApi.getAll({ isMaster: false, approvalStatus: 'Pending' });
      if (Array.isArray(data)) {
        setRequests(data);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error('Fetch Requests Error:', err);
      toast.error('Failed to fetch service requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id, status) => {
    setIsProcessing(id);
    try {
      const approvalStatus = status === 'approved' ? 'Approved' : 'Rejected';
      const activeStatus = status === 'approved' ? 'Active' : 'Inactive';

      await serviceApi.update(id, { 
        approvalStatus, 
        status: activeStatus 
      });

      toast.success(`Service request ${status === 'approved' ? 'approved' : 'rejected'} successfully!`);
      fetchRequests();
    } catch (err) {
      console.error('Action Error:', err);
      toast.error('Action failed. Try again.');
    } finally {
      setIsProcessing(null);
    }
  };

  // Filter requests based on vendor name, item name, and price
  const filteredData = useMemo(() => {
    return requests.filter(req => {
      const vendorName = req.vendorId?.shopDetails?.name || req.vendorId?.displayName || 'Unknown Vendor';
      const matchesVendor = !selectedVendorName || vendorName === selectedVendorName;
      const matchesItemName = !selectedItemName || req.name === selectedItemName;
      const matchesPrice = !selectedPrice || String(req.basePrice) === selectedPrice;
      
      return matchesVendor && matchesItemName && matchesPrice;
    });
  }, [requests, selectedVendorName, selectedItemName, selectedPrice]);

  const uniqueVendorNames = useMemo(() => {
    const names = requests.map(r => r.vendorId?.shopDetails?.name || r.vendorId?.displayName || 'Unknown Vendor').filter(Boolean);
    return [...new Set(names)].sort();
  }, [requests]);

  const uniqueItemNames = useMemo(() => {
    const names = requests.map(r => r.name).filter(Boolean);
    return [...new Set(names)].sort();
  }, [requests]);

  const uniquePrices = useMemo(() => {
    const prices = requests.map(r => r.basePrice).filter(v => v !== undefined && v !== null);
    return [...new Set(prices)].sort((a, b) => a - b);
  }, [requests]);

  const paginatedData = useMemo(() => {
    return filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filteredData, page]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  useEffect(() => {
    setPage(1); // Reset page on filter changes
  }, [selectedVendorName, selectedItemName, selectedPrice]);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50/50 pb-20 font-sans">
      <PageHeader title="Vendor Service Request" />

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Table Container */}
        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
          
          {/* Header Bar with Filters */}
          <div className="px-8 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between bg-white gap-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-slate-900 rounded-sm" />
              <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.2em] leading-none mb-1">
                Custom Service Requests
              </h3>
              <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-400 text-[10px] font-bold tabular-nums tracking-widest leading-none">
                {filteredData.length} REQUESTS
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Vendor Name Filter */}
              <select
                value={selectedVendorName}
                onChange={e => setSelectedVendorName(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-[10px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none w-36 uppercase tracking-wider cursor-pointer"
              >
                <option value="">All Vendors</option>
                {uniqueVendorNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              {/* Item Name Filter */}
              <select
                value={selectedItemName}
                onChange={e => setSelectedItemName(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-[10px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none w-36 uppercase tracking-wider cursor-pointer"
              >
                <option value="">All Items</option>
                {uniqueItemNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              {/* Price Filter */}
              <select
                value={selectedPrice}
                onChange={e => setSelectedPrice(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-[10px] font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none w-36 uppercase tracking-wider cursor-pointer"
              >
                <option value="">All Prices</option>
                {uniquePrices.map(price => (
                  <option key={price} value={String(price)}>₹{price}</option>
                ))}
              </select>

              {/* Reset Button */}
              {(selectedVendorName || selectedItemName || selectedPrice) && (
                <button
                  onClick={() => {
                    setSelectedVendorName('');
                    setSelectedItemName('');
                    setSelectedPrice('');
                  }}
                  className="px-3 py-1.5 border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-900 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all bg-white cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Table Element */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="w-[18%] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Vendor Name</th>
                  <th className="w-[18%] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Item Name</th>
                  <th className="w-[12%] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Category</th>
                  <th className="w-[12%] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Sub Category</th>
                  <th className="w-[10%] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Price</th>
                  <th className="w-[18%] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Description</th>
                  <th className="w-[12%] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Service Requests...</p>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-32 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-4">
                        <ClipboardList size={32} />
                      </div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Queue Clear</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">No pending vendor service requests found.</p>
                    </td>
                  </tr>
                ) : paginatedData.map((req) => {
                  const shopName = req.vendorId?.shopDetails?.name || req.vendorId?.displayName || 'Unknown Vendor';
                  const phone = req.vendorId?.phone ? ` (${req.vendorId.phone})` : '';
                  return (
                    <tr key={req._id || req.id} className="hover:bg-slate-50/50 transition-colors group">
                      {/* Vendor Name */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900 tracking-tight whitespace-nowrap">
                            {shopName}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            {phone}
                          </span>
                        </div>
                      </td>
                      {/* Item Name */}
                      <td className="px-6 py-5">
                        <span className="text-xs font-black text-slate-700 tracking-tight whitespace-nowrap">
                          {req.name}
                        </span>
                      </td>
                      {/* Category */}
                      <td className="px-6 py-5">
                        <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                          {req.category}
                        </span>
                      </td>
                      {/* Sub Category */}
                      <td className="px-6 py-5">
                        <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                          {req.subCategory || 'N/A'}
                        </span>
                      </td>
                      {/* Price */}
                      <td className="px-6 py-5">
                        <span className="text-xs font-black text-slate-700 tabular-nums whitespace-nowrap">
                          ₹{req.basePrice} <span className="text-[8px] font-bold text-slate-400">/ {req.unit || 'kg'}</span>
                        </span>
                      </td>
                      {/* Description */}
                      <td className="px-6 py-5">
                        <p className="text-xs text-slate-500 font-bold max-w-xs break-words line-clamp-2" title={req.description}>
                          {req.description || 'No description provided.'}
                        </p>
                      </td>
                      {/* Actions */}
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <button
                            disabled={isProcessing !== null}
                            onClick={() => handleAction(req._id || req.id, 'rejected')}
                            className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all border border-rose-100 shadow-sm cursor-pointer disabled:opacity-50"
                            title="Reject Request"
                          >
                            <X size={18} />
                          </button>
                          <button
                            disabled={isProcessing !== null}
                            onClick={() => handleAction(req._id || req.id, 'approved')}
                            className="h-10 px-4 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg active:scale-95 whitespace-nowrap cursor-pointer disabled:opacity-50"
                          >
                            {isProcessing === (req._id || req.id) ? (
                              <RotateCw size={14} className="animate-spin" />
                            ) : (
                              <Check size={14} />
                            )}
                            {isProcessing === (req._id || req.id) ? 'Wait...' : 'Approve'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredData.length > 0 && (
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end transition-colors hover:bg-slate-100/30">
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(p => p - 1)}
                  className="p-1 px-3 border border-slate-200 text-[9px] font-bold uppercase tracking-widest rounded-sm bg-white hover:bg-slate-950 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Prev
                </button>
                <span className="px-4 text-[9px] font-black text-slate-900 tracking-widest tabular-nums bg-slate-200/50 h-6 flex items-center rounded-sm whitespace-nowrap">
                  PG {String(page).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
                </span>
                <button
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage(p => p + 1)}
                  className="p-1 px-3 border border-slate-200 text-[9px] font-bold uppercase tracking-widest rounded-sm bg-white hover:bg-slate-950 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
