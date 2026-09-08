import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Clock, MapPin, Store, Navigation, FileText, MessageSquare, AlertCircle, CheckCircle2, ChevronRight, XCircle, Filter, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { orderApi, adminApi } from '../../../lib/api';
import socket from '../../../lib/socket';
import { toast } from 'react-hot-toast';

const OrdersHistoryPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  
  // DATE FILTER STATES
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const userData = JSON.parse(localStorage.getItem('userData') || localStorage.getItem('user') || '{}');
  const userId = userData._id || userData.id || localStorage.getItem('userId');

  const [invoiceSettings, setInvoiceSettings] = useState(null);

  const isCancellable = (order) => {
    if (!order || !order.createdAt || order.status === 'CANCELLED') return false;
    const cancellableStatuses = ['ORDER_PLACED', 'PICKUP_ASSIGNED', 'RIDER_ARRIVING'];
    if (!cancellableStatuses.includes(order.status)) return false;
    const diffInMs = Date.now() - new Date(order.createdAt).getTime();
    const diffInMinutes = diffInMs / (1000 * 60);
    return diffInMinutes <= 120; // 2 hours
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order? Paid amount will be refunded automatically.")) return;
    try {
        setCancelling(orderId);
        const res = await orderApi.cancelOrder(orderId);
        toast.success(res.message || "Order cancelled successfully!");
        setOrders((prevOrders) => {
            return prevOrders.map((o) => {
                if (o._id === orderId || o.id === orderId) {
                    return {
                        ...o,
                        status: 'CANCELLED',
                        paymentStatus: o.paymentStatus === 'Paid' ? 'Refunded' : o.paymentStatus
                    };
                }
                return o;
            });
        });
    } catch (err) {
        toast.error(err.message || "Failed to cancel order");
    } finally {
        setCancelling(null);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      console.log('📡 Fetching orders for UserID:', userId);
      try {
        const filters = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (orderTypeFilter !== 'all') filters.orderType = orderTypeFilter;

        const data = await orderApi.getMyOrders(userId, filters);
        console.log('✅ Received orders count:', data?.length || 0);
        
        setOrders(data || []);
      } catch (orderErr) {
        console.error('❌ Error fetching orders:', orderErr);
        setOrders([]);
      }

      try {
        const configs = await adminApi.getConfig();
        if (Array.isArray(configs)) {
          const invConfig = configs.find(c => c.key === 'invoice_settings');
          if (invConfig) setInvoiceSettings(invConfig.value);
        }
      } catch (configErr) {
        console.warn('⚠️ Could not fetch invoice settings, using defaults');
      }
    } catch (err) {
      console.error('❌ Error in fetchOrders main loop:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('📦 OrdersHistoryPage Mounted or Filters Changed. UserID:', userId);
    if (!userId) {
      console.warn('⚠️ No UserID found in local storage. Fetch aborted.');
      setLoading(false);
      return;
    }
    fetchOrders();
  }, [userId, startDate, endDate, orderTypeFilter]);

  useEffect(() => {
    const handleOrderStatusUpdate = (updatedOrder) => {
      console.log('🔌 [SOCKET] Received order status update in history:', updatedOrder);
      if (!updatedOrder || !updatedOrder._id) return;
      
      setOrders((prevOrders) => {
        return prevOrders.map((o) => {
          if (o._id === updatedOrder._id || o.id === updatedOrder._id) {
            return {
              ...o,
              ...updatedOrder
            };
          }
          return o;
        });
      });
    };

    socket.on('order_status_update', handleOrderStatusUpdate);

    return () => {
      socket.off('order_status_update', handleOrderStatusUpdate);
    };
  }, []);

  const activeOrders = useMemo(() => 
    orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)), 
  [orders]);

  const pastOrders = useMemo(() => {
    let filtered = orders.filter(o => ['DELIVERED', 'CANCELLED'].includes(o.status));
    
    if (orderTypeFilter !== 'all') {
      filtered = filtered.filter(o => {
        if (orderTypeFilter === 'walk-in') return o.orderType === 'walk-in';
        if (orderTypeFilter === 'online') return o.orderType === 'online' || !o.orderType;
        return true;
      });
    }

    if (startDate || endDate) {
      filtered = filtered.filter(o => {
        const orderDate = new Date(o.createdAt).setHours(0,0,0,0);
        const start = startDate ? new Date(startDate).setHours(0,0,0,0) : null;
        const end = endDate ? new Date(endDate).setHours(0,0,0,0) : null;
        
        if (start && orderDate < start) return false;
        if (end && orderDate > end) return false;
        return true;
      });
    }
    
    return filtered;
  }, [orders, startDate, endDate, orderTypeFilter]);

  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  }), []);

  const itemVariants = useMemo(() => ({
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
  }), []);

  const handleDownloadInvoice = (order) => {
    const printWindow = window.open('', '_blank');
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    
    const cfg = invoiceSettings || {
      showLogo: true,
      showVendorDetails: true,
      showTerms: true,
      customTerms: 'Thank you for taking our services..',
      invoiceNote: 'This is a computer generated invoice.',
      showTaxes: true,
      showServiceFee: true,
      showDeliveryFee: false,
      showSurge: false,
      showDiscount: true,
      accentColor: '#000000',
      businessName: 'SPINZYT',
      contactEmail: 'support@spinzyt.com',
      gstNumber: 'ZA1223324435435'
    };

    const itemsTotal = (order.items || []).reduce((sum, item) => {
      const qty = parseFloat(item.quantity || item.qty || 1);
      if (item.quantity !== undefined) {
        return sum + (item.price * item.quantity);
      } else {
        return sum + item.price;
      }
    }, 0);

    const isMock = !order.priceBreakdown;
    const isHeritage = order.tier === 'Heritage' || order.serviceTier === 'Heritage';
    const gstPercent = isHeritage ? 18 : 5;
    
    const grandTotal = order.totalAmount || order.total || 0;
    const discount = order.discountAmount || (order.priceBreakdown?.discount !== undefined ? order.priceBreakdown.discount : 0);
    
    let platformFee = 0;
    if (!isMock) {
      platformFee = order.priceBreakdown?.platformFee || 0;
    } else if (itemsTotal !== grandTotal) {
      platformFee = cfg.showServiceFee !== false ? grandTotal * 0.02 : 0;
    }

    let gstAmount = 0;
    if (!isMock) {
      gstAmount = order.priceBreakdown?.gstAmount || 0;
    } else {
      const target = grandTotal + discount - platformFee;
      const taxable = target / (1 + gstPercent / 100);
      gstAmount = target - taxable;
    }

    const subtotal = grandTotal - platformFee - gstAmount + discount;

    // GST Display Logic
    const customerObj = order.customer || order.user || userData;
    const customerGstType = customerObj?.customerType === 'retail' ? 'RD' : 'URD';
    const customerGstin = customerObj?.gstNumber || '';

    const vendorObj = order.vendor;
    const vendorGstin = vendorObj?.shopDetails?.gst || vendorObj?.gstNumber || '';
    const vendorGstType = vendorGstin ? 'RD' : 'URD';

    let displayGstNo = '';
    let displayGstLabel = '';
    let gstNotice = '';

    if (customerGstType === 'RD' && vendorGstType === 'RD') {
        displayGstNo = customerGstin;
        displayGstLabel = "Customer GSTIN";
        gstNotice = "B2B Invoice - Tax Credit Available";
    } else if (customerGstType === 'URD' && vendorGstType === 'RD') {
        displayGstNo = vendorGstin;
        displayGstLabel = "Vendor GSTIN";
        gstNotice = "B2C Invoice";
    } else {
        // Includes URD-URD and fallback
        displayGstNo = cfg.gstNumber || 'ZA1223324435435';
        displayGstLabel = "Spinzyt GSTIN";
        gstNotice = "Marketplace / Platform Invoice";
    }

    const invoiceHtml = `
      <html>
        <head>
          <title>Invoice - ${order.orderId || order._id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              padding: 0; 
              margin: 0;
              color: #0f172a; 
              background: #fff;
              -webkit-print-color-adjust: exact;
            }
            .page { padding: 40px; max-width: 850px; margin: auto; }
            
            /* PREMIUM HEADER MATCHING INVOICEPRINT.JSX */
            .header-container { 
              background-color: #f3f4f6; 
              padding: 40px; 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
              position: relative;
              border: 1px solid #e2e8f0;
              border-bottom: none;
            }
            .header-left { position: relative; z-index: 10; }
            .business-title { font-size: 32px; font-weight: 900; letter-spacing: -1px; margin-bottom: 15px; line-height: 1; }
            .business-details { font-size: 13px; font-weight: 700; color: #475569; line-height: 1.4; }
            
            .header-right { text-align: right; position: relative; z-index: 10; display: ${cfg.showLogo ? 'flex' : 'none'}; flex-direction: column; align-items: center; }
            .logo-circle { width: 80px; height: 80px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); margin-bottom: 12px; }
            .logo-circle img { width: 48px; height: 48px; object-fit: contain; padding-top: 16px; }
            .brand-name { font-size: 24px; font-weight: 900; letter-spacing: 0.2em; line-height: 1; }

            /* INFO SECTION */
            .info-section { 
              padding: 40px 10px; 
              display: flex; 
              justify-content: space-between; 
              border-left: 1px solid #e2e8f0;
              border-right: 1px solid #e2e8f0;
            }
            .info-group { space-y: 8px; }
            .info-label { font-size: 13px; font-weight: 900; text-transform: uppercase; margin-bottom: 8px; }
            .info-value { font-weight: 700; color: #475569; margin-left: 8px; }

            /* TABLE STYLING */
            .table-container { border: 1px solid #e2e8f0; border-top: none; }
            table { width: 100%; border-collapse: collapse; }
            th { 
              background: #f8fafc; 
              padding: 16px; 
              text-align: left; 
              font-size: 11px; 
              font-weight: 900; 
              text-transform: uppercase; 
              letter-spacing: 0.1em; 
              color: #94a3b8;
              border-bottom: 1px solid #e2e8f0;
              border-right: 1px solid #e2e8f0;
            }
            th:last-child { border-right: none; }
            td { 
              padding: 16px; 
              font-size: 13px; 
              font-weight: 700; 
              color: #334155;
              border-bottom: 1px solid #f1f5f9;
              border-right: 1px solid #e2e8f0;
            }
            td:last-child { border-right: none; font-weight: 900; color: #0f172a; text-align: right; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }

            /* TOTALS SECTION */
            .totals-row td { padding: 12px 24px; border-bottom: none; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; }
            .grand-total-row { background: #0f172a; color: white !important; }
            .grand-total-row td { color: white !important; padding: 20px 24px; font-size: 12px; }
            .grand-total-value { font-size: 18px !important; }

            /* FOOTER */
            .footer { margin-top: 48px; text-align: center; }
            .footer-line { padding: 16px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; margin-bottom: 16px; }
            .footer-note { font-size: 10px; font-weight: 900; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.4em; }
            .footer-terms { font-size: 10px; font-weight: 700; color: #94a3b8; font-style: italic; margin-bottom: 8px; display: ${cfg.showTerms ? 'block' : 'none'}; }
            .footer-brand { font-size: 12px; font-weight: 900; letter-spacing: 0.3em; text-transform: uppercase; }

            @media print {
              .header-container { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
              .grand-total-row { background-color: #0f172a !important; -webkit-print-color-adjust: exact; }
              th { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header-container">
              <div class="header-left">
                <div class="business-title">${cfg.businessName}</div>
                <div class="business-details">
                  <div>www.spinzyt.com</div>
                  <div>${cfg.contactEmail}</div>
                  ${displayGstNo ? `<div>${displayGstLabel} # ${displayGstNo}</div>` : ''}
                </div>
              </div>
              <div class="header-right">
                <div class="logo-circle">
                  <img src="https://spinzyt.com/wp-content/uploads/2023/12/spinzyt-logo-new.png" />
                </div>
                <div class="brand-name">SPINZYT</div>
              </div>
            </div>

            <div class="info-section">
              <div class="info-group">
                <div class="info-label">Invoice No: <span class="info-value">${order.invoiceNo || `SZ-CUST-2026-${(order.orderId || order._id).slice(-4)}`}</span></div>
                <div class="info-label">Customer Name: <span class="info-value">${customerObj?.displayName || userData.displayName || 'Valued Customer'}</span></div>
                ${customerGstType === 'RD' && customerGstin ? `<div class="info-label">Customer GSTIN: <span class="info-value">${customerGstin}</span></div>` : ''}
                ${cfg.showVendorDetails ? `<div class="info-label">Vendor ID: <span class="info-value">${order.vendor?.displayName || 'VEN-001'}</span></div>` : ''}
                ${gstNotice ? `<div class="info-label" style="color: #6d28d9; font-size: 10px; margin-top: 4px;">${gstNotice}</div>` : ''}
              </div>
              <div class="info-group text-right">
                <div class="info-label">Order No: <span class="info-value">${order.orderId || order._id}</span></div>
                <div class="info-label">Date: <span class="info-value">${orderDate}</span></div>
              </div>
            </div>

            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th class="text-center">SAC</th>
                    <th>Service Type</th>
                    <th class="text-center">Qty / Weight</th>
                    <th class="text-right">Unit Price</th>
                    <th class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${(order.items || []).map(item => `
                    <tr>
                      <td>${item.name}</td>
                      <td class="text-center">9994</td>
                      <td>${item.serviceType || 'Laundry'}</td>
                      <td class="text-center">${item.quantity || 1}</td>
                      <td class="text-right">₹${item.price}</td>
                      <td class="text-right">₹${(item.price * (item.quantity || 1))}</td>
                    </tr>
                  `).join('')}
                  
                  <tr class="totals-row" style="border-top: 2px solid #0f172a">
                    <td colspan="5">Subtotal Services</td>
                    <td>₹${subtotal.toFixed(2)}</td>
                  </tr>
                  ${cfg.showServiceFee && platformFee > 0 ? `
                    <tr class="totals-row">
                      <td colspan="5">Platform Fee</td>
                      <td>₹${platformFee.toFixed(2)}</td>
                    </tr>
                  ` : ''}
                  ${cfg.showDiscount && discount > 0 ? `
                    <tr class="totals-row" style="color: #059669">
                      <td colspan="5">Promotional Discount</td>
                      <td>- ₹${discount.toFixed(2)}</td>
                    </tr>
                  ` : ''}
                  <tr class="totals-row">
                    <td colspan="5">GST (${gstPercent}%)</td>
                    <td>₹${gstAmount.toFixed(2)}</td>
                  </tr>
                  <tr class="totals-row grand-total-row">
                    <td colspan="5">Grand Total</td>
                    <td class="grand-total-value">₹${grandTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="footer">
              <div class="footer-line">
                <div class="footer-note">${cfg.invoiceNote}</div>
              </div>
              <div>
                <div class="footer-terms">${cfg.customTerms}</div>
                <div class="footer-brand">${cfg.businessName}</div>
              </div>
            </div>
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  };

  return (
    <div className="min-h-[100dvh] flex flex-col text-slate-900">
      <main className="flex-1 pb-36 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {loading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium text-slate-500">Loading your orders...</p>
          </div>
        ) : (
          <>
            {/* SEGMENTED TAB SWITCHER */}
            <div className="flex justify-center mb-8">
              <div className="bg-slate-100/90 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/80 w-full max-w-md">
                <button 
                  onClick={() => setActiveTab('active')}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer",
                    activeTab === 'active' 
                      ? "bg-white text-slate-900 shadow-xs font-semibold" 
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <span>Active Orders</span>
                  {activeOrders.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold">
                      {activeOrders.length}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setActiveTab('past')}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer",
                    activeTab === 'past' 
                      ? "bg-white text-slate-900 shadow-xs font-semibold" 
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <span>Past Orders</span>
                  {pastOrders.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold">
                      {pastOrders.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* ORDERS LIST */}
            <div className="min-h-[400px]">
              <AnimatePresence mode="wait">
                {activeTab === 'active' ? (
                  <motion.div 
                    key="active-section"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-5"
                  >
                    {activeOrders.length > 0 ? (
                      activeOrders.map((order) => {
                        const isPlaced = order.status === 'ORDER_PLACED';
                        return (
                          <div 
                            key={order._id || order.id}
                            className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all space-y-5"
                          >
                            {/* Card Header: Order ID, Date & Total Price */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2.5">
                                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                                    {order.orderId || `#${order._id?.slice(-6)}`}
                                  </h3>
                                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold uppercase tracking-wide">
                                    {order.status?.replace(/_/g, ' ') || 'In Progress'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 font-normal">
                                  Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                              <div className="text-left sm:text-right">
                                <span className="text-lg sm:text-xl font-bold text-slate-900">
                                  ₹{order.totalAmount?.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {/* Hub & Delivery Time Details */}
                            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                              <div className="flex items-center gap-2 min-w-0">
                                <Store size={15} className="text-slate-500 shrink-0" />
                                <span className="font-medium text-slate-800 truncate">
                                  {order.vendor?.displayName || 'Spinzyt Partner Hub'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock size={14} className="text-slate-500 shrink-0" />
                                <span className="font-normal text-slate-600">
                                  {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </span>
                              </div>
                            </div>

                            {/* Order Status Progress Timeline */}
                            <div className="space-y-2 py-1">
                              <div className="flex justify-between text-[11px] sm:text-xs font-medium text-slate-500 px-0.5">
                                <span className="text-slate-900 font-semibold">Placed</span>
                                <span className={['PICKUP_ASSIGNED', 'RIDER_ARRIVING', 'IN_TRANSIT', 'RECEIVED_BY_VENDOR', 'PROCESSING', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) ? 'text-slate-900 font-semibold' : ''}>Assigned</span>
                                <span className={['IN_TRANSIT', 'RECEIVED_BY_VENDOR', 'PROCESSING', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) ? 'text-slate-900 font-semibold' : ''}>In Transit</span>
                                <span className={['PROCESSING', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) ? 'text-slate-900 font-semibold' : ''}>Processing</span>
                                <span className={['OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) ? 'text-slate-900 font-semibold' : ''}>Out for Delivery</span>
                              </div>
                              <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  style={{
                                    width: 
                                      order.status === 'PICKUP_ASSIGNED' ? '25%' : 
                                      order.status === 'RIDER_ARRIVING' ? '37.5%' :
                                      order.status === 'IN_TRANSIT' ? '50%' :
                                      order.status === 'RECEIVED_BY_VENDOR' ? '62.5%' :
                                      order.status === 'PROCESSING' ? '75%' : 
                                      order.status === 'READY_FOR_DISPATCH' ? '87.5%' :
                                      ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) ? '100%' : '10%'
                                  }}
                                  className="h-full bg-slate-900 rounded-full transition-all duration-700" 
                                />
                              </div>
                            </div>

                            {/* Card Actions */}
                            <div className="flex flex-wrap items-center gap-2.5 pt-2">
                              <button 
                                onClick={() => {
                                  if (!isPlaced) navigate(`/user/tracking/${order._id || order.id}`);
                                }}
                                disabled={isPlaced}
                                className={cn(
                                  "flex-1 min-w-[120px] py-2.5 px-4 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer",
                                  isPlaced 
                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200" 
                                    : "bg-slate-900 hover:bg-slate-800 text-white shadow-2xs"
                                )}
                              >
                                <Navigation size={15} />
                                <span>{isPlaced ? 'Order Received' : 'Track Order'}</span>
                              </button>
                              
                              <button 
                                onClick={() => navigate('/user/verification', { state: { orderId: order._id || order.id } })}
                                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-200/60"
                              >
                                <FileText size={15} />
                                <span>Articles</span>
                              </button>

                              <button 
                                onClick={() => navigate(`/user/chat/${order._id}`)}
                                className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center justify-center transition-colors cursor-pointer border border-slate-200/60 shrink-0"
                                title="Chat with support"
                              >
                                <MessageSquare size={16} />
                              </button>
                            </div>

                            {/* Cancel Option (if cancellable) */}
                            {isCancellable(order) && (
                              <div className="pt-2">
                                <button 
                                  onClick={() => handleCancelOrder(order._id || order.id)}
                                  disabled={cancelling === (order._id || order.id)}
                                  className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-medium flex items-center justify-center gap-2 border border-rose-200 transition-colors cursor-pointer"
                                >
                                  {cancelling === (order._id || order.id) ? (
                                    <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <XCircle size={14} />
                                      <span>Cancel Order</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 p-8">
                        <Package size={40} className="mx-auto text-slate-300 mb-3" />
                        <h4 className="text-base font-semibold text-slate-800">No active orders</h4>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                          You don't have any ongoing laundry or dry cleaning orders.
                        </p>
                        <button
                          onClick={() => navigate('/user/home')}
                          className="mt-5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs cursor-pointer"
                        >
                          Explore Services
                        </button>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="past-section"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {/* Filter Toggle */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <button
                        onClick={() => setShowDateFilter(!showDateFilter)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors border cursor-pointer",
                          showDateFilter || startDate || endDate || orderTypeFilter !== 'all'
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <Filter size={14} />
                        <span>{startDate || endDate || orderTypeFilter !== 'all' ? 'Filters Active' : 'Filter Orders'}</span>
                      </button>

                      {(startDate || endDate || orderTypeFilter !== 'all') && (
                        <button 
                          onClick={() => { setStartDate(''); setEndDate(''); setOrderTypeFilter('all'); }}
                          className="text-xs text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>

                    {showDateFilter && (
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 mb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">From Date</label>
                            <input 
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-slate-400 transition-all"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">To Date</label>
                            <input 
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-slate-400 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {pastOrders.length > 0 ? (
                      pastOrders.map((order) => {
                        const isCancelled = order.status === 'CANCELLED';
                        return (
                          <div 
                            key={order._id || order.id}
                            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-3"
                          >
                            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                              <div className="space-y-0.5">
                                <h3 className="text-base font-bold text-slate-900">
                                  {order.orderId || `#${order._id?.slice(-6)}`}
                                </h3>
                                <p className="text-xs text-slate-500 font-normal">
                                  {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={cn(
                                  "text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide",
                                  isCancelled ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                )}>
                                  {isCancelled ? 'Cancelled' : 'Delivered'}
                                </span>
                                <span className="text-base font-bold text-slate-900">
                                  ₹{order.totalAmount?.toFixed(0)}
                                </span>
                              </div>
                            </div>

                            {/* Articles Collapsible */}
                            <details className="group bg-slate-50/60 rounded-xl border border-slate-100 overflow-hidden">
                              <summary className="list-none p-3 cursor-pointer flex items-center justify-between text-xs font-medium text-slate-700 hover:bg-slate-100/60 transition-colors">
                                <span className="flex items-center gap-2">
                                  <FileText size={14} className="text-slate-400" />
                                  <span>Order Items ({order.items?.length || 0})</span>
                                </span>
                                <ChevronRight size={14} className="text-slate-400 group-open:rotate-90 transition-transform" />
                              </summary>
                              <div className="px-3 pb-3 pt-1 space-y-1.5 border-t border-slate-100">
                                {order.items && order.items.length > 0 ? (
                                  order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs py-1">
                                      <span className="text-slate-800 font-medium">{item.name} × {item.quantity || 1}</span>
                                      <span className="text-slate-600 font-medium">₹{(item.price || 0) * (item.quantity || 1)}</span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-slate-400 py-1">No items details</p>
                                )}
                              </div>
                            </details>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between gap-3 pt-1">
                              <button 
                                onClick={() => handleDownloadInvoice(order)}
                                className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200/60"
                              >
                                <Download size={13} />
                                <span>Download Invoice</span>
                              </button>
                              <button 
                                onClick={() => {
                                  navigate('/user/home');
                                }}
                                className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer shadow-2xs"
                              >
                                Order Again
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 p-8">
                        <Package size={40} className="mx-auto text-slate-300 mb-3" />
                        <h4 className="text-base font-semibold text-slate-800">No past orders</h4>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">Your past order history will appear here.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default OrdersHistoryPage;
