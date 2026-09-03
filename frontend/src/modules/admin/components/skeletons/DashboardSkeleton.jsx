import React from 'react';
import Skeleton from './Skeleton';

export default function DashboardSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
      {/* Global Control & Filter Header Skeleton */}
      <div className="bg-white border-b border-slate-200 px-6 py-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1600px] mx-auto space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-48 rounded-lg" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>

            {/* Channel selector pill skeleton */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit border border-slate-200/50 gap-1">
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>

          {/* Cascading dropdown selectors skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex flex-col gap-1.5">
                <Skeleton className="h-2.5 w-14 rounded ml-1" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-Tabs Panel Skeleton */}
      <div className="max-w-[1600px] mx-auto w-full px-6 pt-6">
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200/60">
          {[1, 2, 3, 4, 5].map((tab) => (
            <Skeleton key={tab} className="h-11 w-36 rounded-t-[1.2rem]" />
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="max-w-[1600px] mx-auto w-full px-6 pt-6 space-y-6">
        {/* Macro Metrics ROW (4 KPI Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200/80 p-6 rounded-[2rem] shadow-sm flex items-center justify-between"
            >
              <div className="space-y-3 flex-1">
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-8 w-28 rounded-md" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
              <Skeleton className="w-12 h-12 rounded-2xl shrink-0 ml-4" />
            </div>
          ))}
        </div>

        {/* Funnel + Core Chart Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fulfillment Funnel Card Skeleton */}
          <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-2.5 w-36 rounded" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>

            <div className="space-y-4 pt-2">
              {[
                { w: 'w-full' },
                { w: 'w-[85%]' },
                { w: 'w-[65%]' },
                { w: 'w-[45%]' }
              ].map((bar, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-28 rounded" />
                    <Skeleton className="h-3 w-12 rounded" />
                  </div>
                  <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden">
                    <Skeleton className={`h-full ${bar.w} rounded-full`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Secondary Intel / Donut Chart Card Skeleton */}
          <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-2.5 w-28 rounded" />
            </div>

            <div className="h-56 flex items-center justify-center">
              <Skeleton className="w-40 h-40 rounded-full border-8 border-slate-100" />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {[1, 2, 3, 4].map((legend) => (
                <div key={legend} className="flex items-center gap-2">
                  <Skeleton className="w-3 h-3 rounded-full" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lower Table / Ledger Strip Skeleton */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-7 w-28 rounded-lg" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="flex items-center justify-between py-2 border-b border-slate-50 gap-4">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-36 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
