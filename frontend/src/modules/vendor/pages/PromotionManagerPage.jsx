import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Tag,
  Plus,
  Percent,
  Calendar,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit3,
  Play,
  Pause,
  Copy,
  Check,
  Layers,
  ShieldCheck,
  X,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  promotionApi,
  authApi,
  vendorMasterSupplyApi,
  BASE_URL,
} from "../../../lib/api";
import toast from "react-hot-toast";

const PromotionManagerPage = () => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [promos, setPromos] = useState([]);
  const [editingPromo, setEditingPromo] = useState(null);
  const [services, setServices] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [copiedCode, setCopiedCode] = useState(null);

  const vendorId = useMemo(() => {
    const vendorDataRaw =
      localStorage.getItem("vendorData") ||
      localStorage.getItem("supplierData") ||
      localStorage.getItem("user") ||
      localStorage.getItem("userData") ||
      "{}";
    const vendorData = JSON.parse(vendorDataRaw);
    const id =
      vendorData._id ||
      vendorData.id ||
      vendorData.user?._id ||
      vendorData.user?.id ||
      localStorage.getItem("vendor_id") ||
      localStorage.getItem("supplier_id");
    return id ? String(id) : null;
  }, []);

  const [formData, setFormData] = useState({
    title: "",
    code: "",
    discountType: "Percentage",
    discountValue: 0,
    minOrderValue: 0,
    usageLimit: 100,
    expiryDate: "",
    start_date: new Date().toISOString().split("T")[0],
    scope_type: "GLOBAL_ORDER",
    selected_services: [],
    is_exclusive_window_eligible: true,
  });

  const activePromos = useMemo(() => {
    if (!Array.isArray(promos)) return [];
    return promos.filter(
      (p) => (p.approval_status || "APPROVED") === "APPROVED",
    );
  }, [promos]);

  const pendingPromos = useMemo(() => {
    if (!Array.isArray(promos)) return [];
    return promos.filter(
      (p) => (p.approval_status || "APPROVED") !== "APPROVED",
    );
  }, [promos]);

  const filteredPromos = activeTab === "active" ? activePromos : pendingPromos;

  useEffect(() => {
    if (vendorId) {
      fetchPromos();
      fetchServices();
    }
  }, [vendorId]);

  const fetchPromos = async () => {
    try {
      setLoading(true);
      const data = await promotionApi.getVendorPromos(vendorId);
      setPromos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch promos error:", err);
      toast.error("Failed to load promotions");
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const profile = await authApi.getProfile(vendorId);
      if (
        profile?.shopDetails?.services &&
        profile.shopDetails.services.length > 0
      ) {
        const approvedServices = profile.shopDetails.services
          .filter((s) => s.status === "approved" || !s.status)
          .map((s) => ({
            _id: s.id || s._id,
            name: s.name,
            icon: s.icon,
          }));
        setServices(approvedServices);
      } else {
        try {
          const phone = profile?.phone || "";
          const supplierCode = `SUP-${phone ? phone.slice(-4) : "001"}`;
          const res = await vendorMasterSupplyApi.getAll({
            supplierId: supplierCode,
          });
          const supplyItems = Array.isArray(res)
            ? res
            : res?.data || res?.supplies || [];
          if (supplyItems.length > 0) {
            setServices(
              supplyItems.map((s) => ({
                _id: s._id || s.id,
                name: s.name || s.itemName || s.productName,
                icon: s.image || s.icon,
              })),
            );
          } else {
            setServices([]);
          }
        } catch {
          setServices([]);
        }
      }
    } catch (e) {
      console.error("Fetch services error:", e);
    }
  };

  const triggerAutogenerateCode = async () => {
    if (!vendorId) return;
    try {
      const data = await promotionApi.autogenerateCode(vendorId);
      if (data?.code) {
        setFormData((prev) => ({ ...prev, code: data.code }));
      }
    } catch (err) {
      console.error("Autogenerate Code failed:", err);
    }
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied code "${code}"`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleEditClick = (promo) => {
    setEditingPromo(promo);
    setFormData({
      title: promo.title,
      code: promo.code,
      discountType:
        promo.discountType === "Flat" || promo.discount_type === "FLAT_AMOUNT"
          ? "Flat"
          : "Percentage",
      discountValue:
        promo.discountValue !== undefined
          ? promo.discountValue
          : promo.discount_value || 0,
      minOrderValue:
        promo.minOrderValue !== undefined
          ? promo.minOrderValue
          : promo.min_order_value || 0,
      usageLimit: promo.usageLimit || 100,
      expiryDate: promo.expiryDate
        ? new Date(promo.expiryDate).toISOString().split("T")[0]
        : "",
      start_date: promo.start_date
        ? new Date(promo.start_date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      scope_type: promo.scope_type || "GLOBAL_ORDER",
      selected_services: Array.isArray(promo.selected_services)
        ? promo.selected_services.map((s) => s._id || s)
        : [],
      is_exclusive_window_eligible: promo.is_exclusive_window_eligible ?? true,
    });
    setIsCreating(true);
  };

  const handleCreateOrUpdate = async () => {
    try {
      if (
        !formData.code ||
        formData.discountValue === undefined ||
        !formData.expiryDate
      ) {
        toast.error(
          "Please fill all mandatory fields (Code, Value, Expiry Date)",
        );
        return;
      }

      const expiryDate = new Date(formData.expiryDate);
      expiryDate.setHours(23, 59, 59, 999);

      let geofence_id = null;
      try {
        const profileRes = await authApi.getProfile(vendorId);
        const lat = profileRes?.location?.lat;
        const lng = profileRes?.location?.lng;
        if (lat && lng && lat !== 0 && lng !== 0) {
          const geoRes = await fetch(
            `${BASE_URL}/geofence/check-availability?lat=${lat}&lng=${lng}`,
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.available && geoData.areaId) {
              geofence_id = geoData.areaId;
            }
          }
        }
      } catch (err) {
        console.error("Error fetching geofence for promotion:", err);
      }

      const payload = {
        ...formData,
        title: formData.code,
        vendorId,
        expiryDate,
        geofence_id,
        discount_type:
          formData.discountType === "Flat" ? "FLAT_AMOUNT" : "PERCENTAGE",
        discount_value: Number(formData.discountValue),
        min_order_value: Number(formData.minOrderValue),
        scope_type: formData.scope_type,
        selected_services:
          formData.scope_type === "SELECTED_SERVICES"
            ? formData.selected_services
            : [],
        is_exclusive_window_eligible: formData.is_exclusive_window_eligible,
      };

      if (!payload.vendorId) {
        toast.error("Vendor ID not found. Please re-login.");
        return;
      }

      if (editingPromo) {
        await promotionApi.update(editingPromo._id, payload);
        toast.success("Promotion updated successfully!");
      } else {
        await promotionApi.create(payload);
        toast.success("Promotion created successfully! Sent for review.");
      }

      setIsCreating(false);
      setEditingPromo(null);
      setFormData({
        title: "",
        code: "",
        discountType: "Percentage",
        discountValue: 0,
        minOrderValue: 0,
        usageLimit: 100,
        expiryDate: "",
        start_date: new Date().toISOString().split("T")[0],
        scope_type: "GLOBAL_ORDER",
        selected_services: [],
        is_exclusive_window_eligible: true,
      });
      fetchPromos();
    } catch (err) {
      toast.error(err.message || "Error saving promotion");
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await promotionApi.toggleStatus(id);
      toast.success("Promotion status updated");
      fetchPromos();
    } catch (err) {
      console.error("Toggle error:", err);
      toast.error("Failed to change status");
    }
  };

  return (
    <div className="bg-transparent text-slate-900 min-h-screen pb-32 flex flex-col font-body antialiased">
      {/* Top Navigation Header */}
      <header className="bg-white/85 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 flex items-center justify-center transition-colors shadow-sm shrink-0 cursor-pointer"
              title="Go Back">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600 shrink-0" />
                <span>Promotions & Campaigns</span>
              </h1>
              <p className="text-xs text-slate-500 truncate hidden sm:block">
                Create discount codes to increase customer volume and repeat
                orders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {promos.length > 0 && (
              <button
                onClick={() => setEditMode(!editMode)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  editMode
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}>
                <Edit3 className="w-3.5 h-3.5" />
                <span>{editMode ? "Done" : "Manage"}</span>
              </button>
            )}
            <button
              onClick={async () => {
                setEditingPromo(null);
                setFormData({
                  title: "",
                  code: "",
                  discountType: "Percentage",
                  discountValue: 0,
                  minOrderValue: 0,
                  usageLimit: 100,
                  expiryDate: "",
                  start_date: new Date().toISOString().split("T")[0],
                  scope_type: "GLOBAL_ORDER",
                  selected_services: [],
                  is_exclusive_window_eligible: true,
                });
                setIsCreating(true);
                await triggerAutogenerateCode();
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-slate-900/15 flex items-center gap-1.5 cursor-pointer active:scale-95">
              <Plus className="w-4 h-4" />
              <span>Create Promo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Segmented Filter Tabs */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 mt-6">
        <div className="flex bg-slate-200/70 p-1 rounded-2xl w-full sm:w-fit gap-1">
          <button
            onClick={() => {
              setActiveTab("active");
              setEditMode(false);
            }}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "active"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}>
            <span>Active Campaigns</span>
            <span
              className={`text-[10px] font-black px-2 py-0.2 rounded-full ${activeTab === "active" ? "bg-slate-900 text-white" : "bg-slate-300 text-slate-700"}`}>
              {activePromos.length}
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab("pending");
              setEditMode(false);
            }}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "pending"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}>
            <span>Pending / Revision</span>
            <span
              className={`text-[10px] font-black px-2 py-0.2 rounded-full ${activeTab === "pending" ? "bg-slate-900 text-white" : "bg-slate-300 text-slate-700"}`}>
              {pendingPromos.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 w-full flex-1 mt-6">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Loading Promotions...
            </p>
          </div>
        ) : filteredPromos.length === 0 ? (
          /* Beautiful Engaging Empty State */
          <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-14 text-center shadow-sm max-w-xl mx-auto space-y-6">
            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-50 to-indigo-100/60 rounded-3xl flex items-center justify-center mx-auto text-indigo-600 shadow-inner">
              <Tag className="w-10 h-10" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                {activeTab === "active"
                  ? "No Active Promotions Yet"
                  : "No Pending Review Promotions"}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {activeTab === "active"
                  ? "Create limited-time coupon codes or percentage discounts to attract more walk-in laundry customers and boost off-peak orders."
                  : "All your promotions have been audited. Any new promotions created will appear here while undergoing admin review."}
              </p>
            </div>

            {/* Feature Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Percent className="w-4 h-4" />
                </div>
                <p className="text-[11px] font-bold text-slate-800">
                  % or Flat Off
                </p>
                <p className="text-[10px] text-slate-500">
                  Custom percentage or flat cash discounts
                </p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <p className="text-[11px] font-bold text-slate-800">
                  Minimum Order
                </p>
                <p className="text-[10px] text-slate-500">
                  Set MOV thresholds to protect profit margins
                </p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <p className="text-[11px] font-bold text-slate-800">
                  Exclusive Window
                </p>
                <p className="text-[10px] text-slate-500">
                  120-second priority order access
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={async () => {
                  setEditingPromo(null);
                  setIsCreating(true);
                  await triggerAutogenerateCode();
                }}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-slate-900/20 active:scale-95 cursor-pointer inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Create Your First Promotion</span>
              </button>
            </div>
          </div>
        ) : (
          /* Promotions Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {filteredPromos.map((promo) => {
              const isFlat =
                promo.discountType === "Flat" ||
                promo.discount_type === "FLAT_AMOUNT";
              const discountDisplay = isFlat
                ? `₹${promo.discountValue || promo.discount_value} OFF`
                : `${promo.discountValue || promo.discount_value}% OFF`;
              const mov = promo.minOrderValue || promo.min_order_value || 0;
              const currentUsage = promo.currentUsage || 0;
              const usageLimit = promo.usageLimit || 100;
              const usagePercent = Math.min(
                100,
                Math.round((currentUsage / usageLimit) * 100),
              );
              const isApproved = promo.approval_status === "APPROVED";
              const isRejected = promo.approval_status === "REJECTED";
              const isActive = promo.status === "Active";

              return (
                <motion.div
                  key={promo._id}
                  layout
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
                  {/* Coupon Top Header */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            isApproved
                              ? "bg-emerald-100 text-emerald-800"
                              : isRejected
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                          }`}>
                          {promo.approval_status || "PENDING"}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            isActive
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                          {promo.status}
                        </span>
                      </div>

                      {promo.is_exclusive_window_eligible && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Zap className="w-3 h-3 text-indigo-600" />
                          Priority 120s
                        </span>
                      )}
                    </div>

                    {/* Main Promo Details */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-2xl font-black text-slate-900 tracking-tight">
                          {discountDisplay}
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {mov > 0
                            ? `Valid on orders over ₹${mov}`
                            : "No minimum order required"}
                        </p>
                      </div>

                      {/* Promo Code Badge with Copy */}
                      <button
                        onClick={() => handleCopyCode(promo.code)}
                        className="group bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl px-3 py-2 text-center transition-colors cursor-pointer flex items-center gap-1.5"
                        title="Copy Promo Code">
                        <span className="font-mono text-xs font-black text-slate-800 tracking-wider">
                          {promo.code}
                        </span>
                        {copiedCode === promo.code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0" />
                        )}
                      </button>
                    </div>

                    {/* Rejection Alert */}
                    {isRejected && promo.rejection_reason && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-rose-800 text-xs">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Reason: </span>
                          <span>{promo.rejection_reason}</span>
                        </div>
                      </div>
                    )}

                    {/* Scope & Dates */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        {promo.scope_type === "SELECTED_SERVICES"
                          ? `${promo.selected_services?.length || 0} Services`
                          : "Storewide (All)"}
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Expires{" "}
                        {new Date(promo.expiryDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Progress & Actions Footer */}
                  <div className="bg-slate-50/80 border-t border-slate-100 p-4 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600">
                        <span>Usage</span>
                        <span>
                          {currentUsage} / {usageLimit} redemptions
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all"
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    </div>

                    {editMode && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleToggleStatus(promo._id)}
                          className="flex-1 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
                          {isActive ? (
                            <>
                              <Pause className="w-3.5 h-3.5 text-amber-600" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Resume</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleEditClick(promo)}
                          className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create / Edit Promo Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 my-8 max-h-[90vh] overflow-y-auto relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  {editingPromo ? "Edit Promotion" : "Create New Promotion"}
                </h3>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setEditingPromo(null);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Discount Code */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700">
                      Promo Code
                    </label>
                    {!editingPromo && (
                      <button
                        type="button"
                        onClick={triggerAutogenerateCode}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer">
                        <Sparkles className="w-3 h-3" />
                        <span>Auto-generate</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="e.g. SUMMER20"
                    disabled={!!editingPromo}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white uppercase tracking-wider"
                  />
                </div>

                {/* Discount Type & Value */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Discount Type
                    </label>
                    <select
                      value={formData.discountType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discountType: e.target.value,
                        })
                      }
                      disabled={!!editingPromo}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-indigo-500 cursor-pointer">
                      <option value="Percentage">Percentage (% Off)</option>
                      <option value="Flat">Flat Amount (₹ Off)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      {formData.discountType === "Flat"
                        ? "Discount Value (₹)"
                        : "Discount Value (%)"}
                    </label>
                    <input
                      type="number"
                      value={formData.discountValue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discountValue: Number(e.target.value),
                        })
                      }
                      placeholder="20"
                      min="0"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* MOV & Usage Limit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Min. Order Value (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.minOrderValue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minOrderValue: Number(e.target.value),
                        })
                      }
                      placeholder="0"
                      min="0"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Total Usage Limit
                    </label>
                    <input
                      type="number"
                      value={formData.usageLimit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          usageLimit: Number(e.target.value),
                        })
                      }
                      placeholder="100"
                      min="1"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData({ ...formData, start_date: e.target.value })
                      }
                      disabled={!!editingPromo}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) =>
                        setFormData({ ...formData, expiryDate: e.target.value })
                      }
                      disabled={!!editingPromo}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Scope */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Applicable Services
                  </label>
                  <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        !editingPromo &&
                        setFormData({ ...formData, scope_type: "GLOBAL_ORDER" })
                      }
                      className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        formData.scope_type === "GLOBAL_ORDER"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}>
                      Storewide (All Services)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        !editingPromo &&
                        setFormData({
                          ...formData,
                          scope_type: "SELECTED_SERVICES",
                        })
                      }
                      className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        formData.scope_type === "SELECTED_SERVICES"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}>
                      Specific Services
                    </button>
                  </div>
                </div>

                {formData.scope_type === "SELECTED_SERVICES" && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 max-h-40 overflow-y-auto">
                    <p className="text-[11px] font-bold text-slate-500">
                      Select eligible services:
                    </p>
                    {services.map((s) => {
                      const id = s._id || s.id;
                      const isChecked = formData.selected_services.includes(id);
                      return (
                        <label
                          key={id}
                          className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={!!editingPromo}
                            onChange={() => {
                              if (editingPromo) return;
                              const nextSelected = isChecked
                                ? formData.selected_services.filter(
                                    (sid) => sid !== id,
                                  )
                                : [...formData.selected_services, id];
                              setFormData({
                                ...formData,
                                selected_services: nextSelected,
                              });
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{s.name || s.itemName}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Exclusive window */}
                <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_exclusive_window_eligible}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_exclusive_window_eligible: e.target.checked,
                      })
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <p className="font-bold text-slate-900 text-xs">
                      Priority 120s Dispatch Window
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Prioritize customer orders placed with this promotion
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleCreateOrUpdate}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-slate-900/15 transition-all cursor-pointer active:scale-98">
                  {editingPromo ? "Save Changes" : "Launch Promotion"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PromotionManagerPage;
