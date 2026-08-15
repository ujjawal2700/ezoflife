import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import VendorHeader from '../components/VendorHeader';
import { legalApi } from '../../../lib/api';

/**
 * Vendor privacy policy.
 *
 * Content is managed by Admin (Admin → Privacy Policy) and served from
 * /api/legal/:type, so legal text can be updated without a release. The
 * previously hardcoded copy is kept only as a fallback for when the document
 * has not been published yet.
 */
const FALLBACK_SECTIONS = [
    {
        heading: 'Introduction',
        body: 'Welcome to Spinzyt. This Privacy Policy details our practices regarding the collection, use, and disclosure of your information when you use our vendor application.'
    },
    {
        heading: 'Data Collection',
        body: 'We collect personal information such as shop name, owner name, email address, and phone number to provide you with our services and for verification purposes.'
    },
    {
        heading: 'Use of Information',
        body: 'Your information is used to facilitate order processing, communicate with you about your account, and improve our services.'
    },
    {
        heading: 'Data Security',
        body: 'We implement industry-standard security measures to protect your information and ensure it is not accessed by unauthorized parties.'
    }
];

const PrivacyPolicy = () => {
    const [doc, setDoc] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await legalApi.getByType('privacy-policy-vendor');
                if (!cancelled) setDoc(data);
            } catch (error) {
                console.error('Fetch Vendor Privacy Policy Error:', error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const updatedAt = doc?.updatedAt || doc?.lastUpdated;

    return (
        <div className="bg-[#F8FAFC] text-[#1E293B] min-h-screen pb-32 font-sans">
            <VendorHeader title="Privacy Policy" showBack={true} />

            <motion.main
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto px-6 py-8 space-y-8"
            >
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
                    {loading ? (
                        <p className="text-sm text-slate-400 font-medium py-8 text-center">Loading…</p>
                    ) : doc?.content ? (
                        <div
                            className="prose prose-sm max-w-none text-slate-600"
                            dangerouslySetInnerHTML={{ __html: doc.content }}
                        />
                    ) : (
                        FALLBACK_SECTIONS.map(({ heading, body }) => (
                            <section key={heading} className="space-y-4">
                                <h2 className="text-xl font-bold tracking-tight">{heading}</h2>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">{body}</p>
                            </section>
                        ))
                    )}

                    <div className="pt-8 border-t border-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                        {updatedAt
                            ? `Last Updated: ${new Date(updatedAt).toLocaleDateString()}`
                            : 'Awaiting published policy'}
                    </div>
                </div>
            </motion.main>
        </div>
    );
};

export default PrivacyPolicy;
