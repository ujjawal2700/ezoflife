import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { 
    Building2, 
    Mail, 
    Phone, 
    Calendar, 
    FileText, 
    ArrowRight, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    Download,
    Filter
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import DataGrid from '../components/tables/DataGrid';
import StatusBadge from '../components/common/StatusBadge';
import { partnershipApi } from '../../../lib/api';
import toast from 'react-hot-toast';

/** Statuses that count as still in play, for the pipeline stats. */
const OPEN_STATUSES = ['Lead Received', 'Under Verification', 'Proposal Sent', 'Contract Drafting', 'Account Setup'];
const WON_STATUSES = ['Active'];

export default function B2BLeads() {
    const [inquiries, setInquiries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLeads = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await partnershipApi.getAll();
            setInquiries(Array.isArray(data) ? data : (data?.inquiries || []));
        } catch (err) {
            console.error('Failed to load B2B leads:', err);
            toast.error('Could not load B2B leads');
            setInquiries([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchLeads(); }, [fetchLeads]);

    // Map the API record onto the shape this table renders.
    const leads = useMemo(() => inquiries.map(i => ({
        id: i._id,
        company: i.companyName,
        contact: i.phone || i.email,
        email: i.email,
        requirement: i.proposal || i.partnershipType || '—',
        status: i.status || 'Lead Received',
        date: (i.submittedAt || i.createdAt || '').slice(0, 10)
    })), [inquiries]);

    const leadStats = useMemo(() => {
        const total = inquiries.length;
        const fresh = inquiries.filter(i => (i.status || 'Lead Received') === 'Lead Received').length;
        const active = inquiries.filter(i => OPEN_STATUSES.includes(i.status) && i.status !== 'Lead Received').length;
        const won = inquiries.filter(i => WON_STATUSES.includes(i.status)).length;
        const conversion = total ? ((won / total) * 100).toFixed(1) : '0.0';

        return [
            { label: 'New Inquiries', value: String(fresh), subValue: `${total} total`, variant: 'slate' },
            { label: 'Active Negotiations', value: String(active), variant: 'slate' },
            { label: 'Converted', value: String(won), variant: 'primary' },
            { label: 'Conversion Rate', value: `${conversion}%`, variant: 'dark' }
        ];
    }, [inquiries]);

    const leadColumns = useMemo(() => [
        { 
            header: 'Entity / Lead', 
            key: 'company',
            render: (val, row) => (
                <div className="flex items-center gap-3 transition-transform">
                    <div className="w-8 h-8 rounded-sm bg-slate-900 text-white flex items-center justify-center">
                        <Building2 size={14} />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-[11px] uppercase tracking-tight leading-none mb-1">{val}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] opacity-60 flex items-center gap-1.5 tabular-nums leading-none">
                                {row.contact}
                            </span>
                        </div>
                    </div>
                </div>
            )
        },
        { 
            header: 'Primary Request', 
            key: 'requirement',
            render: (val) => (
                <div className="max-w-[250px]">
                    <p className="text-[10px] font-bold text-slate-600 line-clamp-1 italic uppercase tracking-tighter">"{val}"</p>
                </div>
            )
        },
        { 
            header: 'Lead Status', 
            key: 'status', 
            render: (val) => <StatusBadge status={val} /> 
        },
        { 
            header: 'Inbound Date', 
            key: 'date', 
            render: (val) => (
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest tabular-nums opacity-60 flex items-center gap-2">
                    <Calendar size={10} className="text-slate-200" /> {val}
                </span>
            )
        },
        { 
            header: 'Administrative Actions', 
            key: 'actions', 
            align: 'right',
            render: (val, row) => (
                <div className="flex items-center justify-end gap-2.5">
                    <button className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-sm text-[8px] font-black uppercase tracking-[0.2em] hover:bg-slate-950 hover:text-white hover:border-slate-950 transition-all flex items-center gap-2">
                        View Lead Profile <ArrowRight size={11} />
                    </button>
                </div>
            )
        }
    ], []);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
            <PageHeader 
                title="B2B Leads Repository" 
                actions={[
                    { label: 'Export Leads (CSV)', icon: Download, variant: 'secondary' },
                    { label: 'Register Manual Lead', icon: Building2, variant: 'primary' }
                ]}
            />

            <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
                {/* Tactical Stats Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {leadStats.map((stat, i) => (
                        <div key={i} className={`${stat.variant === 'dark' ? 'bg-slate-900 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'} p-6 rounded-sm border flex flex-col gap-2 ${stat.variant === 'primary' ? 'text-primary' : ''}`}>
                            <span className={`text-[9px] font-black ${stat.variant === 'dark' ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest italic leading-none ${stat.variant === 'primary' ? 'opacity-60' : ''}`}>{stat.label}</span>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-2xl font-black ${stat.variant === 'dark' ? 'text-white' : 'text-slate-900'} tabular-nums italic leading-none`}>{stat.value}</span>
                                {stat.subValue && <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">{stat.subValue}</span>}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Lead Registry */}
                {isLoading ? (
                    <div className="py-16 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                        Loading inquiries…
                    </div>
                ) : leads.length === 0 ? (
                    <div className="py-16 text-center">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">No B2B inquiries yet</p>
                        <p className="mt-2 text-[10px] text-slate-400">
                            Submissions from the Partnership Inquiry form appear here.
                        </p>
                    </div>
                ) : (
                    <DataGrid
                        title="Enterprise Inquiry Feed"
                        columns={leadColumns}
                        data={leads}
                    />
                )}
            </div>
        </div>
    );
}
