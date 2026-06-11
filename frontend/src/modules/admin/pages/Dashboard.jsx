import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { adminApi } from '../../../lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StorageWidget = () => {
  const [storageData, setStorageData] = useState(null);

  useEffect(() => {
    const fetchStorage = async () => {
      try {
        const usage = await adminApi.getCloudinaryUsage();
        if (usage && usage.storage) {
          const usedBytes = usage.storage.usage || 0;
          const limitBytes = usage.storage.limit || (25 * 1024 * 1024 * 1024); // fallback 25GB
          const freeBytes = Math.max(0, limitBytes - usedBytes);
          const usedPercent = Math.round((usedBytes / limitBytes) * 100) || 0;
          
          // Approximated breakdown of 'usedBytes' for visual demonstration
          const docBytes = usedBytes * 0.20;
          const imgBytes = usedBytes * 0.45;
          const vidBytes = usedBytes * 0.35;

          setStorageData({
            usedPercent,
            free: freeBytes,
            images: imgBytes,
            videos: vidBytes,
            documents: docBytes,
            total: limitBytes
          });
        }
      } catch (err) {
        console.error('Failed to load storage data:', err);
      }
    };
    fetchStorage();
  }, []);

  if (!storageData) {
    return (
      <div className="bg-white border border-slate-200 p-6 xl:p-8 rounded-3xl shadow-sm flex flex-col h-[350px] items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const formatGB = (bytes) => (bytes / (1024 ** 3)).toFixed(1);

  const radius = 35;
  const circumference = 2 * Math.PI * radius;

  // Colors exactly matching the UI screenshot
  const segments = [
    { label: 'Documents', value: storageData.documents, color: 'text-[#E5D5A8]' },
    { label: 'Images', value: storageData.images, color: 'text-[#474887]' },
    { label: 'Videos', value: storageData.videos, color: 'text-[#85B49F]' },
    { label: 'Free', value: storageData.free, color: 'text-[#3F302D]' }
  ];

  let cumulativeLength = 0;
  const chartSegments = segments.map(seg => {
     const percentage = (seg.value / storageData.total) * 100;
     const length = (percentage / 100) * circumference;
     const chartSeg = {
       ...seg,
       strokeDasharray: `${length} ${circumference}`,
       strokeDashoffset: -cumulativeLength
     };
     cumulativeLength += length;
     return chartSeg;
  });

  return (
    <div className="bg-white border border-slate-200 p-6 xl:p-8 rounded-[2rem] shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-slate-800">Storage</h3>
        <button className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors">
          <span className="material-symbols-outlined text-[16px]">more_vert</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative w-[140px] h-[140px] mb-8 mt-4">
          <svg className="w-full h-full transform -rotate-90">
             <circle className="text-slate-100" strokeWidth="22" stroke="currentColor" fill="transparent" r={radius} cx="50%" cy="50%" />
             {chartSegments.map((seg, idx) => (
                <circle
                  key={idx}
                  className={seg.color}
                  strokeWidth="22"
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  stroke="currentColor"
                  fill="transparent"
                  r={radius}
                  cx="50%"
                  cy="50%"
                  style={{ transition: 'stroke-dasharray 1s ease-in-out, stroke-dashoffset 1s ease-in-out' }}
                />
             ))}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-slate-900">{storageData.usedPercent}%</span>
          </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-y-5 gap-x-2 border-t border-slate-100 pt-6">
          {segments.map((seg, idx) => (
             <div key={idx} className="flex flex-col items-start px-2">
               <div className="flex items-center gap-2 mb-0.5">
                 <div className={`w-2.5 h-2.5 rounded-full bg-current ${seg.color}`}></div>
                 <span className="text-xs font-bold text-slate-800">{seg.label}</span>
               </div>
               <span className="text-[11px] font-bold text-slate-400 ml-4.5">{formatGB(seg.value)} GB</span>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DashboardHeader = ({ onDateChange }) => {
  const [dateRange, setDateRange] = useState('March 18 - April 18');
  const admin = JSON.parse(localStorage.getItem('adminData') || '{}');
  const adminName = admin.displayName || admin.name || 'Admin';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const today = new Date();
  const dateNum = today.getDate();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'short' });
  const monthName = today.toLocaleDateString('en-US', { month: 'long' });

  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8">
      {/* Left */}
      <div className="flex flex-col">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
          {getGreeting()}, {adminName}!
        </h1>
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
          <p className="text-sm font-bold text-slate-500 tracking-wide">Welcome to master dashboard</p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-5 mt-6 lg:mt-0">
        <div className="flex items-center gap-4">
          <div className="w-2.5 h-12 bg-blue-600 rounded-lg shadow-sm"></div>
          <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm">
            <span className="text-2xl font-black text-slate-800">{dateNum}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-slate-700">{dayName},</span>
            <span className="text-sm font-bold text-slate-700">{monthName}</span>
            {currentTime && (
              <>
                <span className="text-sm font-bold text-slate-300 mx-0.5">•</span>
                <span className="text-sm font-bold text-slate-700">{currentTime}</span>
              </>
            )}
          </div>
        </div>

        <div className="w-[1px] h-10 bg-slate-200 mx-2"></div>

        <div className="relative">
          <input 
            type="date" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            onChange={(e) => {
                if(e.target.value) {
                   const dateObj = new Date(e.target.value);
                   const formatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                   setDateRange(formatted);
                   if(onDateChange) onDateChange(e.target.value);
                }
            }}
          />
          <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-5 py-3 rounded-2xl transition-colors cursor-pointer group">
            <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-blue-600 transition-colors">calendar_month</span>
            <span className="text-xs font-bold text-slate-700 tracking-wide">{dateRange}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricBox = ({ title, icon, total, stats, primaryLabel }) => {
  let primaryPercentage = 0;
  
  if (typeof total === 'number' && total > 0 && stats && primaryLabel) {
    const primaryStat = stats.find(s => s.label === primaryLabel);
    if (primaryStat) {
      primaryPercentage = Math.round((primaryStat.value / total) * 100);
    }
  } else if (title === 'Total Revenue' || (!stats && total > 0)) {
    primaryPercentage = 100;
  }

  const radius = 28;
  const circumference = 2 * Math.PI * radius;

  // Calculate segments for multi-colored donut chart
  let segments = [];
  if (stats && total > 0) {
    let cumulativeLength = 0;
    segments = stats.map(stat => {
      const percentage = (stat.value / total) * 100;
      const length = (percentage / 100) * circumference;
      const segment = {
        label: stat.label,
        color: stat.color || 'text-blue-500',
        strokeDasharray: `${length} ${circumference}`,
        strokeDashoffset: -cumulativeLength,
      };
      cumulativeLength += length;
      return segment;
    });
  } else if (title === 'Total Revenue') {
    segments = [{ color: 'text-blue-500', strokeDasharray: `${circumference} ${circumference}`, strokeDashoffset: 0 }];
  }

  return (
    <div className="bg-white border border-slate-200 p-5 xl:p-6 rounded-3xl shadow-sm flex items-center justify-between gap-4 h-full">
      <div className="flex flex-col flex-1 h-full min-w-0 justify-between">
        <div className="flex flex-col mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-slate-400 text-lg">{icon}</span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{title}</span>
          </div>
          <h3 className="text-2xl xl:text-3xl font-black text-slate-900 tracking-tighter leading-none truncate">{total}</h3>
        </div>
        
        {stats && (
           <div className="flex flex-wrap gap-x-4 gap-y-2">
             {stats.map(stat => (
                <div key={stat.label} className="flex flex-col">
                  <span className={`text-[8px] font-bold uppercase tracking-widest mb-0.5 ${stat.color ? stat.color.replace('text-', 'text-opacity-70 text-') : 'text-slate-400'}`}>
                    {stat.label}
                  </span>
                  <span className="text-xs font-bold text-slate-800 leading-none">{stat.value}</span>
                </div>
             ))}
           </div>
        )}
      </div>

      {/* Circular Progress (Segmented) */}
      <div className="shrink-0 relative flex items-center justify-center">
        <svg className="w-[64px] h-[64px] xl:w-[72px] xl:h-[72px] transform -rotate-90">
          <circle
            className="text-slate-100"
            strokeWidth="6"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="50%"
            cy="50%"
          />
          {segments.map((segment, idx) => (
            <circle
              key={idx}
              className={segment.color}
              strokeWidth="6"
              strokeDasharray={segment.strokeDasharray}
              strokeDashoffset={segment.strokeDashoffset}
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="50%"
              cy="50%"
              style={{ transition: 'stroke-dasharray 1s ease-in-out, stroke-dashoffset 1s ease-in-out' }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] xl:text-xs font-black text-slate-900">{primaryPercentage}%</span>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [liveStats, setLiveStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await adminApi.getStats();
        setLiveStats(res.stats);
      } catch (err) {
        console.error('Stats fetch error:', err);
      }
    };
    fetchStats();
  }, []);

  const handleDateChange = (newDate) => {
    // In a real app, this would fetch data based on the selected date
    console.log("Fetching new stats for date:", newDate);
    // Mocking a refetch
    adminApi.getStats().then(res => {
        if(res && res.stats) setLiveStats(res.stats);
    }).catch(console.error);
  };

  const revenueData = [
    { name: 'Jan', revenue: 15000 },
    { name: 'Feb', revenue: 22000 },
    { name: 'Mar', revenue: 18000 },
    { name: 'Apr', revenue: 28000 },
    { name: 'May', revenue: 24000 },
    { name: 'Jun', revenue: 35000 },
  ];

  const metricsData = [
    {
      id: 'revenue',
      title: 'Total Revenue',
      icon: 'payments',
      total: '₹0',
      stats: null,
      primaryLabel: null
    },
    {
      id: 'vendors',
      title: 'Total Vendors',
      icon: 'storefront',
      total: 0,
      stats: [
        { label: 'Approved', value: 0, color: 'text-emerald-500' },
        { label: 'Rejected', value: 0, color: 'text-rose-500' }
      ],
      primaryLabel: 'Approved'
    },
    {
      id: 'suppliers',
      title: 'Total Suppliers',
      icon: 'local_shipping',
      total: 0,
      stats: [
        { label: 'Approved', value: 0, color: 'text-emerald-500' },
        { label: 'Rejected', value: 0, color: 'text-rose-500' }
      ],
      primaryLabel: 'Approved'
    },
    {
      id: 'geofences',
      title: 'Total Geofences',
      icon: 'map',
      total: 0,
      stats: [
        { label: 'Active Zones', value: 0, color: 'text-indigo-500' }
      ],
      primaryLabel: 'Active Zones'
    },
    {
      id: 'services',
      title: 'Total Services',
      icon: 'category',
      total: 0,
      stats: [
        { label: 'Master Services', value: 0, color: 'text-indigo-500' }
      ],
      primaryLabel: 'Master Services'
    },
    {
      id: 'support_tickets',
      title: 'Support Tickets',
      icon: 'support_agent',
      total: 0,
      stats: [
        { label: 'Resolved', value: 0, color: 'text-emerald-500' },
        { label: 'Unresolved', value: 0, color: 'text-rose-500' }
      ],
      primaryLabel: 'Resolved'
    },
    {
      id: 'advertisements',
      title: 'Advertisements',
      icon: 'campaign',
      total: 0,
      stats: [
        { label: 'Active', value: 0, color: 'text-blue-500' },
        { label: 'Inactive', value: 0, color: 'text-slate-400' }
      ],
      primaryLabel: 'Active'
    },
    {
      id: 'products',
      title: 'Total Products',
      icon: 'inventory_2',
      total: 0,
      stats: [
        { label: 'Active', value: 0, color: 'text-emerald-500' },
        { label: 'Out of Stock', value: 0, color: 'text-rose-500' }
      ],
      primaryLabel: 'Active'
    },
    {
      id: 'career_requests',
      title: 'Career Requests',
      icon: 'work',
      total: 0,
      stats: [
        { label: 'Pending', value: 0, color: 'text-amber-500' },
        { label: 'Reviewed', value: 0, color: 'text-emerald-500' }
      ],
      primaryLabel: 'Reviewed'
    },
    {
      id: 'service_requests',
      title: 'Service Requests',
      icon: 'assignment',
      total: 0,
      stats: [
        { label: 'Pending', value: 0, color: 'text-amber-500' },
        { label: 'Approved', value: 0, color: 'text-emerald-500' },
        { label: 'Rejected', value: 0, color: 'text-rose-500' }
      ],
      primaryLabel: 'Approved'
    }
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50/50 pb-20">
      <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6">
        
        {/* Dynamic Header */}
        <DashboardHeader onDateChange={handleDateChange} />

        {/* Metric Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {metricsData.map(metric => (
            <MetricBox key={metric.id} {...metric} />
          ))}
        </div>

        {/* Middle Section: Revenue Graph + Storage Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Revenue Graph Section */}
            <div className="bg-white border border-slate-200 p-6 xl:p-8 rounded-[2rem] shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col">
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Revenue Trend</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Monthly Platform Revenue</span>
                </div>
                <select className="bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl outline-none cursor-pointer">
                  <option>6 Months</option>
                  <option>1 Year</option>
                  <option>All Time</option>
                </select>
              </div>
              
              <div className="flex-1 min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} dx={-10} tickFormatter={(value) => `₹${value.toLocaleString()}`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}
                      itemStyle={{ color: '#0f172a', fontWeight: 900 }}
                      labelStyle={{ color: '#64748b', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}
                      formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="lg:col-span-1">
            <StorageWidget />
          </div>
        </div>

        {/* Welcome Section */}
        <div className="bg-white p-12 rounded-[2rem] border border-slate-100 shadow-[0_15px_40px_rgba(0,0,0,0.02)] text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-slate-300">dashboard</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Welcome to Admin Dashboard</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest max-w-sm mx-auto">Select an option from the sidebar to manage your platform operations.</p>
        </div>
      </div>
    </div>
  );
}
