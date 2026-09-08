import React, { useState, Suspense } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from '@/modules/admin/components/navigation/Sidebar';
import TopBar from '@/modules/admin/components/navigation/TopBar';

export default function AdminLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="admin-theme flex h-screen overflow-hidden text-slate-900 font-sans selection:bg-slate-900 selection:text-white antialiased">
      {/* Sidebar Command Engine */}
      <Sidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        isMobileOpen={isMobileOpen} 
        setIsMobileOpen={setIsMobileOpen} 
      />

      {/* Primary Context Area */}
      <div className={`flex-1 flex flex-col h-screen min-w-0 transition-all duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <TopBar onMenuClick={() => setIsMobileOpen(true)} />

        {/* Dynamic Context Delivery (Page Content) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative bg-slate-50/50">
            <Suspense fallback={
                <div className="h-full w-full flex items-center justify-center p-20 animate-pulse bg-white transition-all">
                    <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin shadow-black/5" />
                </div>
            }>
                <div className="h-full w-full p-0">
                    <Outlet />
                </div>
            </Suspense>
        </main>
      </div>
    </div>
  );
}
