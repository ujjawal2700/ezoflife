import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Clock, Map, ShieldAlert, UserCheck } from 'lucide-react';
import {
  XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ScatterChart, Scatter
} from 'recharts';
import PageHeader from '../components/common/PageHeader';
import MetricRow from '../components/cards/MetricRow';
import ChartPanel from '../components/cards/ChartPanel';
import { adminApi } from '../../../lib/api';
import toast from 'react-hot-toast';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const orDash = (v, suffix = '') => (v === null || v === undefined ? '—' : `${v}${suffix}`);
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#64748b'];

const REPORTS = {
  tat: { title: 'Vendor TAT Report', icon: Clock, blurb: 'How long orders take, from placement to delivery, measured from recorded status changes.' },
  heatmap: { title: 'Geospatial Heatmap', icon: Map, blurb: 'Where orders come from, by pickup location and address pincode.' },
  leakage: { title: 'Revenue Leakage Analysis', icon: ShieldAlert, blurb: 'Revenue lost to refunds, unpaid deliveries, platform discounts and unpaid fees.' },
  customers: { title: 'Repeat Customers Analysis', icon: UserCheck, blurb: 'How many customers come back, and how much of revenue they drive.' }
};

const Empty = ({ text = 'No data for this period' }) => (
  <div className="h-full w-full min-h-[120px] flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-300">
    {text}
  </div>
);

/** Simple table used by every report. */
const Table = ({ columns, rows = [], empty }) => (
  <div className="overflow-x-auto">
    {rows.length === 0 ? <Empty text={empty} /> : (
      <table className="w-full text-left text-[11px]">
        <thead className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
          <tr>{columns.map(c => <th key={c.key} className={`py-2 pr-4 ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map(c => (
                <td key={c.key} className={`py-2.5 pr-4 ${c.align === 'right' ? 'text-right tabular-nums' : ''} ${c.strong ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                  {c.render ? c.render(r[c.key], r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const downloadCsv = (filename, header, rows) => {
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Business reports. Each report type is computed server-side from real
 * orders for the selected period (GET /admin/reports/:type).
 */
export default function Reports() {
  const [searchParams] = useSearchParams();
  const type = REPORTS[searchParams.get('type')] ? searchParams.get('type') : 'tat';
  const meta = REPORTS[type];

  const [from, setFrom] = useState(() => ymd(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(() => ymd(new Date()));
  const [loaded, setLoaded] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoaded(null);
    adminApi.getReport(type, { from, to })
      .then(d => { if (!cancelled) setLoaded(d); })
      .catch(err => { if (!cancelled) toast.error(err.message || 'Could not load report'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [type, from, to]);

  // Switching report type keeps this component mounted, so for one render the
  // previous type's data is still in state. Only use data for the type on screen.
  const report = loaded?.type === type ? loaded : null;
  const s = report?.summary || {};
  const show = (v) => (loading || !report ? '…' : v);

  const metrics = useMemo(() => {
    if (type === 'tat') return [
      { label: 'Delivered Orders', value: show(orDash(s.deliveredOrders)) },
      { label: 'Avg Order-to-Delivery', value: show(orDash(s.avgTotalHours, ' h')) },
      { label: 'Delivered Within 48h', value: show(orDash(s.within48hPercent, '%')) },
      { label: 'Without Status Timeline', value: show(orDash(s.ordersWithoutTimeline)) }
    ];
    if (type === 'heatmap') return [
      { label: 'Orders', value: show(orDash(s.orders)) },
      { label: 'Mapped Orders', value: show(orDash(s.mappedOrders)) },
      { label: 'Active Areas (~1 km)', value: show(orDash(s.activeCells)) },
      { label: 'Pincodes', value: show(orDash(s.pincodes)) }
    ];
    if (type === 'leakage') return [
      { label: 'Billed Revenue', value: show(inr(s.billed)) },
      { label: 'Revenue Leakage', value: show(inr(s.totalLeakage)) },
      { label: 'Leakage Rate', value: show(orDash(s.leakagePercent, '%')) },
      { label: 'Wallet Credits Used', value: show(inr(s.walletCreditsUsed)) }
    ];
    return [
      { label: 'Ordering Customers', value: show(orDash(s.customers)) },
      { label: 'Repeat Customers', value: show(orDash(s.repeatCustomers)) },
      { label: 'Repeat Rate', value: show(orDash(s.repeatRate, '%')) },
      { label: 'Revenue from Repeaters', value: show(orDash(s.repeatRevenueShare, '%')) }
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, report, loading]);

  const handleExport = () => {
    if (!report) return;
    const stamp = `${from}_to_${to}`;
    if (type === 'tat') {
      downloadCsv(`Vendor_TAT_${stamp}.csv`, ['Vendor', 'Phone', 'Delivered orders', 'Avg order-to-delivery (h)', 'Avg processing (h)', 'Within 48h'],
        report.vendors.map(v => [v.name, v.phone, v.orders, v.avgTotalHours, v.avgProcessingHours ?? '', v.within48h]));
    } else if (type === 'heatmap') {
      downloadCsv(`Order_Heatmap_${stamp}.csv`, ['Pincode', 'Orders', 'Revenue (INR)'],
        report.pincodes.map(p => [p.pincode, p.orders, p.revenue]));
    } else if (type === 'leakage') {
      downloadCsv(`Revenue_Leakage_${stamp}.csv`, ['Category', 'Orders', 'Amount (INR)', 'Counts as platform loss'],
        report.categories.map(c => [c.name, c.count, c.amount, c.countsAsLoss ? 'Yes' : 'No']));
    } else {
      downloadCsv(`Repeat_Customers_${stamp}.csv`, ['Customer', 'Phone', 'Orders', 'Spend (INR)', 'Last order'],
        report.topCustomers.map(c => [c.name, c.phone, c.orders, c.spend, c.lastOrder ? new Date(c.lastOrder).toLocaleDateString('en-IN') : '']));
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
      <PageHeader
        title={meta.title}
        actions={[
          {
            customComponent: (
              <div className="flex items-center gap-1.5">
                <input type="date" value={from} max={to} onChange={e => e.target.value && setFrom(e.target.value)} aria-label="From date"
                  className="px-2 py-1 bg-white border border-slate-200 rounded-sm text-[10px] font-bold text-slate-700 outline-none" />
                <span className="text-[9px] font-black text-slate-400 uppercase">to</span>
                <input type="date" value={to} min={from} onChange={e => e.target.value && setTo(e.target.value)} aria-label="To date"
                  className="px-2 py-1 bg-white border border-slate-200 rounded-sm text-[10px] font-bold text-slate-700 outline-none" />
              </div>
            )
          },
          { label: 'Export CSV', icon: Download, variant: 'primary', onClick: handleExport }
        ]}
      />

      <div className="bg-white border-b border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-x divide-slate-100 max-w-[1600px] mx-auto w-full">
          {metrics.map(m => <MetricRow key={m.label} label={m.label} value={m.value} icon={meta.icon} />)}
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        <p className="text-[11px] text-slate-500 font-semibold">{meta.blurb}</p>

        {type === 'tat' && report && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartPanel title="Delivery Time Distribution" subtitle="Order placed → delivered" height={320}>
              <div className="h-full w-full p-6">
                {!s.measuredOrders ? <Empty text="No delivered orders with a status timeline" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                      <Tooltip />
                      <Bar dataKey="value" name="Orders" radius={[1, 1, 0, 0]} barSize={32}>
                        {report.distribution.map((e, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartPanel>
            <ChartPanel title="By Vendor" subtitle="Slowest first" height={320} className="lg:col-span-2">
              <div className="p-6">
                <Table
                  empty="No delivered orders in this period"
                  rows={report.vendors}
                  columns={[
                    { key: 'name', label: 'Vendor', strong: true },
                    { key: 'orders', label: 'Delivered', align: 'right' },
                    { key: 'avgTotalHours', label: 'Avg order→delivery', align: 'right', render: v => orDash(v, ' h') },
                    { key: 'avgProcessingHours', label: 'Avg processing', align: 'right', render: v => orDash(v, ' h') },
                    { key: 'within48h', label: 'Within 48h', align: 'right', render: (v, r) => `${v}/${r.orders}` }
                  ]}
                />
              </div>
            </ChartPanel>
          </div>
        )}

        {type === 'heatmap' && report && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartPanel title="Order Density Map" subtitle="Each bubble is a ~1 km area; size = orders" height={420} className="lg:col-span-2">
              <div className="h-full w-full p-6">
                {report.cells.length === 0 ? <Empty text="No orders with a pickup location" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" dataKey="lng" name="Longitude" domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                      <YAxis type="number" dataKey="lat" name="Latitude" domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                      <ZAxis type="number" dataKey="orders" range={[60, 900]} name="Orders" />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ payload }) => {
                          const c = payload?.[0]?.payload;
                          if (!c) return null;
                          return (
                            <div className="bg-white border border-slate-200 p-2 text-[10px] font-bold text-slate-700">
                              <div>{c.area || `${c.lat}, ${c.lng}`}</div>
                              <div>{c.orders} orders · {inr(c.revenue)}</div>
                            </div>
                          );
                        }}
                      />
                      <Scatter data={report.cells} fill="#ef4444" fillOpacity={0.55} />
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartPanel>
            <ChartPanel title="Busiest Areas" subtitle="By order count" height={420}>
              <div className="p-6">
                <Table
                  empty="No mapped orders"
                  rows={report.cells.slice(0, 10)}
                  columns={[
                    { key: 'area', label: 'Area', strong: true, render: (v, r) => v || `${r.lat}, ${r.lng}` },
                    { key: 'orders', label: 'Orders', align: 'right' },
                    { key: 'revenue', label: 'Revenue', align: 'right', render: inr }
                  ]}
                />
              </div>
            </ChartPanel>
            <ChartPanel title="By Pincode" subtitle="From the pickup address" height={320} className="lg:col-span-3">
              <div className="p-6">
                <Table
                  empty="No pincodes found in pickup addresses"
                  rows={report.pincodes}
                  columns={[
                    { key: 'pincode', label: 'Pincode', strong: true },
                    { key: 'orders', label: 'Orders', align: 'right' },
                    { key: 'revenue', label: 'Revenue', align: 'right', render: inr }
                  ]}
                />
              </div>
            </ChartPanel>
          </div>
        )}

        {type === 'leakage' && report && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartPanel title="Where Revenue Leaks" subtitle="Amount by category" height={360}>
              <div className="h-full w-full p-6">
                {report.categories.every(c => !c.amount) ? <Empty text="No leakage in this period" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.categories} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={170} axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} />
                      <Tooltip formatter={v => inr(v)} />
                      <Bar dataKey="amount" name="Amount" barSize={14}>
                        {report.categories.map((c, i) => <Cell key={i} fill={c.countsAsLoss ? '#ef4444' : '#cbd5e1'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartPanel>
            <ChartPanel title="Breakdown" subtitle="Red = counted as platform loss" height={360}>
              <div className="p-6">
                <Table
                  rows={report.categories}
                  columns={[
                    { key: 'name', label: 'Category', strong: true, render: (v, r) => <span className={r.countsAsLoss ? 'text-rose-600' : ''}>{v}</span> },
                    { key: 'count', label: 'Orders', align: 'right' },
                    { key: 'amount', label: 'Amount', align: 'right', render: inr }
                  ]}
                />
              </div>
            </ChartPanel>
            <ChartPanel title="Delivered but Unpaid" subtitle="Largest first — follow up for collection" height={320} className="lg:col-span-2">
              <div className="p-6">
                <Table
                  empty="Every delivered order in this period is paid"
                  rows={report.unpaidDelivered}
                  columns={[
                    { key: 'orderId', label: 'Order', strong: true },
                    { key: 'customer', label: 'Customer' },
                    { key: 'paymentStatus', label: 'Payment' },
                    { key: 'createdAt', label: 'Placed', render: v => new Date(v).toLocaleDateString('en-IN') },
                    { key: 'amount', label: 'Amount', align: 'right', render: inr }
                  ]}
                />
              </div>
            </ChartPanel>
          </div>
        )}

        {type === 'customers' && report && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartPanel title="Order Frequency" subtitle="Customers by number of orders" height={320}>
              <div className="h-full w-full p-6">
                {!s.customers ? <Empty text="No customer orders in this period" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.frequency} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                      <Tooltip />
                      <Bar dataKey="value" name="Customers" radius={[1, 1, 0, 0]} barSize={32}>
                        {report.frequency.map((e, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartPanel>
            <ChartPanel title="Top Repeat Customers" subtitle="Two or more orders in the period" height={320} className="lg:col-span-2">
              <div className="p-6">
                <Table
                  empty="No repeat customers in this period"
                  rows={report.topCustomers}
                  columns={[
                    { key: 'name', label: 'Customer', strong: true },
                    { key: 'phone', label: 'Phone' },
                    { key: 'orders', label: 'Orders', align: 'right' },
                    { key: 'spend', label: 'Spend', align: 'right', render: inr },
                    { key: 'lastOrder', label: 'Last order', render: v => (v ? new Date(v).toLocaleDateString('en-IN') : '—') }
                  ]}
                />
              </div>
            </ChartPanel>
          </div>
        )}
      </div>
    </div>
  );
}
