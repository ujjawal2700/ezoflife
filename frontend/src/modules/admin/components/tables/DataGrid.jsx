import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
    MoreHorizontal, 
    ArrowUpDown, 
    Search, 
    Download, 
    Filter, 
    Inbox,
    Trash2,
    Edit2,
    Eye
} from 'lucide-react';
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
    TablePagination,
    StatusBadge,
    UserAvatarCell,
} from '@/shared/components/ui/table';

export default function DataGrid({
    columns = [],
    data = [],
    onRowClick,
    onAction,
    title,
    actions,
    footer,
    density = 'normal',
    stickyHeader = false,
    loading = false,
    pagination,
    onPageChange,
    showFilter = true,
    showSearch = true,
    showHeader = true,
    onDownload,
    minWidth = '800px',
    maxHeight,
    showTotalEntities = true,
    leftContent,
}) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredData = useMemo(() => {
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

    const totalCount = pagination?.total ?? (data?.length || 0);
    const totalColumns = columns.length + (onAction ? 1 : 0);

    return (
        <div className="w-full bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col font-['Poppins',sans-serif]">
            {/* Header Control Strip */}
            {showHeader && (
                <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                    <div className="flex items-center flex-wrap gap-3">
                        {title && (
                            <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-tight">
                                {title}
                            </h3>
                        )}
                        {showTotalEntities && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                {totalCount} {totalCount === 1 ? 'record' : 'records'}
                            </span>
                        )}
                        {leftContent}
                    </div>

                    <div className="flex items-center flex-wrap gap-2.5 w-full sm:w-auto">
                        {showSearch && (
                            <div className="relative flex-1 sm:w-64">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input 
                                    type="text" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search..." 
                                    className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-xs"
                                />
                            </div>
                        )}
                        {actions}
                        {onDownload && (
                            <button 
                                onClick={onDownload} 
                                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
                                title="Export / Download"
                            >
                                <Download size={15} className="text-slate-500" />
                                <span className="hidden sm:inline">Export</span>
                            </button>
                        )}
                        {showFilter && (
                            <button 
                                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
                                title="Filter"
                            >
                                <Filter size={15} className="text-slate-500" />
                                <span className="hidden sm:inline">Filters</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Main Table */}
            <div 
                className="overflow-x-auto relative"
                style={maxHeight ? { maxHeight } : undefined}
            >
                <Table style={{ minWidth }}>
                    <TableHeader className={cn(stickyHeader && "sticky top-0 z-20")}>
                        <TableRow className="border-b border-slate-200">
                            {columns.map((col, idx) => (
                                <TableHead
                                    key={idx}
                                    className={cn(
                                        "px-6 py-3.5 font-semibold text-[13.5px] text-slate-700 normal-case tracking-normal",
                                        col.align === 'right' ? "text-right" : col.align === 'center' ? "text-center" : "text-left",
                                        col.sticky && "sticky left-0 bg-slate-50 z-10"
                                    )}
                                    style={{ width: col.width }}
                                >
                                    <div className={cn(
                                        "inline-flex items-center gap-2",
                                        col.align === 'center' && "justify-center",
                                        col.align === 'right' && "justify-end",
                                        col.sortable && "cursor-pointer hover:text-slate-900"
                                    )}>
                                        <span>{col.header}</span>
                                        {col.sortable && <ArrowUpDown size={13} className="text-slate-400" />}
                                    </div>
                                </TableHead>
                            ))}
                            {onAction && <TableHead className="w-24 pr-6 text-right font-semibold text-[13.5px] text-slate-700">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {loading ? (
                            Array.from({ length: 6 }).map((_, rowIndex) => (
                                <TableRow key={rowIndex} className="border-b border-slate-200/70">
                                    {columns.map((col, colIndex) => (
                                        <TableCell
                                            key={colIndex}
                                            className={cn(
                                                "px-6 py-4.5",
                                                col.align === 'right' ? "text-right" : col.align === 'center' ? "text-center" : "text-left"
                                            )}
                                        >
                                            <div 
                                                className={cn(
                                                    "h-4 bg-slate-100 rounded-md animate-pulse",
                                                    colIndex % 3 === 0 ? "w-32" : colIndex % 3 === 1 ? "w-40" : "w-24",
                                                    col.align === 'center' && "mx-auto",
                                                    col.align === 'right' && "ml-auto"
                                                )}
                                            />
                                        </TableCell>
                                    ))}
                                    {onAction && (
                                        <TableCell className="px-6 py-4.5 text-right">
                                            <div className="h-5 w-12 bg-slate-100 rounded ml-auto animate-pulse" />
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        ) : filteredData.length > 0 ? (
                            filteredData.map((row, rowIdx) => {
                                return (
                                    <TableRow
                                        key={rowIdx}
                                        onClick={() => onRowClick?.(row)}
                                        className={cn(
                                            "border-b border-slate-200/70 transition-colors hover:bg-slate-50/80",
                                            onRowClick && "cursor-pointer"
                                        )}
                                    >
                                        {columns.map((col, colIdx) => {
                                            const cellVal = row[col.key];

                                            let content;
                                            if (col.render) {
                                                content = col.render(cellVal, row);
                                            } else if (col.key === 'isActive' || col.key === 'status') {
                                                const label = typeof cellVal === 'boolean' ? (cellVal ? 'Active' : 'Inactive') : cellVal;
                                                content = <StatusBadge status={label} label={label} />;
                                            } else {
                                                content = cellVal ?? '—';
                                            }

                                            return (
                                                <TableCell
                                                    key={colIdx}
                                                    className={cn(
                                                        "px-6 py-4.5 text-[14.5px] text-slate-700 font-normal leading-normal",
                                                        col.wrap ? "whitespace-normal" : "whitespace-nowrap",
                                                        col.align === 'right' ? "text-right" : col.align === 'center' ? "text-center" : "text-left",
                                                        col.sticky && "sticky left-0 bg-white group-hover:bg-slate-50 z-10"
                                                    )}
                                                >
                                                    {content}
                                                </TableCell>
                                            );
                                        })}
                                        {onAction && (
                                            <TableCell className="px-6 py-4.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                <div className="inline-flex items-center gap-1.5">
                                                    <button 
                                                        onClick={() => onAction(row, 'edit')}
                                                        className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => onAction(row, 'delete')}
                                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => onAction(row, 'more')}
                                                        className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                        title="More"
                                                    >
                                                        <MoreHorizontal size={16} />
                                                    </button>
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow className="hover:bg-transparent border-none">
                                <TableCell colSpan={totalColumns} className="h-44 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center">
                                            <Inbox size={22} className="text-slate-400" />
                                        </div>
                                        <p className="text-[15px] font-medium text-slate-900">No data available</p>
                                        <p className="text-sm text-slate-500">No records match your criteria.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Footer / Pagination: Exact UntitledUI 3-piece layout */}
            {pagination ? (
                <TablePagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={onPageChange}
                />
            ) : footer ? (
                footer
            ) : null}
        </div>
    );
}
