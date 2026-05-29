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

  // Feedback Modal State
  const [modalData, setModalData] = useState({
    isOpen: false,
    requestId: null,
    type: null, // 'approved' | 'rejected'
    serviceName: '',
    basePrice: 0,
    message: ''
  });

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

  const handleAction = async (id, status, message) => {
    setIsProcessing(id);
    try {
      const approvalStatus = status === 'approved' ? 'Approved' : 'Rejected';
      const activeStatus = 'Inactive'; // default inactive for approved/rejected custom services

      await serviceApi.update(id, { 
        approvalStatus, 
        status: activeStatus,
        adminMessage: message
      });

      toast.success(`Service request ${status === 'approved' ? 'approved' : 'rejected'} successfully!`);
      setModalData({ isOpen: false, requestId: null, type: null, serviceName: '', basePrice: 0, message: '' });
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
                          {req.hasMasterService ? (
                            <>
                              <button
                                disabled={isProcessing !== null}
                                onClick={() => setModalData({
                                  isOpen: true,
                                  requestId: req._id || req.id,
                                  type: 'rejected',
                                  serviceName: req.name,
                                  basePrice: req.basePrice,
                                  message: ''
                                })}
                                className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm cursor-pointer disabled:opacity-50"
                              >
                                Reject
                              </button>
                              <button
                                disabled={isProcessing !== null}
                                onClick={() => setModalData({
                                  isOpen: true,
                                  requestId: req._id || req.id,
                                  type: 'approved',
                                  serviceName: req.name,
                                  basePrice: req.basePrice,
                                  message: ''
                                })}
                                className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50"
                              >
                                Approve
                              </button>
                            </>
                          ) : (
                            <span className="px-2.5 py-1 text-[8px] font-black text-amber-500 bg-amber-50 rounded uppercase tracking-wider border border-amber-100">
                              Setup Category/Service First
                            </span>
                          )}
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

      {/* Confirmation & Feedback Message Input Window (Modal) */}
      <AnimatePresence>
        {modalData.isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setModalData(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl space-y-5 border border-slate-200"
            >
              <div className="flex justify-between items-center pb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${modalData.type === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <MessageSquare size={16} />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    {modalData.type === 'approved' ? 'Approve Service Request' : 'Reject Service Request'}
                  </h3>
                </div>
                <button 
                  onClick={() => setModalData(prev => ({ ...prev, isOpen: false }))} 
                  className="p-1.5 hover:bg-slate-50 rounded-full text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Service Context Info */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service Details</p>
                <div className="flex justify-between text-xs font-black text-slate-800">
                  <span className="uppercase">{modalData.serviceName}</span>
                  <span className="tabular-nums text-slate-900">₹{modalData.basePrice}</span>
                </div>
              </div>

              {/* Feedback Input */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                  Message for Vendor
                </label>
                <textarea 
                  required
                  rows={4}
                  value={modalData.message}
                  onChange={e => setModalData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none resize-none placeholder:text-slate-300"
                  placeholder={modalData.type === 'approved' ? 'Add details/congratulations message (e.g. Your service is approved and is currently set to Inactive...)' : 'Reason for rejection...'}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setModalData(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3.5 border border-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(modalData.requestId, modalData.type, modalData.message)}
                  disabled={!modalData.message.trim() || isProcessing !== null}
                  className={`flex-1 py-3.5 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${modalData.type === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10'}`}
                >
                  {isProcessing !== null ? 'Processing...' : modalData.type === 'approved' ? 'Approve & Send' : 'Reject & Send'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

