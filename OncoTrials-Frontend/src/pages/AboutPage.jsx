import React from "react";
import { motion } from "framer-motion";
import FormButton from "../components/buttons/FormButton.jsx"
import HomeNavBar from "../components/layout/HomeNavBar.jsx";

export default function AboutOncoTrials() {
    return (
       
        <div className=" animate-fade-down min-h-screen bg-gradient-to-tl from-blue-100 via-white to-indigo-100 text-gray-900">
             <HomeNavBar/>
            {/* Hero */}
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white px-6 md:px-16 py-20">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="space-y-6"
                    >
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                            About TrialsOnco
                        </h1>
                        <p className="text-lg text-blue-100 max-w-xl">
                            TrialsOnco helps oncologists find the right clinical trials for
                            their patients—instantly and within their normal workflow.
                        </p>
                        <div className="flex gap-4">
                            <FormButton text={'Request Demo'}  className="bg-white text-blue-700 hover:bg-gray-100">
                                Request Demo
                            </FormButton>
                            <FormButton variant="outline" text={'Request Demo'} className="border-white text-white hover:bg-white/10">
                                Learn More
                            </FormButton>
                        </div>
                    </motion.div>

                    {/* Placeholder Visual */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="bg-white/10 backdrop-blur rounded-2xl p-6 shadow-xl"
                    >
                        <div className="h-64 rounded-xl bg-white/20 flex items-center justify-center text-sm text-blue-100">
                            Product Preview
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="px-6 md:px-16 py-16">
                <div className="max-w-5xl mx-auto space-y-12">
                    {/* Problem */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-white rounded-2xl shadow-sm p-6 md:p-8 space-y-4"
                    >
                        <h2 className="text-2xl font-semibold">The Problem</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Most eligible cancer patients are never enrolled in clinical
                            trials—not because trials don’t exist, but because matching
                            patients to trials is time-consuming, fragmented, and often
                            happens too late.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Trial data lives across platforms like ClinicalTrials.gov, and
                            eligibility criteria are difficult to apply in real time.
                        </p>
                    </motion.div>

                    {/* Differentiator */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-white rounded-2xl shadow-sm p-6 md:p-8 space-y-4"
                    >
                        <h2 className="text-2xl font-semibold">
                            What Makes TrialsOnco Different
                        </h2>
                        <p className="text-gray-600 leading-relaxed">
                            TrialsOnco doesn’t ask clinicians to search for trials. It brings
                            trials to them—automatically.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            By integrating directly into systems like Epic, TrialsOnco
                            surfaces high-probability matches at the exact moment decisions
                            are being made.
                        </p>
                    </motion.div>

                    {/* How It Works */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-white rounded-2xl shadow-sm p-6 md:p-8"
                    >
                        <h2 className="text-2xl font-semibold mb-6">How It Works</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            {[
                                {
                                    title: "Real-Time Patient Analysis",
                                    desc: "Diagnosis, stage, prior therapy, and genomic markers are evaluated instantly.",
                                },
                                {
                                    title: "Continuously Updated Trials",
                                    desc: "National databases plus institution-specific trials stay current automatically.",
                                },
                                {
                                    title: "Smart Matching",
                                    desc: "Advanced ranking surfaces the most relevant trials with match scores.",
                                },
                                {
                                    title: "Seamless Workflow",
                                    desc: "Results appear directly inside existing systems—no extra logins or manual search.",
                                },
                            ].map((item, index) => (
                                <motion.div
                                    key={index}
                                    whileHover={{ scale: 1.03 }}
                                    className="p-4 border rounded-xl bg-gray-50"
                                >
                                    <h3 className="font-semibold text-lg mb-2">
                                        {item.title}
                                    </h3>
                                    <p className="text-gray-600 text-sm">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* What You See */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-white rounded-2xl shadow-sm p-6 md:p-8 space-y-4"
                    >
                        <h2 className="text-2xl font-semibold">What You See</h2>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2">
                            <li>Top 3–5 matched trials per patient</li>
                            <li>Match eligibility</li>
                            <li>Key inclusion and exclusion highlights</li>
                            <li>Direct referral pathway to enrolling site</li>
                        </ul>
                    </motion.div>

                    {/* Why It Matters */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-blue-50 border border-blue-100 rounded-2xl p-6 md:p-8 space-y-4"
                    >
                        <h2 className="text-2xl font-semibold">Why It Matters</h2>
                        <p className="text-gray-700 leading-relaxed">
                            Every missed trial is a missed opportunity for a patient.
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                            TrialsOnco makes trial consideration consistent, fast, and part
                            of routine care—not something that depends on time, memory, or
                            manual effort.
                        </p>
                    </motion.div>

                    {/* Vision */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center space-y-4"
                    >
                        <h2 className="text-2xl font-semibold">Our Vision</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
                            Clinical trials should not be an afterthought.
                        </p>
                        <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
                            TrialsOnco is building a system where every patient is
                            continuously evaluated against every relevant trial, across
                            institutions, in real time.
                        </p>
                    </motion.div>

                    {/* Final CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-8 text-center space-y-4 shadow-lg"
                    >
                        <h2 className="text-2xl font-semibold">
                            Bring Clinical Trials Into Every Decision
                        </h2>
                        <p className="text-blue-100 max-w-xl mx-auto">
                            See how TrialsOnco fits directly into your workflow and helps
                            identify the best options for every patient.
                        </p>
                        <FormButton text={'Schedule a Demo'}  className="bg-white text-blue-700 hover:bg-gray-100">
                            
                        </FormButton>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
