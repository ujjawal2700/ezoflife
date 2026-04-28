import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProfessionalTooltip({
    active,
    payload,
    label,
    currency = '₹',
    showComparison = true
}) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-slate-200 rounded-lg p-3 min-w-[200px] z-[100] selection:bg-slate-100">
                <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                    <div className="px-1.5 py-0.5 rounded bg-slate-50 text-[10px] font-bold text-slate-400">
                        {payload[0]?.payload?.period || 'Data Capture'}
                    </div>
                </div>

                <div className="space-y-2.5">
                    {payload.map((item, index) => {
                        const val = item.value;
                        const prevVal = item.payload?.previousValue;
                        const hasComparison = showComparison && prevVal !== undefined;
                        const diff = hasComparison ? ((val - prevVal) / prevVal) * 100 : 0;
                        const isPositive = diff > 0;
                        const isNeutral = diff === 0;

                        return (
                            <div key={index} className="flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
                                        <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-tight">{item.name || item.dataKey}</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-900 tabular-nums">
                                        {currency}{typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: val < 100 ? 2 : 0 }) : val}
                                    </span>
                                </div>

                                {hasComparison && (
                                    <div className="flex items-center justify-between pl-4">
                                        <span className="text-[10px] items-center italic text-slate-400">vs Prev Unit</span>
                                        <div className={cn(
                                            "flex items-center gap-0.5 text-[10px] font-bold px-1 rounded-sm",
                                            isNeutral ? "text-slate-400" : isPositive ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                                        )}>
                                            {isNeutral ? <Minus size={8} /> : isPositive ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                                            {Math.abs(diff).toFixed(1)}%
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {payload[0]?.payload?.insight && (
                    <div className="mt-3 pt-2 border-t border-slate-50">
                        <p className="text-[10px] text-slate-500 font-medium italic leading-relaxed opacity-60">
                            Analytics: {payload[0]?.payload?.insight}
                        </p>
                    </div>
                )}
            </div>
        );
    }

    return null;
}
