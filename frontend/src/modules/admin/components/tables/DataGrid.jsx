import React from 'react';
import { cn } from '@/lib/utils';
import { MoreHorizontal, ArrowUpDown, ChevronRight, Search, Download, Filter } from 'lucide-react';

export default function DataGrid({
    columns = [],
    data = [],
    onRowClick,
    onAction,
    title,
    actions,
    footer,
    density = 'compact', // compact, standard
    stickyHeader = true,
    loading = false,
    pagination,
    onPageChange,
    showFilter = true,
    showSearch = true,
    showHeader = true,
    onDownload,
    minWidth = '800px',
    maxHeight
}) {
    const [searchTerm, setSearchTerm] = React.useState('');

    const filteredData = React.useMemo(() => {
        if (!searchTerm) return data;
        const lowerSearch = searchTerm.toLowerCase();
        return data.filter(row => {
            return Object.keys(row).some(key => {
                const val = row[key];
                if (val === null || val === undefined) return false;
                if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
                    if (key === 'isActive') {
                        const statusStr = val ? 'active' : 'inactive';
                        return statusStr.includes(lowerSearch);
                    }
                    return String(val).toLowerCase().includes(lowerSearch);
                }
                return false;
            });
        });
    }, [data, searchTerm]);

    return (
        <div className="w-full bg-white border border-slate-200 flex flex-col rounded-sm">
            {/* Grid Header Strip */}
            {showHeader && (
                <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white z-20">
                    <div className="flex items-center flex-wrap gap-3">
                        <div className="w-1.5 h-6 bg-slate-900 rounded-sm" />
                        <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.2em] leading-none mb-1">
                            {title}
                        </h3>
                        <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-400 text-[10px] font-bold tabular-nums tracking-widest leading-none">
                            {pagination ? pagination.total : data.length} TOTAL ENTITIES
                        </span>
                    </div>
                    <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
                        {showSearch && (
                            <div className="relative group lg:block hidden">
                                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-slate-900 transition-all" />
                                <input 
                                     type="text" 
                                     value={searchTerm}
                                     onChange={(e) => setSearchTerm(e.target.value)}
                                     placeholder="Filter records..." 
                                     className="pl-8 pr-4 py-1.5 bg-slate-50 border border-slate-100 rounded-sm text-[10px] font-bold text-slate-900 focus:bg-white focus:border-slate-300 transition-all outline-none w-48"
                                />
                            </div>
                        )}
                        {actions}
                        {onDownload && (
                            <>
                                <div className="h-4 w-px bg-slate-100 mx-1" />
                                <button onClick={onDownload} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-sm" title="Download Excel/CSV">
                                    <Download size={14} />
                                </button>
                            </>
                        )}
                        {showFilter && (
                            <button className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-sm">
                                <Filter size={14} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Main Table Engine */}
            <div 
                className="overflow-x-auto overflow-y-auto relative z-10"
                style={maxHeight ? { maxHeight } : undefined}
            >
                <table className="w-full border-collapse text-left" style={{ minWidth }}>
                    <thead className={cn(
                        "bg-slate-50/50 border-b border-slate-200",
                        stickyHeader && "sticky top-0 z-20"
                    )}>
                        <tr>
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    className={cn(
                                        "text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] transition-all whitespace-nowrap",
                                        density === 'compact' ? "px-5 py-3" : "px-5 py-4",
                                        col.align === 'right' ? "text-right" : col.align === 'center' ? "text-center" : "text-left",
                                        col.sticky && "sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]"
                                    )}
                                    style={{ width: col.width }}
                                >
                                    <div className={cn(
                                        "flex items-center gap-1.5 group cursor-pointer hover:text-slate-900",
                                        col.align === 'center' && "justify-center",
                                        col.align === 'right' && "justify-end"
                                    )}>
                                        {col.header}
                                        {col.sortable && <ArrowUpDown size={10} className="text-slate-300 group-hover:text-slate-500" />}
                                    </div>
                                </th>
                            ))}
                            {onAction && <th className="px-5 py-3 w-10 border-b border-slate-200 bg-slate-50/50"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length + (onAction ? 1 : 0)} className="px-4 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 animate-pulse">Synchronizing entities...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredData.length > 0 ? (
                            filteredData.map((row, rowIdx) => (
                                <tr
                                    key={rowIdx}
                                    onClick={() => onRowClick?.(row)}
                                    className={cn(
                                        "group hover:bg-slate-50 transition-all border-b border-transparent hover:border-slate-200/50",
                                        onRowClick && "cursor-pointer"
                                    )}
                                >
                                    {columns.map((col, colIdx) => (
                                        <td
                                            key={colIdx}
                                            className={cn(
                                                "text-[12px] font-medium text-slate-700 tabular-nums tracking-tight",
                                                col.wrap ? "whitespace-normal" : "whitespace-nowrap",
                                                density === 'compact' ? "px-5 py-2.5" : "px-5 py-3.5",
                                                col.align === 'right' ? "text-right" : col.align === 'center' ? "text-center" : "text-left",
                                                col.sticky && "sticky left-0 bg-white group-hover:bg-slate-50 z-10"
                                            )}
                                        >
                                            {col.render ? col.render(row[col.key], row) : row[col.key]}
                                        </td>
                                    ))}
                                    {onAction && (
                                        <td className="px-5 py-3 text-right">
                                            <button className="p-1.5 rounded-sm text-slate-300 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition-all" onClick={(e) => { e.stopPropagation(); onAction?.(row); }}>
                                                <MoreHorizontal size={14} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length + (onAction ? 1 : 0)} className="px-4 py-16 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest opacity-60">
                                    Entity registry empty / No records found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination / Aggregation Intelligence */}
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end transition-colors hover:bg-slate-100/30">
                <div className="flex items-center gap-1">
                    <button 
                        disabled={!pagination || pagination.page <= 1 || loading}
                        onClick={() => onPageChange?.(pagination.page - 1)}
                        className="p-1 px-3 border border-slate-200 text-[9px] font-bold uppercase tracking-widest rounded-sm bg-white hover:bg-slate-950 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Prev
                    </button>
                    <span className="px-4 text-[9px] font-black text-slate-900 tracking-widest tabular-nums bg-slate-200/50 h-6 flex items-center rounded-sm whitespace-nowrap">
                        PG {String(pagination?.page || 1).padStart(2, '0')} / {String(pagination?.totalPages || 1).padStart(2, '0')}
                    </span>
                    <button 
                        disabled={!pagination || pagination.page >= pagination?.totalPages || loading}
                        onClick={() => onPageChange?.(pagination.page + 1)}
                        className="p-1 px-3 border border-slate-200 text-[9px] font-bold uppercase tracking-widest rounded-sm bg-white hover:bg-slate-950 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
