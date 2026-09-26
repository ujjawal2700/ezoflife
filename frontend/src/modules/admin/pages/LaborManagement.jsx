import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { laborApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const LaborManagement = () => {
    const [laborList, setLaborList] = useState([]);
    const [requisitions, setRequisitions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'requisitions'
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newLabor, setNewLabor] = useState({ name: '', rate: '', icon: 'person' });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [laborData, reqData] = await Promise.all([
                laborApi.getAll(),
                laborApi.getAllRequisitions()
            ]);
            setLaborList(Array.isArray(laborData) ? laborData : []);
            setRequisitions(Array.isArray(reqData) ? reqData : []);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await laborApi.add(newLabor);
            toast.success('Labor type added successfully');
            setNewLabor({ name: '', rate: '', icon: 'person' });
            setIsAddModalOpen(false);
            fetchData();
        } catch (error) {
            toast.error('Failed to add labor');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to remove this labor type?')) return;
        try {
            await laborApi.delete(id);
            toast.success('Removed successfully');
            fetchData();
        } catch (error) {
            toast.error('Failed to remove');
        }
    };

    const handleAssign = async (id) => {
        try {
            await laborApi.assignRequisition(id);
            toast.success('Specialist Assigned! Vendor notified.');
            fetchData();
        } catch (error) {
            toast.error('Assignment failed');
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 leading-none uppercase">Labor Management</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 opacity-60">Control Skilled Labor Inventory for Vendors</p>
                </div>
                <div className="flex gap-4">
                    {activeTab === 'inventory' && (
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 shrink-0"
                        >
                            <span className="material-symbols-outlined text-sm">add</span>
                            Register Specialist
                        </button>
                    )}
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 p-1.5 bg-slate-100 rounded-full w-full max-w-sm">
                <button 
                    onClick={() => setActiveTab('inventory')}
                    className={`flex-1 py-3 rounded-full font-black text-[9px] uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                    Labor Pool
                </button>
                <button 
                    onClick={() => setActiveTab('requisitions')}
                    className={`flex-1 py-3 rounded-full font-black text-[9px] uppercase tracking-widest transition-all ${activeTab === 'requisitions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                    Incoming Requests
                </button>
            </div>

            {activeTab === 'inventory' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {!loading && laborList.length === 0 && (
                        <p className="md:col-span-2 lg:col-span-3 text-center py-16 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                            No specialists registered yet. Use “Register Specialist” to add one.
                        </p>
                    )}
                    {Array.isArray(laborList) && laborList.map((labor) => (
                        <motion.div 
                            key={labor._id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm group relative"
                        >
                            <button 
                                onClick={() => handleDelete(labor._id)}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                            
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-100">
                                    <span className="material-symbols-outlined text-3xl">{labor.icon}</span>
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 tracking-tight">{labor.name}</h3>
                                    <p className="text-primary font-black text-sm tracking-tighter mt-1">{labor.rate}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] border-r border-slate-100">Vendor Partner</th>
                                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] border-r border-slate-100">Specialist Needed</th>
                                    <th className="px-6 py-5 text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] border-r border-slate-100">Live Status</th>
                                    <th className="px-6 py-5 text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Administrative Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {Array.isArray(requisitions) && requisitions.length > 0 ? requisitions.map((req) => (
                                    <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-6 border-r border-slate-50">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900 tracking-tight">{req.vendorName}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-slate-100 rounded text-slate-400">ID: {req._id.slice(-6).toUpperCase()}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 capitalize">{new Date(req.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 border-r border-slate-50">
                                            <div className="flex flex-wrap gap-2">
                                                {req.items.map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
                                                        <span className="text-[10px] font-black text-slate-700 uppercase">{item.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 border-r border-slate-50 text-center">
                                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest ${
                                                req.status === 'Assigned' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                                            }`}>
                                                <span className={`w-2 h-2 rounded-full animate-pulse ${req.status === 'Assigned' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                                {req.status}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            {req.status === 'Pending' ? (
                                                <button 
                                                    onClick={() => handleAssign(req._id)}
                                                    className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                                                >
                                                    <span className="material-symbols-outlined text-sm">person_add</span>
                                                    Confirm Assignment
                                                </button>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2 text-emerald-600">
                                                    <span className="material-symbols-outlined text-sm">verified</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Dispatched</span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-20 text-center text-slate-400 bg-slate-50/30">
                                            <span className="material-symbols-outlined text-4xl mb-3 opacity-20">inventory_2</span>
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No labor requisitions found</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAddModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 shadow-2xl relative z-10"
                        >
                            <h3 className="text-2xl font-black tracking-tighter text-slate-900 mb-8">Register New Labor</h3>
                            <form onSubmit={handleAdd} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Specialist Name</label>
                                    <input 
                                        required 
                                        type="text" 
                                        placeholder="e.g. Master Tailor"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-sm focus:bg-white transition-all ring-0 outline-none"
                                        value={newLabor.name}
                                        onChange={(e) => setNewLabor({...newLabor, name: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Daily Rate / Shift Price</label>
                                    <input 
                                        required 
                                        type="text" 
                                        placeholder="₹800/shift"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-sm focus:bg-white transition-all ring-0 outline-none"
                                        value={newLabor.rate}
                                        onChange={(e) => setNewLabor({...newLabor, rate: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Icon Name (Material Symbol)</label>
                                    <input 
                                        required 
                                        type="text" 
                                        placeholder="person, iron, tailoring..."
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-sm focus:bg-white transition-all ring-0 outline-none"
                                        value={newLabor.icon}
                                        onChange={(e) => setNewLabor({...newLabor, icon: e.target.value})}
                                    />
                                </div>
                                <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-slate-200">
                                    Confirm Addition
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LaborManagement;
