import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 pb-safe shadow-lg h-16 flex justify-center md:hidden font-['Poppins',sans-serif]">
      <div className="flex justify-around items-center w-full h-full max-w-md mx-auto px-3">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <button 
              key={item.path}
              id={`nav-${item.label.toLowerCase()}`}
              onClick={() => handleNavClick(item.path)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full transition-colors cursor-pointer group",
                isActive ? "text-slate-900 font-semibold" : "text-slate-400 hover:text-slate-700 font-medium"
              )}
            >
              {isActive && (
                <span className="absolute top-1 w-8 h-1 rounded-full bg-slate-900" />
              )}
              <div className="flex flex-col items-center justify-center gap-1">
                <span 
                  className={cn(
                    "material-symbols-outlined text-[22px] transition-transform", 
                    isActive ? "scale-110 text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                  )} 
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                <span className="text-[10px] leading-none tracking-tight">{item.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
