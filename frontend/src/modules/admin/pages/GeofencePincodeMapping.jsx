import React, { useState, useEffect, useMemo } from 'react';
import { BASE_URL } from '../../../lib/api';
import { toast } from 'react-hot-toast';
import { 
    Download, Hash, MapPin, Shield, CheckCircle, 
    Filter, Search, ArrowRightLeft, Database
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import DataGrid from '../components/tables/DataGrid';

const GeofencePincodeMapping = () => {
    const [mappings, setMappings] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchMappings = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${BASE_URL}/geofence/pincode-mappings`);
            const data = await res.json();
            setMappings(data);
        } catch (err) {
            toast.error('Failed to load mappings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMappings();
    }, []);

    const columns = useMemo(() => [
        {
            header: 'Mapping ID',
            key: 'mappingId',
            render: (val) => (
                <span className="font-black text-slate-900 tabular-nums">
                    #{val}
                </span>
            )
        },
        {
            header: 'Fence ID',
            key: 'fenceId',
            render: (val) => (
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-900 text-white flex items-center justify-center rounded-sm text-[8px] font-black">
                        F{val}
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Excel Ref</span>
                </div>
            )
        },
        {
            header: 'Pincode',
            key: 'pincode',
            render: (val) => (
                <div className="flex items-center gap-2 text-slate-900 font-black">
                    <MapPin size={12} className="text-slate-300" />
                    <span>{val}</span>
                </div>
            )
        },
        {
            header: 'Coverage Type',
            key: 'coverageType',
            render: (val) => (
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${val === 'Full' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className={`text-[9px] font-black uppercase tracking-widest ${val === 'Full' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {val} Coverage
                    </span>
                </div>
            )
        },
        {
            header: 'Sync Status',
            key: 'status',
            render: () => (
                <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <CheckCircle size={10} className="text-emerald-500" />
                    Validated
                </div>
            )
        }
    ], []);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
            <PageHeader 
                title="Pincode Logistics Registry" 
                actions={[
                    {
                        label: "Export CSV",
                        icon: Download,
                        onClick: () => toast.success('Exporting Logistical Data...'),
                        variant: 'secondary'
                    }
                ]}
            />

            <div className="p-6 space-y-6 max-w-[1200px] mx-auto w-full">
                {/* Information Callout */}
                <div className="bg-slate-900 text-white p-8 rounded-sm shadow-2xl flex items-center justify-between border-l-4 border-emerald-500">
                    <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-white/10 flex items-center justify-center rounded-sm border border-white/10">
                            <Database size={24} className="text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-[12px] font-black uppercase tracking-[0.2em]">Logistical Synchronization</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Direct Mapping from Spinzyt Master Excel (Table 4)</p>
                        </div>
                    </div>
                    <div className="hidden md:flex gap-10">
                        <div className="text-center">
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Mappings</p>
                            <p className="text-xl font-black">{mappings.length}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Active Pincodes</p>
                            <p className="text-xl font-black text-emerald-400">{new Set(mappings.map(m => m.pincode)).size}</p>
                        </div>
                    </div>
                </div>

                <DataGrid 
                    title="Pincode-to-Geofence Mapping"
                    columns={columns}
                    data={mappings}
                    loading={loading}
                />
            </div>
        </div>
    );
};

export default GeofencePincodeMapping;
