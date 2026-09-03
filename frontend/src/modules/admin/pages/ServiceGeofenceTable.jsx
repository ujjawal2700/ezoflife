import React, { useState, useEffect, useMemo } from 'react';
import { BASE_URL } from '../../../lib/api';
import { toast } from 'react-hot-toast';
import {
    Download, MapPin, Globe, Zap, Percent, ShieldCheck,
    ChevronRight, Info, Settings, MoreHorizontal, Map, Trash2, X, Save, Edit2, TrendingUp, Truck, CheckCircle2, RotateCcw
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import DataGrid from '../components/tables/DataGrid';
import StatusBadge from '../components/common/StatusBadge';
import { cn } from '@/lib/utils';

const ServiceGeofenceTable = () => {
    const [areas, setAreas] = useState([]);
    const [uniqueAreaNames, setUniqueAreaNames] = useState([]);
    const [uniqueBaseMultipliers, setUniqueBaseMultipliers] = useState([]);
    const [uniqueExpressMultipliers, setUniqueExpressMultipliers] = useState([]);
    const [uniqueHeritageMultipliers, setUniqueHeritageMultipliers] = useState([]);
    const [uniqueDiscountMultipliers, setUniqueDiscountMultipliers] = useState([]);
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
            setAreas(Array.isArray(data) ? data : []);
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
            'Coordinates Count',
            'Pincodes',
            'Base Multiplier',
            'Express Multiplier',
            'Heritage Multiplier',
            'Discount Multiplier',
            'Show Discount',
            'Status',
            'Platform Multiplier',
            'Min Platform Fee',
            'Max Platform Fee',
            'Free Delivery Threshold'
        ];

        const csvRows = [headers.join(',')];

        areas.forEach(area => {
            const row = [
                `"${area.excelFenceId || ''}"`,
                `"${area.areaName || ''}"`,
                `"${area.boundary?.coordinates?.[0]?.length || 0}"`,
                `"${(area.pincodes || []).join('; ')}"`,
                `"${area.basePriceMultiplier ?? 1.0}"`,
                `"${area.dynamicSurgeMultiplier ?? 1.0}"`,
                `"${area.heritageMultiplier ?? 1.0}"`,
                `"${area.discountPriceMultiplier ?? 1.0}"`,
                `"${area.allowDiscount !== false ? 'Y' : 'N'}"`,
                `"${area.isActive ? 'Active' : 'Inactive'}"`,
                `"${area.platformMultiplier ?? 1.0}"`,
                `"${area.minPlatformFee ?? 0}"`,
                `"${area.maxPlatformFee ?? ''}"`,
                `"${area.freeDeliveryThreshold ?? 0}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `service_geofence_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Geofence CSV downloaded successfully');
    };

    // Load initial dropdown options only once on mount
    const loadInitialNames = async () => {
        try {
            const res = await fetch(`${BASE_URL}/geofence/areas`);
            const data = await res.json();
            if (Array.isArray(data)) {
                const names = [...new Set(data.map(item => item.areaName).filter(Boolean))];
                setUniqueAreaNames(names);

                const baseMults = [...new Set(data.map(item => item.basePriceMultiplier).filter(val => val !== undefined && val !== null))].sort((a, b) => a - b);
                setUniqueBaseMultipliers(baseMults);

                const expMults = [...new Set(data.map(item => item.dynamicSurgeMultiplier).filter(val => val !== undefined && val !== null))].sort((a, b) => a - b);
                setUniqueExpressMultipliers(expMults);

                const herMults = [...new Set(data.map(item => item.heritageMultiplier).filter(val => val !== undefined && val !== null))].sort((a, b) => a - b);
                setUniqueHeritageMultipliers(herMults);

                const discMults = [...new Set(data.map(item => item.discountPriceMultiplier).filter(val => val !== undefined && val !== null))].sort((a, b) => a - b);
                setUniqueDiscountMultipliers(discMults);
            }
        } catch (err) {
            console.error('Failed to load initial areas list', err);
        }
    };

    useEffect(() => {
        loadInitialNames();
    }, []);

    // Refetch areas whenever filters change
    useEffect(() => {
        fetchAreas();
    }, [
        selectedAreaName,
        searchAreaNameInput,
        searchBaseMultiplier,
        searchExpressMultiplier,
        searchHeritageMultiplier,
        searchDiscountMultiplier
    ]);

    const handleClearFilters = () => {
        setSelectedAreaName('');
        setSearchAreaNameInput('');
        setSearchBaseMultiplier('');
        setSearchExpressMultiplier('');
        setSearchHeritageMultiplier('');
        setSearchDiscountMultiplier('');
    };

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (selectedAreaName || searchAreaNameInput) count++;
        if (searchBaseMultiplier) count++;
        if (searchExpressMultiplier) count++;
        if (searchHeritageMultiplier) count++;
        if (searchDiscountMultiplier) count++;
        return count;
    }, [selectedAreaName, searchAreaNameInput, searchBaseMultiplier, searchExpressMultiplier, searchHeritageMultiplier, searchDiscountMultiplier]);

    // Modal state for editing multipliers
    const [editingArea, setEditingArea] = useState(null);

    const handleDeleteArea = async (id) => {
        if (!window.confirm('Are you sure you want to delete this service geofence? This action cannot be undone.')) return;
        try {
            const res = await fetch(`${BASE_URL}/geofence/areas/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Geofence area deleted successfully');
                fetchAreas();
                loadInitialNames();
            } else {
                toast.error('Failed to delete area');
            }
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    const handleUpdateArea = async () => {
        try {
            const res = await fetch(`${BASE_URL}/geofence/areas/${editingArea._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    areaName: editingArea.areaName,
                    basePriceMultiplier: editingArea.basePriceMultiplier === '' ? 1.0 : Number(editingArea.basePriceMultiplier),
                    dynamicSurgeMultiplier: editingArea.dynamicSurgeMultiplier === '' ? 1.0 : Number(editingArea.dynamicSurgeMultiplier),
                    heritageMultiplier: editingArea.heritageMultiplier === '' ? 1.0 : Number(editingArea.heritageMultiplier),
                    discountPriceMultiplier: editingArea.discountPriceMultiplier === '' ? 1.0 : Number(editingArea.discountPriceMultiplier),
                    allowDiscount: editingArea.allowDiscount,
                    platformMultiplier: editingArea.platformMultiplier === '' ? 1.0 : Number(editingArea.platformMultiplier),
                    minPlatformFee: editingArea.minPlatformFee === '' ? 0 : Number(editingArea.minPlatformFee),
                    maxPlatformFee: editingArea.maxPlatformFee === '' || editingArea.maxPlatformFee === null ? null : Number(editingArea.maxPlatformFee),
                    freeDeliveryThreshold: editingArea.freeDeliveryThreshold === '' ? 0 : Number(editingArea.freeDeliveryThreshold)
                })
            });
            if (res.ok) {
                toast.success('Multipliers updated successfully');
                setEditingArea(null);
                fetchAreas();
                loadInitialNames();
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
                <span className="font-semibold text-slate-800 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/60 text-xs">
                    {val || '—'}
                </span>
            )
        },
        {
            header: 'Area name',
            key: 'areaName',
            render: (val, row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0" style={{ backgroundColor: row.color || '#3b82f6' }}>
                        <Map size={14} />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 text-[14.5px]">{val}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Boundary points',
            key: 'boundary',
            render: (val) => (
                <span className="text-xs font-medium text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/60">
                    {val?.coordinates[0]?.length || 0} vertices
                </span>
            )
        },
        {
            header: 'Pincodes',
            key: 'pincodes',
            render: (val) => (
                <div className="flex flex-wrap gap-1 max-w-[220px]">
                    {val?.slice(0, 3).map(p => (
                        <span key={p} className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200/70 px-2 py-0.5 rounded-md">
                            {p}
                        </span>
                    ))}
                    {val?.length > 3 && (
                        <span className="text-xs font-medium text-slate-400 px-1.5 py-0.5">
                            +{val.length - 3}
                        </span>
                    )}
                </div>
            )
        },
        {
            header: 'Base rate',
            key: 'basePriceMultiplier',
            render: (val) => (
                <span className="font-semibold text-slate-800 text-[14px]">
                    {val || 1.0}x
                </span>
            )
        },
        {
            header: 'Express surge',
            key: 'dynamicSurgeMultiplier',
            render: (val) => (
                <span className="font-semibold text-amber-700 text-[14px]">
                    {val || 1.0}x
                </span>
            )
        },
        {
            header: 'Heritage tier',
            key: 'heritageMultiplier',
            render: (val) => (
                <span className="font-semibold text-purple-700 text-[14px]">
                    {val || 1.0}x
                </span>
            )
        },
        {
            header: 'Discount rate',
            key: 'discountPriceMultiplier',
            render: (val) => (
                <span className="font-semibold text-emerald-700 text-[14px]">
                    {val || 1.0}x
                </span>
            )
        },
        {
            header: 'Show discount',
            key: 'allowDiscount',
            render: (val) => {
                const displayVal = val !== false;
                return (
                    <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium border",
                        displayVal 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                    )}>
                        {displayVal ? 'Allowed' : 'Disabled'}
                    </span>
                );
            }
        },
        {
            header: 'Status',
            key: 'isActive',
            render: (val) => (
                <StatusBadge status={val ? 'Active' : 'Inactive'} label={val ? 'Active' : 'Inactive'} />
            )
        },
        {
            header: 'Platform mult.',
            key: 'platformMultiplier',
            render: (val) => (
                <span className="font-medium text-slate-800 text-[14px]">
                    {val || 1.0}x
                </span>
            )
        },
        {
            header: 'Min plat. fee',
            key: 'minPlatformFee',
            render: (val) => (
                <span className="font-medium text-slate-800 text-[14px]">
                    ₹{val || 0}
                </span>
            )
        },
        {
            header: 'Max plat. fee',
            key: 'maxPlatformFee',
            render: (val) => (
                <span className="font-medium text-slate-800 text-[14px]">
                    {val ? `₹${val}` : 'No Limit'}
                </span>
            )
        },
        {
            header: 'Free delivery',
            key: 'freeDeliveryThreshold',
            render: (val) => (
                <span className="font-semibold text-slate-800 text-[14px]">
                    ₹{val || 0}
                </span>
            )
        },
        {
            header: 'Actions',
            key: 'actions',
            align: 'right',
            render: (val, row) => (
                <div className="flex items-center justify-end gap-1.5">
                    <button
                        onClick={() => setEditingArea(row)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Edit zone multipliers"
                    >
                        <Edit2 size={15} />
                    </button>
                    <button
                        onClick={() => handleDeleteArea(row._id)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete zone"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            )
        }
    ], []);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20 font-['Poppins',sans-serif]">
            <PageHeader
                title="Service Geofences"
                subtitle="Master tabular overview of all regional geofences, pricing rates, and thresholds."
            />

            <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
                
                {/* ─── Modern SaaS Filter Bar ─── */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <h3 className="text-base font-semibold text-slate-900">Geofence Rates & Zones</h3>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                                {areas.length} zones
                            </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                            {activeFiltersCount > 0 && (
                                <button
                                    onClick={handleClearFilters}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/80 rounded-lg transition-colors cursor-pointer"
                                >
                                    <RotateCcw size={14} />
                                    Reset filters ({activeFiltersCount})
                                </button>
                            )}

                            <button
                                onClick={handleDownload}
                                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                <Download size={15} className="text-slate-500" />
                                Export CSV
                            </button>
                        </div>
                    </div>

                    {/* Filter Inputs Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-3 border-t border-slate-100">
                        {/* Area Name Select */}
                        <div className="lg:col-span-3">
                            <select
                                value={selectedAreaName}
                                onChange={(e) => {
                                    setSelectedAreaName(e.target.value);
                                    if (e.target.value !== '') setSearchAreaNameInput('');
                                }}
                                className="w-full h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-normal text-slate-800 hover:bg-slate-100/60 focus:bg-white focus:border-slate-400 outline-none cursor-pointer transition-all shadow-xs"
                            >
                                <option value="">All Service Areas</option>
                                {uniqueAreaNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Search Input */}
                        <div className="lg:col-span-3">
                            <input
                                type="text"
                                value={searchAreaNameInput}
                                onChange={(e) => {
                                    setSearchAreaNameInput(e.target.value);
                                    if (e.target.value !== '') setSelectedAreaName('');
                                }}
                                placeholder="Search area by name..."
                                className="w-full h-10 px-3.5 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 outline-none transition-all shadow-xs"
                            />
                        </div>

                        {/* Base Multiplier */}
                        <div className="lg:col-span-2">
                            <select
                                value={searchBaseMultiplier}
                                onChange={(e) => setSearchBaseMultiplier(e.target.value)}
                                className="w-full h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-normal text-slate-800 hover:bg-slate-100/60 focus:bg-white focus:border-slate-400 outline-none cursor-pointer transition-all shadow-xs"
                            >
                                <option value="">Base Rate</option>
                                {uniqueBaseMultipliers.map(mult => (
                                    <option key={mult} value={String(mult)}>{mult}x</option>
                                ))}
                            </select>
                        </div>

                        {/* Express Multiplier */}
                        <div className="lg:col-span-2">
                            <select
                                value={searchExpressMultiplier}
                                onChange={(e) => setSearchExpressMultiplier(e.target.value)}
                                className="w-full h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-normal text-slate-800 hover:bg-slate-100/60 focus:bg-white focus:border-slate-400 outline-none cursor-pointer transition-all shadow-xs"
                            >
                                <option value="">Express Surge</option>
                                {uniqueExpressMultipliers.map(mult => (
                                    <option key={mult} value={String(mult)}>{mult}x</option>
                                ))}
                            </select>
                        </div>

                        {/* Discount Multiplier */}
                        <div className="lg:col-span-2">
                            <select
                                value={searchDiscountMultiplier}
                                onChange={(e) => setSearchDiscountMultiplier(e.target.value)}
                                className="w-full h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-normal text-slate-800 hover:bg-slate-100/60 focus:bg-white focus:border-slate-400 outline-none cursor-pointer transition-all shadow-xs"
                            >
                                <option value="">Discount Rate</option>
                                {uniqueDiscountMultipliers.map(mult => (
                                    <option key={mult} value={String(mult)}>{mult}x</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table View */}
                <div className="w-full">
                    <DataGrid
                        showHeader={false}
                        columns={columns}
                        data={areas}
                        loading={loading}
                        showSearch={false}
                        showFilter={false}
                    />
                </div>
            </div>

            {/* Edit Multipliers Modal */}
            {editingArea && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 font-['Poppins',sans-serif]">
                    <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4.5 border-b border-slate-200/80 flex items-center justify-between bg-white">
                            <div>
                                <h3 className="text-base font-semibold text-slate-900">Edit Zone Parameters</h3>
                                <p className="text-xs text-slate-500 font-normal mt-0.5">Fence ID: {editingArea.excelFenceId || '—'}</p>
                            </div>
                            <button onClick={() => setEditingArea(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto">
                            {/* Area Name */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-700 block">Area Name</label>
                                <input
                                    value={editingArea.areaName || ''}
                                    onChange={(e) => setEditingArea({ ...editingArea, areaName: e.target.value })}
                                    className="w-full h-11 px-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all shadow-2xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3.5 pt-2">
                                {/* Base Multiplier */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700 block">Base Rate (x)</label>
                                    <input
                                        type="number" step="0.1"
                                        value={editingArea.basePriceMultiplier ?? ''}
                                        onChange={(e) => setEditingArea({ ...editingArea, basePriceMultiplier: e.target.value })}
                                        className="w-full h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all shadow-2xs"
                                    />
                                </div>

                                {/* Express Multiplier */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700 block">Express Surge (x)</label>
                                    <input
                                        type="number" step="0.1"
                                        value={editingArea.dynamicSurgeMultiplier ?? ''}
                                        onChange={(e) => setEditingArea({ ...editingArea, dynamicSurgeMultiplier: e.target.value })}
                                        className="w-full h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all shadow-2xs"
                                    />
                                </div>

                                {/* Heritage Multiplier */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700 block">Heritage Tier (x)</label>
                                    <input
                                        type="number" step="0.1"
                                        value={editingArea.heritageMultiplier ?? ''}
                                        onChange={(e) => setEditingArea({ ...editingArea, heritageMultiplier: e.target.value })}
                                        className="w-full h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all shadow-2xs"
                                    />
                                </div>

                                {/* Discount Multiplier */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700 block">Discount Rate (x)</label>
                                    <input
                                        type="number" step="0.1"
                                        value={editingArea.discountPriceMultiplier ?? ''}
                                        onChange={(e) => setEditingArea({ ...editingArea, discountPriceMultiplier: e.target.value })}
                                        className="w-full h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all shadow-2xs"
                                    />
                                </div>

                                {/* Platform Multiplier */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700 block">Platform Multiplier (x)</label>
                                    <input
                                        type="number" step="0.1"
                                        value={editingArea.platformMultiplier ?? ''}
                                        onChange={(e) => setEditingArea({ ...editingArea, platformMultiplier: e.target.value })}
                                        className="w-full h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all shadow-2xs"
                                    />
                                </div>

                                {/* Free Delivery Threshold */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700 block">Free Delivery Threshold (₹)</label>
                                    <input
                                        type="number"
                                        value={editingArea.freeDeliveryThreshold ?? ''}
                                        onChange={(e) => setEditingArea({ ...editingArea, freeDeliveryThreshold: e.target.value })}
                                        className="w-full h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all shadow-2xs"
                                    />
                                </div>

                                {/* Min Platform Fee */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700 block">Min Platform Fee (₹)</label>
                                    <input
                                        type="number"
                                        value={editingArea.minPlatformFee ?? ''}
                                        onChange={(e) => setEditingArea({ ...editingArea, minPlatformFee: e.target.value })}
                                        className="w-full h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all shadow-2xs"
                                    />
                                </div>

                                {/* Max Platform Fee */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700 block">Max Platform Fee (₹)</label>
                                    <input
                                        type="number"
                                        value={editingArea.maxPlatformFee ?? ''}
                                        onChange={(e) => setEditingArea({ ...editingArea, maxPlatformFee: e.target.value })}
                                        placeholder="No limit"
                                        className="w-full h-10 px-3 bg-slate-50/70 border border-slate-200 rounded-lg text-sm font-normal text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all shadow-2xs"
                                    />
                                </div>
                            </div>

                            {/* Show Discount Price segmented control */}
                            <div className="space-y-1.5 pt-2">
                                <label className="text-xs font-medium text-slate-700 block">Show Discount Price</label>
                                <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 w-full">
                                    <button
                                        type="button"
                                        onClick={() => setEditingArea({ ...editingArea, allowDiscount: true })}
                                        className={cn(
                                            "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                                            editingArea.allowDiscount !== false
                                                ? "bg-white text-slate-900 font-semibold shadow-xs"
                                                : "text-slate-600 hover:text-slate-900"
                                        )}
                                    >
                                        Allowed
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingArea({ ...editingArea, allowDiscount: false })}
                                        className={cn(
                                            "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                                            editingArea.allowDiscount === false
                                                ? "bg-white text-rose-700 font-semibold shadow-xs"
                                                : "text-slate-600 hover:text-slate-900"
                                        )}
                                    >
                                        Disabled
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4.5 border-t border-slate-200 bg-white">
                            <button
                                onClick={handleUpdateArea}
                                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                            >
                                <Save size={15} /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceGeofenceTable;
