import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const userRole = useMemo(() => {
    try {
      return (localStorage.getItem('userRole') || 'customer').toLowerCase();
    } catch (e) {
      return 'customer';
    }
  }, []);

  const userType = useMemo(() => {
    try {
      return (localStorage.getItem('userType') || 'individual').toLowerCase();
    } catch (e) {
      return 'individual';
    }
  }, []);

  const navItems = useMemo(() => {
    switch (userRole) {
      case 'vendor':
        return [
          { label: 'Dashboard', icon: 'dashboard', path: '/vendor/dashboard' },
          { label: 'My Services', icon: 'local_laundry_service', path: '/vendor/services' },
          { label: 'Profile', icon: 'person', path: '/vendor/profile' },
          { label: 'More', icon: 'menu', path: '/user/more' }
        ];
      case 'supplier':
        return [
          { label: 'Home', icon: 'home', path: '/supplier/dashboard' },
          { label: 'Supplies', icon: 'inventory_2', path: '/supplier/supplies' },
          { label: 'Profile', icon: 'person', path: '/user/profile' },
          { label: 'More', icon: 'menu', path: '/user/more' }
        ];
      case 'rider':
        return [
          { label: 'Deliveries', icon: 'delivery_dining', path: '/rider/dashboard' },
          { label: 'History', icon: 'history', path: '/rider/history' },
          { label: 'Profile', icon: 'person', path: '/user/profile' },
          { label: 'More', icon: 'menu', path: '/user/more' }
        ];
      default: // customer
        return [
          { label: 'Home', icon: 'home', path: '/user/home' },
          { 
            label: userType === 'retail' ? 'Bulk Orders' : 'My Orders', 
            icon: userType === 'retail' ? 'inventory' : 'local_laundry_service', 
            path: '/user/orders' 
          },
          { label: 'Profile', icon: 'person', path: '/user/profile' },
          { label: 'More', icon: 'menu', path: '/user/more' }
        ];
    }
  }, [userRole, userType]);

  const handleNavClick = (path) => {
    // Public paths allowed without login
    const publicPaths = ['/user/home', '/user/more', '/user/land'];
    const getSafeToken = () => {
      try { return localStorage.getItem('token'); }
      catch (e) { return null; }
    };
    const token = getSafeToken();

    if (!token && !publicPaths.includes(path)) {
      navigate('/user/auth');
      return;
    }
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-2xl border-t border-slate-100 pb-safe shadow-[0_-1px_10px_rgba(0,0,0,0.02)]">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <motion.button 
              key={item.path}
              id={`nav-${item.label.toLowerCase()}`}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleNavClick(item.path)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 ${
                isActive ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`flex flex-col items-center transition-transform duration-300 ${isActive ? '-translate-y-0.5' : ''}`}>
                <span className="material-symbols-outlined text-[24px] mb-0.5" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                  {item.icon}
                </span>
                <span className="font-black text-[9px] uppercase tracking-widest">{item.label}</span>
              </div>
              {isActive && (
                <motion.div 
                  layoutId="activeIndicator"
                  className="absolute bottom-0 w-8 h-1 bg-slate-900 rounded-t-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
