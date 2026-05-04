import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  CreditCard, 
  IndianRupee, 
  FileText, 
  CheckCircle2, 
  Clock, 
  MoreHorizontal, 
  Download, 
  History, 
  Calculator, 
  ArrowRight, 
  ShieldCheck, 
  Zap,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  RefreshCcw,
  Search
} from 'lucide-react';
import { mockAdminData } from '../data/mockData';
import PageHeader from '../components/common/PageHeader';
import DataGrid from '../components/tables/DataGrid';
import StatusBadge from '../components/common/StatusBadge';
import MetricRow from '../components/cards/MetricRow';
import { adminApi } from '../../../lib/api';

export default function Payments() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('Customer Payments');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerData, setCustomerData] = useState([]);
  const [vendorData, setVendorData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = async () => {
    try {
        setLoading(true);
        const [cRes, vRes] = await Promise.all([
            adminApi.getCustomerPayments(),
            adminApi.getVendorPayments()
        ]);
        setCustomerData(cRes);
        setVendorData(vRes);
    } catch (err) {
        console.error('Error fetching payment data:', err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleReconcile = async (row) => {
    if (activeTab !== 'Vendor Payouts') return;
    
    const amount = window.prompt(`Enter payout amount for ${row.customer}:`, row.pendingBalance);
    if (!amount || isNaN(amount)) return;

    const txnId = window.prompt(`Enter Transaction ID / Reference:`);
    if (!txnId) return;

    try {
        setLoading(true);
        await adminApi.recordVendorPayout({
            vendorId: row.id,
            amount: parseFloat(amount),
            transactionId: txnId,
            paymentMethod: 'UPI',
            notes: 'Admin Manual Settlement'
        });
        alert('Payout recorded successfully');
        fetchAllData();
    } catch (err) {
        alert('Failed to record payout');
    } finally {
        setLoading(false);
    }
  };

  const tabMap = {
    customer: 'Customer Payments',
    vendor: 'Vendor Payouts',
    supplier: 'Supplier Payouts',
    cod: 'Pending COD',
    refunds: 'Refunds'
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tabMap[tab]) {
        setActiveTab(tabMap[tab]);
    }
  }, [searchParams]);

  const tabs = [
    'Customer Payments',
    'Vendor Payouts',
    'Supplier Payouts',
    'Pending COD',
    'Refunds'
  ];

  // Mock data for other tabs, live for Customer & Vendor
  const paymentsData = useMemo(() => {
    if (activeTab === 'Customer Payments') {
        return customerData.map(item => ({
            ...item,
            id: item._id,
            transactionId: `LEDGER-${item.phone.slice(-4)}`,
            date: 'Live Data',
            amount: item.totalSpent,
            status: item.pendingBalance > 0 ? 'Pending' : 'Paid',
            customer: item.displayName,
            method: 'LEDGER'
        }));
    }

    if (activeTab === 'Vendor Payouts') {
        return vendorData.map(item => ({
            ...item,
            id: item._id,
            transactionId: item.lastPayout ? `LAST: ${new Date(item.lastPayout).toLocaleDateString()}` : 'No Previous Payout',
            date: 'Live Analytics',
            amount: item.pendingBalance,
            status: item.pendingBalance > 0 ? 'Pending' : 'Settled',
            customer: item.displayName,
            shop: item.shopName,
            method: 'TRANSFER'
        }));
    }

    return mockAdminData.payoutRequests.map(item => ({
        ...item,
        type: activeTab,
        method: activeTab === 'Pending COD' ? 'CASH' : 'ONLINE',
        customer: 'RAHUL SHARMA',
        transactionId: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    }));
  }, [activeTab, customerData, vendorData]);

  const stats = useMemo(() => {
    if (activeTab === 'Customer Payments') {
        const totalSpent = customerData.reduce((acc, curr) => acc + (curr.totalSpent || 0), 0);
        const totalAdvance = customerData.reduce((acc, curr) => acc + (curr.totalAdvancePaid || 0), 0);
        
        return [
            { label: 'Total Sales', value: `₹${(totalSpent/1000).toFixed(1)}K`, change: 'All Time', trend: 'up', icon: ArrowDownLeft, color: 'emerald-400' },
            { label: 'Advance Paid', value: `₹${(totalAdvance/1000).toFixed(1)}K`, change: 'Collected', trend: 'up', icon: ArrowUpRight, color: 'sky-400' },
            { label: 'Pending COD', value: `₹${((totalSpent - totalAdvance)/1000).toFixed(1)}K`, change: 'In Field', trend: 'down', icon: Wallet, color: 'white' },
            { label: 'Total Customers', value: customerData.length.toString(), change: 'Registered', trend: 'up', icon: RefreshCcw, color: 'amber-400' }
        ];
    }

    if (activeTab === 'Vendor Payouts') {
        const totalEarned = vendorData.reduce((acc, curr) => acc + (curr.totalEarnings || 0), 0);
        const totalPaid = vendorData.reduce((acc, curr) => acc + (curr.totalPaid || 0), 0);
        
        return [
            { label: 'Total Earnings', value: `₹${(totalEarned/1000).toFixed(1)}K`, change: 'Vendor Share', trend: 'up', icon: ArrowDownLeft, color: 'emerald-400' },
            { label: 'Total Settled', value: `₹${(totalPaid/1000).toFixed(1)}K`, change: 'Paid out', trend: 'up', icon: ArrowUpRight, color: 'sky-400' },
            { label: 'Pending Payout', value: `₹${((totalEarned - totalPaid)/1000).toFixed(1)}K`, change: 'Due now', trend: 'down', icon: Wallet, color: 'white' },
            { label: 'Active Vendors', value: vendorData.length.toString(), change: 'Partners', trend: 'up', icon: RefreshCcw, color: 'amber-400' }
        ];
    }

    return [
        { label: 'Total Inflow', value: '₹4.2M', change: 'This Month', trend: 'up', icon: ArrowDownLeft, color: 'emerald-400' },
        { label: 'Total Outflow', value: '₹2.8M', change: 'Settlements', trend: 'up', icon: ArrowUpRight, color: 'rose-400' },
        { label: 'Escrow Balance', value: '₹1.1M', change: 'System Held', trend: 'up', icon: Wallet, color: 'white' },
        { label: 'Refund Volume', value: '₹42K', change: 'Last 7 Days', trend: 'down', icon: RefreshCcw, color: 'amber-400' }
    ];
  }, [activeTab, customerData, vendorData]);

  const columns = useMemo(() => [
    { 
      header: 'Transaction / ID', 
      key: 'transactionId',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-900 text-[11px] tracking-widest uppercase leading-none mb-1">{val || `PAY-${row.id}`}</span>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] opacity-60 tabular-nums">{row.date} · 12:45 PM</span>
        </div>
      )
    },
    { 
      header: 'Entity / Partner', 
      key: 'vendor',
      render: (val, row) => (
        <div className="flex flex-col">
           <span className="font-bold text-slate-900 text-[11px] uppercase tracking-tight mb-1">
             {activeTab === 'Customer Payments' ? row.customer : val}
           </span>
           <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] opacity-60">
             {activeTab === 'Customer Payments' ? 'Individual Account' : `${row.shop} Registry`}
           </span>
        </div>
      )
    },
    { 
      header: 'Method', 
      key: 'method',
      render: (val) => (
        <div className="flex items-center gap-2">
           <div className={`w-1.5 h-1.5 rounded-full ${val === 'ONLINE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
           <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">{val}</span>
        </div>
      )
    },
    { 
      header: 'Amount', 
      key: 'amount', 
      align: 'right', 
      render: (val) => (
        <div className="flex flex-col items-end">
          <span className="font-black text-slate-900 tabular-nums text-xs tracking-tighter italic">₹{val.toLocaleString()}</span>
          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Gross Settlement</span>
        </div>
      )
    },
    { 
      header: 'Status', 
      key: 'status', 
      render: (val) => <StatusBadge status={val} /> 
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
          {row.status === 'Pending' && activeTab === 'Vendor Payouts' && (
             <button 
                onClick={() => handleReconcile(row)}
                className="px-4 py-2 bg-primary text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all rounded-sm shadow-lg shadow-slate-200"
             >
               Reconcile
             </button>
          )}
        </div>
      )
    }
  ], [activeTab]);

  const Eye = ({ size }) => <MoreHorizontal size={size} />; // Fallback for Eye since I missed importing it or want a similar look

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
      <PageHeader 
        title="Payments Management" 
        actions={[
          { label: 'Generate GST Report', icon: History, variant: 'secondary' },
          { label: 'Bulk Settlement', icon: Zap, variant: 'primary' }
        ]}
      />

      {/* Financial Intelligence Matrix */}
      <div className="bg-slate-900 border-b border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(14,165,233,0.1),transparent)] pointer-events-none" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-x divide-slate-800 max-w-[1600px] mx-auto w-full relative z-10">
            {stats.map((stat, i) => (
                <MetricRow key={i} {...stat} />
            ))}
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Search Only (Tabs removed as they are in Sidebar) */}
        <div className="flex justify-end">
            <div className="relative w-full md:w-80 shadow-sm">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="SEARCH BY TXN ID, ENTITY..."
                    className="w-full bg-white border border-slate-200 p-3 pl-11 text-[10px] font-bold tracking-widest focus:border-slate-900 outline-none transition-all uppercase"
                />
            </div>
        </div>

        {/* Master Transaction Index */}
        <DataGrid 
          title={activeTab.toUpperCase()}
          columns={columns}
          data={paymentsData}
          loading={loading}
          onAction={(row) => console.log('Viewing txn', row.id)}
        />
      </div>
    </div>
  );
}
