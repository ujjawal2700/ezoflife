import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const MoreMenuPage = () => {
  const navigate = useNavigate();

  const userRaw = localStorage.getItem('user') || '{}';
  const user = JSON.parse(userRaw);
  const isVendor = user.role?.toLowerCase() === 'vendor';
  const isSupplier = user.role?.toLowerCase() === 'supplier';
  const isPartner = isVendor || isSupplier;

  const menuSections = useMemo(() => {
    const sections = [
        {
          title: "Partnerships & Updates",
          icon: "handshake",
          items: [
            ...(!isPartner ? [
              { icon: "storefront", title: "Become a Vendor", desc: "Onboard Physical Shop", path: "/user/become-vendor" },
              { icon: "factory", title: "Become a Supplier", desc: "Distribute Materials", path: "/user/become-supplier" }
            ] : []),
            { icon: "campaign", title: "Advertise with us", desc: "Digital Media Kit", path: "/user/advertise", color: "primary" },
            { icon: "handshake", title: "Partner with us", desc: "Logistics & Alliances", path: "/user/partnerships", color: "tertiary" },
            { icon: "account_balance_wallet", title: "Wallet", desc: "Manage credits & cashback", path: "/user/profile/wallet", color: "primary" },
            { icon: "notifications", title: "Notifications", desc: "View Alerts & Updates", path: "/user/notifications", color: "primary" },

            { icon: "reviews", title: "App Feedback", desc: "Share your experience", path: "/user/feedback", color: "tertiary" },
          ]
        },
        {
          title: "Ecosystem",
          icon: "lan",
          items: [
            { icon: "work", title: "Careers", desc: "Join the team", path: "/user/careers", color: "tertiary" },
            { icon: "share", title: "Refer us", desc: "Invite friends & family", path: "/user/referral", color: "secondary" }
          ]
        },
        {
          title: "Help & FAQ",
          icon: "support_agent",
          items: [
            { icon: "help_center", title: "Help & FAQ", desc: "FAQs & Instant Help", path: "/user/support" }
          ]
        },
      ];
    return sections;
  }, [isVendor, isSupplier]);

  const allItems = useMemo(() => {
    return menuSections.reduce((acc, section) => [...acc, ...section.items], []);
  }, [menuSections]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen pb-32 font-sans bg-slate-50/50">
      <main className="max-w-md mx-auto px-4 pt-24">
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-[2.2rem] border border-black/5 divide-y divide-black/5 overflow-hidden shadow-xl shadow-slate-200/50"
        >
          {allItems.map((item, idx) => (
            <motion.button 
              key={idx}
              variants={itemVariants}
              whileHover={{ backgroundColor: 'rgba(0,0,0,0.01)' }}
              whileTap={{ scale: 0.995 }}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center justify-between py-3 px-5 text-left group transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.color ? `bg-${item.color}/10 text-${item.color}` : 'bg-slate-50 text-slate-400'} group-hover:bg-slate-950 group-hover:text-white transition-colors`}>
                  <span className="material-symbols-outlined text-base">{item.icon}</span>
                </div>
                <div>
                  <span className="block font-black text-[13px] tracking-tight leading-none text-slate-900 group-hover:text-slate-950">{item.title}</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[10px] transition-transform group-hover:translate-x-1 text-slate-200">
                arrow_forward_ios
              </span>
            </motion.button>
          ))}
        </motion.div>

        <footer className="mt-8 px-4 text-center text-slate-300">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] mb-1">SPINZYT Operations</p>
          <p className="text-[7px] font-bold uppercase tracking-widest italic">v.2.4.0 • Core 2026</p>
        </footer>
      </main>
    </div>
  );
};

export default MoreMenuPage;
