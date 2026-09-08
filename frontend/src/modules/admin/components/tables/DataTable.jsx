import React from 'react';
import { MoreHorizontal, Search, RefreshCw, Filter, ChevronRight, ChevronLeft } from 'lucide-react';

const DataTable = ({ title, columns = [], data = [], onAction = () => {}, density = 'default' }) => {
  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden flex flex-col h-full transition-all hover:border-slate-200 group">
      {/* Table Header */}
      <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky left-0 right-0 z-20 transition-all group-hover:bg-slate-50/50">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-[0.1em]">{title}</h3>
          <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 tabular-nums">
            {data.length} <span className="opacity-60 ml-1">TOTAL</span>
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group/search hidden md:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-blue-500" />
            <input 
              type="text" 
              placeholder="Search records..." 
              className="pl-9 pr-6 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-900 focus:bg-white focus:border-blue-500/20 transition-all outline-none"
            />
          </div>
          <button className="p-2.5 bg-slate-100 rounded-xl text-slate-400 hover:text-blue-500 transition-all relative border border-slate-200">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 overflow-x-auto no-scrollbar bg-white">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10 transition-colors">
              {columns.map((col, i) => (
                <th 
                  key={i} 
                  className={`px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] transition-all ${col.align === 'right' ? 'text-right' : ''}`}
                >
                  {col.header}
                </th>
              ))}
              <th className="px-8 py-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 transition-all">
            {data.map((row, i) => (
              <tr 
                key={i} 
                className="hover:bg-blue-50/30 transition-all cursor-pointer group/row border-b border-transparent hover:border-blue-500/10"
              >
                {columns.map((col, j) => (
                  <td 
                    key={j} 
                    className={`px-8 py-5 text-xs font-bold text-slate-700 tracking-tight transition-all duration-300 ${col.align === 'right' ? 'text-right' : ''}`}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                <td className="px-8 py-4 text-right bg-white sticky right-0 transition-all group-hover/row:bg-blue-50/10">
                   <button className="p-2 rounded-xl text-slate-300 hover:text-blue-600 hover:bg-white transition-all shadow-black/5" onClick={(e) => { e.stopPropagation(); onAction(row); }}>
                     <MoreHorizontal size={16} />
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between transition-colors group-hover:bg-slate-100/30">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Showing 1 to {data.length} of {data.length} results</p>
        <div className="flex items-center gap-1.5 rounded-xl px-1 py-1 bg-white border border-slate-200">
          <button className="p-1.5 text-slate-400 hover:text-slate-900 transition-all rounded-lg"><ChevronLeft size={16} /></button>
          <span className="text-[10px] font-bold text-slate-900 tracking-tighter tabular-nums px-2">PG 01 // 01</span>
          <button className="p-1.5 text-slate-400 hover:text-slate-900 transition-all rounded-lg"><ChevronRight size={16} /></button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
