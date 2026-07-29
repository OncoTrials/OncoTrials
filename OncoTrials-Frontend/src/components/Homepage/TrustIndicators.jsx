
export const TrustIndicators = () => {
    const indicators = [
        {
            icon: ShieldCheckIcon,
            label: 'HIPAA Compliant',
            description: 'Enterprise-grade security',
        },
        {
            icon: MedalIcon,
            label: 'FDA Aligned',
            description: 'Regulatory compliance',
        },
        {
            icon: GpsFixIcon,
            label: 'Geographic Proximity',
            description: 'Travel feasibility insights',
        },
        {
            icon: CheckCircle,
            label: 'Validated Results',
            description: 'Evidence-based matching',
        },
    ]

    return (
        <section className="py-20 px-6 md:px-12 lg:px-20">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-14">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 mb-3">
                        Built For Oncology Workflows
                    </p>

                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                        Clinical trial matching that fits naturally into care delivery
                    </h2>

                    <p className="mt-5 text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
                        TrialsOnco helps oncologists discover relevant clinical trials in real time without disrupting existing workflows.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {indicators.map((indicator, index) => (
                        <motion.div
                            key={index}
                            className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center hover:shadow-xl transition-all duration-300"
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7, ease: easeInOut, delay: index * 0.12 }}
                        >
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5 border border-blue-100">
                                <indicator.icon className="w-8 h-8 text-blue-600" />
                            </div>

                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {indicator.label}
                            </h3>

                            <p className="text-gray-600 text-sm leading-relaxed">
                                {indicator.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}