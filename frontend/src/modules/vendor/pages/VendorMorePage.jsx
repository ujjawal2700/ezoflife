import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  History, 
  Package, 
  ShoppingBag, 
  Sliders, 
  Wallet, 
  Star, 
  Users2, 
  Megaphone, 
  Handshake, 
  Bell, 
  Share2, 
  HelpCircle, 
  ChevronRight,
  Briefcase,
  Sparkles
} from 'lucide-react';

const VendorMorePage = () => {
  const navigate = useNavigate();

  const menuSections = useMemo(() => [
    {
      title: "Store Operations & History",
      subtitle: "Performance metrics and past orders",
      badge: "Operations",
      items: [
        { 
          icon: BarChart3, 
          title: "Business Insights & Reports", 
          desc: "Track daily sales, volume, and growth analytics", 
          path: "/vendor/reports",
          iconColor: "text-indigo-600",
          iconBg: "bg-indigo-50 border-indigo-100"
        },
        { 
          icon: History, 
          title: "Customer Order History", 
          desc: "View past fulfilled laundry & dry cleaning orders", 
          path: "/vendor/order-history",
          iconColor: "text-slate-800",
          iconBg: "bg-slate-100 border-slate-200"
        },
        { 
          icon: Package, 
          title: "B2B Supplies & Packaging", 
          desc: "Track raw material purchases from approved suppliers", 
          path: "/vendor/material-orders",
          iconColor: "text-sky-600",
          iconBg: "bg-sky-50 border-sky-100"
        },
        { 
          icon: ShoppingBag, 
          title: "Counter Walk-in POS", 
          desc: "Create offline drop-off tickets directly at your counter", 
          path: "/vendor/walk-in",
          iconColor: "text-emerald-600",
          iconBg: "bg-emerald-50 border-emerald-100"
        }
      ]
    },
    {
      title: "Services & Financials",
      subtitle: "Service catalog, reviews, and settlements",
      badge: "Revenue",
      items: [
        { 
          icon: Sliders, 
          title: "Service Management", 
          desc: "Configure laundry pricing, turnaround time, and categories", 
          path: "/vendor/services",
          iconColor: "text-indigo-600",
          iconBg: "bg-indigo-50 border-indigo-100"
        },
        { 
          icon: Wallet, 
          title: "Earnings & Payouts", 
          desc: "Inspect weekly settlements, payouts, and bank ledger", 
          path: "/vendor/earnings",
          iconColor: "text-emerald-600",
          iconBg: "bg-emerald-50 border-emerald-100"
        },
        { 
          icon: Star, 
          title: "Customer Ratings & Reviews", 
          desc: "View customer feedback, ratings, and quality benchmarks", 
          path: "/vendor/reviews",
          iconColor: "text-amber-600",
          iconBg: "bg-amber-50 border-amber-100"
        },
        { 
          icon: Users2, 
          title: "Labor & Staff Requisitions", 
          desc: "Hire verified ironers, washers, and dry cleaners", 
          path: "/vendor/labor-request",
          iconColor: "text-purple-600",
          iconBg: "bg-purple-50 border-purple-100"
        }
      ]
    },
    {
      title: "Partnerships & Support",
      subtitle: "Alliances, notifications, and priority help",
      badge: "Support",
      items: [
        { 
          icon: Bell, 
          title: "Notifications & Order Alerts", 
          desc: "Live sound alerts and urgent order updates", 
          path: "/vendor/notifications",
          iconColor: "text-sky-600",
          iconBg: "bg-sky-50 border-sky-100"
        },
        { 
          icon: Megaphone, 
          title: "Advertise with us", 
          desc: "Promote your workshop brand in customer app highlights", 
          path: "/user/advertise",
          iconColor: "text-amber-600",
          iconBg: "bg-amber-50 border-amber-100"
        },
        { 
          icon: Handshake, 
          title: "Partner with us", 
          desc: "Franchise opportunities and corporate alliances", 
          path: "/user/partnerships",
          iconColor: "text-emerald-600",
          iconBg: "bg-emerald-50 border-emerald-100"
        },
        { 
          icon: HelpCircle, 
          title: "Help Center & FAQ", 
          desc: "Operational manuals, support tickets, and live assistance", 
          path: "/vendor/support",
          iconColor: "text-indigo-600",
          iconBg: "bg-indigo-50 border-indigo-100"
        }
      ]
    }
  ], []);

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 pb-36 font-['Poppins',sans-serif]">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-8">
        
        {/* Page Header */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-slate-900 text-white border border-slate-900">
                  Vendor Hub
                </span>
                <span className="text-xs font-bold text-slate-400">•</span>
                <span className="text-xs font-bold text-slate-500">Operations & Tools</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Workshop Operations & Services
              </h1>
              <p className="text-sm font-semibold text-slate-500 max-w-2xl">
                Access your store performance metrics, service catalog, supply orders, settlements, and partner support.
              </p>
            </div>

            <div className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-600 shrink-0">
              <Sparkles size={16} className="text-indigo-600" />
              <span>SPINZYT Vendor Operational Suite</span>
            </div>
          </div>
        </div>

        {/* 3-Column Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {menuSections.map((section, sIdx) => (
            <div 
              key={sIdx}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 pb-3.5 border-b border-slate-100">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      {section.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">
                      {section.subtitle}
                    </p>
                  </div>
                  {section.badge && (
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 shrink-0">
                      {section.badge}
                    </span>
                  )}
                </div>

                <div className="space-y-2 pt-3">
                  {section.items.map((item, iIdx) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={iIdx}
                        onClick={() => navigate(item.path)}
                        className="w-full p-3 rounded-2xl flex items-center justify-between text-left hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${item.iconBg || 'bg-slate-100 border-slate-200'} ${item.iconColor || 'text-slate-700'}`}>
                            <IconComponent size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block font-black text-sm text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug truncate">
                              {item.title}
                            </span>
                            <span className="block text-xs font-medium text-slate-400 truncate mt-0.5">
                              {item.desc}
                            </span>
                          </div>
                        </div>

                        <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Footer */}
        <div className="text-center pt-4 pb-8">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            EZ OF LIFE VENDOR OPERATIONS • v3.2.0
          </p>
        </div>

      </main>
    </div>
  );
};

export default VendorMorePage;
