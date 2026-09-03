import React from 'react';
import Skeleton from './Skeleton';

export default function DetailViewSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
      {/* Top Banner & Header Skeleton */}
      <div className="bg-white border-b border-slate-200 px-6 py-8 shadow-sm">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-3xl" />
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-48 rounded-lg" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-64 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-28 rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
          </div>

          {/* Quick Info Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-2.5 w-16 rounded" />
                <Skeleton className="h-5 w-28 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Details Body */}
      <div className="max-w-[1600px] mx-auto w-full px-6 pt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary Left Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-4">
            <Skeleton className="h-5 w-40 rounded" />
            <div className="grid grid-cols-2 gap-4 pt-2">
              {[1, 2, 3, 4, 5, 6].map((field) => (
                <div key={field} className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                  <Skeleton className="h-2.5 w-20 rounded" />
                  <Skeleton className="h-4 w-36 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Table / Sub-list */}
          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-4">
            <Skeleton className="h-5 w-48 rounded" />
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((row) => (
                <div key={row} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar / Actions Panel */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-4">
            <Skeleton className="h-5 w-36 rounded" />
            <div className="space-y-3 pt-2">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-3">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
