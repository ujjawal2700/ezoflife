import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const PaymentMethodsPage = () => {
  const navigate = useNavigate();
  
  // State Management
  const [methods, setMethods] = useState([
    { id: '1', type: 'card', brand: 'visa', last4: '4242', expiry: '12/26', holder: 'Julian Mendoza' },
    { id: '2', type: 'upi', brand: 'google_pay', handle: 'julian.m@okaxis' }
  ]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    type: 'card',
    cardNumber: '',
    expiry: '',
    holder: '',
    handle: ''
  });

  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }), []);

  const itemVariants = useMemo(() => ({
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
  }), []);

  const modalVariants = useMemo(() => ({
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
    exit: { opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.2 } }
  }), []);

  const paymentTypes = useMemo(() => [
    { id: 'card', icon: 'credit_card', label: 'Card' },
    { id: 'upi', icon: 'qr_code_2', label: 'UPI' }
  ], []);

  const handleDelete = (id) => {
    setMethods(prev => prev.filter(m => m.id !== id));
  };

  const handleEdit = (method) => {
    setEditingMethod(method);
    setFormData({
      type: method.type,
      cardNumber: method.type === 'card' ? `•••• •••• •••• ${method.last4}` : '',
      expiry: method.expiry || '',
      holder: method.holder || '',
      handle: method.handle || ''
    });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingMethod(null);
    setFormData({ type: 'card', cardNumber: '', expiry: '', holder: '', handle: '' });
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingMethod) {
      setMethods(prev => prev.map(m => 
        m.id === editingMethod.id 
          ? { 
              ...m, 
              ...formData, 
              last4: formData.type === 'card' ? (formData.cardNumber.includes('••') ? m.last4 : formData.cardNumber.slice(-4)) : m.last4 
            } 
          : m
      ));
    } else {
      const newMethod = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        last4: formData.type === 'card' ? formData.cardNumber.slice(-4) : undefined
      };
      setMethods(prev => [...prev, newMethod]);
    }
    setIsModalOpen(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-background text-on-background min-h-[100dvh] flex flex-col relative overflow-x-hidden"
    >
      <header className="fixed top-0 z-50 bg-white/70 backdrop-blur-xl w-full flex items-center px-6 py-4 border-b border-outline-variant/10">
        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-on-surface-variant mr-4">arrow_back</button>
        <h1 className="font-headline font-black text-xl text-primary tracking-tighter">Payment Methods</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-16 pb-36 w-full">
        <motion.section 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          <motion.div variants={itemVariants} className="ml-2">
            <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-black mb-1 block opacity-60">Wallet & Vault</span>
            <h2 className="text-3xl font-black tracking-tighter leading-none mb-3">Saved Methods</h2>
            <p className="text-xs font-bold text-on-surface-variant opacity-60">Manage your cards and digital payment IDs for a faster checkout flow.</p>
          </motion.div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {methods.map((method) => (
                <motion.div 
                  key={method.id}
                  layout
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-[2rem] p-6 flex items-center justify-between border border-outline-variant/10 shadow-sm group hover:shadow-md transition-all"
                >
                  <div 
                    className="flex items-center gap-5 cursor-pointer flex-1"
                    onClick={() => handleEdit(method)}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-2xl">
                        {method.type === 'card' ? 'credit_card' : 'qr_code_2'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-on-surface tracking-tight leading-none mb-1">
                        {method.type === 'card' ? `Visa •• ${method.last4}` : method.handle}
                      </h3>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-60">
                        {method.type === 'card' ? `Expires ${method.expiry}` : 'UPI ID'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEdit(method)}
                      className="material-symbols-outlined text-outline-variant hover:text-primary transition-colors p-2"
                    >
                      edit
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(method.id); }}
                      className="material-symbols-outlined text-outline-variant hover:text-error transition-colors p-2"
                    >
                      delete_outline
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <motion.button 
              variants={itemVariants}
              whileTap={{ scale: 0.98 }}
              onClick={openAddModal}
              className="w-full py-6 rounded-[2rem] border-2 border-dashed border-primary/20 text-primary font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/5 transition-all"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Add New Payment Method
            </motion.button>
          </div>

          <motion.div 
            variants={itemVariants}
            className="bg-primary/5 rounded-3xl p-8 flex items-start gap-5 border border-primary/10"
          >
            <div className="shrink-0 w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
              <span className="material-symbols-outlined text-xl">verified_user</span>
            </div>
            <div>
              <h4 className="text-sm font-black text-on-surface tracking-tight mb-1 uppercase">Bank-Grade Security</h4>
              <p className="text-[11px] font-bold text-on-surface-variant opacity-60 leading-relaxed">
                Your payment data is encrypted and stored in a secure vault. We never share your full card details with anyone.
              </p>
            </div>
          </motion.div>
        </motion.section>
      </main>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/40 backdrop-blur-sm">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden shadow-2xl relative"
            >
              <div className="p-8 pb-12">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black tracking-tighter uppercase italic">{editingMethod ? 'Update Method' : 'Secure Vault'}</h3>
                  <button onClick={() => setIsModalOpen(false)} className="material-symbols-outlined text-outline-variant">close</button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                  {/* Type Selector */}
                  <div className="flex gap-4 mb-8">
                    {paymentTypes.map(({ id, icon, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: id })}
                        className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 border-2 transition-all ${formData.type === id ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20' : 'border-outline-variant/10 text-on-surface-variant'}`}
                      >
                        <span className="material-symbols-outlined text-xl">{icon}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
                      </button>
                    ))}
                  </div>

                  {formData.type === 'card' ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Card Number</label>
                        <input 
                          type="text"
                          required
                          placeholder="0000 0000 0000 0000"
                          value={formData.cardNumber}
                          onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                          className="w-full bg-surface-container-low border border-slate-200 focus:ring-2 focus:ring-primary/20 rounded-2xl py-4 px-6 text-on-surface font-black"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Expiry Date</label>
                          <input 
                            type="text"
                            required
                            placeholder="MM/YY"
                            value={formData.expiry}
                            onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                            className="w-full bg-surface-container-low border border-slate-200 focus:ring-2 focus:ring-primary/20 rounded-2xl py-4 px-6 text-on-surface font-black"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">CVV</label>
                          <input 
                            type="password"
                            required
                            placeholder="***"
                            className="w-full bg-surface-container-low border border-slate-200 focus:ring-2 focus:ring-primary/20 rounded-2xl py-4 px-6 text-on-surface font-black"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Card Holder Name</label>
                        <input 
                          type="text"
                          required
                          placeholder="Julian Mendoza"
                          value={formData.holder}
                          onChange={(e) => setFormData({ ...formData, holder: e.target.value })}
                          className="w-full bg-surface-container-low border border-slate-200 focus:ring-2 focus:ring-primary/20 rounded-2xl py-4 px-6 text-on-surface font-black"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">UPI ID</label>
                      <input 
                        type="text"
                        required
                        placeholder="yourname@okaxis"
                        value={formData.handle}
                        onChange={(e) => setFormData({ ...formData, handle: e.target.value })}
                        className="w-full bg-surface-container-low border border-slate-200 focus:ring-2 focus:ring-primary/20 rounded-2xl py-4 px-6 text-on-surface font-black"
                      />
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full bg-primary text-on-primary py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 mt-8"
                  >
                    {editingMethod ? 'Confirm Update' : 'Save Securely'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PaymentMethodsPage;

