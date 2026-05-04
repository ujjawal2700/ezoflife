import React, { useMemo, useState, useEffect } from 'react';
import { 
  Users, 
  IndianRupee, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  RefreshCcw,
  Search,
  Download,
  Filter,
  Eye,
  CreditCard
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import DataGrid from '../components/tables/DataGrid';
import MetricRow from '../components/cards/MetricRow';
import { adminApi } from '../../../lib/api';

export default function CustomerPayments() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await adminApi.getCustomerPayments();
        setData(response);
      } catch (err) {
        console.error('Error fetching customer payment summary:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const stats = useMemo(() => {
    const totalSpent = data.reduce((acc, curr) => acc + (curr.totalSpent || 0), 0);
    const totalAdvance = data.reduce((acc, curr) => acc + (curr.totalAdvancePaid || 0), 0);
    const totalOrders = data.reduce((acc, curr) => acc + (curr.totalOrders || 0), 0);

    return [
      { label: 'Total Sales (Gross)', value: `₹${(totalSpent/100000).toFixed(2)}L`, change: 'Across all users', trend: 'up', icon: IndianRupee, color: 'emerald-400' },
      { label: 'Advance Collected', value: `₹${(totalAdvance/1000).toFixed(1)}K`, change: 'Pre-paid', trend: 'up', icon: ArrowDownLeft, color: 'sky-400' },
      { label: 'Total Orders', value: totalOrders.toString(), change: 'Volume', trend: 'up', icon: Users, color: 'white' },
      { label: 'Pending Balance', value: `₹${((totalSpent - (totalAdvance))/1000).toFixed(1)}K`, change: 'COD + Due', trend: 'down', icon: Wallet, color: 'amber-400' }
    ];
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => 
      item.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone.includes(searchQuery)
    );
  }, [data, searchQuery]);

  const columns = useMemo(() => [
    { 
      header: 'Customer Details', 
      key: 'displayName',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-900 text-[11px] tracking-widest uppercase leading-none mb-1">{val}</span>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] opacity-60 tabular-nums">{row.phone}</span>
        </div>
      )
    },
    { 
      header: 'Orders', 
      key: 'totalOrders',
      align: 'center',
      render: (val) => (
        <span className="text-[10px] font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-sm">{val} Orders</span>
      )
    },
    { 
      header: 'Advance Paid', 
      key: 'totalAdvancePaid',
      align: 'right',
      render: (val) => (
        <div className="flex flex-col items-end">
          <span className="font-black text-emerald-600 tabular-nums text-xs tracking-tighter">₹{val.toLocaleString()}</span>
          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Online Checkout</span>
        </div>
      )
    },
    { 
      header: 'COD Paid', 
      key: 'totalCodPaid',
      align: 'right',
      render: (val) => (
        <div className="flex flex-col items-end">
          <span className="font-black text-slate-900 tabular-nums text-xs tracking-tighter">₹{val.toLocaleString()}</span>
          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">On Delivery</span>
        </div>
      )
    },
    { 
      header: 'Total Spent', 
      key: 'totalSpent',
      align: 'right',
      render: (val) => (
        <div className="flex flex-col items-end">
          <span className="font-black text-primary tabular-nums text-sm tracking-tighter">₹{val.toLocaleString()}</span>
          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">LTV (Life Time Value)</span>
        </div>
      )
    },
    { 
      header: 'Actions', 
      key: 'actions', 
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          <button className="p-2 bg-slate-50 border border-slate-200 text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all rounded-sm">
            <Eye size={14} />
          </button>
          <button className="p-2 bg-slate-50 border border-slate-200 text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all rounded-sm">
            <Download size={14} />
          </button>
        </div>
      )
    }
  ], []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
      <PageHeader 
        title="Customer Payment Analytics" 
        actions={[
          { label: 'Export Ledger', icon: Download, variant: 'secondary' },
          { label: 'Filter Range', icon: Filter, variant: 'primary' }
        ]}
      />

      <div className="bg-slate-900 border-b border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(14,165,233,0.1),transparent)] pointer-events-none" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-x divide-slate-800 max-w-[1600px] mx-auto w-full relative z-10">
            {stats.map((stat, i) => (
                <MetricRow key={i} {...stat} />
            ))}
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        <div className="flex justify-between items-center bg-white p-4 border border-slate-200 shadow-sm">
            <h2 className="text-[11px] font-black tracking-widest uppercase text-slate-900 flex items-center gap-2">
                <CreditCard size={14} className="text-primary" />
                Customer Billing Summary
            </h2>
            <div className="relative w-80">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="SEARCH BY NAME OR PHONE..."
                    className="w-full bg-slate-50 border border-slate-200 p-3 pl-11 text-[10px] font-bold tracking-widest focus:border-slate-900 outline-none transition-all uppercase"
                />
            </div>
        </div>

        <DataGrid 
          title="PAYMENT LEDGER"
          columns={columns}
          data={filteredData}
          loading={loading}
        />
      </div>
    </div>
  );
}
