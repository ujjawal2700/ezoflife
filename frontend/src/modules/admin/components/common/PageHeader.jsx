import React from 'react';
import { Home, ChevronRight, PlusCircle, RefreshCw, FileText } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function PageHeader({ title, showBack = false, actions = [] }) {
    const navigate = useNavigate();
    const location = useLocation();
    const pathParts = location.pathname.split('/').filter(p => p !== '');

    return (
        <div className="bg-white border-b border-slate-200 sticky top-0 z-30 min-h-[44px]">
            <div className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {showBack && (
                        <button onClick={() => navigate(-1)} className="p-1.5 bg-slate-50 border border-slate-200 rounded-sm text-slate-400 hover:text-slate-900 transition-all">
                            <ChevronRight size={14} className="rotate-180" />
                        </button>
                    )}
                    <div className="flex flex-col">
                        <h1 className="text-sm font-bold text-slate-900 tracking-tighter uppercase leading-none">{title}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {actions.map((action, i) => {
                        if (action.customComponent) {
                            return <React.Fragment key={i}>{action.customComponent}</React.Fragment>;
                        }
                        return (
                            <button
                                key={i}
                                onClick={action.onClick}
                                className={`px-3 py-1.5 rounded-sm font-bold text-[9px] uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
                                    action.variant === 'primary' 
                                    ? 'bg-slate-900 text-white hover:bg-black' 
                                    : action.variant === 'rose'
                                    ? 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                } ${action.className || ''}`}
                            >
                                {action.icon && <action.icon size={13} />}
                                {action.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
