import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const navItems = [
  { label: 'Home', icon: 'home', path: '/supplier/dashboard' },
  { label: 'Supplier', icon: 'inventory_2', path: '/supplier/supplies' },
  { label: 'Profile', icon: 'person', path: '/supplier/profile' },
  { label: 'More', icon: 'menu', path: '/supplier/more' },
];

const SupplierBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const hideRoutes = [
    '/supplier/auth', 
    '/supplier/otp'
  ];

  if (hideRoutes.some(route => location.pathname === route)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-100 flex justify-center pointer-events-none h-16">
      <motion.div 
        layout
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto flex justify-around items-center w-full h-full overflow-visible"
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button 
              key={item.path} 
              id={`supplier-nav-${item.label.toLowerCase()}`}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center justify-center h-full transition-all duration-300 focus:outline-none touch-none no-underline flex-1 ${
                isActive ? 'text-white' : 'text-slate-400'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
                {isActive && (
                  <motion.div 
                    layoutId="supplierNavBubble"
                    className="absolute w-14 h-14 bg-black rounded-full shadow-xl shadow-black/30 z-0"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              
              <div className="relative z-10 flex flex-col items-center justify-center gap-0.5 pointer-events-none">
                <span 
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                
                <span className="font-headline font-black text-[7px] uppercase tracking-[0.1em]">
                  {item.label}
                </span>
              </div>
            </button>
          );
        })}
      </motion.div>
    </nav>
  );
};

export default SupplierBottomNav;
