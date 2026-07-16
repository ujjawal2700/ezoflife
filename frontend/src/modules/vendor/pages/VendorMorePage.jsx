import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const VendorMorePage = () => {
  const navigate = useNavigate();

  const menuSections = useMemo(() => [
    {
      title: "Operations",
      icon: "settings_suggest",
      items: [
        { icon: "insights", title: "Business Insights", desc: "View Performance Reports", path: "/vendor/reports", color: "primary" }
      ]
    },
    {
      title: "Partnerships",
      icon: "handshake",
      items: [
        { icon: "campaign", title: "Advertise with us", desc: "Digital Media Kit", path: "/user/advertise", color: "primary" },
        { icon: "handshake", title: "Partner with us", desc: "Logistics & Alliances", path: "/user/partnerships", color: "tertiary" },
        { icon: "notifications_active", title: "Notifications", desc: "Stay updated on orders", path: "/vendor/notifications", color: "amber" },
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
        { icon: "help_center", title: "Help & FAQ", desc: "Guides, Tutorials & Answers", path: "/vendor/support" },
      ]
    }
  ], []);

  const allItems = useMemo(() => menuSections.flatMap(section => section.items), [menuSections]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen pb-20 font-sans">
      <main className="max-w-md mx-auto px-6 pt-2">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <div className="bg-white rounded-[2.5rem] border border-black/5 divide-y divide-black/5 overflow-hidden shadow-sm shadow-primary/5 mt-4">
            {allItems.map((item) => (
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
                    <span className="block font-black text-sm tracking-tight leading-none text-slate-900 group-hover:text-slate-950">{item.title}</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1 text-slate-200">
                  {item.rightIcon || 'chevron_right'}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default VendorMorePage;
