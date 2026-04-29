import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { authApi } from '../../../lib/api';
import socket from '../../../lib/socket';

const VendorReports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user.id || user._id;

  const fetchOrders = async () => {
    try {
      if (!userId) return;
      const data = await authApi.getVendorOrders(userId);
      setOrders(data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Live updates via Socket
    socket.on('order_status_update', (data) => {
        console.log('📊 [REPORTS] Order status update received:', data);
        fetchOrders();
    });

    socket.on('new_order_available', () => {
        console.log('📊 [REPORTS] New order available event');
        fetchOrders();
    });

    socket.on('pool_update', () => {
        console.log('📊 [REPORTS] Pool update event');
        fetchOrders();
    });

    return () => {
        socket.off('order_status_update');
        socket.off('new_order_available');
        socket.off('pool_update');
    };
  }, [userId]);

  // Data Processing for Graphs
  const { barData, areaData, pieData, totalRevenue, totalOrders } = useMemo(() => {
    if (!orders.length) return { barData: [], areaData: [], pieData: [], totalRevenue: 0, totalOrders: 0 };

    // 1. Bar Data: Orders per day (last 7 days)
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
    });

    const barMap = {};
    last7Days.forEach(date => barMap[date] = 0);
    
    // 2. Area Data: Revenue per day
    const areaMap = {};
    last7Days.forEach(date => areaMap[date] = 0);

    // 3. Pie Data: Status distribution
    const statusMap = { 'pending': 0, 'completed': 0, 'processing': 0, 'cancelled': 0 };

    let revenue = 0;
    orders.forEach(order => {
        const date = new Date(order.createdAt).toISOString().split('T')[0];
        if (barMap[date] !== undefined) barMap[date]++;
        if (areaMap[date] !== undefined) areaMap[date] += (order.totalAmount || 0);
        
        const status = (order.status || 'pending').toLowerCase();
        statusMap[status] = (statusMap[status] || 0) + 1;
        
        if (status === 'completed') revenue += (order.totalAmount || 0);
    });

    return {
        barData: last7Days.map(date => ({ date: date.split('-').slice(1).join('/'), orders: barMap[date] })),
        areaData: last7Days.map(date => ({ date: date.split('-').slice(1).join('/'), revenue: areaMap[date] })),
        pieData: Object.keys(statusMap).map(status => ({ name: status.toUpperCase(), value: statusMap[status] })),
        totalRevenue: revenue,
        totalOrders: orders.length
    };
  }, [orders]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  if (loading) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
            <div className="w-12 h-12 border-4 border-slate-900 border-t-primary rounded-full animate-spin" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Generating Analytics...</p>
        </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-40 font-sans">
      <main className="max-w-md mx-auto px-6 pt-10">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <button 
                onClick={() => navigate('/vendor/more')}
                className="flex items-center gap-2 text-slate-400 font-black text-[9px] uppercase tracking-widest mb-4 hover:text-slate-900 transition-colors"
            >
                <span className="material-symbols-outlined text-sm">arrow_back</span> Back
            </button>
            <h2 className="text-3xl font-black tracking-tighter text-slate-950 uppercase italic leading-none">Insights</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">Business Performance Analytics</p>
          </div>
          <div className="w-14 h-14 bg-white rounded-2xl shadow-xl shadow-primary/10 flex items-center justify-center border border-slate-100">
            <span className="material-symbols-outlined text-primary text-3xl">query_stats</span>
          </div>
        </header>

        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-2xl">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-2">Total Orders</p>
                    <h4 className="text-3xl font-black tracking-tighter leading-none mb-1">{totalOrders}</h4>
                    <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1 uppercase tracking-tight">
                        <span className="material-symbols-outlined text-[12px]">trending_up</span> Lifetime
                    </span>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] border border-black/5 shadow-sm">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Earnings</p>
                    <h4 className="text-3xl font-black text-slate-950 tracking-tighter leading-none mb-1">₹{totalRevenue.toLocaleString()}</h4>
                    <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-1 uppercase tracking-tight">
                        <span className="material-symbols-outlined text-[12px]">check_circle</span> Verified
                    </span>
                </div>
            </div>

            {/* Chart 1: Order Volume */}
            <section className="bg-white p-8 rounded-[3rem] border border-black/5 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900">Order Volume</h4>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">Last 7 Days</span>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} />
                            <YAxis hide />
                            <Tooltip 
                                cursor={{fill: '#f8fafc'}}
                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                            />
                            <Bar dataKey="orders" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* Chart 2: Revenue Flow */}
            <section className="bg-white p-8 rounded-[3rem] border border-black/5 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900">Revenue Flow</h4>
                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">Growth Analysis</span>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={areaData}>
                            <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} />
                            <YAxis hide />
                            <Tooltip 
                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* Chart 3: Order Status */}
            <section className="bg-white p-8 rounded-[3rem] border border-black/5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900">Status Mix</h4>
                </div>
                <div className="h-64 w-full flex items-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                            />
                            <Legend 
                                wrapperStyle={{ fontSize: '9px', fontWeight: 'black', textTransform: 'uppercase', letterSpacing: '1px' }}
                                iconType="circle"
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </section>
        </div>

        <footer className="mt-12 text-center pb-20">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">SPINZYT ANALYTICS ENGINE</p>
        </footer>
      </main>
    </div>
  );
};

export default VendorReports;
