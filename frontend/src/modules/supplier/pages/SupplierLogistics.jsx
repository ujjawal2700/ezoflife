import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { b2bOrderApi } from '../../../lib/api';

const SupplierLogistics = () => {
    const b2bStatusMapSupplier = {
        'SUBMITTED': { label: 'New Order Received', emoji: '📥', color: 'bg-amber-50 text-amber-600 border-amber-200' },
        'ACCEPTED': { label: 'Timeline Scheduled', emoji: '📅', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        'PROCESSING': { label: 'Preparing Order', emoji: '📦', color: 'bg-blue-50 text-blue-600 border-blue-200' },
        'DISPATCHED': { label: 'Shipped / En Route', emoji: '🚚', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
        'DELIVERED': { label: 'Fulfilled & Completed', emoji: '🏁', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        'REJECTED': { label: 'Order Declined', emoji: '🚫', color: 'bg-rose-50 text-rose-600 border-rose-200' },
        'CANCELLED': { label: 'Cancelled by Buyer', emoji: '💣', color: 'bg-red-50 text-red-600 border-red-200' },

        // Old CamelCase statuses for backward compatibility
        'Submitted': { label: 'New Order Received', emoji: '📥', color: 'bg-amber-50 text-amber-600 border-amber-200' },
        'Confirmed': { label: 'Timeline Scheduled', emoji: '📅', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        'Accepted': { label: 'Timeline Scheduled', emoji: '📅', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        'Out for Delivery': { label: 'Shipped / En Route', emoji: '🚚', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
        'Delivered': { label: 'Fulfilled & Completed', emoji: '🏁', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        'Cancelled': { label: 'Cancelled by Buyer', emoji: '💣', color: 'bg-red-50 text-red-600 border-red-200' }
    };

    const getStatusLabel = (status) => b2bStatusMapSupplier[status]?.label || status;
    const getStatusIcon = (status) => b2bStatusMapSupplier[status]?.emoji || '📥';
    const getStatusColor = (status) => b2bStatusMapSupplier[status]?.color || 'bg-slate-500 text-white';
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');

    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(true);

    const vendorData = JSON.parse(localStorage.getItem('supplierData') || localStorage.getItem('userData') || localStorage.getItem('user') || '{}');
    const supplierId = vendorData?._id || vendorData?.id;

    const fetchOrders = async () => {
        if (!supplierId) return;
        try {
            setLoading(true);
            const data = await b2bOrderApi.getSupplierOrders(supplierId);
            setShipments(data.map(order => ({
                id: order.b2bOrderId,
                _id: order._id,
                vendor: order.vendor?.shopDetails?.name || 'Retail Partner',
                items: order.items.map(i => `${i.quantity}x ${i.name}`).join(', '),
                status: order.status,
                driver: 'System Assigned',
                eta: ['SUBMITTED', 'Submitted', 'Pending', 'Open'].includes(order.status) ? 'Incoming' : 'In Progress'
            })));
        } catch (error) {
            console.error('Fetch Orders Error:', error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchOrders();
    }, [supplierId]);

    const handleUpdateStatus = async (id, status) => {
        try {
            await b2bOrderApi.updateStatus(id, status);
            fetchOrders();
        } catch (error) {
            console.error('Update Status Error:', error);
        }
    };

    const filters = ['All', 'SUBMITTED', 'ACCEPTED', 'PROCESSING', 'DISPATCHED', 'DELIVERED'];

    const filteredShipments = useMemo(() => {
        return shipments.filter(ship => {
            const matchesSearch = ship.vendor.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                ship.id.toLowerCase().includes(searchQuery.toLowerCase());
            
            let matchesFilter = activeFilter === 'All';
            if (!matchesFilter) {
                if (activeFilter === 'SUBMITTED') {
                    matchesFilter = ['SUBMITTED', 'Submitted', 'Pending', 'Open'].includes(ship.status);
                } else if (activeFilter === 'ACCEPTED') {
                    matchesFilter = ['ACCEPTED', 'Accepted', 'Confirmed'].includes(ship.status);
                } else if (activeFilter === 'PROCESSING') {
                    matchesFilter = ship.status === 'PROCESSING';
                } else if (activeFilter === 'DISPATCHED') {
                    matchesFilter = ['DISPATCHED', 'Dispatched', 'Out for Delivery'].includes(ship.status);
                } else if (activeFilter === 'DELIVERED') {
                    matchesFilter = ['DELIVERED', 'Delivered', 'Settled'].includes(ship.status);
                } else {
                    matchesFilter = ship.status === activeFilter;
                }
            }
            return matchesSearch && matchesFilter;
        });
    }, [shipments, searchQuery, activeFilter]);

    return (
        <div className="min-h-screen pb-40 font-body text-on-background">
            <header className="px-6 pt-2 mb-2">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter italic uppercase leading-none">Logistics</h1>
                        <p className="text-[10px] font-black text-on-surface/40 uppercase tracking-[0.3em] mt-1">Fleet & Dispatch Control</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/40 backdrop-blur-md flex items-center justify-center border border-white/20">
                        <span className="material-symbols-outlined text-primary">hub</span>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative group mb-6">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-[20px] text-on-surface/30 group-focus-within:text-primary transition-colors">search</span>
                    </div>
                    <input 
                        type="text"
                        placeholder="Search fleet or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-white/60 backdrop-blur-xl border border-white/20 rounded-[2rem] text-sm font-bold text-on-surface placeholder:text-on-surface/20 outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all shadow-sm"
                    />
                </div>

                {/* Filter Chips */}
                <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar -mx-6 px-6">
                    {filters.map(filter => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 border ${
                                activeFilter === filter 
                                ? 'bg-primary text-white border-primary shadow-lg shadow-black/10' 
                                : 'bg-white/40 text-on-surface/40 border-white/20 hover:bg-white/60'
                            }`}
                        >
                            {filter === 'All' ? 'All' : (b2bStatusMapSupplier[filter]?.label || filter)}
                        </button>
                    ))}
                </div>
            </header>

            <main className="px-6 space-y-10 flex-1">
                <section className="grid grid-cols-2 gap-4">
                    <div className="bg-white/80 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/30 shadow-sm transition-all hover:shadow-md">
                        <p className="text-[10px] font-bold text-on-surface/40 uppercase tracking-widest mb-1">Active Deliveries</p>
                        <h2 className="text-3xl font-black text-on-surface tracking-tighter">{filteredShipments.length.toString().padStart(2, '0')}</h2>
                        <div className="flex items-center gap-1 mt-2 text-primary">
                            <span className="material-symbols-outlined text-[14px]">sensors</span>
                            <span className="text-[9px] font-black uppercase tracking-widest">Live</span>
                        </div>
                    </div>
                    <div className="bg-primary p-6 rounded-[2.5rem] text-white shadow-2xl shadow-black/20 transition-all hover:scale-[1.02] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-white/20 transition-all"></div>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-80">Avg. TAT</p>
                        <h2 className="text-3xl font-black tracking-tighter leading-none">42m</h2>
                        <p className="text-[9px] font-black uppercase mt-2.5 opacity-60">SLA Optimization Active</p>
                    </div>
                </section>

                <section className="space-y-5">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-on-surface/40 italic">Live Fulfillment Queue</h2>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">Feed Live</span>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {filteredShipments.map(ship => (
                                <motion.div 
                                    key={ship.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-white/90 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/40 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all"
                                >
                                    <div className={`absolute top-0 left-0 w-2 h-full transition-all duration-500 ${
                                        ['DISPATCHED', 'Dispatched', 'Out for Delivery'].includes(ship.status) ? 'bg-indigo-400' : 
                                        ['DELIVERED', 'Delivered'].includes(ship.status) ? 'bg-emerald-400' : 'bg-amber-400'
                                    }`}></div>
                                    
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="max-w-[70%]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border flex items-center gap-1 ${getStatusColor(ship.status)}`}>
                                                    <span className="text-xs">{getStatusIcon(ship.status)}</span>
                                                    <span>{getStatusLabel(ship.status)}</span>
                                                </span>
                                            </div>
                                            <h3 className="text-base font-black text-on-surface leading-tight mb-2 tracking-tight group-hover:text-primary transition-colors">{ship.vendor}</h3>
                                            <p className="text-[10px] font-bold text-on-surface/30 uppercase tracking-widest truncate">{ship.items}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-primary tracking-tighter italic">{ship.id}</p>
                                            <p className="text-[9px] font-black text-on-surface/20 uppercase tracking-widest mt-1.5 flex items-center justify-end gap-1">
                                                <span className="material-symbols-outlined text-[12px]">schedule</span>
                                                {ship.eta}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-5 border-t border-slate-50">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center transition-colors group-hover:bg-primary/5 group-hover:border-primary/10">
                                                <span className="material-symbols-outlined text-[20px] text-slate-300 group-hover:text-primary transition-colors">delivery_dining</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <p className="text-[9px] font-black text-on-surface/20 uppercase tracking-widest mb-0.5">Pilot Assigned</p>
                                                <p className="text-xs font-black text-on-surface italic">{ship.driver}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {['SUBMITTED', 'Submitted', 'Pending', 'Open'].includes(ship.status) && (
                                                <button 
                                                    onClick={() => handleUpdateStatus(ship._id, 'ACCEPTED')}
                                                    className="h-10 px-6 bg-emerald-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.25em] shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                                                >
                                                    Accept
                                                </button>
                                            )}
                                            {['ACCEPTED', 'Accepted', 'Confirmed'].includes(ship.status) && (
                                                <button 
                                                    onClick={() => handleUpdateStatus(ship._id, 'PROCESSING')}
                                                    className="h-10 px-6 bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.25em] shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
                                                >
                                                    Prepare
                                                </button>
                                            )}
                                            {ship.status === 'PROCESSING' && (
                                                <button 
                                                    onClick={() => handleUpdateStatus(ship._id, 'DISPATCHED')}
                                                    className="h-10 px-6 bg-primary text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.25em] shadow-lg shadow-black/5 hover:scale-105 active:scale-95 transition-all"
                                                >
                                                    Dispatch
                                                </button>
                                            )}
                                            {['DISPATCHED', 'Dispatched', 'Out for Delivery'].includes(ship.status) && (
                                                <button 
                                                    onClick={() => handleUpdateStatus(ship._id, 'DELIVERED')}
                                                    className="h-10 px-6 bg-emerald-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.25em] shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                                                >
                                                    Deliver
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => navigate(`/supplier/order/${ship._id}`)}
                                                className="h-10 px-6 bg-slate-100 text-slate-600 rounded-2xl text-[9px] font-black uppercase tracking-[0.25em] hover:bg-slate-200 transition-all border border-slate-200"
                                            >
                                                Details
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        
                        {filteredShipments.length === 0 && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="py-20 flex flex-col items-center justify-center text-center opacity-30"
                            >
                                <span className="material-symbols-outlined text-5xl mb-4">search_off</span>
                                <p className="text-[11px] font-black uppercase tracking-widest italic">No matching shipments found</p>
                            </motion.div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default SupplierLogistics;

