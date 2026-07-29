import { EyebrowLabel } from './HomepageHelpers.jsx';
import {
    EnvelopeIcon,
    PhoneIcon,
} from '@phosphor-icons/react';
import CustomAlert from '../common/Alert.jsx';
export const ContactSection = ({ formData, handleChange, handleSubmit, loading, status, onClose }) => {
    return (
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

    )
}