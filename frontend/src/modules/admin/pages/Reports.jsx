import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  Zap, 
  Calendar, 
  Download, 
  Filter, 
  Target, 
  Activity, 
  Cpu, 
  Monitor, 
  IndianRupee, 
  Clock,
  ShieldCheck,
  ShieldAlert,
  Map,
  RotateCcw,
  UserCheck
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import PageHeader from '../components/common/PageHeader';
import MetricRow from '../components/cards/MetricRow';
import ChartPanel from '../components/cards/ChartPanel';
import { dashboardApi } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function Reports() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'revenue';
  const COLORS = useMemo(() => ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'], []);

  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await dashboardApi.getAnalytics();
        if (!cancelled) setAnalytics(res?.data || null);
      } catch (err) {
        console.error('Failed to load report data:', err);
        if (!cancelled) toast.error('Could not load report data');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const financials = analytics?.financials;
  const lifecycle = analytics?.orderLifecycleB2C;

  const revenueFlow = useMemo(() => {
    if (!financials) return [];
    return [
      { name: 'Gross Revenue', value: financials.grossRevenue || 0 },
      { name: 'Vendor Payouts', value: financials.vendorPayouts || 0 },
      { name: 'Logistics', value: financials.logisticsPayouts || 0 },
      { name: 'Net Profit', value: financials.netProfit || 0 }
    ];
  }, [financials]);

  const orderStats = useMemo(() => {
    if (!lifecycle) return [];
    return [
      { name: 'Submitted', value: lifecycle.totalSubmitted || 0 },
      { name: 'Accepted', value: lifecycle.totalAccepted || 0 },
      { name: 'In Progress', value: lifecycle.inProgress || 0 },
      { name: 'Ready', value: lifecycle.readyForDispatch || 0 },
      { name: 'Outbound', value: lifecycle.outboundLogistics || 0 },
      { name: 'Reverse', value: lifecycle.reverseLogistics || 0 }
    ];
  }, [lifecycle]);
  
  const reportTitles = {
    tat: "Vendor TAT Report",
    heatmap: "Geospatial Heatmaps",
    leakage: "Revenue Leakage Analysis",
    customers: "Repeat Customers Analysis"
  };

  const reportIcons = {
    tat: Clock,
    heatmap: Map,
    leakage: ShieldAlert,
    customers: UserCheck
  };

  const CurrentIcon = reportIcons[type] || BarChart3;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
      <PageHeader 
        title={reportTitles[type] || "Business Reports"} 
        actions={[
          { label: 'Download PDF', icon: Download, variant: 'secondary' },
          { label: 'Export CSV', icon: Calendar, variant: 'primary' }
        ]}
      />

      {/* Reports Performance Layer */}
      <div className="bg-white border-b border-slate-200 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 divide-x divide-slate-100 max-w-[1600px] mx-auto w-full">
            <MetricRow label="Report Accuracy" value="99.9%" change="+0.1%" trend="up" icon={ShieldCheck} />
            <MetricRow label="Data Freshness" value="REAL-TIME" change="ACTIVE" trend="up" icon={Zap} />
            <MetricRow label="Total Nodes" value="1.2K" change="+42" trend="up" icon={Activity} />
            <MetricRow label="Contextual ID" value={type.toUpperCase()} trend="up" icon={CurrentIcon} />
        </div>
      </div>

      <div className="p-6 space-y-8 max-w-[1600px] mx-auto w-full">
        
        {/* Report Content based on type */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartPanel 
                title={`${reportTitles[type]} Overview`} 
                subtitle={`Global trend for ${type} metrics`}
                height={400}
            >
                <div className="h-full w-full p-8">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueFlow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorReport" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                            <Tooltip contentStyle={{ borderRadius: '1px', border: '1px solid #f1f5f9', fontWeight: 'black', textTransform: 'uppercase' }} />
                            <Area type="monotone" dataKey="value" stroke="#0f172a" fillOpacity={1} fill="url(#colorReport)" strokeWidth={4} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </ChartPanel>

            <ChartPanel 
                title="Distribution Breakdown" 
                subtitle="Categorical segmentation"
                height={400}
            >
                <div className="h-full w-full p-8">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={orderStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '1px', border: '1px solid #f1f5f9' }} />
                            <Bar dataKey="value" fill="#0f172a" radius={[1, 1, 0, 0]} barSize={32}>
                                {orderStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </ChartPanel>
        </div>

        {/* Tactical Intel Layer */}
        <div className="bg-white border border-slate-200 rounded-sm p-10 space-y-10">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center rounded-sm">
                    <Activity size={24} />
                </div>
                <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Tactical Report Intelligence</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Deep-dive into {type} operational variables</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                {[
                    {
                        label: 'Orders Submitted',
                        value: String(lifecycle?.totalSubmitted ?? 0),
                        desc: 'Total orders in the period'
                    },
                    {
                        label: 'Acceptance Rate',
                        value: lifecycle?.totalSubmitted
                            ? `${((lifecycle.totalAccepted / lifecycle.totalSubmitted) * 100).toFixed(1)}%`
                            : '0.0%',
                        desc: 'Accepted by a vendor'
                    },
                    {
                        label: 'Logistics Bounces',
                        value: String(lifecycle?.logisticsBounces ?? 0),
                        desc: 'Failed pickup or delivery legs'
                    },
                    {
                        label: 'Net Profit',
                        value: `₹${Number(financials?.netProfit || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                        desc: 'Gross revenue less payouts'
                    }
                ].map((intel, i) => (
                    <div key={i} className="space-y-2 border-l-2 border-slate-50 pl-6">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{intel.label}</span>
                        <p className="text-2xl font-black text-slate-900 tabular-nums leading-none tracking-tighter">{intel.value}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight opacity-60">{intel.desc}</p>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}
