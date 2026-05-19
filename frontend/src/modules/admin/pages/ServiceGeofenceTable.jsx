import React, { useState, useEffect, useMemo } from 'react';
import { BASE_URL } from '../../../lib/api';
import { toast } from 'react-hot-toast';
import {
    Download, MapPin, Globe, Zap, Percent, ShieldCheck,
    ChevronRight, Info, Settings, MoreHorizontal, Map, Trash2, X, Save, Edit2, TrendingUp, Truck
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import DataGrid from '../components/tables/DataGrid';

const ServiceGeofenceTable = () => {
    const [areas, setAreas] = useState([]);
    const [uniqueAreaNames, setUniqueAreaNames] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [selectedAreaName, setSelectedAreaName] = useState('');
    const [searchAreaNameInput, setSearchAreaNameInput] = useState('');
    const [searchBaseMultiplier, setSearchBaseMultiplier] = useState('');
    const [searchExpressMultiplier, setSearchExpressMultiplier] = useState('');
    const [searchHeritageMultiplier, setSearchHeritageMultiplier] = useState('');
    const [searchDiscountMultiplier, setSearchDiscountMultiplier] = useState('');

    const fetchAreas = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            
            const activeAreaName = selectedAreaName || searchAreaNameInput;
            if (activeAreaName) {
                queryParams.append('areaName', activeAreaName);
            }
            if (searchBaseMultiplier) {
                queryParams.append('basePriceMultiplier', searchBaseMultiplier);
            }
            if (searchExpressMultiplier) {
                queryParams.append('dynamicSurgeMultiplier', searchExpressMultiplier);
            }
            if (searchHeritageMultiplier) {
                queryParams.append('heritageMultiplier', searchHeritageMultiplier);
            }
            if (searchDiscountMultiplier) {
                queryParams.append('discountPriceMultiplier', searchDiscountMultiplier);
            }

            const res = await fetch(`${BASE_URL}/geofence/areas?${queryParams.toString()}`);
            const data = await res.json();
            setAreas(data);
        } catch (err) {
            toast.error('Failed to load geofence data');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!areas || areas.length === 0) {
            toast.error('No service geofence areas available to download');
            return;
        }

        const headers = [
            'Fence ID',
            'Area Name',
            'City',
            'Pincodes',
            'Base Multiplier',
            'Express Multiplier',
            'Heritage Multiplier',
            'Discount Multiplier',
            'Platform Multiplier',
            'Free Delivery Threshold',
            'Minimum Order Value',
            'Show Discount',
            'Status'
        ];

        const escapeCSV = (str) => {
            if (str === null || str === undefined) return "";
            const stringified = String(str);
            if (stringified.includes(",") || stringified.includes('"') || stringified.includes("\n")) {
                return `"${stringified.replace(/"/g, '""')}"`;
            }
            return stringified;
        };

        const csvRows = [headers.join(",")];

        for (const area of areas) {
            const pincodesList = (area.pincodes || []).join('; ');
            const rowData = [
                area.excelFenceId || '—',
                area.areaName || '',
                area.city || '—',
                pincodesList,
                `${area.basePriceMultiplier || 1.0}x`,
                `${area.dynamicSurgeMultiplier || 1.0}x`,
                `${area.heritageMultiplier || 1.0}x`,
                `${area.discountPriceMultiplier || 1.0}x`,
                `${area.platformMultiplier || 1.0}x`,
                `₹${area.freeDeliveryThreshold || 0}`,
                `₹${area.minimumOrderValue || 0}`,
                area.allowDiscount !== false ? 'Yes' : 'No',
                area.isActive ? 'Active' : 'Inactive'
            ];
            csvRows.push(rowData.map(escapeCSV).join(","));
        }

        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `service_geofence_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Geofence registry exported successfully!');
    };

    // Load initial unique names for dropdown once on mount
    useEffect(() => {
        const loadInitialNames = async () => {
            try {
                const res = await fetch(`${BASE_URL}/geofence/areas`);
                const data = await res.json();
                const names = Array.from(new Set(data.map(a => a.areaName))).sort();
                setUniqueAreaNames(names);
            } catch (err) {
                console.error(err);
            }
        };
        loadInitialNames();
    }, []);

    // Refetch when filters change
    useEffect(() => {
        fetchAreas();
    }, [selectedAreaName, searchAreaNameInput, searchBaseMultiplier, searchExpressMultiplier, searchHeritageMultiplier, searchDiscountMultiplier]);

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
                    allowDiscount: editingArea.allowDiscount !== false,
                    platformMultiplier: editingArea.platformMultiplier,
                    freeDeliveryThreshold: editingArea.freeDeliveryThreshold
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
            header: 'Show Discount',
            key: 'allowDiscount',
            render: (val) => {
                const displayVal = val !== false;
                return (
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${displayVal ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                        {displayVal ? 'Y' : 'N'}
                    </span>
                );
            }
        },
        {
            header: 'Status',
            key: 'isActive',
            render: (val) => (
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${val ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                    {val ? 'Active' : 'Inactive'}
                </span>
            )
        },
        {
            header: 'Platform Mult.',
            key: 'platformMultiplier',
            render: (val) => (
                <div className="flex items-center gap-1.5 text-blue-600 font-bold">
                    <TrendingUp size={10} className="text-blue-400" />
                    <span>{val || 1.0}x</span>
                </div>
            )
        },
        {
            header: 'Free Delivery Threshold',
            key: 'freeDeliveryThreshold',
            render: (val) => (
                <div className="flex items-center gap-1.5 text-rose-600 font-bold">
                    <Truck size={10} className="text-rose-400" />
                    <span>₹{val || 0}</span>
                </div>
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
            />

            <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
                <DataGrid
                    title=""
                    showFilter={false}
                    showSearch={false}
                    actions={
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Area Name Dropdown */}
                            <select
                                value={selectedAreaName}
                                onChange={(e) => {
                                    setSelectedAreaName(e.target.value);
                                    if (e.target.value !== '') {
                                        setSearchAreaNameInput('');
                                    }
                                }}
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-[9px] font-black uppercase tracking-tight outline-none focus:bg-white focus:border-slate-300 transition-all cursor-pointer text-slate-900"
                            >
                                <option value="">SELECT AREA NAME</option>
                                {uniqueAreaNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>

                            {/* Area Name Input */}
                            <input
                                type="text"
                                value={searchAreaNameInput}
                                onChange={(e) => {
                                    setSearchAreaNameInput(e.target.value);
                                    if (e.target.value !== '') {
                                        setSelectedAreaName('');
                                    }
                                }}
                                placeholder="TYPE AREA NAME..."
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-[9px] font-black uppercase tracking-wider outline-none focus:bg-white focus:border-slate-300 transition-all w-36 placeholder:text-slate-300"
                            />

                            {/* Base Multiplier Input */}
                            <input
                                type="text"
                                value={searchBaseMultiplier}
                                onChange={(e) => setSearchBaseMultiplier(e.target.value)}
                                placeholder="BASE MULTIPLIER..."
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-[9px] font-black uppercase tracking-wider outline-none focus:bg-white focus:border-slate-300 transition-all w-32 placeholder:text-slate-300"
                            />

                            {/* Express Multiplier Input */}
                            <input
                                type="text"
                                value={searchExpressMultiplier}
                                onChange={(e) => setSearchExpressMultiplier(e.target.value)}
                                placeholder="EXPRESS MULTIPLIER..."
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-[9px] font-black uppercase tracking-wider outline-none focus:bg-white focus:border-slate-300 transition-all w-36 placeholder:text-slate-300"
                            />

                            {/* Heritage Multiplier Input */}
                            <input
                                type="text"
                                value={searchHeritageMultiplier}
                                onChange={(e) => setSearchHeritageMultiplier(e.target.value)}
                                placeholder="HERITAGE MULTIPLIER..."
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-[9px] font-black uppercase tracking-wider outline-none focus:bg-white focus:border-slate-300 transition-all w-36 placeholder:text-slate-300"
                            />

                            {/* Discount Multiplier Input */}
                            <input
                                type="text"
                                value={searchDiscountMultiplier}
                                onChange={(e) => setSearchDiscountMultiplier(e.target.value)}
                                placeholder="DISCOUNT MULTIPLIER..."
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-[9px] font-black uppercase tracking-wider outline-none focus:bg-white focus:border-slate-300 transition-all w-36 placeholder:text-slate-300"
                            />
                        </div>
                    }
                    columns={columns}
                    data={areas}
                    loading={loading}
                    onDownload={handleDownload}
                />
            </div>

            {/* Edit Multipliers Modal */}
            {editingArea && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-sm border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Edit Zone Parameters</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Fence ID: {editingArea.excelFenceId}</p>
                            </div>
                            <button onClick={() => setEditingArea(null)} className="p-2 hover:bg-slate-100 rounded-sm transition-all"><X size={16} /></button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                {/* Area Name */}
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Area Name</label>
                                    <input
                                        value={editingArea.areaName}
                                        onChange={(e) => setEditingArea({ ...editingArea, areaName: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                    />
                                </div>

                                {/* Express Multiplier */}
                                <div className="space-y-1.5 col-span-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1 flex items-center gap-1.5">
                                        <Zap size={10} className="text-amber-500" /> Express Multiplier
                                    </label>
                                    <input
                                        type="number" step="0.1"
                                        value={editingArea.dynamicSurgeMultiplier}
                                        onChange={(e) => setEditingArea({ ...editingArea, dynamicSurgeMultiplier: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                    />
                                </div>

                                {/* Base Price Multiplier */}
                                <div className="space-y-1.5 col-span-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1 flex items-center gap-1.5">
                                        <Percent size={10} className="text-blue-500" /> Base Price Multiplier
                                    </label>
                                    <input
                                        type="number" step="0.1"
                                        value={editingArea.basePriceMultiplier}
                                        onChange={(e) => setEditingArea({ ...editingArea, basePriceMultiplier: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                    />
                                </div>

                                {/* Discount Price Multiplier */}
                                <div className="space-y-1.5 col-span-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1 flex items-center gap-1.5">
                                        <Percent size={10} className="text-emerald-500" /> Discount Price Multiplier
                                    </label>
                                    <input
                                        type="number" step="0.1"
                                        value={editingArea.discountPriceMultiplier}
                                        onChange={(e) => setEditingArea({ ...editingArea, discountPriceMultiplier: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                    />
                                </div>

                                {/* Show Discount Price */}
                                <div className="space-y-1.5 col-span-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1 flex items-center gap-1.5">
                                        <Percent size={10} className="text-amber-500" /> Show Discount Price (Y/N)
                                    </label>
                                    <div className="flex gap-2">
                                        {[true, false].map(opt => {
                                            const isSelected = editingArea.allowDiscount !== false ? opt === true : opt === false;
                                            return (
                                                <button
                                                    key={opt.toString()}
                                                    type="button"
                                                    onClick={() => setEditingArea({ ...editingArea, allowDiscount: opt })}
                                                    className={`flex-1 py-3 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all border ${isSelected ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                                                >
                                                    {opt ? 'Y' : 'N'}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Heritage Multiplier */}
                                <div className="space-y-1.5 col-span-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1 flex items-center gap-1.5">
                                        <ShieldCheck size={10} className="text-purple-500" /> Heritage Multiplier
                                    </label>
                                    <input
                                        type="number" step="0.1"
                                        value={editingArea.heritageMultiplier || 1.0}
                                        onChange={(e) => setEditingArea({ ...editingArea, heritageMultiplier: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                    />
                                </div>

                                {/* Platform Multiplier */}
                                <div className="space-y-1.5 col-span-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1 flex items-center gap-1.5">
                                        <TrendingUp size={10} className="text-blue-500" /> Platform Multiplier (x)
                                    </label>
                                    <input
                                        type="number" step="0.1"
                                        value={editingArea.platformMultiplier || 1.0}
                                        onChange={(e) => setEditingArea({ ...editingArea, platformMultiplier: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                    />
                                </div>

                                {/* Free Delivery Threshold */}
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1 flex items-center gap-1.5">
                                        <Truck size={10} className="text-rose-500" /> Free Delivery Threshold (₹)
                                    </label>
                                    <input
                                        type="number"
                                        value={editingArea.freeDeliveryThreshold || 500}
                                        onChange={(e) => setEditingArea({ ...editingArea, freeDeliveryThreshold: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleUpdateArea}
                                className="w-full py-4 bg-slate-950 text-white rounded-sm font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 mt-6 border border-slate-900"
                            >
                                <Save size={14} /> Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceGeofenceTable;
