import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Store, 
  Factory, 
  Megaphone, 
  Handshake, 
  Wallet, 
  Bell, 
  MessageSquare, 
  Briefcase, 
  Share2, 
  HelpCircle, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MoreMenuPage = () => {
  const navigate = useNavigate();

  const userRaw = localStorage.getItem('user') || '{}';
  const user = JSON.parse(userRaw);
  const isVendor = user.role?.toLowerCase() === 'vendor';
  const isSupplier = user.role?.toLowerCase() === 'supplier';
  const isPartner = isVendor || isSupplier;

  const menuSections = useMemo(() => [
    {
      title: "Partnerships & Business",
      subtitle: "Grow your business with SPINZYT",
      items: [
        ...(!isPartner ? [
          { icon: Store, title: "Become a Vendor", desc: "Onboard your laundry workshop or store", path: "/user/become-vendor" },
          { icon: Factory, title: "Become a Supplier", desc: "Supply raw materials & packaging", path: "/user/become-supplier" }
        ] : []),
        { icon: Megaphone, title: "Advertise with us", desc: "Promote your brand across our platform", path: "/user/advertise" },
        { icon: Handshake, title: "Partner with us", desc: "Corporate alliances & logistics networks", path: "/user/partnerships" },
      ]
    },
    {
      title: "Account & Rewards",
      subtitle: "Wallet credits and notifications",
      items: [
        { icon: Wallet, title: "Wallet & Credits", desc: "Manage credits, refunds & cashback", path: "/user/profile/wallet" },
        { icon: Bell, title: "Notifications", desc: "Order status & system alerts", path: "/user/notifications" },
        { icon: Share2, title: "Refer & Earn", desc: "Invite friends and get discount credits", path: "/user/referral" },
      ]
    },
    {
      title: "Help & Career Center",
      subtitle: "Support, feedback, and job openings",
      items: [
        { icon: HelpCircle, title: "Help & FAQ", desc: "Answers to common questions & support", path: "/user/support" },
        { icon: MessageSquare, title: "App Feedback", desc: "Help us improve your experience", path: "/user/feedback" },
        { icon: Briefcase, title: "Careers", desc: "Explore open positions at SPINZYT", path: "/user/careers" },
      ]
    },
  ], [isPartner]);

  return (
    <div className="min-h-[100dvh] flex flex-col font-['Poppins',sans-serif] text-slate-900">
      <main className="flex-1 pb-36 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Header Title */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Explore SPINZYT</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal">
            Discover partner opportunities, career openings, wallet benefits, and customer help.
          </p>
        </div>

        {/* 3-Column Responsive Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {menuSections.map((section, sIdx) => (
            <div 
              key={sIdx}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                    {section.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-normal mt-0.5">
                    {section.subtitle}
                  </p>
                </div>

                <div className="space-y-1.5 pt-3">
                  {section.items.map((item, iIdx) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={iIdx}
                        onClick={() => navigate(item.path)}
                        className="w-full p-2.5 rounded-xl flex items-center justify-between text-left hover:bg-slate-50 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-slate-900 text-slate-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                            <IconComponent size={17} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-slate-950 truncate">
                              {item.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={15} className="text-slate-400 group-hover:text-slate-700 transition-colors shrink-0 ml-2" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="text-center pt-8">
          <p className="text-xs text-slate-400 font-normal">SPINZYT Ecosystem • Version 2.4.0</p>
        </div>
      </main>
    </div>
  );
};

export default MoreMenuPage;
