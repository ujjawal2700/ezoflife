import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Store, 
  Megaphone, 
  Handshake, 
  Briefcase, 
  Bell, 
  Share2, 
  HelpCircle, 
  MessageSquare, 
  Boxes, 
  Truck, 
  Headphones, 
  ChevronRight,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

const SupplierMorePage = () => {
  const navigate = useNavigate();

  const menuSections = useMemo(() => [
    {
      title: "Commercial & Partnerships",
      subtitle: "Grow your distribution reach with SPINZYT",
      badge: "Growth",
      items: [
        { 
          icon: Store, 
          title: "Become a Vendor", 
          desc: "Onboard physical laundry workshops or retail points", 
          path: "/user/become-vendor",
          iconColor: "text-indigo-600",
          iconBg: "bg-indigo-50 border-indigo-100"
        },
        { 
          icon: Megaphone, 
          title: "Advertise with us", 
          desc: "Promote wholesale supplies in our digital media kit", 
          path: "/user/advertise",
          iconColor: "text-amber-600",
          iconBg: "bg-amber-50 border-amber-100"
        },
        { 
          icon: Handshake, 
          title: "Partner with us", 
          desc: "Logistics network alliances and corporate contracts", 
          path: "/user/partnerships",
          iconColor: "text-emerald-600",
          iconBg: "bg-emerald-50 border-emerald-100"
        },
      ]
    },
    {
      title: "Operations & Ecosystem",
      subtitle: "Catalog management and platform updates",
      badge: "Platform",
      items: [
        { 
          icon: Boxes, 
          title: "Supplies Catalog", 
          desc: "Browse and update your listed wholesale inventory", 
          path: "/supplier/supplies",
          iconColor: "text-indigo-600",
          iconBg: "bg-indigo-50 border-indigo-100"
        },
        { 
          icon: Bell, 
          title: "Supplier Notifications", 
          desc: "Real-time wholesale orders and system announcements", 
          path: "/supplier/notifications",
          iconColor: "text-sky-600",
          iconBg: "bg-sky-50 border-sky-100"
        },
        { 
          icon: Share2, 
          title: "Refer Partners", 
          desc: "Invite manufacturers, distributors, and vendors", 
          path: "/user/referral",
          iconColor: "text-purple-600",
          iconBg: "bg-purple-50 border-purple-100"
        },
        { 
          icon: Briefcase, 
          title: "Careers", 
          desc: "Explore job openings and executive positions", 
          path: "/user/careers",
          iconColor: "text-slate-700",
          iconBg: "bg-slate-100 border-slate-200"
        },
      ]
    },
    {
      title: "Help & Partner Support",
      subtitle: "Dedicated resolution desk and instant assistance",
      badge: "Support 24/7",
      items: [
        { 
          icon: HelpCircle, 
          title: "Help Center", 
          desc: "Guides, tutorials, and billing policies", 
          path: "/user/support",
          iconColor: "text-indigo-600",
          iconBg: "bg-indigo-50 border-indigo-100"
        },
        { 
          icon: Headphones, 
          title: "Live Support & Tickets", 
          desc: "Open a direct ticket with supplier operations", 
          path: "/user/support/tickets",
          iconColor: "text-emerald-600",
          iconBg: "bg-emerald-50 border-emerald-100"
        },
        { 
          icon: MessageSquare, 
          title: "Help & FAQ", 
          desc: "Instant answers for common fulfillment queries", 
          path: "/user/faq",
          iconColor: "text-amber-600",
          iconBg: "bg-amber-50 border-amber-100"
        },
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
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Supplier Hub
                </span>
                <span className="text-xs font-bold text-slate-400">•</span>
                <span className="text-xs font-bold text-slate-500">Ecosystem & Services</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Partner Services & Resources
              </h1>
              <p className="text-sm font-semibold text-slate-500 max-w-2xl">
                Access commercial expansion programs, operational notifications, partner referral perks, and priority live help.
              </p>
            </div>

            <div className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-600 shrink-0">
              <Sparkles size={16} className="text-indigo-600" />
              <span>SPINZYT B2B Supplier Portal</span>
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
            EZ OF LIFE PARTNER PLATFORM • v3.2.0
          </p>
        </div>

      </main>
    </div>
  );
};

export default SupplierMorePage;
