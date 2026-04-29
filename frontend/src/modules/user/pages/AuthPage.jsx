import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '../../../lib/api';

const AuthPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);

  const [loginPhone, setLoginPhone] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [otpChannel, setOtpChannel] = useState('WhatsApp'); // 'WhatsApp' or 'SMS'
  const [agreedToTnC, setAgreedToTnC] = useState(false);
  const [apiError, setApiError] = useState('');
  const [isRetail, setIsRetail] = useState(false);

  const isLoginValid = loginPhone.length === 10 && /^\d+$/.test(loginPhone);
  const isSignupValid = signupPhone.length === 10 && /^\d+$/.test(signupPhone) && agreedToTnC;

  const handleRequestOtp = async (phone, type, extraData = {}) => {
    setApiError('');
    try {
      const response = await authApi.requestOtp(phone, otpChannel, type, extraData);
      if (response.message === 'OTP sent successfully') {
        navigate('/user/otp', { state: { phone, channel: otpChannel } });
      } else {
        setApiError(response.message || 'Something went wrong');
      }
    } catch (error) {
      setApiError('Server error. Please try again later.');
    }
  };

  // Auto-trigger for Login
  React.useEffect(() => {
    if (isLogin && isLoginValid) {
      handleRequestOtp(loginPhone, 'login');
    }
  }, [loginPhone, isLogin, isLoginValid]);

  // Auto-trigger for Signup
  React.useEffect(() => {
    if (!isLogin && isSignupValid) {
      handleRequestOtp(signupPhone, 'signup', { 
        customerType: isRetail ? 'retail' : 'individual' 
      });
    }
  }, [signupPhone, agreedToTnC, isLogin, isSignupValid, isRetail]);

  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5,
        staggerChildren: 0.05
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: { duration: 0.3 }
    }
  }), []);

  const itemVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 }
  }), []);

  const authTabs = useMemo(() => [
    { key: true, label: 'Login' },
    { key: false, label: 'Signup' }
  ], []);

  const WhatsAppIcon = ({ size = 16, className = "" }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217s.231.001.332.005c.109.004.258-.041.404.311.162.391.549 1.341.597 1.438.048.097.08.21.014.34-.066.13-.1.21-.2.325-.1.115-.21.257-.3.346-.1.091-.205.19-.087.394.119.204.529.873 1.137 1.414.783.699 1.444.916 1.646 1.017.204.102.323.086.444-.053.121-.139.521-.606.66-.813.14-.208.28-.174.472-.102.193.072 1.224.577 1.436.683.213.106.356.159.408.249.053.09.053.519-.091.924z"/>
    </svg>
  );

  const otpChannels = useMemo(() => [
    { id: 'WhatsApp', icon: 'chat', color: 'text-green-600' },
    { id: 'Both', icon: 'all_inclusive', color: 'text-indigo-600' },
    { id: 'SMS', icon: 'sms', color: 'text-primary' }
  ], []);

  return (
    <div className="bg-background font-body text-on-background min-h-[100dvh] flex flex-col overflow-x-hidden relative">
      {/* Refresh Button */}
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={() => window.location.reload()}
        className="absolute top-6 right-6 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-xl border border-white/20 text-slate-400 hover:text-slate-900 transition-all z-[60]"
      >
        <span className="material-symbols-outlined text-[20px]">refresh</span>
      </motion.button>

      {/* Hero Visual Section */}
      <div className="relative h-[25dvh] min-h-[220px] w-full overflow-hidden flex items-center justify-center">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary-container/30 rounded-full blur-[80px]"></div>
        <div className="absolute top-40 -right-20 w-96 h-96 bg-tertiary-container/20 rounded-full blur-[100px]"></div>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="z-10 text-center px-8"
        >
          <h1 className="font-headline font-black text-[2.5rem] md:text-[3.5rem] text-primary leading-none tracking-tight mb-2">SPINZYT</h1>

        </motion.div>
        <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-background to-transparent"></div>
      </div>

      {/* Auth Container */}
      <main className="flex-grow px-6 -mt-6 relative z-20 pb-12">
        <div className="max-w-md mx-auto">
          {/* Tabs */}
          <div className="flex items-center justify-center gap-10 mb-8">
            {authTabs.map(({ key, label }) => (
              <button 
                key={label}
                onClick={() => setIsLogin(key)}
                className="relative py-2 focus:outline-none"
              >
                <span className={`font-headline text-xl font-black transition-colors duration-300 ${isLogin === key ? 'text-on-background' : 'text-outline-variant hover:text-outline'}`}>
                  {label}
                </span>
                {isLogin === key && (
                  <motion.div 
                    layoutId="activeTabIndicator"
                    className="absolute -bottom-1 left-0 right-0 h-1.5 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Auth Card with AnimatePresence for content switching */}
          <motion.div 
            className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-[0_40px_60px_rgba(47,50,58,0.08)] border border-outline-variant/5"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? 'login' : 'signup'}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {isLogin ? (
                  <div className="login-content">
                    <motion.div variants={itemVariants} className="mb-8">
                      <h2 className="font-headline text-2xl font-black mb-1.5 text-on-surface tracking-tighter">Welcome Back</h2>
                      <p className="text-on-surface-variant text-sm font-semibold opacity-70">
                        Log in to your account with your phone number.
                      </p>
                    </motion.div>

                    <div className="space-y-6">
                      {/* OTP Channel Selector */}
                      <motion.div variants={itemVariants} className="flex bg-surface-container-low p-1 rounded-2xl border border-slate-300">
                        {otpChannels.map(channel => (
                          <button 
                            key={channel.id}
                            onClick={() => setOtpChannel(channel.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${otpChannel === channel.id ? `bg-white shadow-sm ${channel.color}` : 'text-on-surface-variant opacity-40'}`}
                          >
                            {channel.id === 'WhatsApp' ? (
                              <WhatsAppIcon size={14} className={otpChannel === channel.id ? 'fill-green-600' : 'fill-on-surface-variant opacity-40'} />
                            ) : (
                              <span className="material-symbols-outlined text-sm">{channel.icon}</span>
                            )}
                            {channel.id}
                          </button>
                        ))}
                      </motion.div>
                      <motion.div variants={itemVariants} className="relative group">
                        <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2.5 ml-1">Phone Number</label>
                        <div className={`flex items-center bg-surface-container-low rounded-2xl p-1 border border-slate-300 transition-all focus-within:bg-white focus-within:ring-2 ${loginPhone.length > 0 && !isLoginValid ? 'focus-within:ring-error/20 ring-error/10' : 'focus-within:ring-primary/20'}`}>
                          <div className="px-4 font-black text-on-surface text-sm">+91</div>
                          <input 
                            className="w-full bg-transparent border-none focus:ring-0 py-4 px-2 text-on-surface font-black placeholder:text-on-surface/30 placeholder:font-medium" 
                            placeholder="000 000 0000" 
                            type="tel"
                            maxLength={10}
                            value={loginPhone}
                            onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ''))}
                          />
                        </div>
                        {loginPhone.length > 0 && !isLoginValid && (
                            <p className="text-[9px] text-error font-bold mt-2 ml-1 animate-pulse">Enter a valid 10-digit number</p>
                        )}
                      </motion.div>

                      <motion.button 
                        variants={itemVariants}
                        whileTap={isLoginValid ? { scale: 0.98 } : {}}
                        onClick={() => isLoginValid && handleRequestOtp(loginPhone, 'login')}
                        disabled={!isLoginValid}
                        className={`w-full font-headline font-black py-5 rounded-2xl shadow-xl tracking-widest uppercase text-xs transition-all duration-300 ${isLoginValid ? 'bg-primary-gradient text-on-primary shadow-primary/20' : 'bg-surface-container-high text-outline-variant cursor-not-allowed opacity-50'}`}
                      >
                        Send Code
                      </motion.button>
                      
                      {apiError && isLogin && (
                        <p className="text-[10px] text-error font-black text-center mt-2 animate-pulse">{apiError}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="signup-content">
                    <motion.div variants={itemVariants} className="mb-8">
                      <h2 className="font-headline text-2xl font-black mb-1.5 text-on-surface tracking-tighter">Create Account</h2>
                      <p className="text-on-surface-variant text-sm font-semibold opacity-70">
                        Start your journey to pristine fabrics today.
                      </p>
                    </motion.div>

                    <div className="space-y-4">
                      {/* OTP Channel Selector */}
                      <motion.div variants={itemVariants} className="flex bg-surface-container-low p-1 rounded-2xl border border-slate-300 mb-2">
                        {otpChannels.map(channel => (
                          <button 
                            key={channel.id}
                            onClick={() => setOtpChannel(channel.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${otpChannel === channel.id ? `bg-white shadow-sm ${channel.color}` : 'text-on-surface-variant opacity-40'}`}
                          >
                            <span className="material-symbols-outlined text-sm">{channel.icon}</span>
                            {channel.id}
                          </button>
                        ))}
                      </motion.div>
 
                      <motion.div variants={itemVariants}>
                        <label className="block font-label text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2.5 ml-1">Phone Number</label>
                        <div className={`flex items-center bg-surface-container-low rounded-2xl p-1 border border-slate-300 focus-within:bg-white focus-within:ring-2 ${signupPhone.length > 0 && signupPhone.length !== 10 ? 'focus-within:ring-error/20 ring-error/10' : 'focus-within:ring-primary/20'}`}>
                          <div className="px-4 font-black text-on-surface text-sm">+91</div>
                          <input 
                            className="w-full bg-transparent border-none focus:ring-0 py-4 px-2 text-on-surface font-black placeholder:text-on-surface/30 placeholder:font-medium" 
                            placeholder="000 000 0000" 
                            type="tel" 
                            maxLength={10}
                            value={signupPhone}
                            onChange={(e) => setSignupPhone(e.target.value.replace(/\D/g, ''))}
                          />
                        </div>
                        {signupPhone.length > 0 && signupPhone.length !== 10 && (
                            <p className="text-[9px] text-error font-bold mt-2 ml-1">Enter a valid 10-digit number</p>
                        )}
                      </motion.div>

                      {/* Business/Retail Selection */}
                      <motion.div 
                        variants={itemVariants}
                        onClick={() => setIsRetail(!isRetail)}
                        className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer border transition-all ${isRetail ? 'bg-primary/5 border-primary shadow-sm' : 'bg-surface-container-low border-slate-300'}`}
                      >
                        <div className="flex flex-col">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isRetail ? 'text-primary' : 'text-on-surface-variant opacity-60'}`}>Business/Retail Mode</span>
                          <span className="text-[9px] font-bold text-on-surface-variant opacity-40 uppercase">For Bulk & Professional Services</span>
                        </div>
                        <div className={`w-10 h-6 rounded-full p-1 transition-all ${isRetail ? 'bg-primary' : 'bg-slate-300'}`}>
                           <motion.div 
                             animate={{ x: isRetail ? 16 : 0 }}
                             className="w-4 h-4 bg-white rounded-full shadow-sm"
                           />
                        </div>
                      </motion.div>

                      {/* T&C Checkbox */}
                      <motion.div variants={itemVariants} className="flex items-start gap-3 px-1 py-1">
                        <button 
                          onClick={() => setAgreedToTnC(!agreedToTnC)}
                          className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all border ${agreedToTnC ? 'bg-primary border-primary text-white' : 'bg-surface-container-low border-outline-variant/20'}`}
                        >
                          {agreedToTnC && <span className="material-symbols-outlined text-[14px]">check</span>}
                        </button>
                        <p className="text-[10px] font-bold text-on-surface-variant leading-relaxed">
                          I agree to the <span className="text-primary underline cursor-pointer">Terms & Conditions</span> and provide consent.
                        </p>
                      </motion.div>

                      <motion.button 
                        variants={itemVariants}
                        whileTap={isSignupValid ? { scale: 0.98 } : {}}
                        onClick={() => isSignupValid && handleRequestOtp(signupPhone, 'signup', { customerType: isRetail ? 'retail' : 'individual' })}
                        disabled={!isSignupValid}
                        className={`w-full font-headline font-black py-5 rounded-2xl shadow-xl tracking-widest uppercase text-xs mt-4 transition-all duration-300 ${isSignupValid ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-primary/20' : 'bg-surface-container-high text-outline-variant cursor-not-allowed opacity-50'}`}
                      >
                        Create Account
                      </motion.button>

                      {apiError && !isLogin && (
                        <p className="text-[10px] text-error font-black text-center mt-4 animate-pulse">{apiError}</p>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Footer micro-copy */}
          <motion.p className="mt-10 text-center text-[11px] text-on-surface-variant font-semibold tracking-wide px-4 opacity-50 underline underline-offset-4 cursor-pointer">
            Trouble logging in? Get support from SPINZYT Team
          </motion.p>
        </div>
      </main>

      {/* Background Decorative Elements */}
      <div className="fixed bottom-12 right-12 w-16 h-16 bg-primary-container/20 rounded-full blur-xl pointer-events-none"></div>
      <div className="fixed top-1/2 -left-8 w-24 h-24 bg-tertiary-container/10 rounded-full blur-2xl pointer-events-none"></div>
    </div>
  );
};

export default AuthPage;

