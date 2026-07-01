import { motion } from 'motion/react';
import { EyebrowLabel, scrollToSection, LoginDropdownItems, RegisterDropdownItems } from './HomepageHelpers.jsx';
import { ArrowRightIcon } from '@phosphor-icons/react';
import SplitText from '../common/SplitText.jsx';
import GetStartedDropdown from '../buttons/HomeDropdown.jsx';

export const HeroSection = () => {
    return (
        <section className="relative min-h-screen flex items-center justify-center px-6 md:px-12 lg:px-20 pt-12">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-blue-200/30 blur-3xl rounded-full" />
            </div>

            <div className="relative max-w-7xl w-full grid md:grid-cols-2 gap-20 items-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center md:text-left"
                >
                    <p className="text-sm font-semibold text-blue-600 uppercase tracking-[0.25em] mb-5">
                        <EyebrowLabel>Clinical Trial Matching Platform</EyebrowLabel>
                    </p>

                    <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                        <img
                            src={'/TrialsOnco.png'}
                            alt="TrialsOnco Logo"
                            className="h-16 w-16"
                        />

                        <SplitText
                            text="TrialsOnco"
                            className="text-5xl md:text-6xl font-bold"
                            delay={80}
                            duration={1}
                            ease="power3.out"
                            splitType="chars"
                            from={{ opacity: 0, y: 40 }}
                            to={{ opacity: 1, y: 0 }}
                            threshold={0.1}
                            rootMargin="-100px"
                            textAlign="left"
                        />
                    </div>

                    <p className="mt-7 text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto md:mx-0">
                        TrialsOnco helps oncologists find the right clinical trials for their patients, instantly and within their normal workflow.
                    </p>

                    <div className="mt-10 flex flex-wrap gap-3 justify-center md:justify-start items-center">
                        <GetStartedDropdown label="Login" menuItems={LoginDropdownItems} />
                        <GetStartedDropdown label="Register" menuItems={RegisterDropdownItems} />
                        <button
                            onClick={() => scrollToSection('contact')}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-[14px] text-sm font-semibold text-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                        >
                            Schedule Demo
                            <ArrowRightIcon size={16} />
                        </button>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                >
                    <div className="relative w-full max-w-2xl mx-auto">
                        <div className="absolute inset-0 bg-white rounded-[32px] shadow-2xl border border-gray-100 rotate-2" />

                        <img
                            src="/oncology_1.png"
                            alt="TrialsOnco Dashboard"
                            className="relative rounded-[32px] shadow-2xl border border-gray-200"
                        />
                    </div>
                </motion.div>
            </div>
        </section>
    )
}