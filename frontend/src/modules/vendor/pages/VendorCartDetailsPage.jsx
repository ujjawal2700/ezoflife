import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ShoppingBag,
  Truck,
  ShieldCheck,
  Store,
  Clock,
  Sparkles,
  MapPin,
  CreditCard,
  Receipt,
  ChevronRight,
  Edit3,
  CheckCircle2,
  AlertCircle,
  PackageCheck,
  Lock,
} from "lucide-react";
import { b2bOrderApi, authApi } from "../../../lib/api";
import toast from "react-hot-toast";

const parseSupplierInfo = (facilityName, phoneFromItem) => {
  let name = facilityName || "";
  let phone = phoneFromItem || "";

  // Find and strip any 10-digit phone number from the name
  const match = name.match(/\b\d{10}\b/);
  if (match) {
    if (!phone) phone = match[0];
    name = name.replace(match[0], "").trim();
  } else {
    const shortMatch = name.match(/\b\d{4,9}\b/);
    if (shortMatch) {
      if (!phone) phone = shortMatch[0];
      name = name.replace(shortMatch[0], "").trim();
    }
  }

  name = name.replace(/\s+/g, " ").trim();
  return { name, phone };
};

export const calculateVendorCart = (cart, materials) => {
  let subTotal = 0;
  let gstTotal = 0;
  const supplierGroups = {};
  const items = [];

  Object.entries(cart || {}).forEach(([id, qty]) => {
    if (qty > 0) {
      const item = (materials || []).find((m) => m._id === id);
      if (item) {
        const originalWholesale = item.wholesaleRate || item.price || 0;
        const gstPercent = item.gst !== undefined ? item.gst : 18;
        const finalPriceOriginal = item.price || 0;

        const hasBulkDiscount =
          item.bulkThreshold > 0 &&
          qty >= item.bulkThreshold &&
          item.bulkDiscount > 0;
        const wholesaleRate = hasBulkDiscount
          ? originalWholesale - (originalWholesale * item.bulkDiscount) / 100
          : originalWholesale;

        const finalPrice = hasBulkDiscount
          ? finalPriceOriginal - (finalPriceOriginal * item.bulkDiscount) / 100
          : finalPriceOriginal;

        const gstAmount = (wholesaleRate * gstPercent) / 100;
        const basePriceWithGst = wholesaleRate + gstAmount;

        const itemWholesaleTotal = wholesaleRate * qty;
        const itemGstTotal = gstAmount * qty;
        const itemTotalFinal = basePriceWithGst * qty;
        const itemPlatformFee =
          (item.supplierPlatformMultiplier || 0) * itemWholesaleTotal;

        const itemData = {
          ...item,
          qty,
          wholesaleRate,
          totalPrice: itemTotalFinal,
          gstAmount: itemGstTotal,
          materialId: id,
          quantity: qty,
          price: finalPrice,
          basePrice: basePriceWithGst,
          originalWholesale: originalWholesale,
          bulkDiscount: item.bulkDiscount || 0,
          bulkThreshold: item.bulkThreshold || 0,
          hasBulkDiscount: hasBulkDiscount,
        };

        subTotal += itemWholesaleTotal;
        gstTotal += itemGstTotal;
        items.push(itemData);

        const sId = item.supplierId || "default-supplier";
        const itemMov = Number(item.movFreeDelivery) || 0;
        const itemDelivery =
          Number(item.deliveryCharges) > 0
            ? Number(item.deliveryCharges)
            : itemMov > 0
              ? 50
              : 0;

        if (!supplierGroups[sId]) {
          const parsedInfo = parseSupplierInfo(
            item.supplierFacilityName,
            item.supplierPhone,
          );
          supplierGroups[sId] = {
            supplierId: sId,
            supplierName: parsedInfo.name || "Supplier Facility",
            supplierPhone: parsedInfo.phone || "",
            nextDeliveryDate:
              item.nextDeliveryDate ||
              item.deliveryFrequency ||
              "Daily, On-Demand",
            deliveryFrequency: item.deliveryFrequency || "Daily, On-Demand",
            items: [],
            subTotal: 0,
            gstTotal: 0,
            totalAmount: 0,
            platformFeeRaw: 0,
            movFreeDelivery: itemMov,
            deliveryCharges: itemDelivery,
            minSupplierPlatformFee: item.minSupplierPlatformFee || 0,
            maxSupplierPlatformFee:
              item.maxSupplierPlatformFee !== undefined
                ? item.maxSupplierPlatformFee
                : null,
            payableToSupplier: 0,
          };
        } else {
          if (itemMov > supplierGroups[sId].movFreeDelivery) {
            supplierGroups[sId].movFreeDelivery = itemMov;
          }
          if (itemDelivery > supplierGroups[sId].deliveryCharges) {
            supplierGroups[sId].deliveryCharges = itemDelivery;
          }
        }

        supplierGroups[sId].items.push(itemData);
        supplierGroups[sId].subTotal += itemWholesaleTotal;
        supplierGroups[sId].gstTotal += itemGstTotal;
        supplierGroups[sId].totalAmount += itemTotalFinal;
        supplierGroups[sId].platformFeeRaw += itemPlatformFee;
      }
    }
  });

  let deliveryTotal = 0;
  let finalPlatformFeeTotal = 0;
  Object.values(supplierGroups).forEach((group) => {
    let deliveryFee = 0;
    const isBelowThreshold =
      group.movFreeDelivery > 0 && group.subTotal < group.movFreeDelivery;

    if (isBelowThreshold) {
      deliveryFee = group.deliveryCharges > 0 ? group.deliveryCharges : 50;
      deliveryTotal += deliveryFee;
      group.isFreeDelivery = false;
    } else if (group.movFreeDelivery > 0) {
      deliveryFee = 0;
      group.isFreeDelivery = true;
    } else {
      deliveryFee = group.deliveryCharges || 0;
      group.isFreeDelivery = deliveryFee === 0;
    }

    group.effectiveDeliveryFee = deliveryFee;
    group.payableToSupplier = group.subTotal + group.gstTotal + deliveryFee;

    let clampedFee = group.platformFeeRaw;
    if (
      group.minSupplierPlatformFee &&
      clampedFee < group.minSupplierPlatformFee
    ) {
      clampedFee = group.minSupplierPlatformFee;
    }
    if (
      group.maxSupplierPlatformFee !== null &&
      group.maxSupplierPlatformFee !== undefined
    ) {
      if (clampedFee > group.maxSupplierPlatformFee) {
        clampedFee = group.maxSupplierPlatformFee;
      }
    }
    group.platformFeeFinal = clampedFee;
    finalPlatformFeeTotal += clampedFee;
  });

  const calculatedGrandTotal =
    subTotal + gstTotal + finalPlatformFeeTotal + deliveryTotal;
  const totalPayableToSuppliers = subTotal + gstTotal + deliveryTotal;

  return {
    itemSubtotal: subTotal,
    totalGst: gstTotal,
    totalDeliveryCharges: deliveryTotal,
    grandTotal: calculatedGrandTotal,
    payableToSupplier: totalPayableToSuppliers,
    totalPlatformFee: finalPlatformFeeTotal,
    orderItems: items,
    groupedCarts: Object.values(supplierGroups),
  };
};

const VendorCartDetailsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // State from route
  const { cart = {}, materials = [], vendorData = {} } = location.state || {};

  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(vendorData);

  useEffect(() => {
    const loadProfile = async () => {
      const vId = vendorData._id || vendorData.id;
      if (!vId) return;
      try {
        const profile = await authApi.getProfile(vId);
        if (profile) {
          setProfileData(profile);
          localStorage.setItem("vendorData", JSON.stringify(profile));
          if (localStorage.getItem("user")) {
            localStorage.setItem("user", JSON.stringify(profile));
          }
          if (localStorage.getItem("userData")) {
            localStorage.setItem("userData", JSON.stringify(profile));
          }
        }
      } catch (err) {
        console.error("Failed to load vendor profile:", err);
      }
    };
    loadProfile();
  }, [vendorData]);

  const {
    itemSubtotal,
    totalGst,
    totalDeliveryCharges,
    grandTotal,
    totalPlatformFee,
    payableToSupplier,
    orderItems,
    groupedCarts,
  } = useMemo(() => calculateVendorCart(cart, materials), [cart, materials]);

  // Handle empty cart state
  if (orderItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-base font-black uppercase tracking-wider text-slate-800">
          Your Cart is Empty
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Please select materials from the B2B catalog to proceed with
          procurement.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95">
          Return to Catalog
        </button>
      </div>
    );
  }

  let city =
    profileData.shopDetails?.city ||
    profileData.address_city ||
    profileData.city ||
    "";
  let pincode =
    profileData.shopDetails?.pincode ||
    profileData.address_pincode ||
    profileData.pincode ||
    "";
  const shippingAddress =
    profileData.shopDetails?.address ||
    profileData.address ||
    `${city}, ${pincode}`;

  if (!pincode && shippingAddress) {
    const pinMatch = shippingAddress.match(/\b\d{6}\b/);
    if (pinMatch) {
      pincode = pinMatch[0];
    }
  }

  if (!pincode) {
    pincode = "452001";
  }
  if (!city || city === "Unknown") {
    city = "Indore";
  }

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    const loadingToast = toast.loading("Placing B2B requests...");
    setLoading(true);
    try {
      const payload = {
        vendorId: profileData._id || profileData.id,
        items: orderItems,
        totalAmount: payableToSupplier,
        totalPlatformFee: totalPlatformFee,
        subTotal: itemSubtotal,
        deliveryCharges: totalDeliveryCharges,
        city: city === "Unknown" ? "" : city,
        city: city,
        pincode: pincode,
        shippingAddress: shippingAddress,
        shippingAddress: shippingAddress || "Store Address",
      };

      const response = await b2bOrderApi.placeOrder(payload);

      if (response.error || !response.orders || response.orders.length === 0) {
        toast.error(
          response.message ||
            response.error ||
            "Failed to place procurement requests",
          { id: loadingToast },
        );
        setLoading(false);
        return;
      }

      if (response.razorpayOrderId && response.platformFeeAmount > 0) {
        toast.loading("Opening payment gateway...", { id: loadingToast });

        const isScriptLoaded = await loadRazorpayScript();
        if (!isScriptLoaded) {
          toast.error("Failed to load payment gateway", { id: loadingToast });
          setLoading(false);
          return;
        }

        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
          amount: Math.round(response.platformFeeAmount * 100),
          currency: "INR",
          name: "SPINZYT",
          description: "B2B Procurement Platform Fee",
          order_id: response.razorpayOrderId,
          handler: async function (paymentResponse) {
            toast.loading("Verifying payment...", { id: loadingToast });
            try {
              const orderIds = response.orders.map((o) => o._id);
              await b2bOrderApi.verifyPlatformFeePayment({
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                orderIds: orderIds,
              });
              toast.success("Order confirmed successfully!", {
                id: loadingToast,
              });
              navigate("/vendor/material-request", {
                replace: true,
                state: { resetCart: true },
              });
            } catch (err) {
              console.error("Payment Verification Error:", err);
              toast.error("Payment verified but order confirmation failed", {
                id: loadingToast,
              });
            }
          },
          prefill: {
            name: profileData.displayName || profileData.name || "",
            email: profileData.email || "",
            contact: profileData.phone || "",
          },
          theme: {
            color: "#0f172a",
          },
          modal: {
            ondismiss: function () {
              toast.error(
                "Payment cancelled. Order saved as Awaiting Fee Payment.",
                { id: loadingToast },
              );
              setLoading(false);
              navigate("/vendor/material-request", {
                replace: true,
                state: { resetCart: true },
              });
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        toast.success("Procurement request submitted successfully!", {
          id: loadingToast,
        });
        navigate("/vendor/material-request", {
          replace: true,
          state: { resetCart: true },
        });
      }
    } catch (err) {
      console.error("Submission Error:", err);
      toast.error(err.message || "Failed to place requests", {
        id: loadingToast,
      });
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-slate-50 font-body text-slate-900 min-h-screen flex flex-col antialiased selection:bg-slate-900 selection:text-white">
      {/* Top Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 transition-all">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 flex items-center justify-center transition-colors shadow-sm active:scale-95 cursor-pointer"
            title="Back to Catalog">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-sm font-black uppercase tracking-wider text-slate-800">
              Cart Details
            </h1>
            <p className="text-[11px] font-semibold text-slate-500">
              {orderItems.length} {orderItems.length === 1 ? "item" : "items"} •{" "}
              {groupedCarts.length}{" "}
              {groupedCarts.length === 1 ? "supplier" : "suppliers"}
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-20 pb-36 w-full flex-1 space-y-5">
        {/* Delivery Destination Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Delivering To
              </p>
              {pincode && (
                <span className="text-[10px] font-extrabold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                  PIN: {pincode}
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
              {profileData.shopDetails?.name ||
                profileData.businessName ||
                profileData.displayName ||
                "Vendor Facility"}
            </p>
            <p className="text-[11px] text-slate-500 leading-snug truncate mt-0.5">
              {shippingAddress || "Address not specified"}
            </p>
          </div>
        </div>

        {/* Multi-Supplier Order Cards */}
        {groupedCarts.map((group, gIdx) => {
          const hasThreshold = group.movFreeDelivery > 0;
          const isFree = group.isFreeDelivery;
          const diffForFree = Math.max(
            0,
            group.movFreeDelivery - group.subTotal,
          );
          const progressPercent = hasThreshold
            ? Math.min(
                100,
                Math.round((group.subTotal / group.movFreeDelivery) * 100),
              )
            : 100;

          return (
            <div
              key={group.supplierId || gIdx}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden divide-y divide-slate-100">
              {/* Supplier Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-white to-slate-50/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-md shadow-slate-900/10 shrink-0">
                      <Store className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900 tracking-tight truncate">
                          {group.supplierName}
                        </h3>
                        <span className="text-[9px] font-extrabold px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded-md shrink-0">
                          {group.supplierId}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          Schedule: {group.nextDeliveryDate}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Free Delivery Threshold Progress Tracker */}
                {hasThreshold ? (
                  <div className="mt-4 p-3.5 rounded-2xl border border-slate-200/60 bg-white transition-all duration-300">
                    {!isFree ? (
                      <div className="space-y-2 bg-amber-50/70 border border-amber-200/80 -m-3.5 p-3.5 rounded-2xl">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                          <span className="flex items-center gap-1.5">
                            <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                            Add{" "}
                            <span className="font-extrabold text-amber-700">
                              ₹{diffForFree.toFixed(2)}
                            </span>{" "}
                            more for FREE Delivery!
                          </span>
                          <span className="text-[11px] font-black text-amber-800">
                            ₹{group.subTotal.toFixed(0)} / ₹
                            {group.movFreeDelivery}
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-amber-200/80 rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="bg-amber-500 h-full rounded-full"
                          />
                        </div>
                        <p className="text-[10px] text-amber-700/90 font-medium">
                          Orders under ₹{group.movFreeDelivery} carry standard
                          delivery fee of ₹
                          {group.effectiveDeliveryFee.toFixed(2)}.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200/80 -m-3.5 p-3.5 rounded-2xl">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-emerald-900">
                              FREE Delivery Unlocked!
                            </p>
                            <p className="text-[10px] text-emerald-700 font-medium">
                              Order meets the ₹{group.movFreeDelivery}{" "}
                              threshold.
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black bg-emerald-600 text-white px-2.5 py-1 rounded-full uppercase tracking-wider">
                          FREE
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 bg-slate-100/70 px-3 py-2 rounded-xl">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium">
                      <Truck className="w-3.5 h-3.5 text-slate-400" />
                      {group.effectiveDeliveryFee === 0
                        ? "Free delivery on this supplier"
                        : "Supplier Standard Delivery"}
                    </span>
                    <span className="font-bold text-slate-700 text-[11px]">
                      {group.effectiveDeliveryFee === 0
                        ? "FREE"
                        : `₹${group.effectiveDeliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Itemized List for this Supplier */}
              <div className="p-4 sm:p-5 space-y-3 bg-white">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Ordered Items ({group.items.length})
                </p>
                <div className="space-y-2.5">
                  {group.items.map((item, iIdx) => (
                    <div
                      key={iIdx}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-200/60 hover:bg-slate-50 transition-colors gap-3">
                      {/* Item thumbnail & details */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                          {item.images && item.images.length > 0 ? (
                            <img
                              src={item.images[0]}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <PackageCheck className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-slate-500 font-medium">
                              ₹{item.wholesaleRate.toFixed(2)} / unit
                            </span>
                            <span className="text-[9px] font-semibold text-slate-600 bg-slate-200/80 px-1.5 py-0.2 rounded">
                              {item.gst || 18}% GST
                            </span>
                            {item.hasBulkDiscount && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                {item.bulkDiscount}% Bulk Off
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quantity & Total */}
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-slate-900">
                          ₹{(item.wholesaleRate * item.quantity).toFixed(2)}
                        </p>
                        <span className="inline-block mt-0.5 text-[10px] font-bold bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                          Qty: {item.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supplier Financial Breakdown (Invoice Style) */}
              <div className="p-4 sm:p-5 bg-slate-50/50 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Wholesale Subtotal</span>
                  <span className="font-semibold text-slate-800">
                    ₹{group.subTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>GST / Tax Amount</span>
                  <span className="font-semibold text-slate-800">
                    ₹{group.gstTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Delivery Charges</span>
                  {group.effectiveDeliveryFee === 0 ? (
                    <span className="font-black text-emerald-600 bg-emerald-100/70 px-2 py-0.5 rounded text-[11px]">
                      FREE
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-800">
                      ₹{group.effectiveDeliveryFee.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="pt-2.5 mt-2.5 border-t border-slate-200/80 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-black text-slate-900 uppercase tracking-tight">
                      Supplier Payable
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Direct settlement upon fulfillment
                    </p>
                  </div>
                  <span className="text-base font-black text-slate-900">
                    ₹{group.payableToSupplier.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* B2B Platform Fee & Security Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Platform Fee & Order Escrow
                </h3>
                {totalPlatformFee === 0 ? (
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Zero Fee Promo
                  </span>
                ) : (
                  <span className="text-xs font-black text-slate-900">
                    ₹{totalPlatformFee.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                {totalPlatformFee > 0
                  ? "A nominal platform fee is required to confirm order processing, reserve inventory, and lock wholesale pricing."
                  : "Platform processing fee is waived for this order during the introductory promotional window."}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>100% Secure & Escrow Protected</span>
            </div>
            <span className="text-[11px] font-bold text-slate-700">
              Payable Now: ₹{totalPlatformFee.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Comprehensive Bill Summary */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Receipt className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Grand Order Total
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>Total Materials Subtotal</span>
              <span className="font-semibold text-slate-800">
                ₹{itemSubtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Total GST</span>
              <span className="font-semibold text-slate-800">
                ₹{totalGst.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Total Delivery Charges</span>
              {totalDeliveryCharges === 0 ? (
                <span className="font-black text-emerald-600 bg-emerald-100/70 px-2 py-0.5 rounded text-[11px]">
                  FREE
                </span>
              ) : (
                <span className="font-semibold text-slate-800">
                  ₹{totalDeliveryCharges.toFixed(2)}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Platform Processing Fee</span>
              <span className="font-semibold text-slate-800">
                ₹{totalPlatformFee.toFixed(2)}
              </span>
            </div>

            <div className="pt-3 mt-2 border-t border-slate-200 flex justify-between items-baseline">
              <div>
                <span className="text-sm font-black text-slate-900">
                  Grand Total
                </span>
                <p className="text-[10px] text-slate-400">
                  Includes all taxes, delivery & fees
                </p>
              </div>
              <span className="text-xl font-black text-slate-900">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Terms / Assistance Note */}
        <p className="text-center text-[11px] text-slate-400 font-medium px-4">
          By confirming this order, you agree to the procurement terms. Material
          dispatch and delivery will be coordinated directly with the verified
          suppliers.
        </p>
      </main>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 sm:px-6 py-3.5 shadow-lg">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              {totalPlatformFee > 0 ? "Payable Now" : "Payable on Delivery"}
            </p>
            <p className="text-lg font-black text-slate-900">
              ₹
              {totalPlatformFee > 0
                ? totalPlatformFee.toFixed(2)
                : payableToSupplier.toFixed(2)}
            </p>
            <p className="text-[9px] text-slate-500 font-semibold">
              {totalPlatformFee > 0 ? "Platform Fee" : "Supplier Total"}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePlaceOrder}
            disabled={loading}
            className="flex-1 max-w-[260px] bg-slate-900 hover:bg-slate-800 text-white py-3.5 px-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer">
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : totalPlatformFee > 0 ? (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Pay ₹{totalPlatformFee.toFixed(2)} & Confirm</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Submit Order</span>
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default VendorCartDetailsPage;
