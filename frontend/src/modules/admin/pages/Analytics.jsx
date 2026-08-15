import React, { useMemo, useState, useEffect } from 'react';
import { BarChart3, TrendingUp, ShoppingBag, Users, Zap, Calendar, Download, Filter, Target, Activity, Cpu, Monitor, IndianRupee, Star, ShieldCheck } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import PageHeader from '../components/common/PageHeader';
import MetricRow from '../components/cards/MetricRow';
import ChartPanel from '../components/cards/ChartPanel';
import { dashboardApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const pct = (num, den) => (den ? ((num / den) * 100).toFixed(1) : '0.0');

export default function Analytics() {
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
        console.error('Failed to load analytics:', err);
        if (!cancelled) toast.error('Could not load analytics');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const financials = analytics?.financials;
  const lifecycle = analytics?.orderLifecycleB2C;
  const vendors = analytics?.vendorPerformance;
  const customers = analytics?.customerAnalytics;

  // Revenue split, derived from the real financial figures.
  const revenueFlow = useMemo(() => {
    if (!financials) return [];
    return [
      { name: 'Gross Revenue', value: financials.grossRevenue || 0 },
      { name: 'Vendor Payouts', value: financials.vendorPayouts || 0 },
      { name: 'Logistics', value: financials.logisticsPayouts || 0 },
      { name: 'Net Profit', value: financials.netProfit || 0 }
    ];
  }, [financials]);

  // Where live orders currently sit.
  const orderStats = useMemo(() => {
    if (!lifecycle) return [];
    return [
      { name: 'Submitted', value: lifecycle.totalSubmitted || 0 },
      { name: 'Accepted', value: lifecycle.totalAccepted || 0 },
      { name: 'In Progress', value: lifecycle.inProgress || 0 },
      { name: 'Ready', value: lifecycle.readyForDispatch || 0 },
      { name: 'Outbound', value: lifecycle.outboundLogistics || 0 }
    ];
  }, [lifecycle]);

  const marketSegmentation = useMemo(() => {
    const cohorts = vendors?.cohorts;
    if (!cohorts) return [];
    return [
      { name: 'Local', value: cohorts.local || 0 },
      { name: 'Proprietorship', value: cohorts.proprietorship || 0 },
      { name: 'Partnership', value: cohorts.partnership || 0 },
      { name: 'Pvt Ltd', value: cohorts.pvtLtd || 0 },
      { name: 'Franchise', value: cohorts.franchise || 0 }
    ].filter(s => s.value > 0);
  }, [vendors]);

  const performanceKPIs = useMemo(() => {
    const submitted = lifecycle?.totalSubmitted || 0;
    const accepted = lifecycle?.totalAccepted || 0;
    const gross = financials?.grossRevenue || 0;
    const aov = submitted ? gross / submitted : 0;

    return [
      { label: 'Acceptance Rate', value: `${pct(accepted, submitted)}%`, variant: 'emerald' },
      { label: 'Gross Revenue', value: inr(gross), variant: 'blue' },
      { label: 'Logistics Bounces', value: String(lifecycle?.logisticsBounces ?? 0), variant: 'rose' },
      { label: 'Avg Order Value', value: inr(aov), variant: 'slate' }
    ];
  }, [lifecycle, financials]);

  const operationalStats = useMemo(() => ([
    { label: 'Active Vendors', value: String(vendors?.totalVendors ?? 0) },
    { label: 'Total Customers', value: String(customers?.totalCustomers ?? 0) },
    { label: 'Dormant Vendors', value: String(vendors?.dormantCount ?? 0), variant: 'rose' },
    { label: 'Net Profit', value: inr(financials?.netProfit), variant: 'emerald' }
  ]), [vendors, customers, financials]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-25/50 pb-20">
      <PageHeader 
        title="Analytics" 
        actions={[
          { label: 'Export Data Report', icon: Download, variant: 'secondary' },
          { label: 'Set Goals', icon: Target, variant: 'primary' }
        ]}
      />

      {/* Analytics Performance Layer */}
      <div className="bg-white border-b border-slate-200 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 divide-x divide-slate-100 max-w-[1600px] mx-auto w-full">
            <MetricRow
              label="Gross Revenue"
              value={inr(financials?.grossRevenue)}
              trend="up"
              icon={IndianRupee}
            />
            <MetricRow
              label="Avg Vendor Rating"
              value={vendors?.averageRating ? `${Number(vendors.averageRating).toFixed(1)}/5` : '—'}
              trend="up"
              icon={Star}
            />
            <MetricRow
              label="Acceptance Rate"
              value={`${pct(lifecycle?.totalAccepted || 0, lifecycle?.totalSubmitted || 0)}%`}
              trend="up"
              icon={TrendingUp}
            />
            <MetricRow
              label="Wallet Liability"
              value={inr(financials?.walletLiability)}
              icon={ShieldCheck}
            />
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartPanel 
            title="Revenue Overview" 
            subtitle="Platform revenue trend analysis"
            height={300}
          >
            <div className="h-full w-full p-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueFlow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAnalytics" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                  <Tooltip contentStyle={{ borderRadius: '1px', border: '1px solid #f1f5f9', fontWeight: 'black', textTransform: 'uppercase' }} />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAnalytics)" strokeWidth={4} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartPanel>

          <ChartPanel 
            title="Orders by Category" 
            subtitle="Operational yield segmentation"
            height={300}
          >
            <div className="h-full w-full p-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orderStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '1px', border: '1px solid #f1f5f9' }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[1, 1, 0, 0]} barSize={24}>
                    {orderStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartPanel>
        </div>

        {/* Platform Performance Layer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartPanel 
              title="Operational Global Pulse" 
              subtitle="Mission critical system metrics"
              height={400}
              collapsible={false}
              className="lg:col-span-2"
            >
              <div className="p-10 h-full flex flex-col justify-between bg-white">
                 <div className="grid grid-cols-2 md:grid-cols-2 gap-x-12 gap-y-10">
                    {performanceKPIs.map((kpi, i) => (
                      <div key={i} className="flex flex-col gap-2 p-1 border-l-2 border-slate-50 pl-6 hover:border-primary transition-all group">
                        <span className={`text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-primary transition-colors`}>{kpi.label}</span>
                        <div className="flex items-baseline gap-3">
                          <span className="text-3xl font-black text-slate-900 tabular-nums leading-none tracking-tighter">{kpi.value}</span>
                          <span className={`text-[10px] ${kpi.variant === 'rose' ? 'text-rose-500' : 'text-emerald-500'} font-black uppercase tracking-tight`}>
                             {kpi.delta}
                          </span>
                        </div>
                      </div>
                    ))}
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-10 border-t border-slate-100 mt-6">
                    {operationalStats.map((stat, i) => (
                      <div key={i} className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{stat.label}</span>
                        <span className={`text-xl font-black ${stat.variant === 'emerald' ? 'text-emerald-500' : 'text-slate-900'} tabular-nums leading-none tracking-tighter`}>{stat.value}</span>
                      </div>
                    ))}
                 </div>
              </div>
            </ChartPanel>

            <ChartPanel title="Market Segmentation" subtitle="Category yield breakdown" height={400}>
               <div className="h-full w-full p-6 flex flex-col items-center justify-between">
                 <div className="flex-1 w-full max-h-[220px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={marketSegmentation}
                          innerRadius={65}
                          outerRadius={85}
                          paddingAngle={10}
                          dataKey="value"
                        >
                          {marketSegmentation.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '0px', border: '1px solid #f1f5f9', fontSize: '10px', fontWeight: 'bold' }} />
                      </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="grid grid-cols-2 gap-x-8 gap-y-4 w-full px-4 pt-6 mt-2 border-t border-slate-50">
                    {marketSegmentation.map((cat, i) => (
                        <div key={cat.name} className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                            <div className="flex flex-col">
                               <span className="text-[9px] font-black uppercase tracking-widest text-slate-900 leading-none">{cat.name}</span>
                               <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">₹{cat.value}K</span>
                            </div>
                        </div>
                    ))}
                 </div>
               </div>
            </ChartPanel>
        </div>

      </div>
    </div>
  );
}
