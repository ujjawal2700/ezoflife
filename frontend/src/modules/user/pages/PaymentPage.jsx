import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import UserHeader from '../components/UserHeader';

const PaymentSelectionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { amount: initialAmount = 0, orderId = '', orderNumber = '' } = location.state || {};
  const [order, setOrder] = React.useState(null);
  const [loading, setLoading] = React.useState(!!orderId);

  React.useEffect(() => {
    if (orderId) {
      const { orderApi } = import('../../../lib/api'); // Dynamic import for safety
      import('../../../lib/api').then(({ orderApi }) => {
          orderApi.getById(orderId).then(res => {
            setOrder(res);
            setLoading(false);
          }).catch(err => {
            console.error('Error fetching order for payment breakdown:', err);
            setLoading(false);
          });
      });
    }
  }, [orderId]);

  const amount = order ? (order.advanceAmount || order.totalAmount) : initialAmount;
  const isPartial = order && order.advanceAmount && order.advanceAmount < order.totalAmount;

  const taxBreakdown = React.useMemo(() => {
    if (!order || !order.items) {
      return {
        subtotal: amount * 0.9,
        tax: amount * 0.1,
        logistics: 0
      };
    }

    const subtotal = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const logistics = order.deliveryCharge || 0;
    const itemsTax = order.items.reduce((acc, item) => {
        const itemGst = item.gst !== undefined ? item.gst : 0.18;
        return acc + (item.price * item.quantity * itemGst);
    }, 0);
    const logisticsTax = logistics * 0.18;

    return {
      subtotal,
      logistics,
      tax: itemsTax + logisticsTax
    };
  }, [order, amount]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
  };

  const [selectedMethod, setSelectedMethod] = React.useState('online');

  const paymentOptions = [
    { id: 'online', title: 'Online Payment', desc: 'UPI, Cards, Net Banking', icon: 'payments', accent: 'primary' },
    { id: 'cash', title: 'Cash on Delivery', desc: 'Pay to rider after delivery', icon: 'handshake', accent: 'tertiary' }
  ];

  const handleFinalizePayment = () => {
      navigate('/user/success-feedback', { 
          state: { 
              orderId,
              orderNumber,
              amount,
              method: selectedMethod 
          } 
      });
  };

  if (loading) {
      return (
          <div className="min-h-screen bg-background flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
      );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-background text-on-background min-h-[100dvh] flex flex-col"
    >

      <main className="max-w-2xl mx-auto px-6 pt-28 pb-36 w-full">
        {/* Editorial Header */}
        <motion.section 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="mb-12 ml-2"
        >
          <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-black mb-2 block opacity-60">Order {orderNumber}</span>
          <h1 className="text-4xl md:text-5xl font-black text-on-background leading-none tracking-tighter mb-4">
            Payment <br/><span className="text-primary tracking-tighter">Gateway</span>
          </h1>
          <p className="text-xs font-bold text-on-surface-variant opacity-60 leading-relaxed max-w-[280px]">
            {isPartial ? `Pay advance of ₹${amount.toFixed(0)} to confirm your order.` : 'Your transition to freshness is almost complete.'}
          </p>
        </motion.section>

        {/* Bill Summary Cards Bento */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
        >
          <motion.div 
            variants={itemVariants}
            className="bg-primary/5 rounded-[2.5rem] p-10 flex flex-col justify-between min-h-[220px] relative overflow-hidden border border-primary/10 group shadow-sm shadow-primary/5"
          >
            <div className="z-10">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3 opacity-60">
                {isPartial ? 'Advance Amount' : 'Amount to Pay'}
              </p>
              <p className="text-5xl font-black text-on-surface tracking-tighter leading-none">₹{amount.toFixed(0)}</p>
            </div>
            <div className="z-10 flex gap-2 items-center text-on-surface-variant opacity-60">
              <span className="material-symbols-outlined text-sm font-black" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Insured Transaction</span>
            </div>
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform"></div>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            className="bg-white rounded-[2.5rem] p-10 flex flex-col justify-center space-y-4 shadow-sm border border-outline-variant/10"
          >
            {[
              { label: 'Order Total', value: `₹${(order?.totalAmount || initialAmount).toFixed(0)}`, color: 'on-surface-variant' },
              { label: 'Paid Now', value: `₹${amount.toFixed(0)}`, color: 'primary' },
              { label: 'Remaining', value: isPartial ? `₹${(order.dueAmount).toFixed(0)}` : '₹0', color: isPartial ? 'tertiary' : 'on-surface' }
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between items-center group/line">
                <span className="text-[10px] font-black text-on-surface-variant opacity-60 uppercase tracking-widest">{item.label}</span>
                <span className={`text-sm font-black tracking-tight text-${item.color}`}>
                  {item.value}
                </span>
              </div>
            ))}
            <div className="h-px bg-outline-variant/5 my-2"></div>
            <p className="text-[9px] font-bold text-slate-400 italic uppercase tracking-widest leading-relaxed">
                {isPartial ? 'Pay advance to initiate pickup. Balance will be due after service completion.' : 'Full payment required for this service tier.'}
            </p>
          </motion.div>
        </motion.div>

        {/* Payment Options */}
        <motion.section 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <div className="flex items-center justify-between mb-4 px-4">
            <h3 className="font-headline font-black text-xl text-on-surface tracking-tighter">Selection</h3>
            <span className="text-[10px] font-black text-primary uppercase tracking-widest opacity-60">3 Options Available</span>
          </div>
          {paymentOptions.map((opt, i) => (
            <motion.button 
              key={opt.id}
              variants={itemVariants}
              onClick={() => setSelectedMethod(opt.id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full p-6 rounded-[2rem] flex items-center justify-between border-2 transition-all group ${
                selectedMethod === opt.id 
                  ? 'bg-white border-primary shadow-xl shadow-primary/5' 
                  : 'bg-white/40 border-transparent backdrop-blur-sm'
              }`}
            >
              <div className="flex items-center gap-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                  selectedMethod === opt.id ? `bg-${opt.accent} text-on-primary` : `bg-${opt.accent}-container/40 text-${opt.accent}`
                }`}>
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>{opt.icon}</span>
                </div>
                <div className="text-left">
                  <p className="font-black text-lg text-on-surface tracking-tight leading-none mb-1">{opt.title}</p>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-60">{opt.desc}</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                selectedMethod === opt.id ? 'bg-primary border-primary' : 'border-outline-variant/30'
              }`}>
                {selectedMethod === opt.id && <span className="material-symbols-outlined text-white text-sm font-black">check</span>}
              </div>
            </motion.button>
          ))}
        </motion.section>

        {/* Security Badge Minimal */}
        <motion.div 
          variants={itemVariants} 
          initial="hidden"
          animate="visible"
          className="mt-16 flex flex-col items-center text-center opacity-60"
        >
          <div className="flex items-center gap-2.5 px-6 py-2 bg-white rounded-full mb-4 shadow-sm border border-outline-variant/10">
            <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
            <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] leading-none mt-0.5">Secure Encryption</span>
          </div>
          <p className="text-[10px] font-black text-on-surface-variant leading-relaxed max-w-[280px] uppercase tracking-widest">
            PCI-DSS compliant processing provided for your safety.
          </p>
        </motion.div>

        {/* Interaction Action CTA */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
          className="fixed md:relative bottom-32 left-0 right-0 px-6 md:px-0 md:mt-16 z-40"
        >
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleFinalizePayment}
            className="w-full bg-primary-gradient py-6 rounded-2xl text-on-primary font-headline font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-primary/20 tracking-[0.2em] uppercase"
          >
            {selectedMethod === 'cash' ? 'Confirm Cash on Delivery' : 'Pay Now'}
            <span className="material-symbols-outlined text-2xl">arrow_forward</span>
          </motion.button>
        </motion.div>
      </main>
    </motion.div>
  );
};

export default PaymentSelectionPage;
