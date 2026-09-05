import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SupplierHeader from '../components/SupplierHeader';
import SupplierBottomNav from '../components/SupplierBottomNav';

const SupplierLayout = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const hideHeaderRoutes = ['/supplier/auth', '/supplier/otp'];
  const showHeader = !hideHeaderRoutes.includes(currentPath);

  return (
    <div className="admin-theme flex flex-col min-h-screen text-slate-900 font-['Poppins',sans-serif] selection:bg-black/10 selection:text-black overflow-x-hidden">
      {showHeader && <SupplierHeader />}

      <main className={`flex-1 w-full relative bg-slate-50/50 ${showHeader ? 'pt-16 sm:pt-20' : ''} pb-24 md:pb-12`}>
        <Outlet />
      </main>

      <SupplierBottomNav />
    </div>
  );
};

export default SupplierLayout;
