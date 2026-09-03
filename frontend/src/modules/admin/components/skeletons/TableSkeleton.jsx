import React from 'react';
import Skeleton from './Skeleton';

export function TableRowSkeleton({ cols = 6, density = 'normal' }) {
  const widths = ['w-24', 'w-36', 'w-20', 'w-44', 'w-28', 'w-16', 'w-32', 'w-20'];
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: cols }).map((_, idx) => (
        <td
          key={idx}
          className={`${density === 'compact' ? 'px-4 py-3' : 'px-6 py-4'}`}
        >
          <Skeleton className={`h-4 ${widths[idx % widths.length]} rounded-md`} />
        </td>
      ))}
    </tr>
  );
}

export default function TableSkeleton({ rows = 6, cols = 6, title, showHeader = true }) {
  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {showHeader && (
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            {title ? (
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">{title}</h3>
            ) : (
              <Skeleton className="h-4 w-40 rounded" />
            )}
            <Skeleton className="h-2.5 w-24 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-44 rounded-lg hidden sm:block" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead className="bg-slate-50/70 border-b border-slate-200/80">
            <tr>
              {Array.from({ length: cols }).map((_, idx) => (
                <th key={idx} className="px-6 py-4">
                  <Skeleton className="h-3 w-16 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <TableRowSkeleton key={rowIdx} cols={cols} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
