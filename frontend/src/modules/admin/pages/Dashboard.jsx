import React, { useCallback, useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import PageHeader from "../components/common/PageHeader";
import { useNavigate } from "react-router-dom";
import { dashboardApi, adminApi } from "../../../lib/api";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { FilterLabel } from "../components/common/FilterLabel";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const MetricCard = ({ label, value, note, icon }) => (
  <div className="bg-white border border-slate-200/80 p-6 rounded-[2rem] shadow-sm flex items-center justify-between">
    <div className="space-y-1 min-w-0">
      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
      <h3 className="text-3xl font-black text-slate-900 truncate">{value}</h3>
      <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{note}</span>
    </div>
    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
      <span className="material-symbols-outlined text-[24px]">{icon}</span>
    </div>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [, setFilterLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarCounts, setSidebarCounts] = useState(null);

  // Global Filters State
  const [channel, setChannel] = useState("All");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedPincode, setSelectedPincode] = useState("");
  const [selectedGeofence, setSelectedGeofence] = useState("");
  const [timeRange, setTimeRange] = useState("Last 30 Days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Cascading geography mappings
  const [geographyMap, setGeographyMap] = useState({
    stateCityMap: {},
    cityPincodeMap: {},
    geofenceMap: {},
    unmappedCities: [],
  });

  // Populated only from the database (see fetchFilters); no hardcoded states.
  const [statesList, setStatesList] = useState([]);

  // Fetch cascading dropdown filters
  const fetchFilters = async () => {
    try {
      setFilterLoading(true);
      const res = await dashboardApi.getFilters();
      if (res && res.success && res.data) {
        setGeographyMap({
          stateCityMap: res.data.stateCityMap || {},
          cityPincodeMap: res.data.cityPincodeMap || {},
          geofenceMap: res.data.geofenceMap || {},
          unmappedCities: res.data.unmappedCities || [],
        });
        setStatesList(res.data.states || []);
      }
    } catch (err) {
      console.error("Failed to fetch filters:", err);
    } finally {
      setFilterLoading(false);
    }
  };

  // Dynamically calculate cascading filters
  const availableCities = useMemo(() => {
    if (!selectedState) {
      const allCities = [...geographyMap.unmappedCities];
      Object.values(geographyMap.stateCityMap).forEach((list) =>
        allCities.push(...list),
      );
      return Array.from(new Set(allCities)).sort();
    }
    return geographyMap.stateCityMap[selectedState] || [];
  }, [selectedState, geographyMap.stateCityMap, geographyMap.unmappedCities]);

  const availablePincodes = useMemo(() => {
    if (!selectedCity) {
      const allPincodes = [];
      Object.values(geographyMap.cityPincodeMap).forEach((list) =>
        allPincodes.push(...list),
      );
      return Array.from(new Set(allPincodes)).sort();
    }
    return geographyMap.cityPincodeMap[selectedCity] || [];
  }, [selectedCity, geographyMap.cityPincodeMap]);

  const availableGeofences = useMemo(() => {
    if (!selectedCity) {
      const allGeofences = [];
      Object.values(geographyMap.geofenceMap).forEach((list) =>
        allGeofences.push(...list),
      );
      return Array.from(new Set(allGeofences)).sort();
    }
    return geographyMap.geofenceMap[selectedCity] || [];
  }, [selectedCity, geographyMap.geofenceMap]);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
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
        endDate,
      };
      const res = await dashboardApi.getAnalytics(activeFilters);
      if (res && res.success && res.data) {
        setAnalytics(res.data);
      }
    } catch (err) {
      toast.error("Failed to retrieve operational metrics");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    channel,
    selectedState,
    selectedCity,
    selectedPincode,
    selectedGeofence,
    timeRange,
    startDate,
    endDate,
  ]);

  const fetchSidebarCounts = async () => {
    try {
      const counts = await adminApi.getSidebarCounts();
      if (counts) setSidebarCounts(counts);
    } catch (e) {
      console.error("Failed to fetch sidebar counts:", e);
    }
  };

  useEffect(() => {
    fetchFilters();
    fetchSidebarCounts();
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchSidebarCounts();
  }, [fetchAnalytics]);

  // Computed Pending Partner Verification numbers
  const pendingVendors =
    analytics?.pendingVerifications?.vendors ??
    sidebarCounts?.vendorRegistrations ??
    0;
  const pendingSuppliers =
    analytics?.pendingVerifications?.suppliers ??
    sidebarCounts?.supplierRegistrations ??
    0;
  const totalPendingVerifications =
    analytics?.pendingVerifications?.total ??
    sidebarCounts?.registrations ??
    pendingVendors + pendingSuppliers;

  // Financial reconciliation chart data formatting
  const financialTrendData = (() => {
    if (!analytics?.financials) return [];
    if (analytics?.monthlyTrend && analytics.monthlyTrend.length > 0) {
      return analytics.monthlyTrend;
    }
    return [
      {
        month: "Current",
        Revenue: analytics.financials.grossRevenue,
        Payouts: analytics.financials.vendorPayouts,
        Logistics: analytics.financials.logisticsPayouts,
        Profit: analytics.financials.netProfit,
        TransactionValue: analytics.financials.grossRevenue,
        PartnerPayable:
          (analytics.financials.b2c?.vendorPayable || 0) +
          (analytics.financials.b2b?.directSupplierPayable || 0),
        LogisticsCharges: analytics.financials.logisticsPayouts,
        PlatformRevenue: analytics.financials.netProfit,
      },
    ];
  })();

  const waterfallData = (() => {
    if (!analytics?.financials) return [];
    if (channel === "B2B") {
      return [
        { name: "Business Customer Orders", value: analytics.financials.b2b?.businessCustomerOrderValue || 0, color: "#2563eb" },
        { name: "Vendor Service Payable", value: -(analytics.financials.b2b?.businessCustomerVendorPayable || 0), color: "#f97316" },
        { name: "Supplier Orders", value: analytics.financials.b2b?.supplierOrderValue || 0, color: "#3b82f6" },
        { name: "Direct to Suppliers", value: -(analytics.financials.b2b?.directSupplierPayable || 0), color: "#f59e0b" },
        { name: "Platform Revenue", value: analytics.financials.netProfit || 0, color: "#10b981" },
        { name: "Fees Pending", value: analytics.financials.b2b?.platformFeesPending || 0, color: "#8b5cf6" },
      ];
    }
    return [
      {
        name: "Gross Revenue",
        value: analytics.financials.grossRevenue,
        color: "#3b82f6",
      },
      {
        name: channel === "All" ? "Partner Payable" : "Vendor Payable",
        value: -(
          analytics.financials.vendorPayouts +
          (channel === "All" ? analytics.financials.b2b?.directSupplierPayable || 0 : 0)
        ),
        color: "#f59e0b",
      },
      {
        name: "Logistics Charges",
        value: -analytics.financials.logisticsPayouts,
        color: "#8b5cf6",
      },
      {
        name: "Refunds Outflow",
        value: -analytics.financials.refunds,
        color: "#ef4444",
      },
      {
        name: "Platform Revenue",
        value: analytics.financials.netProfit,
        color: "#10b981",
      },
    ];
  })();

  // Recharts cell colors helper
  const DONUT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const isB2B = channel === "B2B";
  const isB2C = channel === "B2C";
  const overviewCards = isB2B
    ? [
        { label: "Business customer orders", value: money(analytics?.financials?.b2b?.businessCustomerOrderValue), note: `${analytics?.overview?.orderingCustomers || 0} ordering businesses`, icon: "business_center" },
        { label: "Supplier order value", value: money(analytics?.financials?.b2b?.supplierOrderValue), note: "Paid directly to suppliers", icon: "inventory_2" },
        { label: "B2B platform revenue", value: money(analytics?.overview?.platformRevenue), note: `Service margin + ${money(analytics?.financials?.b2b?.platformFeesCollected)} supply fees`, icon: "payments" },
        { label: "Active B2B transactions", value: analytics?.overview?.activeB2BOrders || 0, note: `${analytics?.overview?.activeBusinessCustomerOrders || 0} business service · ${analytics?.overview?.activeSupplyOrders || 0} supply`, icon: "local_shipping" },
      ]
    : isB2C
      ? [
          { label: "B2C order value", value: money(analytics?.financials?.b2c?.orderValue), note: `${analytics?.financials?.trendMoM || "0%"} vs prior period`, icon: "monetization_on" },
          { label: "Active B2C orders", value: analytics?.overview?.activeB2COrders || 0, note: `${analytics?.orderLifecycleB2C?.totalSubmitted || 0} placed in period`, icon: "shopping_basket" },
          { label: "Ordering customers", value: analytics?.overview?.orderingCustomers || 0, note: `${analytics?.overview?.totalCustomers || 0} total customers`, icon: "person" },
          { label: "Open B2C tickets", value: analytics?.helpdesk?.open || 0, note: `${analytics?.helpdesk?.inProgress || 0} in progress`, icon: "support_agent" },
        ]
      : [
          { label: "Combined transaction value", value: money(analytics?.overview?.transactionValue), note: `${analytics?.financials?.trendMoM || "0%"} vs prior period`, icon: "monetization_on" },
          { label: "Spinzyt platform revenue", value: money(analytics?.overview?.platformRevenue), note: "B2C + collected B2B fees", icon: "account_balance" },
          { label: "Active orders", value: (analytics?.overview?.activeB2COrders || 0) + (analytics?.overview?.activeB2BOrders || 0), note: `${analytics?.overview?.activeB2COrders || 0} B2C · ${analytics?.overview?.activeB2BOrders || 0} B2B`, icon: "local_shipping" },
          { label: "Open support cases", value: analytics?.helpdesk?.open || 0, note: `${analytics?.helpdesk?.inProgress || 0} in progress`, icon: "support_agent" },
        ];

  const lifecycleSteps = isB2B
    ? [
        { label: "Business service orders", value: analytics?.customerServiceLifecycle?.totalSubmitted, color: "bg-blue-500" },
        { label: "Accepted by vendor", value: analytics?.customerServiceLifecycle?.totalAccepted, color: "bg-indigo-500" },
        { label: "In processing", value: analytics?.customerServiceLifecycle?.inProgress, color: "bg-amber-500" },
        { label: "Ready for dispatch", value: analytics?.customerServiceLifecycle?.readyForDispatch, color: "bg-purple-500" },
      ]
    : [
        { label: "Total submitted", value: analytics?.orderLifecycleB2C?.totalSubmitted, color: "bg-blue-500" },
        { label: "Claimed / accepted", value: analytics?.orderLifecycleB2C?.totalAccepted, color: "bg-indigo-500" },
        { label: "In processing", value: analytics?.orderLifecycleB2C?.inProgress, color: "bg-amber-500" },
        { label: "Ready for dispatch", value: analytics?.orderLifecycleB2C?.readyForDispatch, color: "bg-purple-500" },
      ];
  const lifecycleBase = Number(lifecycleSteps[0]?.value) || 1;
  const partnerComposition = isB2B
    ? [
        { name: "Business customers", value: analytics?.customerAnalytics?.businessCount || 0 },
        { name: "Vendors", value: analytics?.vendorPerformance?.totalVendors || 0 },
        { name: "Suppliers", value: analytics?.supplierAnalytics?.totalSuppliers || 0 },
      ]
    : isB2C
      ? [
          { name: "Individual customers", value: analytics?.customerAnalytics?.individualCount || 0 },
        ]
      : [
          { name: "Customers", value: analytics?.customerAnalytics?.totalCustomers || 0 },
          { name: "Vendors", value: analytics?.vendorPerformance?.totalVendors || 0 },
          { name: "Suppliers", value: analytics?.supplierAnalytics?.totalSuppliers || 0 },
        ];
  const cohortData = isB2B
    ? [
        { name: "Ordering businesses", count: analytics?.overview?.orderingCustomers || 0 },
        { name: "Ordering vendors", count: analytics?.overview?.orderingVendors || 0 },
        { name: "Never ordered", count: analytics?.vendorPerformance?.neverOrderedB2B || 0 },
        { name: "Active suppliers", count: analytics?.overview?.participatingSuppliers || 0 },
      ]
    : [
        { name: "Unspecified", count: analytics?.vendorPerformance?.cohorts?.local || 0 },
        { name: "Proprietorship", count: analytics?.vendorPerformance?.cohorts?.proprietorship || 0 },
        { name: "Partnership", count: analytics?.vendorPerformance?.cohorts?.partnership || 0 },
        { name: "Pvt Ltd", count: analytics?.vendorPerformance?.cohorts?.pvtLtd || 0 },
        { name: "Franchise", count: analytics?.vendorPerformance?.cohorts?.franchise || 0 },
      ];
  const topRatedPartners = isB2B
    ? analytics?.supplierAnalytics?.topSuppliers || []
    : analytics?.vendorPerformance?.topVendors || [];
  const bottomRatedPartners = isB2B
    ? analytics?.supplierAnalytics?.bottomSuppliers || []
    : analytics?.vendorPerformance?.bottomVendors || [];
  const slaData = isB2B
    ? [
        { name: "Acceptance >1h", value: analytics?.orderLifecycleB2B?.slaBreach1h || 0 },
        { name: "Fulfilment >48h", value: analytics?.orderLifecycleB2B?.slaBreach48h || 0 },
        { name: "Late delivery", value: analytics?.orderLifecycleB2B?.late || 0 },
        { name: "Cancelled", value: analytics?.orderLifecycleB2B?.cancelled || 0 },
      ]
    : [
        { name: "Logistics Bounces", value: analytics?.orderLifecycleB2C?.logisticsBounces || 0 },
        { name: "Pickup Window Delay", value: analytics?.orderLifecycleB2C?.violations?.pickup || 0 },
        { name: "Drop-off Window Delay", value: analytics?.orderLifecycleB2C?.violations?.dropoff || 0 },
        { name: "Vendor SLA Overruns", value: analytics?.orderLifecycleB2C?.violations?.vendorSla || 0 },
      ];

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">
          Syncing Control Center...
        </p>
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
            <div className="flex flex-col gap-1">
            <FilterLabel label="Channel" info="B2C shows customer laundry orders, B2B shows vendors' supply orders from suppliers, All combines both." />
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit border border-slate-200/50">
              {["All", "B2C", "B2B"].map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${channel === ch ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-slate-900"}`}>
                  {ch === "All" ? "🌐 All" : ch === "B2C" ? "👤 B2C" : "🏢 B2B"}
                </button>
              ))}
            </div>
            </div>
          </div>

          {/* Cascading dropdown selectors */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            <div className="flex flex-col">
              <FilterLabel label="State" className="mb-1 ml-1" info="Limits every figure on the dashboard to vendors and orders in this state. Totals such as clients and vendors count all records there, not just new ones." />
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedCity("");
                  setSelectedPincode("");
                }}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg outline-none cursor-pointer hover:bg-slate-100 transition-colors">
                <option value="">All States</option>
                {statesList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <FilterLabel label="City" className="mb-1 ml-1" info="Limits the dashboard to this city (choose a state first to narrow the list)." />
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setSelectedPincode("");
                }}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg outline-none cursor-pointer hover:bg-slate-100 transition-colors">
                <option value="">All Cities</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <FilterLabel label="Pincode" className="mb-1 ml-1" info="Limits the dashboard to this pincode within the selected city." />
              <select
                value={selectedPincode}
                onChange={(e) => setSelectedPincode(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg outline-none cursor-pointer hover:bg-slate-100 transition-colors">
                <option value="">All Pincodes</option>
                {availablePincodes.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <FilterLabel label="Geofence" className="mb-1 ml-1" info="Limits the dashboard to one service area (geofence) drawn on the map." />
              <select
                value={selectedGeofence}
                onChange={(e) => setSelectedGeofence(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg outline-none cursor-pointer hover:bg-slate-100 transition-colors">
                <option value="">All Geofences</option>
                {availableGeofences.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col col-span-2 md:col-span-1">
              <FilterLabel label="Date range" className="mb-1 ml-1" info="The period used for revenue, orders and new sign-ups. Growth is compared with the previous period of the same length. Overall totals (all clients, all vendors) are not affected." />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg outline-none cursor-pointer hover:bg-slate-100 transition-colors">
                <option>Today</option>
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
                <option>Year-to-Date</option>
                <option>Custom Range</option>
              </select>
            </div>
          </div>

          {/* Custom range calendar inputs */}
          {timeRange === "Custom Range" && (
            <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 w-fit animate-fade-in">
              <div className="flex flex-col">
                <FilterLabel label="Start date" className="mb-1" info="First day of the custom period (included)." />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border border-slate-200 text-[10px] font-bold p-1 px-2 rounded-lg outline-none"
                />
              </div>
              <div className="flex flex-col">
                <FilterLabel label="End date" className="mb-1" info="Last day of the custom period (included)." />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border border-slate-200 text-[10px] font-bold p-1 px-2 rounded-lg outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pending Partner Verifications */}
      {totalPendingVerifications > 0 && (
        <div className="max-w-[1600px] mx-auto w-full px-6 pt-6">
          <div className="bg-white border border-slate-200 rounded-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="w-1.5 h-6 bg-amber-500 rounded-sm shrink-0" />
              <div>
                <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.2em] leading-none mb-1.5">
                  {totalPendingVerifications} Pending Partner Verification
                  {totalPendingVerifications > 1 ? "s" : ""}
                </h3>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest tabular-nums">
                    Vendors{" "}
                    <span className="text-amber-600">{pendingVendors}</span>
                  </span>
                  <span className="h-3 w-px bg-slate-200" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest tabular-nums">
                    Suppliers{" "}
                    <span className="text-orange-600">{pendingSuppliers}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 flex-wrap">
              {pendingVendors > 0 && (
                <button
                  onClick={() => navigate("/admin/vendors/approvals")}
                  className="p-1 px-3 h-7 border border-slate-200 text-[9px] font-bold uppercase tracking-widest rounded-sm bg-white hover:bg-slate-950 hover:text-white transition-all">
                  Vendors ({pendingVendors})
                </button>
              )}
              {pendingSuppliers > 0 && (
                <button
                  onClick={() => navigate("/admin/supplier-requests")}
                  className="p-1 px-3 h-7 border border-slate-200 text-[9px] font-bold uppercase tracking-widest rounded-sm bg-white hover:bg-slate-950 hover:text-white transition-all">
                  Suppliers ({pendingSuppliers})
                </button>
              )}
              <button
                onClick={() =>
                  navigate(
                    pendingVendors > 0
                      ? "/admin/vendors/approvals"
                      : "/admin/supplier-requests",
                  )
                }
                className="p-1 px-3 h-7 text-[9px] font-bold uppercase tracking-widest rounded-sm bg-slate-900 text-white hover:bg-slate-950 transition-all">
                Review Approvals
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Sub-Tabs Panel */}
      <div className="max-w-[1600px] mx-auto w-full px-6 pt-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200/60">
          {[
            { id: "overview", label: "Overview", icon: "dashboard" },
            { id: "users", label: "Partners & Clients", icon: "group" },
            {
              id: "logistics",
              label: "Order Lifecycles",
              icon: "local_shipping",
            },
            { id: "financials", label: "Financial Intel", icon: "payments" },
            { id: "catalogs", label: "Catalogs & Support", icon: "category" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 rounded-t-[1.2rem] font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-400 hover:text-slate-900 border-transparent border-b-slate-100 hover:bg-slate-50"
              }`}>
              <span className="material-symbols-outlined text-[16px]">
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-Tab Dashboards Render */}
      <div className="max-w-[1600px] mx-auto w-full px-6 pt-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
              {overviewCards.map((card) => <MetricCard key={card.label} {...card} />)}
            </div>

            {/* Funnel + Core Chart Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Fulfillment Funnel */}
              <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm lg:col-span-2">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                      Fulfillment Pipeline Funnel
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                      Status drop-offs across order workflow
                    </p>
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">
                    {isB2B ? "Business Customer Funnel" : isB2C ? "B2C Funnel" : "Combined view · Customer funnel"}
                  </span>
                </div>

                <div className="space-y-5">
                  {lifecycleSteps.map((funnel, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-600 tracking-wider">
                        <span>{funnel.label}</span>
                        <span className="tabular-nums font-extrabold">
                          {funnel.value} Orders
                        </span>
                      </div>
                      <div className="h-6 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${Math.min(100, ((Number(funnel.value) || 0) / lifecycleBase) * 100)}%` }}
                          className={`${funnel.color} h-full rounded-full transition-all duration-1000 flex items-center justify-end px-3 text-[8px] font-black text-white`}>
                          {Math.round(
                            (funnel.value /
                              lifecycleBase) *
                              100,
                          )}
                          %
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Storage widget / Quick alerts */}
              <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-4">
                    SLA Violations Alert
                  </h3>
                  <div className="space-y-4">
                    <div className="flex gap-3 items-start p-3 bg-rose-50 border border-rose-100 rounded-2xl">
                      <span className="material-symbols-outlined text-rose-500 text-lg">
                        warning
                      </span>
                      <div>
                        <h4 className="text-[10px] font-black uppercase text-rose-900 tracking-wider">
                          {isB2B ? "Acceptance SLA breaches" : "Logistics Bounces"}
                        </h4>
                        <p className="text-[9px] text-rose-700 font-bold uppercase tracking-wider mt-1">
                          {isB2B
                            ? `${analytics?.orderLifecycleB2B?.slaBreach1h || 0} submitted orders waiting over 1 hour`
                            : `${analytics?.orderLifecycleB2C?.logisticsBounces || 0} orders rejected by logistics partners`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start p-3 bg-amber-50 border border-amber-100 rounded-2xl">
                      <span className="material-symbols-outlined text-amber-500 text-lg">
                        hourglass_bottom
                      </span>
                      <div>
                        <h4 className="text-[10px] font-black uppercase text-amber-900 tracking-wider">
                          {isB2B ? "Fulfilment SLA breaches" : "Immediate Timeouts"}
                        </h4>
                        <p className="text-[9px] text-amber-700 font-bold uppercase tracking-wider mt-1">
                          {isB2B
                            ? `${analytics?.orderLifecycleB2B?.slaBreach48h || 0} accepted orders waiting over 48 hours`
                            : `${analytics?.orderLifecycleB2C?.immediateTimeouts || 0} orders unaccepted for over 5 minutes`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="material-symbols-outlined text-slate-500 text-lg">
                        schedule
                      </span>
                      <div>
                        <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-wider">
                          {isB2B ? "Late supplier orders" : "Dormant Vendors"}
                        </h4>
                        <p className="text-[9px] text-slate-700 font-bold uppercase tracking-wider mt-1">
                          {isB2B
                            ? `${analytics?.orderLifecycleB2B?.late || 0} open orders past promised delivery`
                            : `${analytics?.vendorPerformance?.dormantCount || 0} approved vendors inactive for 5 days`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 text-center">
                  <button
                    onClick={() => setActiveTab("logistics")}
                    className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline">
                    View SLA Details ➔
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            {/* Customer analytics card */}
            <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">
                  {isB2B ? "B2B Partner Composition" : isB2C ? "B2C Customer Composition" : "Platform Participants"}
                </h3>
                <div className="h-[250px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={partnerComposition}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value">
                        {partnerComposition.map((_, idx) => (
                          <Cell key={idx} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 mt-4">
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    {isB2B ? "Never Ordered B2B" : "Churn Risk (30d Inactive)"}
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {isB2B ? analytics?.vendorPerformance?.neverOrderedB2B : analytics?.customerAnalytics?.churnRisk}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    {isB2B ? "30d B2B Inactive" : "Onboarding Friction"}
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {isB2B ? analytics?.vendorPerformance?.dormancy30DaysB2B : analytics?.customerAnalytics?.onboardingFriction}
                  </p>
                </div>
              </div>
            </div>

            {/* Vendor Cohorts analytics */}
            <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">
                {isB2B ? "B2B Partner Activity" : "Vendor Business Types"}
              </h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cohortData}
                    layout="vertical"
                    margin={{ left: 20, right: 10, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={90}
                      tick={{ fill: "#475569", fontSize: 10, fontWeight: 800 }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 mt-4">
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    {isB2B ? "Never Ordered B2B" : "Total Vendors"}
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {isB2B ? analytics?.vendorPerformance?.neverOrderedB2B : analytics?.vendorPerformance?.totalVendors}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    {isB2B ? "30d B2B Inactive" : "Dormant Vendors"}
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {isB2B ? analytics?.vendorPerformance?.dormancy30DaysB2B : analytics?.vendorPerformance?.dormantCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Top/Bottom rating Leaderboards */}
            <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm lg:col-span-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">
                {isB2B ? "Supplier Rating Outliers" : "Vendor Rating Outliers"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Top Vendors */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest bg-emerald-50 px-3 py-1.5 rounded-lg w-fit">
                    Top 5 Highest Rated
                  </h4>
                  <div className="divide-y divide-slate-100">
                    {topRatedPartners.map(
                      (vendor, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center py-3">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {vendor.name}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 bg-emerald-500 text-white rounded text-[10px] font-black">
                            {vendor.rating} ★
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
                {/* Bottom Vendors */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-red-600 tracking-widest bg-red-50 px-3 py-1.5 rounded-lg w-fit">
                    Bottom 5 Lowest Rated
                  </h4>
                  <div className="divide-y divide-slate-100">
                    {bottomRatedPartners.map(
                      (vendor, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center py-3">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {vendor.name}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 bg-red-500 text-white rounded text-[10px] font-black">
                            {vendor.rating} ★
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "logistics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            {/* SLA Delays/Violations */}
            <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">
                  {isB2B ? "B2B Supplier SLA Breakdown" : "B2C Logistics & SLA Breakdown"}
                </h3>
                <div className="h-[250px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={slaData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value">
                        {DONUT_COLORS.map((color, idx) => (
                          <Cell key={idx} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Active order transits progress */}
            <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">
                {isB2B ? "B2B Supply Order Movement" : "B2C Physical Transit"}
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                    <span>{isB2B ? "Supplier dispatches" : "Customer ➔ Vendor Facility"}</span>
                    <span className="font-extrabold text-slate-800">
                      {isB2B ? analytics?.orderLifecycleB2B?.dispatched : analytics?.orderLifecycleB2C?.outboundLogistics} Active
                    </span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          (isB2B ? analytics?.orderLifecycleB2B?.totalPlaced : analytics?.orderLifecycleB2C?.totalSubmitted) > 0
                            ? Math.min(
                                100,
                                Math.round(
                                  (((isB2B ? analytics?.orderLifecycleB2B?.dispatched : analytics?.orderLifecycleB2C?.outboundLogistics) || 0) /
                                    (isB2B ? analytics.orderLifecycleB2B.totalPlaced : analytics.orderLifecycleB2C.totalSubmitted)) *
                                    100,
                                ),
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                    <span>{isB2B ? "Delivered supplier orders" : "Vendor ➔ Customer Home"}</span>
                    <span className="font-extrabold text-slate-800">
                      {isB2B ? analytics?.orderLifecycleB2B?.delivered : analytics?.orderLifecycleB2C?.reverseLogistics} {isB2B ? "Delivered" : "Active Return Transits"}
                    </span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          (isB2B ? analytics?.orderLifecycleB2B?.totalPlaced : analytics?.orderLifecycleB2C?.totalSubmitted) > 0
                            ? Math.min(
                                100,
                                Math.round(
                                  (((isB2B ? analytics?.orderLifecycleB2B?.delivered : analytics?.orderLifecycleB2C?.reverseLogistics) || 0) /
                                    (isB2B ? analytics.orderLifecycleB2B.totalPlaced : analytics.orderLifecycleB2C.totalSubmitted)) *
                                    100,
                                ),
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    {isB2B ? "B2B Processing" : "B2C Processing"}
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {isB2B ? analytics?.orderLifecycleB2B?.inProgress : analytics?.orderLifecycleB2C?.inProgress}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    {isB2B ? "Dispatched" : "Ready / Collection"}
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {isB2B ? analytics?.orderLifecycleB2B?.dispatched : analytics?.orderLifecycleB2C?.readyForDispatch}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    {isB2B ? "Delivered" : "B2B Cycles"}
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {isB2B ? analytics?.orderLifecycleB2B?.delivered : analytics?.orderLifecycleB2B?.totalPlaced}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "financials" && (
          <div className="space-y-6 animate-fade-in">
            {/* Growth trends graph */}
            <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">
                Financial activity for selected period
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={financialTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                    />
                    <YAxis
                      tickFormatter={(val) => `₹${val.toLocaleString()}`}
                      tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                    />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="TransactionValue"
                      name={isB2B ? "Total B2B Transaction Value" : "Transaction Value"}
                      stroke="#3b82f6"
                      strokeWidth={3}
                    />
                    <Line
                      type="monotone"
                      dataKey="PartnerPayable"
                      name={isB2B ? "Vendor + Supplier Payable" : "Partner Payable"}
                      stroke="#f59e0b"
                      strokeWidth={3}
                    />
                    <Line
                      type="monotone"
                      dataKey="LogisticsCharges"
                      name="Logistics Charges"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                    />
                    <Line
                      type="monotone"
                      dataKey="PlatformRevenue"
                      name="Platform Revenue"
                      stroke="#10b981"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue Cost Allocation Waterfall */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm lg:col-span-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">
                  Financial reconciliation (selected period)
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={waterfallData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{
                          fill: "#64748b",
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      />
                      <YAxis
                        tickFormatter={(val) =>
                          `₹${Math.abs(val).toLocaleString()}`
                        }
                        tick={{
                          fill: "#94a3b8",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      />
                      <Tooltip
                        formatter={(value) =>
                          `₹${Math.abs(value).toLocaleString()}`
                        }
                      />
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
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                    Financial Liabilities
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                          {isB2B ? "Platform fees pending" : "Customer Wallet liability"}
                        </p>
                        <p className="text-xl font-black text-slate-900 mt-1">
                          ₹
                          {(isB2B
                            ? analytics?.financials?.b2b?.platformFeesPending
                            : analytics?.financials?.walletLiability
                          )?.toLocaleString()}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-slate-400">
                        account_balance_wallet
                      </span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                          Total refunds processed
                        </p>
                        <p className="text-xl font-black text-slate-900 mt-1">
                          ₹{analytics?.financials.refunds.toLocaleString()}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-slate-400">
                        settings_backup_restore
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] font-bold text-slate-400 uppercase text-center mt-4">
                  {isB2B
                    ? "Supplier invoice amounts are settled directly between vendors and suppliers"
                    : "Liabilities shown separately from collected platform revenue"}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "catalogs" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Service catalog health */}
            <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">
                {isB2B ? "Business Customer Service Catalog" : "Service Catalog (B2C)"}
              </h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: "Active SKUs",
                        count: analytics?.catalogB2C.totalServices,
                      },
                      {
                        name: "Inactive SKUs",
                        count: analytics?.catalogB2C.inactiveServices,
                      },
                    ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#64748b", fontSize: 10, fontWeight: 800 }}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="#474887" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-2xl mt-4">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Pending Catalog Reviews
                </span>
                <span className="px-2.5 py-1 bg-amber-500 text-white rounded-full text-[10px] font-black">
                  {analytics?.catalogB2C.pendingReviews} Action
                </span>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-3">
                Missing price: {analytics?.catalogB2C?.missingPrice || 0} · Missing weight: {analytics?.catalogB2C?.missingWeight || 0}
              </p>
            </div>

            {/* Product catalog B2B */}
            {channel !== "B2C" && <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">
                Supplier Product Catalog (B2B)
              </h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: "Active SKU",
                        count: analytics?.catalogB2B.totalProducts,
                      },
                      {
                        name: "Inactive SKU",
                        count: analytics?.catalogB2B.inactiveProducts,
                      },
                    ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#64748b", fontSize: 10, fontWeight: 800 }}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="#85b49f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-2xl mt-4">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Pending Supplier Reviews
                </span>
                <span className="px-2.5 py-1 bg-amber-500 text-white rounded-full text-[10px] font-black">
                  {analytics?.catalogB2B.pendingReviews} Action
                </span>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-3">
                Missing stock: {analytics?.catalogB2B?.missingStock || 0} · Missing cost: {analytics?.catalogB2B?.missingCost || 0}
              </p>
            </div>}

            {/* ATS pipeline */}
            <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">
                Labor Exchange Pipeline
              </h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: "Corporate",
                        applicants: analytics?.atsLaborExchange?.activeJobs?.admin || 0,
                      },
                      {
                        name: "Vendors",
                        applicants: analytics?.atsLaborExchange?.activeJobs?.vendor || 0,
                      },
                      {
                        name: "Warehouse",
                        applicants: analytics?.atsLaborExchange?.activeJobs?.supplier || 0,
                      },
                    ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#64748b", fontSize: 10, fontWeight: 800 }}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="applicants"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase text-center mt-6">
                Active job requisitions created in the selected period
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm lg:col-span-3">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                  {isB2B ? "B2B Support Cases" : isB2C ? "B2C Support Cases" : "Support Cases"}
                </h3>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Selected period</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ["Open", analytics?.helpdesk?.open, "text-rose-600 bg-rose-50"],
                  ["In progress", analytics?.helpdesk?.inProgress, "text-amber-600 bg-amber-50"],
                  ["Resolved", analytics?.helpdesk?.resolved, "text-emerald-600 bg-emerald-50"],
                  ["Closed", analytics?.helpdesk?.closed, "text-slate-600 bg-slate-50"],
                ].map(([label, value, tone]) => (
                  <div key={label} className={`rounded-2xl p-4 ${tone}`}>
                    <p className="text-[9px] font-black uppercase tracking-wider">{label}</p>
                    <p className="text-2xl font-black mt-1">{value || 0}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sentiment Word Cloud replacement / key terms */}
            <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm lg:col-span-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6">
                {isB2B ? "Supplier Feedback Keyword Analysis" : "Customer Feedback Keyword Analysis"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest bg-emerald-50 px-3 py-1.5 rounded-lg w-fit">
                    Top Positive Keywords
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analytics?.feedbackSentiment?.positiveKeywords?.length >
                    0 ? (
                      analytics.feedbackSentiment.positiveKeywords.map(
                        (word, idx) => (
                          <span
                            key={idx}
                            className="px-3.5 py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100 hover:bg-emerald-100 transition-colors">
                            {word}
                          </span>
                        ),
                      )
                    ) : (
                      <p className="text-xs text-slate-400 font-medium italic">
                        No positive feedback comments recorded yet
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-red-600 tracking-widest bg-red-50 px-3 py-1.5 rounded-lg w-fit">
                    Critical Improvement Flags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analytics?.feedbackSentiment?.criticalKeywords?.length >
                    0 ? (
                      analytics.feedbackSentiment.criticalKeywords.map(
                        (word, idx) => (
                          <span
                            key={idx}
                            className="px-3.5 py-2 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-100 hover:bg-rose-100 transition-colors">
                            {word}
                          </span>
                        ),
                      )
                    ) : (
                      <p className="text-xs text-slate-400 font-medium italic">
                        No critical improvement feedback recorded
                      </p>
                    )}
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
