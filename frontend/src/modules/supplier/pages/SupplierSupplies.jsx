import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    Boxes, Users, TicketPercent, ArrowRight, 
    Sparkles, ShieldCheck, Clock, Layers, 
    CheckCircle2, ArrowUpRight, HelpCircle
} from 'lucide-react';

const SupplierSupplies = () => {
    const navigate = useNavigate();
    const user = JSON.parse(
        localStorage.getItem('supplierData') || 
        localStorage.getItem('userData') || 
        localStorage.getItem('user') || 
        '{}'
    );

    const hubFeatures = [
        {
            id: 'supplies',
            title: 'My Supplies',
            category: 'Inventory Control',
            description: 'Manage your wholesale product registry, update per-unit rates, minimum order quantities, and active stock availability instantly.',
            icon: Boxes,
            iconBg: 'bg-blue-50 text-blue-600',
            badge: 'Core Catalog',
            path: '/supplier/my-supplies',
            tags: ['Wholesale Rates', 'Bulk Pricing', 'Stock Availability'],
            actionText: 'Manage Inventory'
        },
        {
            id: 'talent',
            title: 'Hire Talent',
            category: 'Staffing Solutions',
            description: 'Submit on-demand manpower requests and recruit experienced laundry operators, pressers, and facility helpers for your production line.',
            icon: Users,
            iconBg: 'bg-purple-50 text-purple-600',
            badge: 'Workforce',
            path: '/supplier/labor-request',
            tags: ['Certified Helpers', 'Flexible Shifts', 'Fast Placement'],
            actionText: 'Request Staff'
        },
        {
            id: 'promotions',
            title: 'Promotions',
            category: 'Marketing Hub',
            description: 'Configure seasonal discount coupons, volume rebates, and special campaign offers to incentivize vendor procurement.',
            icon: TicketPercent,
            iconBg: 'bg-rose-50 text-rose-600',
            badge: 'Vendor Deals',
            path: '/supplier/promotions',
            tags: ['Discount Coupons', 'Bulk Tiers', 'Volume Incentives'],
            actionText: 'Configure Offers'
        }
    ];

    return (
        <div className="font-['Poppins',sans-serif] text-slate-900">
            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
                
                {/* Page Title & Intro */}
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Operations & Supplies Hub</h1>
                    <p className="text-xs sm:text-sm text-slate-500 font-normal">
                        Control your wholesale catalogue, hire manpower for facility shifts, and run promotional vendor campaigns.
                    </p>
                </div>

                {/* 3-Column Responsive Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {hubFeatures.map((item) => {
                        const IconComponent = item.icon;
                        return (
                            <motion.div
                                key={item.id}
                                whileHover={{ y: -3 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => navigate(item.path)}
                                className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-5 group"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className={`w-12 h-12 rounded-2xl ${item.iconBg} flex items-center justify-center shadow-xs`}>
                                            <IconComponent className="w-6 h-6" />
                                        </div>
                                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold tracking-wider uppercase border border-slate-200/60">
                                            {item.badge}
                                        </span>
                                    </div>

                                    <div className="space-y-1.5">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                            {item.category}
                                        </span>
                                        <h2 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                                            <span>{item.title}</span>
                                            <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </h2>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            {item.description}
                                        </p>
                                    </div>

                                    {/* Feature Pills */}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {item.tags.map((tag, idx) => (
                                            <span key={idx} className="bg-slate-50 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-md border border-slate-200/60">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                        {item.actionText}
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-slate-600 flex items-center justify-center transition-colors">
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Helpful Guidelines Card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Need Custom Supply Distribution?</h3>
                            <p className="text-xs text-slate-500">
                                Maintain accurate stock quantities to avoid order cancellations and ensure fast fulfillment timelines.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate('/supplier/more')}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all shrink-0 cursor-pointer"
                    >
                        View More Tools
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SupplierSupplies;
