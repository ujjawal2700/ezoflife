import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { orderApi, adminApi } from '../../../lib/api';

const OrdersHistoryPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // DATE FILTER STATES
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  const userData = JSON.parse(localStorage.getItem('userData') || localStorage.getItem('user') || '{}');
  const userId = userData._id || userData.id || localStorage.getItem('userId');

  const [invoiceSettings, setInvoiceSettings] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      console.log('📡 Fetching orders for UserID:', userId);
      try {
        const data = await orderApi.getMyOrders(userId);
        console.log('✅ Received orders count:', data?.length || 0);
        
        const mockPastOrders = [
          {
            _id: 'mock_1',
            orderId: '#SPZ-9901',
            status: 'Delivered',
            totalAmount: 1250.00,
            createdAt: new Date('2024-04-12'),
            serviceTier: 'Heritage',
            items: [{ name: 'Premium Dry Clean', quantity: 2, price: 500 }, { name: 'Silk Saree Care', quantity: 1, price: 250 }],
            vendor: { displayName: 'Spinzyt Luxury Hub' }
          }
        ];
        
        setOrders([...(data || []), ...mockPastOrders]);
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
    console.log('📦 OrdersHistoryPage Mounted. UserID:', userId);
    if (!userId) {
      console.warn('⚠️ No UserID found in local storage. Fetch aborted.');
      setLoading(false);
      return;
    }
    fetchOrders();
  }, [userId]);

  const activeOrders = useMemo(() => 
    orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status)), 
  [orders]);

  const pastOrders = useMemo(() => {
    let filtered = orders.filter(o => ['Delivered', 'Cancelled'].includes(o.status));
    
    if (startDate || endDate) {
      filtered = filtered.filter(o => {
        const orderDate = new Date(o.createdAt).setHours(0,0,0,0);
        const start = startDate ? new Date(startDate).setHours(0,0,0,0) : null;
        const end = endDate ? new Date(endDate).setHours(0,0,0,0) : null;
        
        if (start && orderDate < start) return false;
        if (end && orderDate > end) return false;
        return true;
      });
      return filtered;
    }
    
    return filtered.slice(0, 5);
  }, [orders, startDate, endDate]);

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
      showTaxes: false,
      accentColor: '#000000',
      businessName: 'SPINZYT',
      contactEmail: 'support@spinzyt.com'
    };

    const invoiceHtml = `
      <html>
        <head>
          <title>Invoice - ${order.orderId || order._id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid ${cfg.accentColor}; padding-bottom: 20px; margin-bottom: 40px; }
            .logo { font-size: 32px; font-weight: 900; letter-spacing: -1px; display: ${cfg.showLogo ? 'block' : 'none'}; }
            .invoice-label { font-size: 24px; font-weight: 900; color: #64748b; text-transform: uppercase; }
            .meta { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .meta-box h4 { font-size: 10px; text-transform: uppercase; color: #94a3b8; margin-bottom: 5px; letter-spacing: 1px; }
            .meta-box p { font-size: 14px; font-weight: 700; margin: 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th { text-align: left; background: #f8fafc; padding: 15px; font-size: 12px; text-transform: uppercase; color: #64748b; }
            td { padding: 15px; border-bottom: 1px solid #f1f5f9; font-size: 14px; font-weight: 500; }
            .totals { margin-left: auto; width: 300px; }
            .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
            .grand-total { border-top: 2px solid ${cfg.accentColor}; border-bottom: none; padding-top: 15px; margin-top: 10px; font-weight: 900; font-size: 18px; color: ${cfg.accentColor}; }
            .footer { margin-top: 60px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 30px; color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
            .terms { font-size: 10px; font-weight: 900; color: #1e293b; margin-bottom: 5px; display: ${cfg.showTerms ? 'block' : 'none'}; }
            .note { font-size: 8px; font-weight: 500; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">${cfg.businessName}.</div>
            <div class="invoice-label">Invoice</div>
          </div>
          
          <div class="meta">
            <div class="meta-box">
              <h4>Order ID</h4>
              <p>${order.orderId || '#' + order._id?.slice(-6)}</p>
              <h4 style="margin-top: 15px">Date</h4>
              <p>${orderDate}</p>
            </div>
            <div class="meta-box">
              <h4>Billed To</h4>
              <p>${userData.displayName || userData.username || 'Valued Customer'}</p>
              ${cfg.showVendorDetails ? `
                <h4 style="margin-top: 15px">Vendor</h4>
                <p>${order.vendor?.displayName || ''}</p>
              ` : ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Service Item</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity} ${item.unit || 'pc'}</td>
                  <td>₹${item.price || 0}</td>
                  <td>₹${(item.price || 0) * (item.quantity || 1)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal</span>
              <span>₹${order.totalAmount || 0}</span>
            </div>
            ${(cfg.showServiceFee && order.priceBreakdown?.serviceFee) ? `
              <div class="total-row">
                <span>Service Fee</span>
                <span>₹${order.priceBreakdown.serviceFee}</span>
              </div>
            ` : ''}
            ${(cfg.showDeliveryFee && order.priceBreakdown?.logisticsFee) ? `
              <div class="total-row">
                <span>Logistics Fee</span>
                <span>₹${order.priceBreakdown.logisticsFee}</span>
              </div>
            ` : ''}
            ${(cfg.showSurge && order.priceBreakdown?.expressSurcharge) ? `
              <div class="total-row" style="color: #e11d48;">
                <span>Express Surcharge</span>
                <span>₹${order.priceBreakdown.expressSurcharge}</span>
              </div>
            ` : ''}
            ${(cfg.showDiscount && order.priceBreakdown?.discount) ? `
              <div class="total-row" style="color: #059669;">
                <span>Discount</span>
                <span>- ₹${order.priceBreakdown.discount}</span>
              </div>
            ` : ''}
            ${cfg.showTaxes ? `
              <div class="total-row">
                <span>Taxes (18%)</span>
                <span>₹${((order.totalAmount || 0) * 0.18).toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-row grand-total">
              <span>Grand Total</span>
              <span>₹${order.totalAmount?.toFixed(2) || 0}</span>
            </div>
            ${(cfg.showAdvance && order.advanceAmount) ? `
              <div class="total-row" style="color: #059669; font-weight: 700;">
                <span>Advance Paid</span>
                <span>₹${order.advanceAmount}</span>
              </div>
              <div class="total-row" style="color: #e11d48; font-weight: 900;">
                <span>Due at Delivery</span>
                <span>₹${order.dueAmount || 0}</span>
              </div>
            ` : ''}
          </div>

          <div class="footer">
            <div class="terms">${cfg.customTerms}</div>
            <div class="note">${cfg.invoiceNote}</div>
            <div style="margin-top: 15px; font-size: 9px; color: #64748b;">${cfg.contactEmail}</div>
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-on-background min-h-[100dvh] flex flex-col"
    >
      <main className="pt-16 pb-44 px-6 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center">
             <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mb-6"
            />
            <p className="text-xs font-black uppercase tracking-[0.2em] opacity-40">Syncing with server...</p>
            <p className="text-[10px] opacity-20 mt-4">Session: {userId || 'Guest'}</p>
          </div>
        ) : (
          <>
        <motion.section 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="mb-6 pt-10"
        >
          <div className="flex gap-4 mb-2">
            <button 
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all relative overflow-hidden ${
                activeTab === 'active' 
                  ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20' 
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              Active Orders
              {activeTab === 'active' && activeOrders.length > 0 && (
                <span className="ml-2 bg-primary text-on-primary px-2 py-0.5 rounded-full text-[8px]">{activeOrders.length}</span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('past')}
              className={`flex-1 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${
                activeTab === 'past' 
                  ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20' 
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              Past Orders
            </button>
          </div>
        </motion.section>

        {/* Orders List */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeTab === 'active' ? (
              <motion.div 
                key="active-section"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="space-y-4"
              >
                {activeOrders.length > 0 ? (
                  activeOrders.map((order) => (
                    <motion.div 
                      key={order._id || order.id}
                      variants={itemVariants}
                      whileHover={{ scale: 1.01 }}
                      className="bg-white rounded-[2rem] p-5 relative overflow-hidden group shadow-[0_15px_40px_rgba(0,0,0,0.04)] border border-slate-100 mb-4"
                    >
                      <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-50">
                        <h3 className="text-lg font-black text-slate-900 tracking-tighter leading-none">{order.orderId || `#${order._id?.slice(-6)}`}</h3>
                        <div className="flex items-center gap-2">
                          {order.status && !['Processing', 'Pending', 'Payment Pending'].includes(order.status) && (
                            <span className="text-primary font-black text-[7px] tracking-[0.2em] uppercase bg-primary/5 px-2 py-1 rounded-full">{order.status}</span>
                          )}
                          <p className="text-lg font-headline font-black text-slate-900 tracking-tighter leading-none">₹{order.totalAmount?.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 mb-5">
                        <div className="flex items-center gap-3 opacity-60">
                          <span className="material-symbols-outlined text-[16px]">storefront</span>
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest truncate max-w-[120px]">{order.vendor?.displayName || 'Spinzyt Hub'}</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100/50">
                          <span className="material-symbols-outlined text-xs text-primary">schedule</span>
                          <p className="text-[9px] font-black text-slate-900">{order.pickupSlot?.time?.split(',')[0] || order.deliverySlot?.time?.split(',')[0] || 'Today'}</p>
                        </div>
                      </div>

                      <div className="mb-5 px-1 relative">
                        <div className="flex justify-between text-[6px] text-slate-400 font-black uppercase tracking-widest mb-1.5 px-0.5">
                          <span className="text-primary">Order Placed</span>
                          <span className={['Rider Assigned', 'Picked Up', 'At Shop', 'Out for Delivery', 'Delivered'].includes(order.status) ? 'text-primary' : ''}>Rider Assigned</span>
                          <span className={['At Shop', 'Out for Delivery', 'Delivered'].includes(order.status) ? 'text-primary' : ''}>In Progress</span>
                          <span className={['Out for Delivery', 'Delivered'].includes(order.status) ? 'text-primary' : ''}>Out for Delivery</span>
                        </div>
                        <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: 
                                order.status === 'Rider Assigned' ? '40%' : 
                                order.status === 'Picked Up' || order.status === 'At Shop' || order.status === 'Processing' ? '70%' : 
                                order.status === 'Out for Delivery' ? '100%' : 
                                order.status === 'Delivered' ? '100%' : '15%'
                            }}
                            className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-1000" 
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <motion.button 
                          whileTap={{ scale: 0.98 }}
                          onClick={() => (order.status === 'Assigned' || order.status === 'Out for Delivery') && navigate(`/user/tracking/${order._id || order.id}`)}
                          className={`flex-[1.5] py-3 rounded-xl font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                            (order.status === 'Assigned' || order.status === 'Out for Delivery') 
                            ? 'bg-slate-900 text-white shadow-lg' 
                            : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">my_location</span>
                          Track
                        </motion.button>
                        
                        <motion.button 
                          whileTap={{ scale: 0.95 }}
                          onClick={() => navigate('/user/verification', { state: { orderId: order._id || order.id } })}
                          className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                        >
                          <span className="material-symbols-outlined text-[14px]">inventory</span>
                          Articles
                        </motion.button>

                        <motion.button 
                          whileTap={{ scale: 0.95 }}
                          onClick={() => navigate(`/user/chat/${order._id}`)}
                          className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-all shrink-0"
                        >
                          <span className="material-symbols-outlined text-lg">chat</span>
                        </motion.button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-20 text-center opacity-40">
                    <span className="material-symbols-outlined text-5xl mb-4">shopping_basket</span>
                    <p className="text-xs font-black uppercase tracking-widest">No active orders</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="past-section"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="space-y-2"
              >
                {/* Date Filter Toggle Button */}
                <motion.button
                  variants={itemVariants}
                  onClick={() => setShowDateFilter(!showDateFilter)}
                  className={`w-full py-2.5 rounded-xl font-black text-[8px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all mb-3 ${
                    showDateFilter || startDate || endDate
                      ? 'bg-primary text-white shadow-lg'
                      : 'bg-white text-slate-900 border border-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">calendar_month</span>
                  {startDate || endDate ? 'Date Filter Active' : 'Filter By Date'}
                  <span className="material-symbols-outlined text-xs transition-transform duration-300" style={{ transform: showDateFilter ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                </motion.button>

                <AnimatePresence>
                  {showDateFilter && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3 mb-6">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-0.5">
                            <label className="text-[7px] font-black text-slate-300 uppercase ml-2">From</label>
                            <input 
                              type={startDate ? "date" : "text"} 
                              placeholder="DD/MM/YYYY"
                              onFocus={(e) => e.target.type = 'date'}
                              onBlur={(e) => !startDate && (e.target.type = 'text')}
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-[9px] font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-[7px] font-black text-slate-300 uppercase ml-2">To</label>
                            <input 
                              type={endDate ? "date" : "text"} 
                              placeholder="DD/MM/YYYY"
                              onFocus={(e) => e.target.type = 'date'}
                              onBlur={(e) => !endDate && (e.target.type = 'text')}
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-[9px] font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                          </div>
                        </div>
                        {(startDate || endDate) && (
                          <button 
                            onClick={() => { setStartDate(''); setEndDate(''); }}
                            className="text-[8px] font-black text-rose-500 uppercase tracking-widest w-full py-1.5 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            Clear Filters
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.h4 variants={itemVariants} className="text-[9px] font-black uppercase tracking-[0.3em] text-on-surface-variant opacity-30 px-4 flex items-center gap-4">
                  {startDate || endDate ? 'Filtered Results' : 'Last 5 Orders'}
                  <div className="flex-grow h-px bg-outline-variant/10"></div>
                </motion.h4>

                {pastOrders.length > 0 ? (
                  pastOrders.map((order) => (
                    <motion.div 
                      key={order._id || order.id}
                      variants={itemVariants}
                      whileHover={{ scale: 1.01 }}
                      className="bg-white rounded-[1.2rem] p-4 relative overflow-hidden group shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-slate-100 mb-3 opacity-90 hover:opacity-100 transition-all"
                    >
                      <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-50">
                        <div className="space-y-0.5">
                          <h3 className="text-base font-black text-slate-900 tracking-tight leading-none">{order.orderId || `#${order._id?.slice(-6)}`}</h3>
                          <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <p className="text-base font-black text-slate-900 tracking-tight leading-none">₹{order.totalAmount?.toFixed(0)}</p>
                      </div>

                      <details className="group bg-slate-50/50 rounded-lg border border-slate-100/50 mb-3 overflow-hidden transition-all">
                        <summary className="list-none p-3 cursor-pointer flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[12px] text-slate-400">inventory_2</span>
                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Items</p>
                          </div>
                          <span className="material-symbols-outlined text-slate-400 text-[10px] group-open:rotate-180 transition-transform">expand_more</span>
                        </summary>
                        <div className="px-3 pb-3 space-y-1.5">
                          {order.items && order.items.length > 0 ? (
                            order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-white/50 p-2 rounded-lg border border-slate-50">
                                <p className="text-[8px] font-black text-slate-900 uppercase">{item.name}</p>
                                <p className="text-[8px] font-black text-slate-900">₹{(item.price || 0) * (item.quantity || 1)}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-[8px] font-bold text-slate-400 italic text-center py-1">No items</p>
                          )}
                        </div>
                      </details>

                      <div className="grid grid-cols-2 gap-2">
                        <motion.button 
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDownloadInvoice(order)}
                          className="py-2.5 bg-slate-900 text-white rounded-lg font-black text-[7px] uppercase tracking-widest flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[10px]">picture_as_pdf</span>
                          Invoice
                        </motion.button>
                        <motion.button 
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            const newCart = { 'dry-clean': 2, 'ironing': 5 };
                            localStorage.setItem('cart_quantities', JSON.stringify(newCart));
                            navigate('/user/cart');
                          }}
                          className="py-2.5 bg-slate-900 text-white rounded-lg font-black text-[7px] uppercase tracking-widest flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[10px]">replay</span>
                          Reorder
                        </motion.button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-20 text-center opacity-40">
                    <span className="material-symbols-outlined text-5xl mb-4">archive</span>
                    <p className="text-xs font-black uppercase tracking-widest">No history found</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </>
        )}
      </main>
    </motion.div>
  );
};

export default OrdersHistoryPage;
