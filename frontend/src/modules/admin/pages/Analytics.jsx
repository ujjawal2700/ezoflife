import React, { useMemo, useState, useEffect } from 'react';
import { TrendingUp, Download, IndianRupee, Star, ShieldCheck } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import PageHeader from '../components/common/PageHeader';
import MetricRow from '../components/cards/MetricRow';
import ChartPanel from '../components/cards/ChartPanel';
import { dashboardApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const pct = (num, den) => (den ? ((num / den) * 100).toFixed(1) : '0.0');
const TIME_RANGES = ['Today', 'Last 7 Days', 'Last 30 Days', 'Year-to-Date'];

/** Shown in a chart area when the period has nothing to plot. */
const EmptyNote = ({ text = 'No data for this period' }) => (
  <div className="h-full w-full flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-300">
    {text}
  </div>
);

/**
 * Platform analytics. Every figure comes from /admin/dashboard-analytics
 * (the same database queries as the Dashboard) for the selected period.
 */
export default function Analytics() {
  const COLORS = useMemo(() => ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'], []);

  const [timeRange, setTimeRange] = useState('Last 30 Days');
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const res = await dashboardApi.getAnalytics({ timeRange });
        if (!cancelled) setAnalytics(res?.data || null);
      } catch (err) {
        console.error('Failed to load analytics:', err);
        if (!cancelled) toast.error('Could not load analytics');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [timeRange]);

  const financials = analytics?.financials;
  const lifecycle = analytics?.orderLifecycleB2C;
  const vendors = analytics?.vendorPerformance;
  const customers = analytics?.customerAnalytics;
  const sentiment = analytics?.feedbackSentiment;

  // Real month-by-month revenue and platform profit (last 6 months)
  const monthlyTrend = analytics?.monthlyTrend || [];
  const hasTrend = monthlyTrend.some(m => m.Revenue > 0 || m.Profit > 0);

  // Where orders placed in the period currently sit
  const orderStats = useMemo(() => {
    if (!lifecycle) return [];
    return [
      { name: 'Placed', value: lifecycle.totalSubmitted || 0 },
      { name: 'Accepted', value: lifecycle.totalAccepted || 0 },
      { name: 'Processing', value: lifecycle.inProgress || 0 },
      { name: 'Ready', value: lifecycle.readyForDispatch || 0 },
      { name: 'In Transit', value: lifecycle.outboundLogistics || 0 },
      { name: 'Out for Delivery', value: lifecycle.reverseLogistics || 0 }
    ];
  }, [lifecycle]);

  // Vendors by registered business type (counts, not money)
  const vendorMix = useMemo(() => {
    const cohorts = vendors?.cohorts;
    if (!cohorts) return [];
    return [
      { name: 'Unspecified', value: cohorts.local || 0 },
      { name: 'Proprietorship', value: cohorts.proprietorship || 0 },
      { name: 'Partnership', value: cohorts.partnership || 0 },
      { name: 'Pvt Ltd', value: cohorts.pvtLtd || 0 },
      { name: 'Franchise', value: cohorts.franchise || 0 }
    ].filter(s => s.value > 0);
  }, [vendors]);

  const submitted = lifecycle?.totalSubmitted || 0;
  const accepted = lifecycle?.totalAccepted || 0;
  const gross = financials?.grossRevenue || 0;
  const trendIsDown = (financials?.trendMoM || '').startsWith('-');

  const performanceKPIs = [
    { label: 'Acceptance Rate', value: `${pct(accepted, submitted)}%` },
    { label: 'Avg Order Value', value: inr(submitted ? (financials?.b2cRevenue || 0) / submitted : 0) },
    { label: 'Logistics Bounces', value: String(lifecycle?.logisticsBounces ?? 0), variant: 'rose' },
    { label: 'Critical Timeouts (>24h)', value: String(lifecycle?.criticalTimeouts ?? 0), variant: 'rose' }
  ];

  const operationalStats = [
    { label: 'Total Vendors', value: String(vendors?.totalVendors ?? 0) },
    { label: 'Total Customers', value: String(customers?.totalCustomers ?? 0) },
    { label: 'Dormant Vendors', value: String(vendors?.dormantCount ?? 0) },
    { label: 'Net Platform Profit', value: inr(financials?.netProfit), variant: 'emerald' }
  ];

  const handleExport = () => {
    if (!analytics) return;
    const rows = [
      ['Metric', 'Value'],
      ['Period', timeRange],
      ['Gross revenue (INR)', gross],
      ['Customer order revenue (INR)', financials?.b2cRevenue || 0],
      ['Supply order revenue (INR)', financials?.b2bRevenue || 0],
      ['Net platform profit (INR)', financials?.netProfit || 0],
      ['Revenue change vs prior period', financials?.trendMoM || '0%'],
      ['Wallet liability (INR)', financials?.walletLiability || 0],
      ['Refunds (INR)', financials?.refunds || 0],
      ['Orders placed', submitted],
      ['Orders accepted', accepted],
      ['Acceptance rate (%)', pct(accepted, submitted)],
      ['Logistics bounces', lifecycle?.logisticsBounces ?? 0],
      ['Critical timeouts (>24h)', lifecycle?.criticalTimeouts ?? 0],
      ['Total vendors', vendors?.totalVendors ?? 0],
      ['Dormant vendors', vendors?.dormantCount ?? 0],
      ['Total customers', customers?.totalCustomers ?? 0],
      ['Average customer rating', sentiment?.averageRating ?? ''],
      [],
      ['Month', 'Revenue (INR)', 'Platform profit (INR)'],
      ...monthlyTrend.map(m => [m.month, m.Revenue, m.Profit])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `Platform_Analytics_${timeRange.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
      <PageHeader
        title="Analytics"
        actions={[
          {
            customComponent: (
              <select
                value={timeRange}
                onChange={e => setTimeRange(e.target.value)}
                aria-label="Period"
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-sm text-[9px] font-bold uppercase tracking-[0.2em] text-slate-700 cursor-pointer outline-none"
              >
                {TIME_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )
          },
          { label: 'Export CSV', icon: Download, variant: 'primary', onClick: handleExport }
        ]}
      />

      {/* Headline metrics */}
      <div className="bg-white border-b border-slate-200 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-x divide-slate-100 max-w-[1600px] mx-auto w-full">
            <MetricRow
              label="Gross Revenue"
              value={isLoading && !analytics ? '…' : inr(gross)}
              change={financials?.trendMoM ? `${financials.trendMoM.replace(/^[+-]/, '')} vs prior` : undefined}
              trend={trendIsDown ? 'down' : 'up'}
              icon={IndianRupee}
            />
            <MetricRow
              label="Avg Customer Rating"
              value={sentiment?.averageRating ? `${Number(sentiment.averageRating).toFixed(1)}/5` : '—'}
              icon={Star}
            />
            <MetricRow
              label="Acceptance Rate"
              value={`${pct(accepted, submitted)}%`}
              icon={TrendingUp}
            />
            <MetricRow
              label="Wallet Liability"
              value={inr(financials?.walletLiability)}
              icon={ShieldCheck}
            />
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartPanel
            title="Revenue Trend"
            subtitle="Revenue and platform profit by month (last 6 months)"
            height={300}
          >
            <div className="h-full w-full p-6">
              {!hasTrend ? <EmptyNote text="No revenue in the last 6 months" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAnalytics" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                  <Tooltip formatter={(v) => inr(v)} contentStyle={{ borderRadius: '1px', border: '1px solid #f1f5f9', fontWeight: 'bold' }} />
                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                  <Area type="monotone" name="Revenue" dataKey="Revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAnalytics)" strokeWidth={3} />
                  <Area type="monotone" name="Platform profit" dataKey="Profit" stroke="#10b981" fill="none" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
              )}
            </div>
          </ChartPanel>

          <ChartPanel
            title="Order Pipeline"
            subtitle={`Customer orders placed (${timeRange.toLowerCase()}) by current stage`}
            height={300}
          >
            <div className="h-full w-full p-6">
              {!submitted ? <EmptyNote /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orderStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} dy={10} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '1px', border: '1px solid #f1f5f9' }} />
                  <Bar dataKey="value" name="Orders" fill="#3b82f6" radius={[1, 1, 0, 0]} barSize={24}>
                    {orderStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </ChartPanel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartPanel
              title="Operations"
              subtitle={`Key operating metrics (${timeRange.toLowerCase()})`}
              height={400}
              collapsible={false}
              className="lg:col-span-2"
            >
              <div className="p-6 sm:p-10 h-full flex flex-col justify-between bg-white">
                 <div className="grid grid-cols-2 gap-x-12 gap-y-10">
                    {performanceKPIs.map((kpi) => (
                      <div key={kpi.label} className="flex flex-col gap-2 p-1 border-l-2 border-slate-50 pl-6">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</span>
                        <span className={`text-3xl font-black tabular-nums leading-none tracking-tighter ${kpi.variant === 'rose' ? 'text-rose-600' : 'text-slate-900'}`}>{kpi.value}</span>
                      </div>
                    ))}
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-10 border-t border-slate-100 mt-6">
                    {operationalStats.map((stat) => (
                      <div key={stat.label} className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{stat.label}</span>
                        <span className={`text-xl font-black ${stat.variant === 'emerald' ? 'text-emerald-600' : 'text-slate-900'} tabular-nums leading-none tracking-tighter`}>{stat.value}</span>
                      </div>
                    ))}
                 </div>
              </div>
            </ChartPanel>

            <ChartPanel title="Vendor Mix" subtitle="Vendors by business type" height={400}>
               <div className="h-full w-full p-6 flex flex-col items-center justify-between">
                 {vendorMix.length === 0 ? <EmptyNote text="No vendors yet" /> : (
                 <>
                 <div className="flex-1 w-full max-h-[220px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={vendorMix} innerRadius={65} outerRadius={85} paddingAngle={4} dataKey="value" nameKey="name">
                          {vendorMix.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '0px', border: '1px solid #f1f5f9', fontSize: '10px', fontWeight: 'bold' }} />
                      </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="grid grid-cols-2 gap-x-8 gap-y-4 w-full px-4 pt-6 mt-2 border-t border-slate-50">
                    {vendorMix.map((cat, i) => (
                        <div key={cat.name} className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                            <div className="flex flex-col">
                               <span className="text-[9px] font-black uppercase tracking-widest text-slate-900 leading-none">{cat.name}</span>
                               <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{cat.value} vendor{cat.value === 1 ? '' : 's'}</span>
                            </div>
                        </div>
                    ))}
                 </div>
                 </>
                 )}
               </div>
            </ChartPanel>
        </div>
      </div>
    </div>
  );
}
