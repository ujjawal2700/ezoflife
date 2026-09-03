import React from 'react';
import Skeleton from './Skeleton';

export default function AdminPageSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
      {/* Universal Page Header Skeleton */}
      <div className="bg-white border-b border-slate-200 px-6 py-6 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
        </div>
      </div>

      {/* KPI Stats Strip Skeleton */}
      <div className="bg-white border-b border-slate-100 py-3">
        <div className="max-w-[1600px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 bg-slate-50 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-2.5 w-20 rounded" />
                <Skeleton className="w-4 h-4 rounded-full" />
              </div>
              <Skeleton className="h-7 w-28 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Primary Data Grid Skeleton */}
      <div className="max-w-[1600px] mx-auto w-full px-6 pt-6">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-2.5 w-24 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-48 rounded-xl hidden sm:block" />
              <Skeleton className="h-9 w-24 rounded-xl" />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5, 6].map((row) => (
              <div key={row} className="flex items-center justify-between py-3 border-b border-slate-50 gap-4">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-44 rounded" />
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
