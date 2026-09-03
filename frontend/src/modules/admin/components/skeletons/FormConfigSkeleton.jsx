import React from 'react';
import Skeleton from './Skeleton';

export default function FormConfigSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
      {/* Page Header Skeleton */}
      <div className="bg-white border-b border-slate-200 px-6 py-6 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-52 rounded-lg" />
            <Skeleton className="h-3 w-36 rounded" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Metric Cards Top Strip */}
      <div className="bg-white border-b border-slate-100 py-3">
        <div className="max-w-[1600px] mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="p-4 bg-slate-50 rounded-2xl space-y-2">
              <Skeleton className="h-2.5 w-20 rounded" />
              <Skeleton className="h-6 w-24 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Form Cards */}
      <div className="max-w-[1600px] mx-auto w-full px-6 pt-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((card) => (
            <div key={card} className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-40 rounded" />
                  <Skeleton className="h-2.5 w-56 rounded" />
                </div>
              </div>

              <div className="space-y-4">
                {[1, 2, 3].map((field) => (
                  <div key={field} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-3 w-32 rounded" />
                      <Skeleton className="h-3 w-12 rounded" />
                    </div>
                    <Skeleton className="h-11 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
