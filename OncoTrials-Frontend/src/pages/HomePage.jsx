import React, { useState } from 'react'
import HomeNavBar from '../components/layout/HomeNavBar'
import SplitText from '../components/common/SplitText'
import PageFooter from '../components/layout/PageFooter'
import GetStartedDropdown from '../components/buttons/HomeDropdown'
import CustomAlert from '../components/common/Alert'
import emailjs from '@emailjs/browser'
import {
    ShieldCheckIcon,
    MedalIcon,
    CheckCircleIcon as CheckCircle,
    GpsFixIcon,
    EnvelopeIcon,
    PhoneIcon,
    ArrowRightIcon,
} from '@phosphor-icons/react'
import { easeInOut, motion } from 'motion/react'

const EyebrowLabel = ({ children }) => (
    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-600 mb-4">
        <span className="w-4 h-px bg-blue-400 inline-block" />
        {children}
        <span className="w-4 h-px bg-blue-400 inline-block" />
    </span>
)

const scrollToSection = (section) => {
    document.getElementById(section)?.scrollIntoView({
        behavior: 'smooth',
    })
}

const TrustIndicators = () => {
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

const HowItWorksCards = () => {
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
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 mb-3">
                        <EyebrowLabel>How It Works</EyebrowLabel>
                    </p>

                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                        Designed to reduce friction at every step
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

function HomePage() {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState('')

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        organization: '',
        subject: '',
        message: '',
    })

    const LoginDropdownItems = [
        { path: '/physician-login', label: 'Physician Login' },
    ]

    const RegisterDropdownItems = [
        { path: '/physician-register', label: 'Physician Register' },
    ]

    const handleChange = (e) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        setLoading(true)
        setStatus('')

        try {
            await emailjs.send(
                import.meta.env.VITE_SERVICE_ID,
                import.meta.env.VITE_TEMPLATE_ID,
                {
                    name: formData.firstName + ' ' + formData.lastName,
                    time: new Date(),
                    email: formData.email,
                    organization: formData.organization,
                    subject: formData.subject,
                    message: formData.message,
                },
                import.meta.env.VITE_EMAILJS_PUB_KEY
            )

            setStatus('success')

            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                organization: '',
                subject: '',
                message: '',
            })
        } catch (error) {
            console.error(error)
            setStatus('error')
        } finally {
            setLoading(false)
        }
    }

    const onClose = () => {
        setStatus('')
    }

    return (
        <div className="animate-fade-down overflow-hidden bg-gradient-to-tl from-blue-100 via-white to-indigo-100 text-gray-900 scroll-smooth">
            <HomeNavBar />

            {/* HERO */}
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
                                // href="#contact"
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

            {/* <TrustIndicators /> */}

            {/* ABOUT / PROBLEM */}
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
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 mb-3">
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

            {/* DIFFERENTIATOR */}
            <section className="px-6 md:px-12 lg:px-20 py-24 ">
                <div className="max-w-6xl mx-auto text-center">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 mb-3">
                        <EyebrowLabel>What makes TrialsOnco Different</EyebrowLabel>
                    </p>

                    <h2 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight max-w-4xl mx-auto">
                        TrialsOnco doesn’t ask clinicians to search for trials. It brings it to them.
                    </h2>

                    <p className="mt-8 text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
                        By integrating directly into systems like Epic, TrialsOnco surfaces high-probability matches at the exact moment decisions are being made.
                    </p>
                </div>
            </section>

            <HowItWorksCards />

            {/* WHY IT MATTERS */}
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

            {/* CONTACT SECTION */}
            <section
                id="contact"
                className="relative px-6 md:px-12 lg:px-20 py-28"
            >
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute left-1/2 -translate-x-1/2 top-10 w-[700px] h-[700px] bg-cyan-200/20 blur-3xl rounded-full" />
                </div>

                <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 mb-4">
                            <EyebrowLabel>Contact Us</EyebrowLabel>
                        </p>
                        <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight">
                            Making Clinical Trials
                            <span className="block bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                                More Accessible
                            </span>
                        </h1>

                        <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl">
                            Whether you’re an oncologist, researcher, hospital administrator, or potential partner, we’d love to talk about how TrialsOnco can improve your patient-to-trial matching.
                        </p>

                        <div className="mt-10 space-y-6">
                            <div className="flex gap-4 items-start">
                                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                                    <EnvelopeIcon size={24} color="blue" />
                                </div>

                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900">
                                        Email
                                    </h3>
                                    <p className="text-gray-600">
                                        contact@trialsonco.com
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4 items-start">
                                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                                    <PhoneIcon size={24} color="blue" />
                                </div>

                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900">
                                        Schedule a Demo
                                    </h3>
                                    <p className="text-gray-600">
                                        See how TrialsOnco integrates directly into oncology workflows.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-400/10 blur-2xl rounded-[40px]" />

                        <div className="relative bg-white/90 backdrop-blur-xl border border-gray-200 rounded-[32px] shadow-2xl p-8 md:p-10">
                            <div className="mb-8">
                                <h3 className="text-3xl font-bold text-gray-900">
                                    Send us a message
                                </h3>

                                <p className="text-gray-600 mt-2">
                                    Questions, partnerships, demos, or workflow discussions — we’re happy to help.
                                </p>
                            </div>

                            <form className="space-y-6" onSubmit={handleSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            First Name
                                        </label>

                                        <input
                                            type="text"
                                            name="firstName"
                                            placeholder="First Name"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Last Name
                                        </label>

                                        <input
                                            type="text"
                                            name="lastName"
                                            placeholder="Last Name"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        />
                                    </div>
                                </div>

                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    placeholder="john.doe@email.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Organization
                                </label>

                                <input
                                    type="text"
                                    name="organization"
                                    placeholder="Cancer Center / Hospital / Company (optional)"
                                    value={formData.organization}
                                    onChange={handleChange}
                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    name="subject"
                                    placeholder="Partnership, demo request, or general inquiry"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition"
                                />
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Message
                                </label>
                                <textarea
                                    rows={5}
                                    name="message"
                                    placeholder="Tell us about your use case, questions, or partnership interest..."
                                    value={formData.message}
                                    onChange={handleChange}
                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                                />

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.01] hover:shadow-blue-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-none disabled:from-blue-400 disabled:to-cyan-400"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        Contact TrialsOnco
                                    </span>

                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-white/10" />
                                </button>
                            </form>

                            {status.includes('error') && (
                                <CustomAlert
                                    type={'failure'}
                                    message={'There was an error sending your message. Please try again.'}
                                    onClose={onClose}
                                />
                            )}

                            {status.includes('success') && (
                                <CustomAlert
                                    type={'success'}
                                    message={'Message sent successfully.'}
                                    onClose={onClose}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <PageFooter />
        </div>
    )
}

export default HomePage



