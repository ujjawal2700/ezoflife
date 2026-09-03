import React from 'react';
import Skeleton from './Skeleton';

export default function MetricRowSkeleton({ count = 4 }) {
  return (
    <div className="bg-white border-b border-slate-200">
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${count} divide-y md:divide-y-0 md:divide-x divide-slate-100 max-w-[1600px] mx-auto w-full`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex flex-col py-4 px-6 h-full justify-center space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="w-3.5 h-3.5 rounded-sm" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
              <Skeleton className="h-4 w-12 rounded-sm" />
            </div>
            <div className="flex items-baseline justify-between gap-3 pt-1">
              <Skeleton className="h-7 w-28 rounded-md" />
              <Skeleton className="h-6 w-16 rounded opacity-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
