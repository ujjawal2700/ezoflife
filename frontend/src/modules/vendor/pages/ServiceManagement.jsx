import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    ShoppingCart, Sparkles, ShoppingBag, Users, 
    TicketPercent, ArrowRight, ArrowUpRight, 
    ShieldCheck, Store, ChevronRight, HelpCircle
} from 'lucide-react';
import VendorHeader from '../components/VendorHeader';

const ServiceManagement = () => {
    const navigate = useNavigate();

    const services = [
        {
            id: 'walkin',
            title: 'Walk-In Hub',
            category: 'Counter Billing',
            description: 'Quickly bill over-the-counter walk-in customers and book an on-demand courier rider for doorstep customer delivery.',
            icon: ShoppingCart,
            iconBg: 'bg-slate-100 text-slate-800',
            badge: 'Quick POS',
            path: '/vendor/walk-in',
            tags: ['Over-the-Counter', 'Drop-off Rider', 'Instant Invoice'],
            actionText: 'Open Walk-In POS'
        },
        {
            id: 'myservices',
            title: 'My Services',
            category: 'Menu & Rates',
            description: 'Full control over your retail service catalog. Update per-article pricing, toggle active categories, and configure turnaround tiers.',
            icon: Sparkles,
            iconBg: 'bg-indigo-50 text-indigo-600',
            badge: 'Service Menu',
            path: '/vendor/my-services',
            tags: ['Wash & Fold', 'Dry Clean', 'Heritage Care'],
            actionText: 'Manage Menu'
        },
        {
            id: 'supplies',
            title: 'Order Supplies',
            category: 'B2B Procurement',
            description: 'Order certified detergents, conditioners, garment covers, packaging supplies, and hangers directly from verified suppliers.',
            icon: ShoppingBag,
            iconBg: 'bg-emerald-50 text-emerald-600',
            badge: 'Wholesale Stock',
            path: '/vendor/material-request',
            tags: ['Bulk Detergents', 'Packaging Bags', 'Hangers'],
            actionText: 'Order Materials'
        },
        {
            id: 'talent',
            title: 'Hire Talent',
            category: 'Staffing Solutions',
            description: 'Recruit skilled helpers, steam pressers, and certified laundry machine operators for temporary shifts or full-time placement.',
            icon: Users,
            iconBg: 'bg-purple-50 text-purple-600',
            badge: 'Workforce',
            path: '/vendor/labor-request',
            tags: ['Experienced Pressers', 'Shift Helpers', 'Fast Hiring'],
            actionText: 'Request Staff'
        },
        {
            id: 'promotions',
            title: 'Promotions',
            category: 'Marketing Hub',
            description: 'Create custom promo coupons, volume discounts, and seasonal campaign offers to increase local customer retention.',
            icon: TicketPercent,
            iconBg: 'bg-rose-50 text-rose-600',
            badge: 'Customer Deals',
            path: '/vendor/promotions',
            tags: ['Promo Codes', 'Campaign Tracking', 'Seasonal Deals'],
            actionText: 'Configure Promos'
        }
    ];

    return (
        <div className="font-['Poppins',sans-serif] text-slate-900">
            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
                
                {/* Header Title */}
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Services & Operations Hub</h1>
                    <p className="text-xs sm:text-sm text-slate-500 font-normal">
                        Configure your retail offerings, bill counter walk-ins, procure wholesale materials, and manage staff.
                    </p>
                </div>

                {/* 3-Column Responsive Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {services.map((service) => {
                        const IconComponent = service.icon;
                        return (
                            <motion.div
                                key={service.id}
                                whileHover={{ y: -3 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => navigate(service.path)}
                                className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-5 group"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className={`w-12 h-12 rounded-2xl ${service.iconBg} flex items-center justify-center shadow-xs`}>
                                            <IconComponent className="w-6 h-6" />
                                        </div>
                                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold tracking-wider uppercase border border-slate-200/60">
                                            {service.badge}
                                        </span>
                                    </div>

                                    <div className="space-y-1.5">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                            {service.category}
                                        </span>
                                        <h2 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                                            <span>{service.title}</span>
                                            <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </h2>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            {service.description}
                                        </p>
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {service.tags.map((tag, idx) => (
                                            <span key={idx} className="bg-slate-50 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-md border border-slate-200/60">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                        {service.actionText}
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-slate-600 flex items-center justify-center transition-colors">
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Operations Banner */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Partner Workshop Support</h3>
                            <p className="text-xs text-slate-500">
                                Need help configuring specialized dry cleaning rates or machine maintenance? Access our partner knowledge base.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate('/vendor/more')}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all shrink-0 cursor-pointer"
                    >
                        More Utilities
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ServiceManagement;
