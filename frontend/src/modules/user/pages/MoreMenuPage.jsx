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
          title: "Help & Support",
          icon: "help_center",
          items: [
            { icon: "support_agent", title: "Help Center", desc: "Guides & Tutorials", path: "/user/support" },
            { icon: "quiz", title: "FAQs", desc: "Instant Answers", path: "/user/faq" }
          ]
        },
      ];
    return sections;
  }, [isVendor, isSupplier]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen pb-40 font-sans">
      <main className="max-w-md mx-auto px-6 pt-20">

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-10"
        >
          {menuSections.map((section, idx) => (
            <div key={idx} className="space-y-4">
              <div className="flex items-center gap-2 px-2 text-slate-400">
                <span className="material-symbols-outlined text-[14px]">{section.icon}</span>
                <h4 className="font-headline font-black text-[9px] uppercase tracking-[0.3em]">{section.title}</h4>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-black/5 divide-y divide-black/5 overflow-hidden shadow-sm shadow-primary/5">
                {section.items.map((item) => (
                  <motion.button 
                    key={item.path}
                    variants={itemVariants}
                    whileHover={{ backgroundColor: 'rgba(0,0,0,0.01)' }}
                    whileTap={{ scale: 0.995 }}
                    onClick={() => navigate(item.path)}
                    className="w-full flex items-center justify-between p-5 text-left group transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color ? `bg-${item.color}/10 text-${item.color}` : 'bg-slate-100 text-slate-400'} group-hover:bg-slate-950 group-hover:text-white transition-colors`}>
                        <span className="material-symbols-outlined text-xl">{item.icon}</span>
                      </div>
                      <div>
                        <span className="block font-black text-sm tracking-tight leading-none mb-1 text-slate-900 group-hover:text-slate-950">{item.title}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{item.desc}</span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1 text-slate-200">
                      {item.rightIcon || 'chevron_right'}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          ))}

          <footer className="mt-12 px-4 text-center text-slate-400">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">SPINZYT Operations Control</p>
            <p className="text-[9px] font-bold uppercase tracking-widest italic">v.2.4.0-Customer • Operational Core 2026</p>
          </footer>
        </motion.div>
      </main>
    </div>
  );
};

export default MoreMenuPage;
