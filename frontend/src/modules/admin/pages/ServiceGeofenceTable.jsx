import React, { useState, useEffect, useMemo } from 'react';
import { BASE_URL } from '../../../lib/api';
import { toast } from 'react-hot-toast';
import { 
    Download, MapPin, Globe, Zap, Percent, ShieldCheck, 
    ChevronRight, Info, Settings, MoreHorizontal, Map, Trash2, X, Save, Edit2
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import DataGrid from '../components/tables/DataGrid';

const ServiceGeofenceTable = () => {
    const [areas, setAreas] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAreas = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${BASE_URL}/geofence/areas`);
            const data = await res.json();
            setAreas(data);
        } catch (err) {
            toast.error('Failed to load geofence data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAreas();
    }, []);

    const handleDeleteArea = async (id) => {
        if (!window.confirm('Delete this service zone?')) return;
        try {
            const res = await fetch(`${BASE_URL}/geofence/areas/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Zone deleted');
                fetchAreas();
            }
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    const [editingArea, setEditingArea] = useState(null);
    const handleUpdateArea = async () => {
        try {
            const res = await fetch(`${BASE_URL}/geofence/areas/${editingArea._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    areaName: editingArea.areaName,
                    dynamicSurgeMultiplier: editingArea.dynamicSurgeMultiplier,
                    basePriceMultiplier: editingArea.basePriceMultiplier,
                    discountPriceMultiplier: editingArea.discountPriceMultiplier,
                    heritageMultiplier: editingArea.heritageMultiplier,
                    showDiscount: editingArea.showDiscount
                })
            });
            if (res.ok) {
                toast.success('Multipliers updated');
                setEditingArea(null);
                fetchAreas();
            }
        } catch (err) {
            toast.error('Update failed');
        }
    };

    const columns = useMemo(() => [
        {
            header: 'Fence ID',
            key: 'excelFenceId',
            render: (val) => (
                <span className="font-black text-slate-900 bg-slate-50 px-2 py-1 rounded-sm border border-slate-100 text-[10px]">
                    {val || '—'}
                </span>
            )
        },
        {
            header: 'Area Name',
            key: 'areaName',
            render: (val, row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: row.color || '#3b82f6' }}>
                        <Map size={14} />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-800 uppercase tracking-tight">{val}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{row.city || 'Nashik'}, {row.state || 'MH'}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Boundary',
            key: 'boundary',
            render: (val) => (
                <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                    <MapPin size={10} className="text-slate-300" />
                    <span className="text-[10px] bg-slate-50 px-2 py-0.5 rounded-sm border border-slate-100 uppercase tracking-tighter">
                        Polygon [{val?.coordinates[0]?.length || 0} Points]
                    </span>
                </div>
            )
        },
        {
            header: 'Pincodes',
            key: 'pincodes',
            render: (val) => (
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {val?.map(p => (
                        <span key={p} className="text-[9px] font-black text-slate-500 bg-white border border-slate-100 px-1.5 py-0.5 rounded-sm">
                            {p}
                        </span>
                    ))}
                </div>
            )
        },
        {
            header: 'Express Mult.',
            key: 'dynamicSurgeMultiplier',
            render: (val) => (
                <div className="flex items-center gap-1.5 text-amber-600 font-bold">
                    <Zap size={10} className="text-amber-400" />
                    <span>{val || 1.0}x</span>
                </div>
            )
        },
        {
            header: 'Base Mult.',
            key: 'basePriceMultiplier',
            render: (val) => (
                <div className="flex items-center gap-1.5 text-blue-600 font-bold">
                    <Percent size={10} className="text-blue-400" />
                    <span>{val || 1.0}x</span>
                </div>
            )
        },
        {
            header: 'Disc. Mult.',
            key: 'discountPriceMultiplier',
            render: (val) => (
                <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                    <Percent size={10} className="text-emerald-400" />
                    <span>{val || 1.0}x</span>
                </div>
            )
        },
        {
            header: 'Heritage Mult.',
            key: 'heritageMultiplier',
            render: (val) => (
                <div className="flex items-center gap-1.5 text-purple-600 font-bold">
                    <ShieldCheck size={10} className="text-purple-400" />
                    <span>{val || 1.0}x</span>
                </div>
            )
        },
        {
            header: 'Show Discount',
            key: 'showDiscount',
            render: (val) => (
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${val ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                    {val ? 'Y' : 'N'}
                </span>
            )
        },
        {
            header: 'Curr Ind',
            key: 'isActive',
            render: (val) => (
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${val ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                    {val ? 'Y' : 'N'}
                </span>
            )
        },
        {
            header: 'Actions',
            key: 'actions',
            align: 'right',
            render: (val, row) => (
                <div className="flex items-center justify-end gap-2">
                    <button 
                        onClick={() => setEditingArea(row)}
                        className="p-2 hover:bg-blue-50 rounded-lg text-blue-400 hover:text-blue-600 transition-all"
                    >
                        <Edit2 size={14} />
                    </button>
                </div>
            )
        }
    ], []);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
            <PageHeader 
                title="Service Geofences" 
                actions={[
                    {
                        label: "Bulk Sync",
                        icon: Download,
                        onClick: () => toast.success('Syncing with Master Excel...'),
                        variant: 'secondary'
                    }
                ]}
            />

            <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
                {/* Tactical Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 border border-slate-200 rounded-sm">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Zones</p>
                        <h4 className="text-2xl font-black text-slate-900">{areas.length}</h4>
                    </div>
                    <div className="bg-white p-6 border border-slate-200 rounded-sm">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Polygons</p>
                        <h4 className="text-2xl font-black text-emerald-600">{areas.filter(a => a.isActive).length}</h4>
                    </div>
                </div>

                <DataGrid 
                    title="Area Multiplier Registry"
                    columns={columns}
                    data={areas}
                    loading={loading}
                />
            </div>

            {/* Edit Multipliers Modal */}
            {editingArea && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tighter">Edit Zone Parameters</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Fence ID: {editingArea.excelFenceId}</p>
                            </div>
                            <button onClick={() => setEditingArea(null)} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm"><X size={16}/></button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Area Name</label>
                                <input 
                                    value={editingArea.areaName} 
                                    onChange={(e) => setEditingArea({...editingArea, areaName: e.target.value})}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-wider outline-none focus:border-slate-900 transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Zap size={10} className="text-amber-500" /> Express Multiplier
                                    </label>
                                    <input 
                                        type="number" step="0.1"
                                        value={editingArea.dynamicSurgeMultiplier} 
                                        onChange={(e) => setEditingArea({...editingArea, dynamicSurgeMultiplier: parseFloat(e.target.value)})}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black outline-none focus:border-amber-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Percent size={10} className="text-blue-500" /> Base Price Multiplier
                                    </label>
                                    <input 
                                        type="number" step="0.1"
                                        value={editingArea.basePriceMultiplier} 
                                        onChange={(e) => setEditingArea({...editingArea, basePriceMultiplier: parseFloat(e.target.value)})}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Percent size={10} className="text-emerald-500" /> Discount Price Multiplier
                                    </label>
                                    <input 
                                        type="number" step="0.1"
                                        value={editingArea.discountPriceMultiplier} 
                                        onChange={(e) => setEditingArea({...editingArea, discountPriceMultiplier: parseFloat(e.target.value)})}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black outline-none focus:border-emerald-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Percent size={10} className="text-amber-500" /> Show Discount Price (Y/N)
                                    </label>
                                    <div className="flex gap-2">
                                        {[true, false].map(opt => (
                                            <button 
                                                key={opt.toString()}
                                                type="button"
                                                onClick={() => setEditingArea({...editingArea, showDiscount: opt})}
                                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${editingArea.showDiscount === opt ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                                            >
                                                {opt ? 'Y' : 'N'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <ShieldCheck size={10} className="text-purple-500" /> Heritage Multiplier
                                    </label>
                                    <input 
                                        type="number" step="0.1"
                                        value={editingArea.heritageMultiplier || 1.0} 
                                        onChange={(e) => setEditingArea({...editingArea, heritageMultiplier: parseFloat(e.target.value)})}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black outline-none focus:border-purple-500 transition-all"
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleUpdateArea}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                <Save size={14} /> Update Parameters
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceGeofenceTable;
