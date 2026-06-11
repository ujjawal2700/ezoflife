import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SupplierBottomNav from '../components/SupplierBottomNav';

const SupplierLayout = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 text-slate-900 font-sans selection:bg-black/10 selection:text-black overflow-x-hidden">
      <main className="flex-1 w-full relative pb-24 pt-20">
        <Outlet />
      </main>

      <SupplierBottomNav />
    </div>
  );
};

export default SupplierLayout;
