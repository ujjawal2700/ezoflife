import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Search, Filter, Download, Zap, Percent, 
    ShieldCheck, Map, Tag, RefreshCw, Save, X, Edit2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import PageHeader from '../components/common/PageHeader';
import DataGrid from '../components/tables/DataGrid';
import { BASE_URL } from '../../../lib/api';

const MasterPricingRegistry = () => {
    const [pricingData, setPricingData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState('all');
    const [isSyncing, setIsSyncing] = useState(false);

    // Fetch Areas and Pricing Data
    const fetchData = async () => {
        try {
            setLoading(true);
            const [pricingRes, areasRes] = await Promise.all([
                fetch(`${BASE_URL}/master-pricing${selectedArea !== 'all' ? `?fenceId=${selectedArea}` : ''}`),
                fetch(`${BASE_URL}/geofence/areas`)
            ]);
            
            const pricing = await pricingRes.json();
            const areaList = await areasRes.json();
            
            setPricingData(pricing);
            setAreas(areaList);
        } catch (err) {
            toast.error('Failed to load pricing registry');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedArea]);

    const handleSync = async () => {
        try {
            setIsSyncing(true);
            const res = await fetch(`${BASE_URL}/master-pricing/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fenceId: selectedArea === 'all' ? null : selectedArea })
            });
            if (res.ok) {
                toast.success(selectedArea === 'all' ? 'All Areas Synchronized' : 'Area Pricing Synchronized');
                fetchData();
            }
        } catch (err) {
            toast.error('Sync failed');
        } finally {
            setIsSyncing(false);
        }
    };

    const columns = useMemo(() => [
        {
            header: 'Zone / Area',
            key: 'fenceId',
            render: (val) => (
                <div className="flex flex-col">
                    <span className="font-black text-slate-900 uppercase tracking-tight text-[10px]">{val?.areaName || 'Unknown'}</span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">ID: {val?.excelFenceId || '—'}</span>
                </div>
            )
        },
        {
            header: 'Category',
            key: 'categoryId',
            render: (val) => (
                <span className="text-[9px] font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded-sm border border-slate-100 uppercase tracking-widest">
                    {val?.mainCategory || '—'}
                </span>
            )
        },
        {
            header: 'Sub-Category',
            key: 'categoryId',
            render: (val) => (
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    {val?.subCategory || '—'}
                </span>
            )
        },
        {
            header: 'Service Name',
            key: 'serviceId',
            render: (val) => (
                <span className="font-bold text-slate-800 uppercase tracking-tight text-[10px]">{val?.itemName}</span>
            )
        },
        {
            header: 'SKU',
            key: 'serviceId',
            render: (val) => (
                <span className="text-[8px] text-blue-500 font-black tracking-widest uppercase">{val?.skuId || 'NO-SKU'}</span>
            )
        },
        {
            header: 'GST%',
            key: 'serviceId',
            render: (val) => (
                <span className="text-[9px] font-black text-slate-500 tabular-nums">
                    {val?.gst || 5}%
                </span>
            )
        },
        {
            header: 'SAC',
            key: 'serviceId',
            render: (val) => (
                <span className="font-black text-slate-400 text-[10px] tracking-widest uppercase">
                    {val?.sacCode || '9994'}
                </span>
            )
        },
        {
            header: 'Global Price',
            key: 'basePrice',
            render: (val) => <span className="font-bold text-slate-400 text-[11px] line-through decoration-slate-300">₹{val}</span>
        },
        {
            header: 'Global Discount',
            key: 'discountPrice',
            render: (val) => <span className="font-black text-slate-900 text-[11px]">₹{val}</span>
        },
        {
            header: 'Base Mult.',
            key: 'fenceId',
            render: (val) => (
                <div className="flex items-center gap-1 text-blue-600 font-bold text-[9px]">
                    <Percent size={8} className="text-blue-400" />
                    <span>{val?.basePriceMultiplier || 1.0}x</span>
                </div>
            )
        },
        {
            header: 'Heritage Mult.',
            key: 'fenceId',
            render: (val) => (
                <div className="flex items-center gap-1 text-purple-600 font-bold text-[9px]">
                    <ShieldCheck size={8} className="text-purple-400" />
                    <span>{val?.heritageMultiplier || 1.0}x</span>
                </div>
            )
        },
        {
            header: 'Express Mult.',
            key: 'fenceId',
            render: (val) => (
                <div className="flex items-center gap-1 text-amber-600 font-bold text-[9px]">
                    <Zap size={8} className="text-amber-400" />
                    <span>{val?.dynamicSurgeMultiplier || 1.0}x</span>
                </div>
            )
        },
        {
            header: 'Disc. Mult.',
            key: 'fenceId',
            render: (val) => (
                <div className="flex items-center gap-1 text-emerald-600 font-bold text-[9px]">
                    <Percent size={8} className="text-emerald-400" />
                    <span>{val?.discountPriceMultiplier || 1.0}x</span>
                </div>
            )
        },
        {
            header: 'Base Price (Normal)',
            key: 'finalPrice',
            render: (_, row) => {
                const globalDiscounted = row.discountPrice || 0;
                const baseMult = row.fenceId?.basePriceMultiplier || 1.0;
                const gst = row.serviceId?.gst || 5;
                const priceBeforeTax = globalDiscounted * baseMult;
                const final = Math.round(priceBeforeTax * (1 + gst / 100));
                return (
                    <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-[11px]">₹{final}</span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Incl. GST</span>
                    </div>
                );
            }
        },
        {
            header: 'Base Price (Express)',
            key: 'finalPrice',
            render: (_, row) => {
                const globalDiscounted = row.discountPrice || 0;
                const baseMult = row.fenceId?.basePriceMultiplier || 1.0;
                const expressMult = row.fenceId?.dynamicSurgeMultiplier || 1.0;
                const gst = row.serviceId?.gst || 5;
                const priceBeforeTax = globalDiscounted * baseMult * expressMult;
                const final = Math.round(priceBeforeTax * (1 + gst / 100));
                return (
                    <div className="flex flex-col">
                        <span className="font-black text-amber-600 text-[11px]">₹{final}</span>
                        <span className="text-[8px] text-amber-400 font-bold uppercase tracking-widest">Incl. GST</span>
                    </div>
                );
            }
        },
        {
            header: 'Heritage Price (Normal)',
            key: 'finalPrice',
            render: (_, row) => {
                const globalDiscounted = row.discountPrice || 0;
                const baseMult = row.fenceId?.basePriceMultiplier || 1.0;
                const heritageMult = row.fenceId?.heritageMultiplier || 1.0;
                const hGst = row.serviceId?.heritageGst || 18;
                const priceBeforeTax = globalDiscounted * baseMult * heritageMult;
                const final = Math.round(priceBeforeTax * (1 + hGst / 100));
                return (
                    <div className="flex flex-col">
                        <span className="font-black text-purple-600 text-[11px]">₹{final}</span>
                        <span className="text-[8px] text-purple-400 font-bold uppercase tracking-widest">Incl. GST</span>
                    </div>
                );
            }
        },
        {
            header: 'Heritage Price (Express)',
            key: 'finalPrice',
            render: (_, row) => {
                const globalDiscounted = row.discountPrice || 0;
                const baseMult = row.fenceId?.basePriceMultiplier || 1.0;
                const heritageMult = row.fenceId?.heritageMultiplier || 1.0;
                const expressMult = row.fenceId?.dynamicSurgeMultiplier || 1.0;
                const hGst = row.serviceId?.heritageGst || 18;
                const priceBeforeTax = globalDiscounted * baseMult * heritageMult * expressMult;
                const final = Math.round(priceBeforeTax * (1 + hGst / 100));
                return (
                    <div className="flex flex-col">
                        <span className="font-black text-rose-600 text-[11px]">₹{final}</span>
                        <span className="text-[8px] text-rose-400 font-bold uppercase tracking-widest">Incl. GST</span>
                    </div>
                );
            }
        },
        {
            header: 'Discount Price (Normal)',
            key: 'finalPrice',
            render: (_, row) => {
                const globalDiscounted = row.discountPrice || 0;
                const baseMult = row.fenceId?.basePriceMultiplier || 1.0;
                // Only apply discount multiplier if service allows it
                const discMult = row.serviceId?.allowDiscount ? (row.fenceId?.discountPriceMultiplier || 1.0) : 1.0;
                const gst = row.serviceId?.gst || 5;
                const priceBeforeTax = globalDiscounted * baseMult * discMult;
                const final = Math.round(priceBeforeTax * (1 + gst / 100));
                return (
                    <div className="flex flex-col">
                        <span className="font-black text-emerald-600 text-[11px]">₹{final}</span>
                        <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest">Incl. GST</span>
                    </div>
                );
            }
        },
        {
            header: 'Discount Price (Express)',
            key: 'finalPrice',
            render: (_, row) => {
                const globalDiscounted = row.discountPrice || 0;
                const baseMult = row.fenceId?.basePriceMultiplier || 1.0;
                // Only apply discount multiplier if service allows it
                const discMult = row.serviceId?.allowDiscount ? (row.fenceId?.discountPriceMultiplier || 1.0) : 1.0;
                const expressMult = row.fenceId?.dynamicSurgeMultiplier || 1.0;
                const gst = row.serviceId?.gst || 5;
                const priceBeforeTax = globalDiscounted * baseMult * discMult * expressMult;
                const final = Math.round(priceBeforeTax * (1 + gst / 100));
                return (
                    <div className="flex flex-col">
                        <span className="font-black text-emerald-600 text-[11px]">₹{final}</span>
                        <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest">Incl. GST</span>
                    </div>
                );
            }
        },
        {
            header: 'Disc. Heritage Price (Normal)',
            key: 'finalPrice',
            render: (_, row) => {
                const globalDiscounted = row.discountPrice || 0;
                const baseMult = row.fenceId?.basePriceMultiplier || 1.0;
                const heritageMult = row.fenceId?.heritageMultiplier || 1.0;
                // Only apply discount multiplier if service allows it
                const discMult = row.serviceId?.allowDiscount ? (row.fenceId?.discountPriceMultiplier || 1.0) : 1.0;
                const hGst = row.serviceId?.heritageGst || 18;
                const priceBeforeTax = globalDiscounted * baseMult * heritageMult * discMult;
                const final = Math.round(priceBeforeTax * (1 + hGst / 100));
                return (
                    <div className="flex flex-col">
                        <span className="font-black text-purple-600 text-[11px]">₹{final}</span>
                        <span className="text-[8px] text-purple-400 font-bold uppercase tracking-widest">Incl. GST</span>
                    </div>
                );
            }
        },
        {
            header: 'Disc. Heritage Price (Express)',
            key: 'finalPrice',
            render: (_, row) => {
                const globalDiscounted = row.discountPrice || 0;
                const baseMult = row.fenceId?.basePriceMultiplier || 1.0;
                const heritageMult = row.fenceId?.heritageMultiplier || 1.0;
                // Only apply discount multiplier if service allows it
                const discMult = row.serviceId?.allowDiscount ? (row.fenceId?.discountPriceMultiplier || 1.0) : 1.0;
                const expressMult = row.fenceId?.dynamicSurgeMultiplier || 1.0;
                const hGst = row.serviceId?.heritageGst || 18;
                const priceBeforeTax = globalDiscounted * baseMult * heritageMult * discMult * expressMult;
                const final = Math.round(priceBeforeTax * (1 + hGst / 100));
                return (
                    <div className="flex flex-col">
                        <span className="font-black text-rose-600 text-[11px]">₹{final}</span>
                        <span className="text-[8px] text-rose-400 font-bold uppercase tracking-widest">Incl. GST</span>
                    </div>
                );
            }
        },
        {
            header: 'Final Price',
            key: 'finalPrice',
            render: (val) => (
                <div className="bg-slate-900 text-white px-3 py-1 rounded-sm shadow-sm inline-block">
                    <span className="text-xs font-black tracking-tighter">₹{val}</span>
                </div>
            )
        },
        {
            header: 'Status',
            key: 'isActive',
            render: (val) => (
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${val ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                    {val ? 'Ready' : 'Draft'}
                </span>
            )
        },
        {
            header: 'Actions',
            key: 'actions',
            align: 'right',
            render: () => (
                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-all">
                    <Edit2 size={14} />
                </button>
            )
        }
    ], []);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
            <PageHeader 
                title="Master Pricing Table"
                actions={[
                    {
                        label: "Export CSV",
                        icon: Download,
                        onClick: () => toast.success('Exporting Pricing Grid...'),
                        variant: 'secondary'
                    },
                    {
                        label: isSyncing ? "Syncing..." : "Sync Area Pricing",
                        icon: RefreshCw,
                        onClick: handleSync,
                        variant: 'primary'
                    }
                ]}
            />

            <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
                {/* Tactical Filters */}
                <div className="bg-white p-6 border border-slate-200 rounded-sm flex flex-wrap items-center gap-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center rounded-sm">
                            <Map size={18} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Selected Region</p>
                            <select 
                                value={selectedArea}
                                onChange={(e) => setSelectedArea(e.target.value)}
                                className="bg-transparent text-xs font-black uppercase tracking-tight outline-none cursor-pointer text-slate-900"
                            >
                                <option value="all">Global View (All Areas)</option>
                                {areas.map(area => (
                                    <option key={area._id} value={area._id}>{area.areaName} ({area.city})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="h-10 w-px bg-slate-100 hidden md:block" />

                    <div className="flex-1 min-w-[300px] relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input 
                            placeholder="SEARCH BY SKU OR SERVICE NAME..."
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-sm text-[10px] font-black uppercase tracking-wider outline-none focus:border-slate-900 transition-all"
                        />
                    </div>
                </div>

                {/* Master Table */}
                <DataGrid 
                    title="Unified Multiplier Registry"
                    columns={columns}
                    data={pricingData}
                    loading={loading}
                />
            </div>
        </div>
    );
};

export default MasterPricingRegistry;
