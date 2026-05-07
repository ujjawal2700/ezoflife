import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const GlobalCartButton = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        const updateCount = () => {
            try {
                const saved = localStorage.getItem('cart_quantities');
                if (saved) {
                    const quantities = JSON.parse(saved);
                    const count = Object.values(quantities).reduce((acc, q) => acc + Number(q), 0);
                    setCartCount(count);
                } else {
                    setCartCount(0);
                }
            } catch (e) {
                setCartCount(0);
            }
        };

        updateCount();
        const interval = setInterval(updateCount, 1000);
        return () => clearInterval(interval);
    }, []);

    // Don't show on Cart page, Home page, or Auth/OTP pages
    const hiddenPaths = ['/user/cart', '/user/home', '/user/auth', '/user/otp'];
    if (hiddenPaths.includes(location.pathname) || cartCount === 0) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/user/cart')}
                className="fixed bottom-24 right-6 z-[150] w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center justify-center border border-white/10"
            >
                <div className="relative">
                    <span className="material-symbols-outlined text-2xl">shopping_cart</span>
                    <span className="absolute -top-3 -right-3 bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                        {cartCount}
                    </span>
                </div>
            </motion.button>
        </AnimatePresence>
    );
};

export default GlobalCartButton;
