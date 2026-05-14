import React, { useState, useEffect, useMemo } from 'react';
import { BASE_URL } from '../../../lib/api';
import { toast } from 'react-hot-toast';
import { 
    Download, MapPin, Globe, Zap, Percent, ShieldCheck, 
    ChevronRight, Info, Settings, MoreHorizontal, Map
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
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{row.city}, {row.state || 'MH'}</span>
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
            header: 'Surge Mult.',
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
            header: 'Status',
            key: 'isActive',
            render: (val) => (
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${val ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                    {val ? 'Live' : 'Inactive'}
                </span>
            )
        },
        {
            header: 'Actions',
            key: 'actions',
            align: 'right',
            render: (val, row) => (
                <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-slate-100 rounded-sm text-slate-400 hover:text-slate-900 transition-all">
                        <MoreHorizontal size={14} />
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
        </div>
    );
};

export default ServiceGeofenceTable;
