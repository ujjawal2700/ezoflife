import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    ShoppingBag,
    Users,
    Store,
    Truck,
    Monitor,
    BarChart3,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ShieldCheck,
    UserCircle,
    CreditCard,
    FileText,
    TrendingUp,
    Package,
    Tags,
    Star,
    Clock,
    HelpCircle,
    Home,
    Bike,
    ShieldAlert,
    Layers,
    MessageSquare,
    Handshake,
    Bell,
    Briefcase,
    ClipboardList,
    Factory,
    Rocket,
    MapPin,
    Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
    {
        group: 'Operations', items: [
            { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
            { icon: Users, label: 'User Management', path: '/admin/users' },
            { 
                icon: ShieldCheck, 
                label: 'Approvals', 
                path: '/admin/vendors/approvals',
                subItems: [
                    { label: 'Vendor Requests', path: '/admin/vendors/approvals' },
                    { label: 'Supplier Requests', path: '/admin/supplier-requests' },
                ]
            },
            { icon: ClipboardList, label: 'Vendor Service Request', path: '/admin/vendor-service-requests' },
            { icon: ShoppingBag, label: 'Orders', path: '/admin/orders' },
            { 
                icon: CreditCard, 
                label: 'Payments', 
                path: '/admin/payments',
                subItems: [
                    { label: 'Customer Payments', path: '/admin/payments?tab=customer' },
                    { label: 'Customer Analytics', path: '/admin/customer-payments' },
                    { label: 'Vendor Payouts', path: '/admin/payments?tab=vendor' },
                    { label: 'Supplier Payouts', path: '/admin/payments?tab=supplier' },
                    { label: 'Pending COD', path: '/admin/payments?tab=cod' },
                    { label: 'Refunds', path: '/admin/payments?tab=refunds' },
                ]
            },
            { 
                icon: Layers, 
                label: 'Services & Pricing', 
                path: '/admin/services',
                subItems: [
                    { label: 'Category Management', path: '/admin/categories' },
                    { label: 'Geofence Management', path: '/admin/geofencing' },
                    { label: 'Master Services', path: '/admin/master-services' },
                    { label: 'Service Geofence', path: '/admin/geofence-table' },
                    { label: 'Master Pricing Table', path: '/admin/master-pricing' },
                    { label: 'Global Policies', path: '/admin/pricing' },
                ]
            },
            { 
                icon: Factory, 
                label: 'Vendor Supply Pricing', 
                path: '/admin/vendor-supply-pricing/categories',
                subItems: [
                    { label: 'Category Management', path: '/admin/vendor-supply-pricing/categories' },
                    { label: 'Product Table', path: '/admin/vendor-supply-pricing/products' },
                    { label: 'Master Supplies Table', path: '/admin/vendor-supply-pricing/supplies' },
                    { label: 'Supplier Service Zone', path: '/admin/vendor-supply-pricing/zones' }
                ]
            },


            { 
                icon: MessageSquare, 
                label: 'Support Tickets', 
                path: '/admin/help-desk',
                subItems: [
                    { label: 'Customer Issues', path: '/admin/help-desk?activeTab=Customer' },
                    { label: 'Vendor Issues', path: '/admin/help-desk?activeTab=Vendor' },
                    { label: 'Supplier Issue', path: '/admin/help-desk?activeTab=Supplier' },
                    { label: 'Missing Item Dispute', path: '/admin/dispute-center' },
                ]
            },

            { 
                icon: Bell, 
                label: 'Notifications', 
                path: '/admin/notifications',
                subItems: [
                    { label: 'Offers', path: '/admin/notifications?type=offers' },
                    { label: 'Maintenance alert', path: '/admin/notifications?type=maintenance' },
                    { label: 'Payment reminder', path: '/admin/notifications?type=payment' },
                ]
            },
            { icon: HelpCircle, label: 'FAQ Manager', path: '/admin/faqs' },
            { icon: ShieldAlert, label: 'Privacy Policy', path: '/admin/privacy-policy' },
            { icon: FileText, label: 'Terms & Conditions', path: '/admin/terms-conditions' },
            { icon: Rocket, label: 'Splash Ads', path: '/admin/ads' },
            { icon: MessageSquare, label: 'Advertise', path: '/admin/advertise' },
            { icon: Share2, label: 'Referral Settings', path: '/admin/referral-settings' },
            { icon: FileText, label: 'B2B Leads', path: '/admin/b2b-leads' },
            { icon: Handshake, label: 'Partnerships', path: '/admin/partnerships' },
            { icon: Star, label: 'Customer Feedback', path: '/admin/feedback' },
        ]
    },
    {
        group: 'Network', items: [
            { 
                icon: Briefcase, 
                label: 'Career Center', 
                path: '/admin/careers/admin-posts',
                subItems: [
                    { label: 'Admin Posts', path: '/admin/careers/admin-posts' },
                    { label: 'Vendor Posts', path: '/admin/careers/vendor-posts' },
                    { label: 'Role Details', path: '/admin/careers/role-details' },
                ]
            },
            { icon: Star, label: 'Ranking Engine', path: '/admin/vendor-ranking' },
        ]
    },
    {
        group: 'Core Assets', items: [
            { icon: Layers, label: 'Material Catalog', path: '/admin/materials' },
        ]
    },
    {
        group: 'Settings', items: [
            { icon: Settings, label: 'Settings', path: '/admin/settings' },
            { icon: FileText, label: 'Invoice Design', path: '/admin/invoice-settings' },
        ]
    }
];

export default function Sidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [expandedMenu, setExpandedMenu] = useState(null);

    useEffect(() => {
        // Auto-expand menu item if a sub-item is active
        const currentPath = location.pathname;
        const matchingItem = navItems.flatMap(g => g.items).find(item => 
            item.subItems && item.subItems.some(sub => {
                const subPathOnly = sub.path.split('?')[0];
                return currentPath === subPathOnly;
            })
        );
        if (matchingItem) {
            setExpandedMenu(matchingItem.label);
        }
    }, [location.pathname]);

    return (
        <>
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileOpen(false)}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] lg:hidden"
                    />
                )}
            </AnimatePresence>

            <aside 
                className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 z-[60] flex flex-col transition-all duration-300 
                    ${isCollapsed ? "w-20" : "w-64"} 
                    ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
                `}
            >
                {/* Header / Brand */}
                <div className="h-14 flex items-center justify-between px-6 border-b border-slate-100">
                    {!isCollapsed ? (
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-slate-900 rounded-sm flex items-center justify-center">
                                <span className="text-white font-bold text-sm">E</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-[13px] tracking-tight text-slate-900 leading-none uppercase">SPINZYT</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Admin Panel</span>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full flex justify-center">
                            <div className="w-7 h-7 bg-slate-900 rounded-sm flex items-center justify-center">
                                <span className="text-white font-bold text-sm">E</span>
                            </div>
                        </div>
                    )}

                    {/* Mobile Close Button */}
                    <button 
                        onClick={() => setIsMobileOpen(false)}
                        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-sm hover:bg-slate-50 text-slate-400"
                    >
                        <ChevronLeft size={18} />
                    </button>
                </div>

                {/* Navigation Selection Engine */}
                <nav className="flex-1 px-3 py-6 space-y-8 overflow-y-auto no-scrollbar">
                    {navItems.map((group) => (
                        <div key={group.group} className="space-y-1.5">
                            {(!isCollapsed || isMobileOpen) && (
                                <div className="px-3 mb-2">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">
                                        {group.group}
                                    </span>
                                </div>
                            )}
                            {group.items.map((item) => {
                                const isActive = location.pathname === item.path || (item.subItems && item.subItems.some(sub => location.pathname === sub.path.split('?')[0]));
                                const isExpanded = expandedMenu === item.label;
                                const hasSubItems = item.subItems && item.subItems.length > 0;

                                return (
                                    <div key={item.label}>
                                        <button
                                            onClick={() => {
                                                if (hasSubItems) {
                                                    setExpandedMenu(isExpanded ? null : item.label);
                                                } else {
                                                    navigate(item.path);
                                                    setIsMobileOpen(false);
                                                }
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm transition-all duration-200 group relative ${
                                                isActive 
                                                  ? "bg-slate-900 text-white shadow-slate-200" 
                                                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                            }`}
                                        >
                                            <item.icon size={16} className={`shrink-0 ${isActive ? "text-white" : "group-hover:text-slate-900 transition-colors"}`} />
                                            {(!isCollapsed || isMobileOpen) && (
                                                <>
                                                    <span className={`font-bold text-[11px] uppercase tracking-[0.1em] flex-1 text-left whitespace-nowrap overflow-hidden transition-all ${
                                                        isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100"
                                                    }`}>
                                                        {item.label}
                                                    </span>
                                                    {hasSubItems && (
                                                        <ChevronDown 
                                                            size={12} 
                                                            className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} 
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </button>

                                        {/* Sub Items Rendering */}
                                        <AnimatePresence>
                                            {hasSubItems && isExpanded && (!isCollapsed || isMobileOpen) && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden bg-slate-50/50 rounded-sm mt-1 ml-4 border-l border-slate-200"
                                                >
                                                    {item.subItems.map((sub) => {
                                                        const isSubActive = location.pathname + location.search === sub.path;
                                                        return (
                                                            <button
                                                                key={sub.label}
                                                                onClick={() => {
                                                                    navigate(sub.path);
                                                                    setIsMobileOpen(false);
                                                                }}
                                                                className={`w-full text-left px-6 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                                                                    isSubActive ? "text-slate-900 bg-slate-100/50" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100/30"
                                                                }`}
                                                            >
                                                                {sub.label}
                                                            </button>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* Tactical Footer */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                    <button
                        onClick={() => {
                            localStorage.clear();
                            navigate('/user/auth');
                            setIsMobileOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all group ${(isCollapsed && !isMobileOpen) && "justify-center"}`}
                    >
                        <LogOut size={16} />
                        {(!isCollapsed || isMobileOpen) && <span className="font-bold text-[10px] uppercase tracking-[0.2em]">Logout</span>}
                    </button>
                </div>

                {/* Collapse Trigger (Floating) - Desktop Only */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-20 w-6 h-6 bg-slate-900 text-white rounded-full hidden lg:flex items-center justify-center border-2 border-white z-50 hover:scale-110 transition-all"
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </aside>
        </>
    );
}
