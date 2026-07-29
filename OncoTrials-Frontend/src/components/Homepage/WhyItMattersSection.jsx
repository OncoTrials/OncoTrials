import {motion} from 'motion/react';
import {EyebrowLabel} from './HomepageHelpers.jsx';

export const WhyItMattersSection = () => {
    return (
        <section className="px-6 md:px-12 lg:px-20 py-24">
            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-white rounded-[32px] p-10 shadow-xl border border-gray-100"
                >
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 mb-4">
                        <EyebrowLabel>Why It Matters</EyebrowLabel>
                    </p>

                    <h3 className="text-3xl font-bold text-gray-900 mb-5">
                        Every missed trial is a missed opportunity.
                    </h3>

                    <p className="text-gray-600 leading-relaxed text-lg mb-5">
                        TrialsOnco makes trial consideration consistent, fast, and part of routine care, not something that depends on time, memory, or manual effort.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-cyan-500 to-blue-800 rounded-[32px] p-10 shadow-2xl text-white"
                >
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100 mb-4">
                        Our Vision
                    </p>

                    <h3 className="text-3xl font-bold leading-tight mb-6">
                        Clinical trials should never be an afterthought.
                    </h3>

                    <p className="text-blue-100 text-lg leading-relaxed mb-5">
                        TrialsOnco is building a system where every patient is continuously evaluated against every relevant trial, across institutions, in real time.
                    </p>

                    {/* <p className="text-blue-100 text-lg leading-relaxed">
                            Oncology teams should have immediate visibility into opportunities without changing how they already work.
                        </p> */}
                </motion.div>
            </div>
        </section>
    )
}