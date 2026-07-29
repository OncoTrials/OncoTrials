import {EyebrowLabel} from './HomepageHelpers.jsx';
import {motion} from 'motion/react';
export const HowItWorksCards = () => {
    const items = [
        {
            title: 'Real-Time Patient Analysis',
            desc: 'Diagnosis, stage, prior therapy, and genomic markers are automatically reviewed.',
        },
        {
            title: 'Continuously Updated Trials',
            desc: 'National and institution-specific trials are continuously synced and refreshed.',
        },
        {
            title: 'Smart Matching',
            desc: 'Smart matching ranks the most relevant options with eligibility summaries and match scores.',
        },
        {
            title: 'Seamless Workflow',
            desc: 'Trial matches appear immediately with no separate login or manual search required.',
        },
    ]

    return (
        <section
            id="how-it-works"
            className="px-6 md:px-12 lg:px-20 py-24"
        >
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-14">
                    <h2 className="text-lg font-semibold uppercase tracking-[0.2em] text-blue-600 mb-3">
                        <EyebrowLabel>How It Works</EyebrowLabel>
                    </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-7">
                    {items.map((item, index) => (
                        <motion.div
                            key={index}
                            whileHover={{ y: -6 }}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white flex items-center justify-center font-bold mb-5">
                                {index + 1}
                            </div>

                            <h3 className="text-xl font-semibold mb-3 text-gray-900">
                                {item.title}
                            </h3>

                            <p className="text-gray-600 leading-relaxed">
                                {item.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}