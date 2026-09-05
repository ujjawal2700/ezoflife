import React, { useEffect, useState, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import DashboardSkeleton from '../components/skeletons/DashboardSkeleton';
import { dashboardApi, adminApi } from '../../../lib/api';
import { 
    TrendingUp, TrendingDown, ShoppingBag, IndianRupee, Users, 
    AlertTriangle, ShieldCheck, Truck, RefreshCw, Layers, 
    Activity, Calendar, MapPin, Store, Building, ChevronRight, 
    CheckCircle2, Clock, ArrowUpRight, Sparkles, Filter, PieChart as PieIcon,
    BarChart3, Package, Headphones, ShieldAlert, ArrowRight, UserCheck
} from 'lucide-react';
import { 
    LineChart, Line, 
    AreaChart, Area, 
    BarChart, Bar, 
    PieChart, Pie, Cell, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
    ResponsiveContainer 
} from 'recharts';

export default function Dashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [analytics, setAnalytics] = useState(null);
    const [sidebarCounts, setSidebarCounts] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [lastSyncTime, setLastSyncTime] = useState('Just now');

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
        setIsUpdating(true);
        if (!analytics) {
            setLoading(true);
        }

        try {
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
                const now = new Date();
                setLastSyncTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            }
        } catch (err) {
            toast.error('Failed to retrieve operational metrics');
            console.error(err);
        } finally {
            setLoading(false);
            setIsUpdating(false);
        }
    };

    const fetchSidebarCounts = async () => {
        try {
            const counts = await adminApi.getSidebarCounts();
            if (counts) setSidebarCounts(counts);
        } catch (e) {
            console.error('Failed to fetch sidebar counts:', e);
        }
    };

    useEffect(() => {
        fetchFilters();
        fetchSidebarCounts();
    }, []);

    useEffect(() => {
        fetchAnalytics();
        fetchSidebarCounts();
    }, [channel, selectedState, selectedCity, selectedPincode, selectedGeofence, timeRange, startDate, endDate]);

    // Computed Pending Partner Verification numbers
    const pendingVendors = analytics?.pendingVerifications?.vendors ?? sidebarCounts?.vendorRegistrations ?? 0;
    const pendingSuppliers = analytics?.pendingVerifications?.suppliers ?? sidebarCounts?.supplierRegistrations ?? 0;
    const totalPendingVerifications = analytics?.pendingVerifications?.total ?? (sidebarCounts?.registrations ?? (pendingVendors + pendingSuppliers));

    // Financial trend data (uses real backend monthly trend or formatted fallback)
    const financialTrendData = useMemo(() => {
        if (analytics?.monthlyTrend && analytics.monthlyTrend.length > 0) {
            return analytics.monthlyTrend;
        }
        if (!analytics?.financials) return [];
        return [
            { month: 'Current', Revenue: analytics.financials.grossRevenue, Payouts: analytics.financials.vendorPayouts, Logistics: analytics.financials.logisticsPayouts, Profit: analytics.financials.netProfit }
        ];
    }, [analytics?.monthlyTrend, analytics?.financials]);

    const waterfallData = useMemo(() => {
        if (!analytics?.financials) return [];
        return [
            { name: 'Gross Revenue', value: analytics.financials.grossRevenue, color: '#3b82f6' },
            { name: 'Vendor Payouts', value: -analytics.financials.vendorPayouts, color: '#f59e0b' },
            { name: 'Logistics', value: -analytics.financials.logisticsPayouts, color: '#8b5cf6' },
            { name: 'Net Margin', value: analytics.financials.netProfit, color: '#10b981' }
        ];
    }, [analytics?.financials]);

    const DONUT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    if (loading && !analytics) {
        return <DashboardSkeleton />;
    }

    // Channel-adaptive KPI calculations
    const displayGross = channel === 'B2B' 
        ? (analytics?.financials?.b2bRevenue ?? analytics?.financials?.grossRevenue ?? 0)
        : channel === 'B2C'
        ? (analytics?.financials?.b2cRevenue ?? analytics?.financials?.grossRevenue ?? 0)
        : (analytics?.financials?.grossRevenue ?? 0);

    const b2cOrdersCount = analytics?.orderLifecycleB2C?.totalSubmitted || 0;
    const b2bOrdersCount = analytics?.orderLifecycleB2B?.totalPlaced || 0;
    const totalOrdersCount = channel === 'B2B' ? b2bOrdersCount : channel === 'B2C' ? b2cOrdersCount : (b2cOrdersCount + b2bOrdersCount);

    const ordersTitle = channel === 'B2B' ? 'Active B2B Orders' : channel === 'B2C' ? 'Active B2C Orders' : 'Combined Orders';
    const ordersBadge = channel === 'B2B' 
        ? `${analytics?.orderLifecycleB2B?.totalAccepted || 0} Accepted`
        : channel === 'B2C'
        ? `${b2cOrdersCount > 0 ? Math.round(((analytics?.orderLifecycleB2C?.totalAccepted || 0) / b2cOrdersCount) * 100) : 100}% Acceptance`
        : `${b2cOrdersCount} B2C • ${b2bOrdersCount} B2B`;

    const clientCount = channel === 'B2B'
        ? (analytics?.vendorPerformance?.totalVendors || 0)
        : (analytics?.customerAnalytics?.totalCustomers || 0);

    const clientTitle = channel === 'B2B' ? 'Verified Vendors' : channel === 'B2C' ? 'Retail Customers' : 'Total Client Base';
    const clientBadge = channel === 'B2B'
        ? `${analytics?.supplierAnalytics?.totalSuppliers || 0} Suppliers`
        : `Churn risk: ${analytics?.customerAnalytics?.churnRisk || 0}`;

    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc] pb-24 text-slate-900 selection:bg-indigo-500 selection:text-white relative font-sans">
            {/* Top Loading Progress Bar */}
            {isUpdating && (
                <div className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 animate-pulse z-50 shadow-md shadow-blue-500/20" />
            )}

            {/* Executive Command Header */}
            <div className="bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 py-5 sticky top-0 z-30 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
                <div className="max-w-[1600px] mx-auto space-y-4">
                    {/* Top Bar: Title & Channel Switcher */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-900/10 border border-slate-700/50 shrink-0">
                                <Activity size={22} className="text-indigo-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Control Center</h1>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase border transition-all ${
                                        isUpdating 
                                            ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    }`}>
                                        <span className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-amber-500 animate-spin' : 'bg-emerald-500'}`} />
                                        {isUpdating ? 'Synchronizing...' : 'Live'}
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                                    Real-time synchronized telemetry • Last updated {lastSyncTime}
                                </p>
                            </div>
                        </div>

                        {/* Right: Channel Switcher & Manual Refresh */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Segmented Channel Selector */}
                            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner gap-1.5">
                                {[
                                    { id: 'All', label: 'All Channels', icon: Layers },
                                    { id: 'B2C', label: 'Consumer (B2C)', icon: Users },
                                    { id: 'B2B', label: 'Wholesale (B2B)', icon: Store }
                                ].map(({ id, label, icon: Icon }) => {
                                    const isActive = channel === id;
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => {
                                                if (channel !== id) {
                                                    setIsUpdating(true);
                                                    setChannel(id);
                                                }
                                            }}
                                            className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                                                isActive
                                                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-[1.02]'
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                                            }`}
                                        >
                                            <Icon size={16} className={isActive ? 'text-indigo-400' : 'text-slate-500'} />
                                            <span>{label}</span>
                                            {isActive && isUpdating && (
                                                <RefreshCw size={13} className="animate-spin text-indigo-400 ml-1" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Manual Refresh Button */}
                            <button
                                onClick={() => {
                                    setIsUpdating(true);
                                    fetchAnalytics();
                                }}
                                disabled={isUpdating}
                                title="Force Refresh Metrics"
                                className="p-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-2xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                            >
                                <RefreshCw size={16} className={isUpdating ? 'animate-spin text-indigo-600' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Filter Strip */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 pt-1">
                        <div className="flex flex-col">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1.5">
                                <MapPin size={12} className="text-slate-400" /> State
                            </label>
                            <select
                                value={selectedState}
                                onChange={e => {
                                    setIsUpdating(true);
                                    setSelectedState(e.target.value); 
                                    setSelectedCity(''); 
                                    setSelectedPincode(''); 
                                }}
                                className="bg-slate-50/90 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold uppercase tracking-wide px-3.5 py-2.5 rounded-xl outline-none cursor-pointer hover:bg-white focus:bg-white focus:border-indigo-500 transition-all shadow-sm"
                            >
                                <option value="">All States</option>
                                {statesList.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1.5">
                                <Building size={12} className="text-slate-400" /> City
                            </label>
                            <select
                                value={selectedCity}
                                onChange={e => { 
                                    setIsUpdating(true);
                                    setSelectedCity(e.target.value); 
                                    setSelectedPincode(''); 
                                }}
                                className="bg-slate-50/90 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold uppercase tracking-wide px-3.5 py-2.5 rounded-xl outline-none cursor-pointer hover:bg-white focus:bg-white focus:border-indigo-500 transition-all shadow-sm"
                            >
                                <option value="">All Cities</option>
                                {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1.5">
                                <MapPin size={12} className="text-slate-400" /> Pincode
                            </label>
                            <select
                                value={selectedPincode}
                                onChange={e => {
                                    setIsUpdating(true);
                                    setSelectedPincode(e.target.value);
                                }}
                                className="bg-slate-50/90 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold uppercase tracking-wide px-3.5 py-2.5 rounded-xl outline-none cursor-pointer hover:bg-white focus:bg-white focus:border-indigo-500 transition-all shadow-sm"
                            >
                                <option value="">All Pincodes</option>
                                {availablePincodes.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1.5">
                                <ShieldCheck size={12} className="text-slate-400" /> Geofence
                            </label>
                            <select
                                value={selectedGeofence}
                                onChange={e => {
                                    setIsUpdating(true);
                                    setSelectedGeofence(e.target.value);
                                }}
                                className="bg-slate-50/90 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold uppercase tracking-wide px-3.5 py-2.5 rounded-xl outline-none cursor-pointer hover:bg-white focus:bg-white focus:border-indigo-500 transition-all shadow-sm"
                            >
                                <option value="">All Geofences</option>
                                {availableGeofences.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-col col-span-2 md:col-span-1">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1.5">
                                <Calendar size={12} className="text-slate-400" /> Temporal Range
                            </label>
                            <select
                                value={timeRange}
                                onChange={e => {
                                    setIsUpdating(true);
                                    setTimeRange(e.target.value);
                                }}
                                className="bg-slate-50/90 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold uppercase tracking-wide px-3.5 py-2.5 rounded-xl outline-none cursor-pointer hover:bg-white focus:bg-white focus:border-indigo-500 transition-all shadow-sm"
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
                        <div className="flex gap-4 items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-200 w-fit">
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                                <input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={e => {
                                        setIsUpdating(true);
                                        setStartDate(e.target.value);
                                    }} 
                                    className="bg-white border border-slate-200 text-xs sm:text-sm font-bold p-2 px-3 rounded-xl outline-none" 
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                                <input 
                                    type="date" 
                                    value={endDate} 
                                    onChange={e => {
                                        setIsUpdating(true);
                                        setEndDate(e.target.value);
                                    }} 
                                    className="bg-white border border-slate-200 text-xs sm:text-sm font-bold p-2 px-3 rounded-xl outline-none" 
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Dashboard Sub-Tabs Panel */}
            <div className="max-w-[1600px] mx-auto w-full px-6 pt-6">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
                    {[
                        { id: 'overview', label: 'Executive Overview', icon: Activity },
                        { id: 'users', label: 'Partners & Clients', icon: Users },
                        { id: 'logistics', label: 'Order Lifecycles', icon: Truck },
                        { id: 'financials', label: 'Financial Intel', icon: IndianRupee },
                        { id: 'catalogs', label: 'Catalogs & Support', icon: Package }
                    ].map(({ id, label, icon: Icon }) => {
                        const isActive = activeTab === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                className={`px-5 py-3.5 rounded-t-[1.3rem] font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2.5 transition-all cursor-pointer ${
                                    isActive
                                        ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                                        : 'bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-t border-x border-transparent hover:border-slate-200'
                                }`}
                            >
                                <Icon size={16} className={isActive ? 'text-indigo-400' : 'text-slate-400'} />
                                <span>{label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Prominent Floating Sync Indicator */}
            {isUpdating && (
                <div className="max-w-[1600px] mx-auto w-full px-6 pt-4 flex items-center justify-center">
                    <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-slate-900 text-white rounded-full text-xs sm:text-sm font-black uppercase tracking-wider shadow-2xl shadow-slate-900/30 border border-slate-700 animate-pulse">
                        <RefreshCw size={15} className="animate-spin text-indigo-400" />
                        <span>Synchronizing {channel} Control Center Telemetry...</span>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="max-w-[1600px] mx-auto w-full px-6 pt-6">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Pending Verification Requests Flag / Alert Banner */}
                        {totalPendingVerifications > 0 && (
                            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border-2 border-amber-300/80 p-5 sm:p-6 shadow-lg shadow-amber-500/5 transition-all">
                                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/25">
                                            <ShieldAlert size={26} className="animate-pulse" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                                                    Action Required
                                                </span>
                                                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                                    {totalPendingVerifications} Pending Partner Verification Request{totalPendingVerifications > 1 ? 's' : ''}
                                                </h3>
                                            </div>
                                            <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-1">
                                                New supplier and vendor onboarding submissions are awaiting administrative review and KYC verification.
                                            </p>
                                            <div className="flex items-center gap-3 sm:gap-4 mt-2.5 text-xs font-bold text-slate-700 flex-wrap">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/80 rounded-lg border border-amber-200">
                                                    <Store size={14} className="text-amber-600" />
                                                    Vendors Pending: <span className="font-black text-amber-700">{pendingVendors}</span>
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/80 rounded-lg border border-amber-200">
                                                    <Building size={14} className="text-orange-600" />
                                                    Suppliers Pending: <span className="font-black text-orange-700">{pendingSuppliers}</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap">
                                        {pendingVendors > 0 && (
                                            <button
                                                onClick={() => navigate('/admin/vendors/approvals')}
                                                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <Store size={14} className="text-amber-600" />
                                                Vendors ({pendingVendors})
                                            </button>
                                        )}
                                        {pendingSuppliers > 0 && (
                                            <button
                                                onClick={() => navigate('/admin/supplier-requests')}
                                                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <Building size={14} className="text-orange-600" />
                                                Suppliers ({pendingSuppliers})
                                            </button>
                                        )}
                                        <button
                                            onClick={() => navigate(pendingVendors > 0 ? '/admin/vendors/approvals' : '/admin/supplier-requests')}
                                            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
                                        >
                                            Review Approvals
                                            <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Macro Metrics 4 Cards Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* 1. Revenue Card */}
                            <div className="bg-white rounded-[2rem] border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all pointer-events-none" />
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2 flex-1">
                                        <p className="text-xs sm:text-sm font-extrabold uppercase text-slate-500 tracking-wider">
                                            {channel === 'B2B' ? 'B2B Wholesale GMV' : channel === 'B2C' ? 'B2C Consumer GMV' : 'Gross Volume (GMV)'}
                                        </p>
                                        {isUpdating ? (
                                            <div className="space-y-2 py-1">
                                                <div className="h-9 w-36 bg-slate-200/80 rounded-lg animate-pulse" />
                                                <div className="h-5 w-28 bg-slate-100 rounded-md animate-pulse" />
                                            </div>
                                        ) : (
                                            <>
                                                <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight tabular-nums">
                                                    ₹{displayGross.toLocaleString('en-IN')}
                                                </h3>
                                                <div className="flex items-center gap-2 pt-1">
                                                    <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                                                        <ArrowUpRight size={13} />
                                                        +12.5% MoM
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-500">Net: ₹{(analytics?.financials?.netProfit || 0).toLocaleString('en-IN')}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="w-13 h-13 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm ml-4">
                                        <IndianRupee size={24} />
                                    </div>
                                </div>
                            </div>

                            {/* 2. Channel-Aware Orders Card */}
                            <div className="bg-white rounded-[2rem] border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all pointer-events-none" />
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2 flex-1">
                                        <p className="text-xs sm:text-sm font-extrabold uppercase text-slate-500 tracking-wider">{ordersTitle}</p>
                                        {isUpdating ? (
                                            <div className="space-y-2 py-1">
                                                <div className="h-9 w-24 bg-slate-200/80 rounded-lg animate-pulse" />
                                                <div className="h-5 w-32 bg-slate-100 rounded-md animate-pulse" />
                                            </div>
                                        ) : (
                                            <>
                                                <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight tabular-nums">
                                                    {totalOrdersCount}
                                                </h3>
                                                <div className="flex items-center gap-2 pt-1">
                                                    <span className="inline-flex items-center gap-1 text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                                                        {ordersBadge}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="w-13 h-13 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 shadow-sm ml-4">
                                        <ShoppingBag size={24} />
                                    </div>
                                </div>
                            </div>

                            {/* 3. Unique Clients Card */}
                            <div className="bg-white rounded-[2rem] border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2 flex-1">
                                        <p className="text-xs sm:text-sm font-extrabold uppercase text-slate-500 tracking-wider">{clientTitle}</p>
                                        {isUpdating ? (
                                            <div className="space-y-2 py-1">
                                                <div className="h-9 w-24 bg-slate-200/80 rounded-lg animate-pulse" />
                                                <div className="h-5 w-32 bg-slate-100 rounded-md animate-pulse" />
                                            </div>
                                        ) : (
                                            <>
                                                <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight tabular-nums">
                                                    {clientCount}
                                                </h3>
                                                <div className="flex items-center gap-2 pt-1">
                                                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                                                        {clientBadge}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-sm ml-4">
                                        <Users size={24} />
                                    </div>
                                </div>
                            </div>

                            {/* 4. Open Disputes Card */}
                            <div className="bg-white rounded-[2rem] border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-36 h-36 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all pointer-events-none" />
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2 flex-1">
                                        <p className="text-xs sm:text-sm font-extrabold uppercase text-slate-500 tracking-wider">
                                            {channel === 'B2B' ? 'B2B Cancellations' : 'Open Support Cases'}
                                        </p>
                                        {isUpdating ? (
                                            <div className="space-y-2 py-1">
                                                <div className="h-9 w-20 bg-slate-200/80 rounded-lg animate-pulse" />
                                                <div className="h-5 w-28 bg-slate-100 rounded-md animate-pulse" />
                                            </div>
                                        ) : (
                                            <>
                                                <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight tabular-nums">
                                                    {channel === 'B2B' ? (analytics?.orderLifecycleB2B?.cancelled || 0) : (analytics?.helpdesk?.open || 0)}
                                                </h3>
                                                <div className="flex items-center gap-2 pt-1">
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                                                        <AlertTriangle size={12} />
                                                        {channel === 'B2B' ? `${analytics?.orderLifecycleB2B?.inProgress || 0} In Transit` : `${analytics?.helpdesk?.inProgress || 0} In-Progress`}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="w-13 h-13 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 shadow-sm ml-4">
                                        <Headphones size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Funnel + Core Chart Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Fulfillment Pipeline Funnel Card */}
                            <div className="bg-white border border-slate-200/80 p-6 sm:p-7 rounded-[2rem] shadow-sm lg:col-span-2 space-y-6">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                    <div>
                                        <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900 flex items-center gap-2.5">
                                            <Activity size={18} className="text-indigo-600" />
                                            {channel === 'B2B' ? 'B2B Supply Chain Funnel' : 'Fulfillment Pipeline Funnel'}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                                            {channel === 'B2B' ? 'Vendor-Supplier order conversion and delivery progression' : 'Status drop-offs across live B2C customer orders'}
                                        </p>
                                    </div>
                                    <span className="text-xs font-black text-indigo-700 uppercase tracking-wider bg-indigo-50 border border-indigo-100 px-3.5 py-1.5 rounded-full">
                                        {channel === 'B2B' ? 'B2B Wholesale' : 'B2C Direct'}
                                    </span>
                                </div>

                                {isUpdating ? (
                                    <div className="space-y-4 pt-1">
                                        {[1, 2, 3, 4, 5].map(k => (
                                            <div key={k} className="space-y-1.5">
                                                <div className="flex justify-between">
                                                    <div className="h-4 w-32 bg-slate-200/80 rounded animate-pulse" />
                                                    <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
                                                </div>
                                                <div className="h-5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                                                    <div className="h-full bg-slate-200/80 rounded-full animate-pulse" style={{ width: `${85 - k * 14}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-4 pt-1">
                                        {(channel === 'B2B' ? [
                                            { label: 'Orders Placed', value: analytics?.orderLifecycleB2B?.totalPlaced || 0, color: 'bg-blue-600', base: analytics?.orderLifecycleB2B?.totalPlaced || 1 },
                                            { label: 'Supplier Accepted', value: analytics?.orderLifecycleB2B?.totalAccepted || 0, color: 'bg-indigo-600', base: analytics?.orderLifecycleB2B?.totalPlaced || 1 },
                                            { label: 'In Processing', value: analytics?.orderLifecycleB2B?.inProgress || 0, color: 'bg-amber-500', base: analytics?.orderLifecycleB2B?.totalPlaced || 1 },
                                            { label: 'Dispatched / In Transit', value: analytics?.orderLifecycleB2B?.dispatched || 0, color: 'bg-purple-600', base: analytics?.orderLifecycleB2B?.totalPlaced || 1 },
                                            { label: 'Completed & Delivered', value: analytics?.orderLifecycleB2B?.delivered || 0, color: 'bg-emerald-600', base: analytics?.orderLifecycleB2B?.totalPlaced || 1 }
                                        ] : [
                                            { label: 'Total Submitted', value: analytics?.orderLifecycleB2C?.totalSubmitted || 0, color: 'bg-blue-600', base: analytics?.orderLifecycleB2C?.totalSubmitted || 1 },
                                            { label: 'Claimed / Accepted', value: analytics?.orderLifecycleB2C?.totalAccepted || 0, color: 'bg-indigo-600', base: analytics?.orderLifecycleB2C?.totalSubmitted || 1 },
                                            { label: 'In Processing', value: analytics?.orderLifecycleB2C?.inProgress || 0, color: 'bg-amber-500', base: analytics?.orderLifecycleB2C?.totalSubmitted || 1 },
                                            { label: 'Ready for Pickup', value: analytics?.orderLifecycleB2C?.readyForDispatch || 0, color: 'bg-purple-600', base: analytics?.orderLifecycleB2C?.totalSubmitted || 1 },
                                            { label: 'Outbound Logistics', value: analytics?.orderLifecycleB2C?.outboundLogistics || 0, color: 'bg-emerald-600', base: analytics?.orderLifecycleB2C?.totalSubmitted || 1 }
                                        ]).map((funnel, idx) => {
                                            const pct = Math.min(100, Math.round((funnel.value / (funnel.base || 1)) * 100));
                                            return (
                                                <div key={idx} className="space-y-1.5">
                                                    <div className="flex justify-between items-center text-xs sm:text-sm font-bold text-slate-700 tracking-wide">
                                                        <span className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                                                            {funnel.label}
                                                        </span>
                                                        <span className="tabular-nums font-black text-slate-900">
                                                            {funnel.value.toLocaleString()} Orders ({pct}%)
                                                        </span>
                                                    </div>
                                                    <div className="h-5 bg-slate-100 rounded-full overflow-hidden flex p-0.5 border border-slate-200">
                                                        <div 
                                                            style={{ width: `${Math.max(6, pct)}%` }} 
                                                            className={`${funnel.color} h-full rounded-full transition-all duration-700 flex items-center justify-end px-2.5 text-xs font-black text-white shadow-sm`}
                                                        >
                                                            {pct >= 20 ? `${pct}%` : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* SLA Alert Radar Card */}
                            <div className="bg-white border border-slate-200/80 p-6 sm:p-7 rounded-[2rem] shadow-sm flex flex-col justify-between space-y-6">
                                <div>
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                                        <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900 flex items-center gap-2">
                                            <ShieldCheck size={18} className="text-amber-500" />
                                            SLA Violations Radar
                                        </h3>
                                        <span className="text-xs font-black uppercase text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                                            Real-Time
                                        </span>
                                    </div>

                                    {isUpdating ? (
                                        <div className="space-y-3">
                                            {[1, 2, 3].map(k => (
                                                <div key={k} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2 animate-pulse">
                                                    <div className="h-4 w-32 bg-slate-200/80 rounded" />
                                                    <div className="h-3 w-48 bg-slate-100 rounded" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-3.5">
                                            {totalPendingVerifications > 0 && (
                                                <div 
                                                    onClick={() => navigate(pendingVendors > 0 ? '/admin/vendors/approvals' : '/admin/supplier-requests')}
                                                    className="flex gap-3.5 items-start p-4 bg-amber-50/90 hover:bg-amber-100/80 border-2 border-amber-300 rounded-2xl cursor-pointer transition-all group shadow-xs"
                                                >
                                                    <span className="p-2 bg-amber-500 text-white rounded-xl shrink-0 shadow-sm">
                                                        <ShieldAlert size={16} className="animate-pulse" />
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <h4 className="text-xs sm:text-sm font-black uppercase text-amber-950 tracking-wide">
                                                                Pending Verifications
                                                            </h4>
                                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-500 text-white rounded-md tracking-wider shrink-0">
                                                                {totalPendingVerifications} Pending
                                                            </span>
                                                        </div>
                                                        <p className="text-xs font-semibold text-amber-900 mt-1">
                                                            {pendingVendors} vendor{pendingVendors !== 1 ? 's' : ''} & {pendingSuppliers} supplier{pendingSuppliers !== 1 ? 's' : ''} awaiting approval
                                                        </p>
                                                    </div>
                                                    <ChevronRight size={16} className="text-amber-700 group-hover:translate-x-1 transition-transform self-center shrink-0" />
                                                </div>
                                            )}

                                            <div className="flex gap-3.5 items-start p-4 bg-rose-50/80 border border-rose-100 rounded-2xl">
                                                <span className="p-2 bg-rose-100 text-rose-600 rounded-xl shrink-0">
                                                    <AlertTriangle size={16} />
                                                </span>
                                                <div>
                                                    <h4 className="text-xs sm:text-sm font-black uppercase text-rose-950 tracking-wide">Logistics Bounces</h4>
                                                    <p className="text-xs font-semibold text-rose-800 mt-1">
                                                        {analytics?.orderLifecycleB2C?.logisticsBounces || 0} shipments flagged for courier partner rejection
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-3.5 items-start p-4 bg-amber-50/80 border border-amber-100 rounded-2xl">
                                                <span className="p-2 bg-amber-100 text-amber-600 rounded-xl shrink-0">
                                                    <Clock size={16} />
                                                </span>
                                                <div>
                                                    <h4 className="text-xs sm:text-sm font-black uppercase text-amber-950 tracking-wide">Immediate Timeouts</h4>
                                                    <p className="text-xs font-semibold text-amber-800 mt-1">
                                                        {analytics?.orderLifecycleB2C?.immediateTimeouts || 0} orders pending vendor acceptance &gt; 5 mins
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-3.5 items-start p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                                <span className="p-2 bg-slate-200 text-slate-700 rounded-xl shrink-0">
                                                    <Store size={16} />
                                                </span>
                                                <div>
                                                    <h4 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide">Dormant Vendors</h4>
                                                    <p className="text-xs font-semibold text-slate-600 mt-1">
                                                        {analytics?.vendorPerformance?.dormantCount || 0} partner shops inactive in last 5 days
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-slate-100 text-center">
                                    <button 
                                        onClick={() => setActiveTab('logistics')} 
                                        className="text-xs font-black text-indigo-600 uppercase tracking-wider hover:text-indigo-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                                    >
                                        Inspect Order Timers & Lifecycles
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Revenue Trends Chart */}
                        <div className="bg-white border border-slate-200/80 p-6 sm:p-7 rounded-[2rem] shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                                <div>
                                    <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900 flex items-center gap-2.5">
                                        <BarChart3 size={18} className="text-blue-600" />
                                        Monthly Revenue & Settlement Trajectory
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                                        Gross transaction volume vs partner payouts & platform margin
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 text-xs sm:text-sm font-bold">
                                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-600" /> Revenue</span>
                                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Profit</span>
                                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500" /> Payouts</span>
                                </div>
                            </div>

                            {isUpdating ? (
                                <div className="h-[290px] w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100 p-8 space-y-3">
                                    <RefreshCw size={26} className="animate-spin text-indigo-500" />
                                    <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-500 animate-pulse">
                                        Computing {channel} Revenue Aggregation...
                                    </p>
                                </div>
                            ) : (
                                <div className="h-[290px] w-full pt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={financialTrendData}>
                                            <defs>
                                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                                                </linearGradient>
                                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} />
                                            <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} />
                                            <Tooltip formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`} />
                                            <Area type="monotone" dataKey="Revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorRev)" />
                                            <Area type="monotone" dataKey="Profit" stroke="#10b981" strokeWidth={2.5} fill="url(#colorProfit)" />
                                            <Area type="monotone" dataKey="Payouts" stroke="#f59e0b" strokeWidth={2} fill="transparent" strokeDasharray="4 4" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="space-y-6">
                        {totalPendingVerifications > 0 && (
                            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border-2 border-amber-300/80 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/25">
                                        <ShieldAlert size={24} className="animate-pulse" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-900">
                                            {totalPendingVerifications} Partner Onboarding Request{totalPendingVerifications > 1 ? 's' : ''} Pending Review
                                        </h3>
                                        <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
                                            {pendingVendors} vendor{pendingVendors !== 1 ? 's' : ''} and {pendingSuppliers} supplier{pendingSuppliers !== 1 ? 's' : ''} require KYC document and profile verification.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                                    {pendingVendors > 0 && (
                                        <button
                                            onClick={() => navigate('/admin/vendors/approvals')}
                                            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-900 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-200 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                                        >
                                            <Store size={13} className="text-amber-600" />
                                            Vendors ({pendingVendors})
                                        </button>
                                    )}
                                    {pendingSuppliers > 0 && (
                                        <button
                                            onClick={() => navigate('/admin/supplier-requests')}
                                            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-900 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-200 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                                        >
                                            <Building size={13} className="text-orange-600" />
                                            Suppliers ({pendingSuppliers})
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Customer analytics card */}
                            <div className="bg-white border border-slate-200/80 p-6 sm:p-7 rounded-[2rem] shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-800 mb-6">Customer Composition (B2C vs B2B)</h3>
                                    <div className="h-[250px] w-full flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Individual B2C', value: analytics?.customerAnalytics.individualCount || 0 },
                                                        { name: 'Commercial B2B', value: analytics?.customerAnalytics.businessCount || 0 }
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
                                        <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Churn Risk (30d Inactive)</p>
                                        <p className="text-2xl sm:text-3xl font-black text-slate-900">{analytics?.customerAnalytics.churnRisk || 0}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Onboarding Friction</p>
                                        <p className="text-2xl sm:text-3xl font-black text-slate-900">{analytics?.customerAnalytics.onboardingFriction || 0}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Vendor Cohorts analytics */}
                            <div className="bg-white border border-slate-200/80 p-6 sm:p-7 rounded-[2rem] shadow-sm">
                                <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-800 mb-6">Vendor Onboarding Cohorts</h3>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={[
                                                { name: 'Local', count: analytics?.vendorPerformance.cohorts.local || 0 },
                                                { name: 'Proprietorship', count: analytics?.vendorPerformance.cohorts.proprietorship || 0 },
                                                { name: 'Partnership', count: analytics?.vendorPerformance.cohorts.partnership || 0 },
                                                { name: 'Pvt Ltd', count: analytics?.vendorPerformance.cohorts.pvtLtd || 0 },
                                                { name: 'Franchise', count: analytics?.vendorPerformance.cohorts.franchise || 0 }
                                            ]}
                                            layout="vertical"
                                            margin={{ left: 20, right: 10, top: 5, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                                            <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 800 }} />
                                            <Tooltip />
                                            <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 mt-4">
                                    <div className="text-center">
                                        <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Never Ordered B2B</p>
                                        <p className="text-2xl sm:text-3xl font-black text-slate-900">{analytics?.vendorPerformance.neverOrderedB2B || 0}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-black text-slate-500 uppercase tracking-wider">30d B2B Inactive</p>
                                        <p className="text-2xl sm:text-3xl font-black text-slate-900">{analytics?.vendorPerformance.dormancy30DaysB2B || 0}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Top/Bottom rating Leaderboards */}
                            <div className="bg-white border border-slate-200/80 p-6 sm:p-7 rounded-[2rem] shadow-sm lg:col-span-2">
                                <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-800 mb-6">Vendor Performance Outliers (Ratings)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black uppercase text-emerald-700 tracking-wider bg-emerald-50 px-3 py-1.5 rounded-lg w-fit">Top 5 Highest Rated</h4>
                                        <div className="divide-y divide-slate-100">
                                            {analytics?.vendorPerformance?.topVendors?.length ? analytics.vendorPerformance.topVendors.map((vendor, idx) => (
                                                <div key={idx} className="flex justify-between items-center py-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-500">#{idx+1}</span>
                                                        <span className="text-xs sm:text-sm font-bold text-slate-800">{vendor.name}</span>
                                                    </div>
                                                    <span className="px-2.5 py-1 bg-emerald-500 text-white rounded-md text-xs font-black">{vendor.rating} ★</span>
                                                </div>
                                            )) : <p className="text-xs text-slate-400 py-3">No rating data yet</p>}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black uppercase text-red-700 tracking-wider bg-red-50 px-3 py-1.5 rounded-lg w-fit">Bottom 5 Lowest Rated</h4>
                                        <div className="divide-y divide-slate-100">
                                            {analytics?.vendorPerformance?.bottomVendors?.length ? analytics.vendorPerformance.bottomVendors.map((vendor, idx) => (
                                                <div key={idx} className="flex justify-between items-center py-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-500">#{idx+1}</span>
                                                        <span className="text-xs sm:text-sm font-bold text-slate-800">{vendor.name}</span>
                                                    </div>
                                                    <span className="px-2.5 py-1 bg-red-500 text-white rounded-md text-xs font-black">{vendor.rating} ★</span>
                                                </div>
                                            )) : <p className="text-xs text-slate-400 py-3">No outlier data yet</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'logistics' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* SLA Delays/Violations */}
                        <div className="bg-white border border-slate-200/80 p-6 sm:p-7 rounded-[2rem] shadow-sm flex flex-col justify-between">
                            <div>
                                <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-800 mb-6">Logistics & SLA Violation Breakdown</h3>
                                <div className="h-[250px] w-full flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Logistics Bounces', value: analytics?.orderLifecycleB2C?.logisticsBounces || 0 },
                                                    { name: 'Pickup Window Delay', value: analytics?.orderLifecycleB2C?.violations?.pickup || 0 },
                                                    { name: 'Drop-off Window Delay', value: analytics?.orderLifecycleB2C?.violations?.dropoff || 0 },
                                                    { name: 'Vendor SLA Overruns', value: analytics?.orderLifecycleB2C?.violations?.vendorSla || 0 }
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
                        <div className="bg-white border border-slate-200/80 p-6 sm:p-7 rounded-[2rem] shadow-sm">
                            <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-800 mb-6">Active Physical Transit Pipes</h3>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-xs font-black uppercase text-slate-500 tracking-wider mb-2">
                                        <span>Customer ➔ Vendor Facility</span>
                                        <span className="font-extrabold text-slate-900">{analytics?.orderLifecycleB2C?.outboundLogistics || 0} Active Transits</span>
                                    </div>
                                    <div className="h-5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '65%' }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs font-black uppercase text-slate-500 tracking-wider mb-2">
                                        <span>Vendor ➔ Customer Home</span>
                                        <span className="font-extrabold text-slate-900">{analytics?.orderLifecycleB2C?.reverseLogistics || 0} Active Return Transits</span>
                                    </div>
                                    <div className="h-5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{ width: '45%' }} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider">In Processing</p>
                                    <p className="text-2xl sm:text-3xl font-black text-slate-900">{analytics?.orderLifecycleB2C?.inProgress || 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Ready / Collection</p>
                                    <p className="text-2xl sm:text-3xl font-black text-slate-900">{analytics?.orderLifecycleB2C?.readyForDispatch || 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider">B2B Cycles</p>
                                    <p className="text-2xl sm:text-3xl font-black text-slate-900">{analytics?.orderLifecycleB2B?.totalPlaced || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'financials' && (
                    <div className="space-y-6">
                        {/* Revenue Cost Allocation Waterfall */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-white border border-slate-200/80 p-6 sm:p-7 rounded-[2rem] shadow-sm lg:col-span-2">
                                <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-800 mb-6">Waterfall Cost Allocations (Current Period)</h3>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={waterfallData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11, fontWeight: 800 }} />
                                            <YAxis tickFormatter={(val) => `₹${Math.abs(val).toLocaleString('en-IN')}`} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                                            <Tooltip formatter={(value) => `₹${Math.abs(value).toLocaleString('en-IN')}`} />
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
                            <div className="bg-white border border-slate-200/80 p-6 sm:p-7 rounded-[2rem] shadow-sm flex flex-col justify-between">
                                <div className="space-y-6">
                                    <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-800">Financial Liabilities</h3>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-black uppercase text-slate-500 tracking-wider">Customer Wallet liability</p>
                                                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">₹{(analytics?.financials?.walletLiability || 0).toLocaleString('en-IN')}</p>
                                            </div>
                                            <IndianRupee className="text-slate-400" size={22} />
                                        </div>
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-black uppercase text-slate-500 tracking-wider">Total refunds processed</p>
                                                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">₹{(analytics?.financials?.refunds || 0).toLocaleString('en-IN')}</p>
                                            </div>
                                            <RefreshCw className="text-slate-400" size={22} />
                                        </div>
                                    </div>
                                </div>

                                <div className="text-xs font-bold text-slate-500 uppercase text-center mt-4">
                                    Disbursements completed via RazorpayX
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'catalogs' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Service catalog health */}
                        <div className="bg-white border border-slate-200/80 p-6 sm:p-7 rounded-[2rem] shadow-sm">
                            <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-800 mb-6">Service Catalog (B2C)</h3>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            { name: 'Active SKUs', count: analytics?.catalogB2C?.totalServices || 0 },
                                            { name: 'Inactive SKUs', count: analytics?.catalogB2C?.inactiveServices || 0 }
                                        ]}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11, fontWeight: 800 }} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#474887" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3.5 rounded-2xl mt-4">
                                <span className="text-xs font-black uppercase text-slate-600 tracking-wider">Pending Catalog Reviews</span>
                                <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-black">{analytics?.catalogB2C?.pendingReviews || 0} Action</span>
                            </div>
                        </div>

                        {/* Product catalog B2B */}
                        <div className="bg-white border border-slate-200/80 p-6 sm:p-7 rounded-[2rem] shadow-sm">
                            <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-800 mb-6">Supplier Product Catalog (B2B)</h3>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            { name: 'Active SKU', count: analytics?.catalogB2B?.totalProducts || 0 },
                                            { name: 'Inactive SKU', count: analytics?.catalogB2B?.inactiveProducts || 0 }
                                        ]}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11, fontWeight: 800 }} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#85b49f" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3.5 rounded-2xl mt-4">
                                <span className="text-xs font-black uppercase text-slate-600 tracking-wider">Pending Supplier Reviews</span>
                                <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-black">{analytics?.catalogB2B?.pendingReviews || 0} Action</span>
                            </div>
                        </div>

                        {/* ATS pipeline */}
                        <div className="bg-white border border-slate-200/80 p-6 sm:p-7 rounded-[2rem] shadow-sm">
                            <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-800 mb-6">Labor Exchange Pipeline</h3>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            { name: 'Corporate', applicants: analytics?.atsLaborExchange?.admin || 0 },
                                            { name: 'Vendors', applicants: analytics?.atsLaborExchange?.vendor || 0 },
                                            { name: 'Warehouse', applicants: analytics?.atsLaborExchange?.supplier || 0 }
                                        ]}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11, fontWeight: 800 }} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                                        <Tooltip />
                                        <Bar dataKey="applicants" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="text-xs font-bold text-slate-500 uppercase text-center mt-6">
                                ATS Job Requisitions active in last 60 days
                            </div>
                        </div>

                        {/* Sentiment Word Cloud replacement / key terms */}
                        <div className="bg-white border border-slate-200/80 p-6 sm:p-7 rounded-[2rem] shadow-sm lg:col-span-3">
                            <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-800 mb-6">Feedback Sentiment Keyword Analysis</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase text-emerald-700 tracking-wider bg-emerald-50 px-3.5 py-1.5 rounded-lg w-fit">Top Positive Keywords</h4>
                                    <div className="flex flex-wrap gap-2.5">
                                        {(analytics?.feedbackSentiment?.positiveKeywords || []).map((word, idx) => (
                                            <span key={idx} className="px-4 py-2 bg-emerald-50 text-emerald-800 rounded-full text-xs sm:text-sm font-bold border border-emerald-100 hover:bg-emerald-100 transition-colors">
                                                {word}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase text-red-700 tracking-wider bg-red-50 px-3.5 py-1.5 rounded-lg w-fit">Critical Improvement Flags</h4>
                                    <div className="flex flex-wrap gap-2.5">
                                        {(analytics?.feedbackSentiment?.criticalKeywords || []).map((word, idx) => (
                                            <span key={idx} className="px-4 py-2 bg-rose-50 text-rose-800 rounded-full text-xs sm:text-sm font-bold border border-rose-100 hover:bg-rose-100 transition-colors">
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
