import React from 'react';
import { Dot } from 'lucide-react';

export default function StatusBadge({ status }) {
    const statusMap = {
        'Active': { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-600' },
        'In Progress': { color: 'bg-indigo-50 text-indigo-600 border-indigo-100', dot: 'bg-indigo-600 animate-pulse' },
        'PROCESSING': { color: 'bg-blue-50 text-blue-600 border-blue-100', dot: 'bg-blue-600 animate-pulse' },
        'READY_FOR_DISPATCH': { color: 'bg-blue-50 text-blue-600 border-blue-100', dot: 'bg-blue-600' },
        'DELIVERED': { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-600' },
        'Paid': { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-600' },
        'ORDER_PLACED': { color: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-600' },
        'PICKUP_ASSIGNED': { color: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-600' },
        'RIDER_ARRIVING': { color: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-600' },
        'IN_TRANSIT': { color: 'bg-indigo-50 text-indigo-600 border-indigo-100', dot: 'bg-indigo-600 animate-pulse' },
        'RECEIVED_BY_VENDOR': { color: 'bg-indigo-50 text-indigo-600 border-indigo-100', dot: 'bg-indigo-600 animate-pulse' },
        'OUT_FOR_DELIVERY': { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-600 animate-pulse' },
        'Suspended': { color: 'bg-rose-50 text-rose-600 border-rose-100', dot: 'bg-rose-600' },
        'CANCELLED': { color: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-500' },
        'Inactive': { color: 'bg-slate-50 text-slate-400 border-slate-100', dot: 'bg-slate-400' },
        'Pending Approval': { color: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-600 animate-pulse' },
        'Approved': { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-600' },
    };

    const { color, dot } = statusMap[status] || { color: 'bg-slate-50 text-slate-400 border-slate-100', dot: 'bg-slate-400' };

    return (
        <div className={`px-2.5 py-1 rounded-[1px] text-[8px] font-bold uppercase tracking-[0.25em] border inline-flex items-center gap-1.5 hover:scale-[1.02] transition-transform ${color}`}>
            <span className={`w-1 h-1 rounded-full shrink-0 ${dot}`} />
            {status}
        </div>
    );
}
