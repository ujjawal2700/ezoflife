import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import VendorHeader from '../components/VendorHeader';
import { legalApi } from '../../../lib/api';

/**
 * Vendor terms & conditions.
 *
 * Served from /api/legal/:type so Admin can publish updates without a release.
 * The hardcoded copy remains only as a fallback until a document is published.
 */
const FALLBACK_SECTIONS = [
    {
        heading: 'Acceptance of Terms',
        body: 'By using our vendor application, you agree to comply with our Terms & Conditions. If you do not agree to these terms, you should not use our services.'
    },
    {
        heading: 'Vendor Responsibility',
        body: 'As a vendor, you are responsible for maintaining the accuracy of your profile information and for the quality of services provided to customers.'
    },
    {
        heading: 'Order Fulfilment',
        body: 'Orders should be accepted and fulfilled in a timely manner. Delays in service may affect your vendor rating on the platform.'
    },
    {
        heading: 'Payment Settlements',
        body: 'Payments for completed orders will be settled weekly. Spinzyt reserves the right to withhold payments in cases of disputes or non-compliance.'
    }
];

const TermsConditions = () => {
    const [doc, setDoc] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await legalApi.getByType('terms-conditions-vendor');
                if (!cancelled) setDoc(data);
            } catch (error) {
                console.error('Fetch Vendor Terms Error:', error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const updatedAt = doc?.updatedAt || doc?.lastUpdated;

    return (
        <div className="bg-[#F8FAFC] text-[#1E293B] min-h-screen pb-32 font-sans">
            <VendorHeader title="Terms & Conditions" showBack={true} />

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
                            : 'Awaiting published terms'}
                    </div>
                </div>
            </motion.main>
        </div>
    );
};

export default TermsConditions;
