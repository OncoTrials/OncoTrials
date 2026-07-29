import { motion } from 'motion/react';
import { EyebrowLabel } from './HomepageHelpers.jsx';
export const AboutSection = () => {
    return (
        <section
            id="about"
            className="px-6 md:px-12 lg:px-20 py-24"
        >
            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                <motion.div
                    initial={{ opacity: 0, x: -40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                    className="space-y-8"
                >
                    <div>
                        <p className="text-lg font-semibold uppercase tracking-[0.2em] text-blue-600 mb-3">
                            <EyebrowLabel>The Problem</EyebrowLabel>
                        </p>

                        <h2 className="text-3xl md:text-5xl font-bold leading-tight text-gray-900">
                            Most eligible cancer patients are never enrolled in clinical trials.
                        </h2>
                    </div>

                    <p className="text-lg text-gray-600 leading-relaxed">
                        Not because trials don’t exist, but because matching patients to trials is time-consuming, fragmented, and often happens too late. Trial data lives across platforms like ClinicalTrials.gov, and eligibility criteria are difficult to apply in real time.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                    className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-xl"
                >
                    <img
                        src="/preview.png"
                        alt="TrialsOnco Preview"
                        className="rounded-2xl"
                    />
                </motion.div>
            </div>
        </section>
    )
}