import React, { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../components/common/PageHeader';
import { dashboardApi } from '../../../lib/api';
import { 
    LineChart, Line, 
    AreaChart, Area, 
    BarChart, Bar, 
    PieChart, Pie, Cell, 
    ScatterChart, Scatter, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
    ResponsiveContainer 
} from 'recharts';

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [filterLoading, setFilterLoading] = useState(false);
    const [analytics, setAnalytics] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    // Global Filters State
    const [channel, setChannel] = useState('All');
    const [selectedState, setSelectedState] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedPincode, setSelectedPincode] = useState('');
    const [selectedGeofence, setSelectedGeofence] = useState('');
    const [timeRange, setTimeRange] = useState('Last 30 Days');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Cascading geography mappings
    const [geographyMap, setGeographyMap] = useState({
        stateCityMap: {},
        cityPincodeMap: {},
        geofenceMap: {}
    });

    const [statesList, setStatesList] = useState(['Madhya Pradesh', 'Maharashtra']);

    // Fetch cascading dropdown filters
    const fetchFilters = async () => {
        try {
            setFilterLoading(true);
            const res = await dashboardApi.getFilters();
            if (res && res.success && res.data) {
                setGeographyMap({
                    stateCityMap: res.data.stateCityMap || {},
                    cityPincodeMap: res.data.cityPincodeMap || {},
                    geofenceMap: res.data.geofenceMap || {}
                });
                setStatesList(res.data.states?.length ? res.data.states : ['Madhya Pradesh', 'Maharashtra']);
            }
        } catch (err) {
            console.error('Failed to fetch filters:', err);
        } finally {
            setFilterLoading(false);
        }
    };

    // Dynamically calculate cascading filters
    const availableCities = useMemo(() => {
        if (!selectedState) {
            const allCities = [];
            Object.values(geographyMap.stateCityMap).forEach(list => allCities.push(...list));
            return Array.from(new Set(allCities)).sort();
        }
        return geographyMap.stateCityMap[selectedState] || [];
    }, [selectedState, geographyMap.stateCityMap]);

    const availablePincodes = useMemo(() => {
        if (!selectedCity) {
            const allPincodes = [];
            Object.values(geographyMap.cityPincodeMap).forEach(list => allPincodes.push(...list));
            return Array.from(new Set(allPincodes)).sort();
        }
        return geographyMap.cityPincodeMap[selectedCity] || [];
    }, [selectedCity, geographyMap.cityPincodeMap]);

    const availableGeofences = useMemo(() => {
        if (!selectedCity) {
            const allGeofences = [];
            Object.values(geographyMap.geofenceMap).forEach(list => allGeofences.push(...list));
            return Array.from(new Set(allGeofences)).sort();
        }
        return geographyMap.geofenceMap[selectedCity] || [];
    }, [selectedCity, geographyMap.geofenceMap]);

    // Fetch analytics data
    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const activeFilters = {
                channel,
                state: selectedState,
                city: selectedCity,
                pincode: selectedPincode,
                geofence: selectedGeofence,
                timeRange,
                startDate,
                endDate
            };
            const res = await dashboardApi.getAnalytics(activeFilters);
            if (res && res.success && res.data) {
                setAnalytics(res.data);
            }
        } catch (err) {
            toast.error('Failed to retrieve operational metrics');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFilters();
    }, []);

    useEffect(() => {
        fetchAnalytics();
    }, [channel, selectedState, selectedCity, selectedPincode, selectedGeofence, timeRange, startDate, endDate]);

    // Financial reconciliation chart data formatting
    const financialTrendData = useMemo(() => {
        if (!analytics?.financials) return [];
        const monthlyBase = [
            { month: 'Jan', Revenue: 210000, Payouts: 147000, Logistics: 25000, Profit: 38000 },
            { month: 'Feb', Revenue: 280000, Payouts: 196000, Logistics: 30000, Profit: 54000 },
            { month: 'Mar', Revenue: 340000, Payouts: 238000, Logistics: 38000, Profit: 64000 },
            { month: 'Apr', Revenue: 400000, Payouts: 280000, Logistics: 42000, Profit: 78000 },
            { month: 'May', Revenue: 430000, Payouts: 301000, Logistics: 44000, Profit: 85000 },
            { month: 'Jun', Revenue: analytics.financials.grossRevenue, Payouts: analytics.financials.vendorPayouts, Logistics: analytics.financials.logisticsPayouts, Profit: analytics.financials.netProfit },
        ];
        return monthlyBase;
    }, [analytics?.financials]);

    const waterfallData = useMemo(() => {
        if (!analytics?.financials) return [];
        return [
            { name: 'Gross Revenue', value: analytics.financials.grossRevenue, color: '#3b82f6' },
            { name: 'Vendor Splits', value: -analytics.financials.vendorPayouts, color: '#f59e0b' },
            { name: 'Logistics Cost', value: -analytics.financials.logisticsPayouts, color: '#8b5cf6' },
            { name: 'Refunds Outflow', value: -analytics.financials.refunds, color: '#ef4444' },
            { name: 'Net Platform Profit', value: analytics.financials.netProfit, color: '#10b981' }
        ];
    }, [analytics?.financials]);

    // Recharts cell colors helper
    const DONUT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    if (loading && !analytics) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Syncing Control Center...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
            {/* Global Control & Filter Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-6 sticky top-0 z-30 shadow-sm">
                <div className="max-w-[1600px] mx-auto space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">

                        {/* Channel selector pill */}
                        <div className="flex bg-slate-100 p-1 rounded-xl w-fit border border-slate-200/50">
                            {['All', 'B2C', 'B2B'].map(ch => (
                                <button
                                    key={ch}
                                    onClick={() => setChannel(ch)}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${channel === ch ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-900'}`}
                                >
                                    {ch === 'All' ? '🌐 All' : ch === 'B2C' ? '👤 B2C' : '🏢 B2B'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Cascading dropdown selectors */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                        <div className="flex flex-col">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">State</label>
                            <select
                                value={selectedState}
                                onChange={e => { setSelectedState(e.target.value); setSelectedCity(''); setSelectedPincode(''); }}
                                className="bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                                <option value="">All States</option>
                                {statesList.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">City</label>
                            <select
                                value={selectedCity}
                                onChange={e => { setSelectedCity(e.target.value); setSelectedPincode(''); }}
                                className="bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                                <option value="">All Cities</option>
                                {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Pincode</label>
                            <select
                                value={selectedPincode}
                                onChange={e => setSelectedPincode(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                                <option value="">All Pincodes</option>
                                {availablePincodes.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Geofence</label>
                            <select
                                value={selectedGeofence}
                                onChange={e => setSelectedGeofence(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                                <option value="">All Geofences</option>
                                {availableGeofences.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col col-span-2 md:col-span-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Temporal Index</label>
                            <select
                                value={timeRange}
                                onChange={e => setTimeRange(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                                <option>Today</option>
                                <option>Last 7 Days</option>
                                <option>Last 30 Days</option>
                                <option>Year-to-Date</option>
                                <option>Custom Range</option>
                            </select>
                        </div>
                    </div>

                    {/* Custom range calendar inputs */}
                    {timeRange === 'Custom Range' && (
                        <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 w-fit animate-fade-in">
                            <div className="flex flex-col">
                                <label className="text-[7px] font-black text-slate-400 uppercase mb-1">Start Date</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border border-slate-200 text-[10px] font-bold p-1 px-2 rounded-lg outline-none" />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[7px] font-black text-slate-400 uppercase mb-1">End Date</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border border-slate-200 text-[10px] font-bold p-1 px-2 rounded-lg outline-none" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Dashboard Sub-Tabs Panel */}
            <div className="max-w-[1600px] mx-auto w-full px-6 pt-6">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200/60">
                    {[
                        { id: 'overview', label: 'Overview', icon: 'dashboard' },
                        { id: 'users', label: 'Partners & Clients', icon: 'group' },
                        { id: 'logistics', label: 'Order Lifecycles', icon: 'local_shipping' },
                        { id: 'financials', label: 'Financial Intel', icon: 'payments' },
                        { id: 'catalogs', label: 'Catalogs & Support', icon: 'category' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-3 rounded-t-[1.2rem] font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${
                                activeTab === tab.id
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                    : 'bg-white text-slate-400 hover:text-slate-900 border-transparent border-b-slate-100 hover:bg-slate-50'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Sub-Tab Dashboards Render */}
            <div className="max-w-[1600px] mx-auto w-full px-6 pt-6">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Macro Metrics ROW */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
                            <div className="bg-white border border-slate-200/80 p-6 rounded-[2rem] shadow-sm flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Gross transactional volume</p>
                                    <h3 className="text-3xl font-black text-slate-900">₹{analytics?.financials.grossRevenue.toLocaleString()}</h3>
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">+12.5% vs MoM</span>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-[24px]">monetization_on</span>
                                </div>
                            </div>
                            <div className="bg-white border border-slate-200/80 p-6 rounded-[2rem] shadow-sm flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Active B2C orders</p>
                                    <h3 className="text-3xl font-black text-slate-900">{analytics?.orderLifecycleB2C.totalSubmitted}</h3>
                                    <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded">95.4% acceptance</span>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-[24px]">shopping_basket</span>
                                </div>
                            </div>
                            <div className="bg-white border border-slate-200/80 p-6 rounded-[2rem] shadow-sm flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Unique clients</p>
                                    <h3 className="text-3xl font-black text-slate-900">{analytics?.customerAnalytics.totalCustomers}</h3>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded">Churn risk: {analytics?.customerAnalytics.churnRisk}</span>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-[24px]">person</span>
                                </div>
                            </div>
                            <div className="bg-white border border-slate-200/80 p-6 rounded-[2rem] shadow-sm flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Open disputes</p>
                                    <h3 className="text-3xl font-black text-slate-900">{analytics?.helpdesk.open}</h3>
                                    <span className="text-[10px] font-bold text-rose-600 uppercase bg-rose-50 px-2 py-0.5 rounded">{analytics?.helpdesk.inProgress} In-Progress</span>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-[24px]">support_agent</span>
                                </div>
                            </div>
                        </div>

                        {/* Funnel + Core Chart Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Fulfillment Funnel */}
                            <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm lg:col-span-2">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">Fulfillment Pipeline Funnel</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Status drop-offs across order workflow</p>
                                    </div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">B2C Funnel</span>
                                </div>

                                <div className="space-y-5">
                                    {[
                                        { label: 'Total Submitted', value: analytics?.orderLifecycleB2C.totalSubmitted, color: 'bg-blue-500', width: '100%' },
                                        { label: 'Claimed / Accepted', value: analytics?.orderLifecycleB2C.totalAccepted, color: 'bg-indigo-500', width: `${(analytics?.orderLifecycleB2C.totalAccepted / (analytics?.orderLifecycleB2C.totalSubmitted || 1)) * 100}%` },
                                        { label: 'In processing', value: analytics?.orderLifecycleB2C.inProgress, color: 'bg-amber-500', width: `${(analytics?.orderLifecycleB2C.inProgress / (analytics?.orderLifecycleB2C.totalSubmitted || 1)) * 100}%` },
                                        { label: 'Ready for Rider', value: analytics?.orderLifecycleB2C.readyForDispatch, color: 'bg-purple-500', width: `${(analytics?.orderLifecycleB2C.readyForDispatch / (analytics?.orderLifecycleB2C.totalSubmitted || 1)) * 100}%` }
                                    ].map((funnel, idx) => (
                                        <div key={idx} className="space-y-1.5">
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-600 tracking-wider">
                                                <span>{funnel.label}</span>
                                                <span className="tabular-nums font-extrabold">{funnel.value} Orders</span>
                                            </div>
                                            <div className="h-6 bg-slate-100 rounded-full overflow-hidden flex">
                                                <div 
                                                    style={{ width: funnel.width }} 
                                                    className={`${funnel.color} h-full rounded-full transition-all duration-1000 flex items-center justify-end px-3 text-[8px] font-black text-white`}
                                                >
                                                    {Math.round((funnel.value / (analytics?.orderLifecycleB2C.totalSubmitted || 1)) * 100)}%
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Storage widget / Quick alerts */}
                            <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-4">SLA Violations Alert</h3>
                                    <div className="space-y-4">
                                        <div className="flex gap-3 items-start p-3 bg-rose-50 border border-rose-100 rounded-2xl">
                                            <span className="material-symbols-outlined text-rose-500 text-lg">warning</span>
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase text-rose-900 tracking-wider">Logistics Bounces</h4>
                                                <p className="text-[9px] text-rose-700 font-bold uppercase tracking-wider mt-1">{analytics?.orderLifecycleB2C.logisticsBounces} orders rejected by Shiprocket courier partners</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 items-start p-3 bg-amber-50 border border-amber-100 rounded-2xl">
                                            <span className="material-symbols-outlined text-amber-500 text-lg">hourglass_bottom</span>
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase text-amber-900 tracking-wider">Immediate Timeouts</h4>
                                                <p className="text-[9px] text-amber-700 font-bold uppercase tracking-wider mt-1">{analytics?.orderLifecycleB2C.immediateTimeouts} orders unaccepted in 5-minute window</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 items-start p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                                            <span className="material-symbols-outlined text-slate-500 text-lg">schedule</span>
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-wider">Dormant Vendors</h4>
                                                <p className="text-[9px] text-slate-700 font-bold uppercase tracking-wider mt-1">{analytics?.vendorPerformance.dormantCount} approved vendors offline or dormant</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 text-center">
                                    <button onClick={() => setActiveTab('logistics')} className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline">
                                        View SLA Details ➔
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                        {/* Customer analytics card */}
                        <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">Customer Composition (B2C vs B2B)</h3>
                                <div className="h-[250px] w-full flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Individual B2C', value: analytics?.customerAnalytics.individualCount },
                                                    { name: 'Commercial B2B', value: analytics?.customerAnalytics.businessCount }
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                <Cell fill="#3b82f6" />
                                                <Cell fill="#10b981" />
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 mt-4">
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Churn Risk (30d Inactive)</p>
                                    <p className="text-2xl font-black text-slate-900">{analytics?.customerAnalytics.churnRisk}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Onboarding Friction</p>
                                    <p className="text-2xl font-black text-slate-900">{analytics?.customerAnalytics.onboardingFriction}</p>
                                </div>
                            </div>
                        </div>

                        {/* Vendor Cohorts analytics */}
                        <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">Vendor Onboarding Cohorts</h3>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            { name: 'Local', count: analytics?.vendorPerformance.cohorts.local },
                                            { name: 'Proprietorship', count: analytics?.vendorPerformance.cohorts.proprietorship },
                                            { name: 'Partnership', count: analytics?.vendorPerformance.cohorts.partnership },
                                            { name: 'Pvt Ltd', count: analytics?.vendorPerformance.cohorts.pvtLtd },
                                            { name: 'Franchise', count: analytics?.vendorPerformance.cohorts.franchise }
                                        ]}
                                        layout="vertical"
                                        margin={{ left: 20, right: 10, top: 5, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                        <YAxis dataKey="name" type="category" width={90} tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 mt-4">
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Never Ordered B2B</p>
                                    <p className="text-2xl font-black text-slate-900">{analytics?.vendorPerformance.neverOrderedB2B}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">30d B2B Inactive</p>
                                    <p className="text-2xl font-black text-slate-900">{analytics?.vendorPerformance.dormancy30DaysB2B}</p>
                                </div>
                            </div>
                        </div>

                        {/* Top/Bottom rating Leaderboards */}
                        <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm lg:col-span-2">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">Vendor Performance Outliers (Ratings)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Top Vendors */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest bg-emerald-50 px-3 py-1.5 rounded-lg w-fit">Top 5 Highest Rated</h4>
                                    <div className="divide-y divide-slate-100">
                                        {analytics?.vendorPerformance.topVendors.map((vendor, idx) => (
                                            <div key={idx} className="flex justify-between items-center py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400">#{idx+1}</span>
                                                    <span className="text-xs font-bold text-slate-800">{vendor.name}</span>
                                                </div>
                                                <span className="px-2 py-0.5 bg-emerald-500 text-white rounded text-[10px] font-black">{vendor.rating} ★</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Bottom Vendors */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase text-red-600 tracking-widest bg-red-50 px-3 py-1.5 rounded-lg w-fit">Bottom 5 Lowest Rated</h4>
                                    <div className="divide-y divide-slate-100">
                                        {analytics?.vendorPerformance.bottomVendors.map((vendor, idx) => (
                                            <div key={idx} className="flex justify-between items-center py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400">#{idx+1}</span>
                                                    <span className="text-xs font-bold text-slate-800">{vendor.name}</span>
                                                </div>
                                                <span className="px-2 py-0.5 bg-red-500 text-white rounded text-[10px] font-black">{vendor.rating} ★</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'logistics' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                        {/* SLA Delays/Violations */}
                        <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">Logistics & SLA Violation Breakdown</h3>
                                <div className="h-[250px] w-full flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Logistics Bounces', value: analytics?.orderLifecycleB2C.logisticsBounces },
                                                    { name: 'Pickup Window Delay', value: analytics?.orderLifecycleB2C.violations.pickup },
                                                    { name: 'Drop-off Window Delay', value: analytics?.orderLifecycleB2C.violations.dropoff },
                                                    { name: 'Vendor SLA Overruns', value: analytics?.orderLifecycleB2C.violations.vendorSla }
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {DONUT_COLORS.map((color, idx) => <Cell key={idx} fill={color} />)}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Active order transits progress */}
                        <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">Active Physical Transit Pipes</h3>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                                        <span>Customer ➔ Vendor Facility</span>
                                        <span className="font-extrabold text-slate-800">{analytics?.orderLifecycleB2C.outboundLogistics} Active Transits</span>
                                    </div>
                                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '65%' }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                                        <span>Vendor ➔ Customer Home</span>
                                        <span className="font-extrabold text-slate-800">{analytics?.orderLifecycleB2C.reverseLogistics} Active Return Transits</span>
                                    </div>
                                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{ width: '45%' }} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">In Processing</p>
                                    <p className="text-2xl font-black text-slate-900">{analytics?.orderLifecycleB2C.inProgress}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Ready / Collection</p>
                                    <p className="text-2xl font-black text-slate-900">{analytics?.orderLifecycleB2C.readyForDispatch}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">B2B Cycles</p>
                                    <p className="text-2xl font-black text-slate-900">{analytics?.orderLifecycleB2B.totalPlaced}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'financials' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Growth trends graph */}
                        <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">Financial growth & disbursement trends</h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={financialTrendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                        <YAxis tickFormatter={(val) => `₹${val.toLocaleString()}`} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="Revenue" stroke="#3b82f6" strokeWidth={3} />
                                        <Line type="monotone" dataKey="Payouts" stroke="#f59e0b" strokeWidth={3} />
                                        <Line type="monotone" dataKey="Logistics" stroke="#8b5cf6" strokeWidth={3} />
                                        <Line type="monotone" dataKey="Profit" stroke="#10b981" strokeWidth={3} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Revenue Cost Allocation Waterfall */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm lg:col-span-2">
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">Waterfall Cost Allocations (Current Period)</h3>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={waterfallData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} />
                                            <YAxis tickFormatter={(val) => `₹${Math.abs(val).toLocaleString()}`} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                            <Tooltip formatter={(value) => `₹${Math.abs(value).toLocaleString()}`} />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                {waterfallData.map((entry, index) => (
                                                    <Cell key={index} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Wallet Liability & Refunds */}
                            <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
                                <div className="space-y-6">
                                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">Financial Liabilities</h3>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Customer Wallet liability</p>
                                                <p className="text-xl font-black text-slate-900 mt-1">₹{analytics?.financials.walletLiability.toLocaleString()}</p>
                                            </div>
                                            <span className="material-symbols-outlined text-slate-400">account_balance_wallet</span>
                                        </div>
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total refunds processed</p>
                                                <p className="text-xl font-black text-slate-900 mt-1">₹{analytics?.financials.refunds.toLocaleString()}</p>
                                            </div>
                                            <span className="material-symbols-outlined text-slate-400">settings_backup_restore</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-[10px] font-bold text-slate-400 uppercase text-center mt-4">
                                    Disbursements completed via RazorpayX
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'catalogs' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                        {/* Service catalog health */}
                        <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">Service Catalog (B2C)</h3>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            { name: 'Active SKUs', count: analytics?.catalogB2C.totalServices },
                                            { name: 'Inactive SKUs', count: analytics?.catalogB2C.inactiveServices }
                                        ]}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#474887" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-2xl mt-4">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Pending Catalog Reviews</span>
                                <span className="px-2.5 py-1 bg-amber-500 text-white rounded-full text-[10px] font-black">{analytics?.catalogB2C.pendingReviews} Action</span>
                            </div>
                        </div>

                        {/* Product catalog B2B */}
                        <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">Supplier Product Catalog (B2B)</h3>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            { name: 'Active SKU', count: analytics?.catalogB2B.totalProducts },
                                            { name: 'Inactive SKU', count: analytics?.catalogB2B.inactiveProducts }
                                        ]}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#85b49f" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-2xl mt-4">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Pending Supplier Reviews</span>
                                <span className="px-2.5 py-1 bg-amber-500 text-white rounded-full text-[10px] font-black">{analytics?.catalogB2B.pendingReviews} Action</span>
                            </div>
                        </div>

                        {/* ATS pipeline */}
                        <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">Labor Exchange Pipeline</h3>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            { name: 'Corporate', applicants: analytics?.atsLaborExchange.admin },
                                            { name: 'Vendors', applicants: analytics?.atsLaborExchange.vendor },
                                            { name: 'Warehouse', applicants: analytics?.atsLaborExchange.supplier }
                                        ]}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                        <Tooltip />
                                        <Bar dataKey="applicants" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase text-center mt-6">
                                ATS Job Requisitions active in last 60 days
                            </div>
                        </div>

                        {/* Sentiment Word Cloud replacement / key terms */}
                        <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm lg:col-span-3">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">Feedback Sentiment Keyword Analysis</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest bg-emerald-50 px-3 py-1.5 rounded-lg w-fit">Top Positive Keywords</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {analytics?.feedbackSentiment.positiveKeywords.map((word, idx) => (
                                            <span key={idx} className="px-3.5 py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100 hover:bg-emerald-100 transition-colors">
                                                {word}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase text-red-600 tracking-widest bg-red-50 px-3 py-1.5 rounded-lg w-fit">Critical Improvement Flags</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {analytics?.feedbackSentiment.criticalKeywords.map((word, idx) => (
                                            <span key={idx} className="px-3.5 py-2 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-100 hover:bg-rose-100 transition-colors">
                                                {word}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
