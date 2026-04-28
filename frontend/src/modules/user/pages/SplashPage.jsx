import React, { useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { safeStorage } from '@/lib/safeStorage';

const SplashPage = () => {
  const navigate = useNavigate();
  const bgRef = useRef(null);

  useEffect(() => {
    // GSAP floating animation for background blobs
    const blobs = bgRef.current?.querySelectorAll('.blob');
    if (blobs) {
      blobs.forEach((blob) => {
        gsap.to(blob, {
          x: 'random(-50, 50)',
          y: 'random(-50, 50)',
          duration: 'random(5, 10)',
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });
      });
    }

    // Automatic redirect after 3 seconds based on role-based session check
    const redirectTimer = setTimeout(() => {
      const userSession = safeStorage.getItem('userSession');
      const userRole = safeStorage.getItem('userRole');

      if (userSession && userRole) {
        switch (userRole) {
          case 'admin':
            navigate('/admin/dashboard', { replace: true });
            break;
          case 'vendor':
            navigate('/vendor/dashboard', { replace: true });
            break;
          case 'rider':
            navigate('/rider/dashboard', { replace: true });
            break;
          case 'customer':
          case 'user':
            navigate('/user/home', { replace: true });
            break;
          default:
            navigate('/user/home', { replace: true });
        }
      } else {
        // If first time or not logged in, show Landing Ad screen
        const hasSeenLanding = safeStorage.getItem('hasSeenLanding');
        if (hasSeenLanding) {
            navigate('/user/home', { replace: true });
        } else {
            navigate('/user/land', { replace: true });
        }
      }
    }, 3000);

    return () => clearTimeout(redirectTimer);
  }, [navigate]);

  const splashConfig = useMemo(() => ({
    title: 'SPINZYT',
    subtitle: 'The Pristine Flow',
    description: 'Elevate your lifestyle with premium fabric care delivered to your doorstep.',
    launchText: 'Launching Experience',
    sponsorLabel: 'Sponsored',
    sponsorName: 'LUMIERE FABRICS',
    sponsorTitle: 'Redefinition of Pure Elegance.',
    sponsorDesc: 'Experience the science of aromatherapy and micro-hydration for your finest garments.',
    sponsorButton: 'Explore Luxury'
  }), []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-surface text-on-surface antialiased overflow-hidden min-h-screen relative flex flex-col"
    >
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        
      {/* Top/Left Half: Brand (Splash Header) */}
        <section className="relative flex flex-col items-center justify-center z-10 px-6 py-12 lg:py-24 overflow-hidden border-b lg:border-r border-outline-variant/10
          max-lg:bg-gradient-to-br max-lg:from-[#89ECDA] max-lg:via-[#a1f0e2] max-lg:to-[#83D8C8] 
          bg-surface-container-lowest h-[50dvh] lg:h-auto">
          
          {/* Background Ambient Accents */}
          <div ref={bgRef} className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="blob absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-primary-fixed/20 rounded-full blur-[100px] max-lg:opacity-60"></div>
            <div className="blob absolute bottom-[-5%] left-[-5%] w-[300px] h-[300px] bg-white/40 rounded-full blur-[80px] max-lg:opacity-40"></div>
          </div>

          {/* Logo Cluster */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative z-20 flex flex-col items-center gap-4 lg:gap-8"
          >
            <div className="w-20 h-20 lg:w-24 lg:h-24 flex items-center justify-center rounded-3xl bg-black shadow-2xl relative">
              <span className="material-symbols-outlined text-white text-4xl lg:text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                local_laundry_service
              </span>
              <div className="absolute inset-0 bg-white/10 rounded-3xl blur-sm -z-10"></div>
            </div>
            
            <div className="text-center relative">
              <h1 className="text-4xl lg:text-6xl font-black text-black tracking-tighter leading-none mb-1 lg:mb-3">{splashConfig.title}</h1>

            </div>

            {/* Mobile Loading Label */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="lg:hidden mt-8 flex flex-col items-center gap-2"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-black/70">{splashConfig.launchText}</p>
            </motion.div>
          </motion.div>

          {/* Onboarding Text (Desktop Only) */}
          <div className="hidden lg:flex relative w-full max-w-[340px] flex-col items-center gap-10 z-30 mt-12">
            <div className="w-full flex flex-col items-center gap-6 text-center">
              <p className="text-black/70 font-body leading-relaxed text-md font-medium">
                {splashConfig.description}
              </p>
              
              <div className="w-full flex flex-col gap-4">
                <button 
                  onClick={() => navigate('/user/auth')}
                  className="w-full bg-black text-white py-5 rounded-2xl font-headline font-bold text-lg shadow-xl shadow-black/10 transition-all flex items-center justify-center gap-3"
                >
                  Get Started
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom/Right Half: Sponsor Ad (Half Screen on Mobile) */}
        <section className="relative bg-surface-container-low h-[50dvh] lg:h-auto overflow-hidden group cursor-pointer flex">
          <div className="absolute inset-0 transition-transform duration-[2s]">
            <img 
              alt="Sponsor Advertisement" 
              className="w-full h-full object-cover grayscale lg:grayscale lg:opacity-60 mix-blend-multiply transition-all duration-700 max-lg:grayscale-0 max-lg:opacity-100" 
              src="/luxury_fabric_sponsor_ad.png" 
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-8 lg:p-16">
            <motion.div 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.5 }}
               className="relative z-10"
            >
              <div className="flex items-center gap-3 mb-3 lg:mb-4">
                <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[8px] lg:text-[9px] font-black text-white uppercase tracking-[.3em] border border-white/20">{splashConfig.sponsorLabel}</span>
                <div className="h-px w-8 lg:w-10 bg-white/20"></div>
                <span className="text-white font-headline font-black text-[10px] lg:text-xs uppercase tracking-widest opacity-80">{splashConfig.sponsorName}</span>
              </div>
              <h2 className="text-2xl lg:text-5xl font-black text-white tracking-tighter leading-[1.1] mb-4 lg:mb-6">
                Redefinition of <br/>Pure <span className="text-[#89ECDA]">Elegance.</span>
              </h2>
              <p className="text-white/60 text-xs lg:text-sm font-medium leading-relaxed max-w-sm mb-6 lg:mb-10 italic hidden sm:block">
                {splashConfig.sponsorDesc}
              </p>
              
              <button className="flex items-center gap-4 text-white">
                <span className="font-black text-[10px] lg:text-xs uppercase tracking-widest">{splashConfig.sponsorButton}</span>
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full border border-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </div>
              </button>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Mobile Loading Progress Bar (Top for visibility) */}
      <div className="lg:hidden fixed top-0 left-0 w-full h-1.5 bg-white/20 z-[1000] overflow-hidden">
        <motion.div 
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 4.2, ease: "linear" }}
          className="h-full bg-black shadow-[0_0_10px_rgba(0,0,0,0.2)]"
        />
      </div>

      {/* Semantic Decorative Background Logo */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015] z-0 max-lg:opacity-[0.03]">
        <div className="w-full h-full text-[40vh] lg:text-[60vh] font-black flex items-center justify-center select-none text-black">
          E
        </div>
      </div>
    </motion.div>
  );
};

export default SplashPage;
