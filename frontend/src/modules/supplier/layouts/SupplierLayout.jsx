import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SupplierBottomNav from '../components/SupplierBottomNav';

const SupplierLayout = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const isSuppliesPage = currentPath === '/supplier/supplies';

  return (
    <div className="admin-theme flex flex-col min-h-screen text-slate-900 font-sans selection:bg-black/10 selection:text-black overflow-x-hidden">
      <main className={`flex-1 w-full relative bg-slate-50/50 ${isSuppliesPage ? 'pb-4' : 'pb-24'}`}>
        <Outlet />
      </main>

      <SupplierBottomNav />
    </div>
  );
};

export default SupplierLayout;
