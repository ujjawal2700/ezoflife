import React from 'react';

export default function StatusBadge({ status }) {
    const norm = String(status || '').trim();

    const statusMap = {
        'Active': { color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' },
        'Approved': { color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' },
        'Paid': { color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' },
        'DELIVERED': { color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' },
        'In Progress': { color: 'bg-blue-50 text-blue-700 border-blue-200/80', dot: 'bg-blue-500' },
        'PROCESSING': { color: 'bg-blue-50 text-blue-700 border-blue-200/80', dot: 'bg-blue-500' },
        'IN_TRANSIT': { color: 'bg-blue-50 text-blue-700 border-blue-200/80', dot: 'bg-blue-500' },
        'Pending': { color: 'bg-amber-50 text-amber-700 border-amber-200/80', dot: 'bg-amber-500' },
        'Pending Approval': { color: 'bg-amber-50 text-amber-700 border-amber-200/80', dot: 'bg-amber-500' },
        'ORDER_PLACED': { color: 'bg-amber-50 text-amber-700 border-amber-200/80', dot: 'bg-amber-500' },
        'PICKUP_ASSIGNED': { color: 'bg-amber-50 text-amber-700 border-amber-200/80', dot: 'bg-amber-500' },
        'RIDER_ARRIVING': { color: 'bg-amber-50 text-amber-700 border-amber-200/80', dot: 'bg-amber-500' },
        'Suspended': { color: 'bg-rose-50 text-rose-700 border-rose-200/80', dot: 'bg-rose-500' },
        'Blocked': { color: 'bg-rose-50 text-rose-700 border-rose-200/80', dot: 'bg-rose-500' },
        'Rejected': { color: 'bg-rose-50 text-rose-700 border-rose-200/80', dot: 'bg-rose-500' },
        'CANCELLED': { color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
        'Inactive': { color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
    };

    const matched = statusMap[norm] || { color: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' };

    // Pretty format string like ORDER_PLACED -> Order Placed
    const formattedText = norm.includes('_')
        ? norm.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
        : norm;

    return (
        <span className={`px-3 py-1 rounded-full text-[13px] font-medium border inline-flex items-center gap-2 whitespace-nowrap font-['Poppins',sans-serif] ${matched.color}`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${matched.dot}`} />
            {formattedText}
        </span>
    );
}
