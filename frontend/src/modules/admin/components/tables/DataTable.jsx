import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { MoreHorizontal, Search, RefreshCw, Trash2, Edit2 } from 'lucide-react';
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
    TablePagination,
    StatusBadge,
} from '@/shared/components/ui/table';

const DataTable = ({ 
  title, 
  columns = [], 
  data = [], 
  onAction = () => {},
  pagination,
  onPageChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data;
    const lowerSearch = searchTerm.toLowerCase();
    return data.filter(row => {
      return Object.keys(row).some(key => {
        const val = row[key];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(lowerSearch);
      });
    });
  }, [data, searchTerm]);

  const activePage = pagination?.page ?? page;
  const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = pagination ? filteredData : filteredData.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  const handlePageChange = (newPage) => {
    if (onPageChange) {
      onPageChange(newPage);
    } else {
      setPage(newPage);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col h-full font-['Poppins',sans-serif]">
      {/* Table Header Strip */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
        <div className="flex items-center gap-3">
          {title && <h3 className="text-base sm:text-lg font-semibold text-slate-900">{title}</h3>}
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {filteredData.length} records
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..." 
              className="w-48 sm:w-60 pl-9 pr-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-xs"
            />
          </div>
          <button 
            type="button"
            className="p-2 bg-white border border-slate-300 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-x-auto bg-white">
        <Table style={{ minWidth: '800px' }}>
          <TableHeader>
            <TableRow className="border-b border-slate-200">
              {columns.map((col, i) => (
                <TableHead 
                  key={i} 
                  className={cn("px-6 py-3.5 font-semibold text-[13.5px] text-slate-700 normal-case", col.align === 'right' && 'text-right')}
                >
                  {col.header}
                </TableHead>
              ))}
              <TableHead className="w-20 pr-6 text-right font-semibold text-[13.5px] text-slate-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? paginatedData.map((row, i) => (
              <TableRow 
                key={row.id || row._id || i}
                className="border-b border-slate-200/70 hover:bg-slate-50/80 transition-colors"
              >
                {columns.map((col, j) => {
                  const val = row[col.key];
                  return (
                    <TableCell 
                      key={j} 
                      className={cn(
                        "px-6 py-4.5 text-[14.5px] text-slate-700 font-normal leading-normal",
                        col.align === 'right' && 'text-right'
                      )}
                    >
                      {col.render ? col.render(val, row) : (
                        col.key === 'status' || col.key === 'isActive' ? (
                          <StatusBadge status={val} label={typeof val === 'boolean' ? (val ? 'Active' : 'Inactive') : val} />
                        ) : (
                          val ?? '—'
                        )
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="px-6 py-4.5 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5 justify-end">
                    <button 
                      onClick={() => onAction('edit', row)}
                      className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => onAction('delete', row)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="h-44 text-center text-slate-500 text-sm">
                  No records found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer / Pagination */}
      <TablePagination
        page={activePage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default DataTable;
