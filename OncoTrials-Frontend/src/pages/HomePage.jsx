import React from 'react'
import HomeNavBar from '../components/layout/HomeNavBar'
import SplitText from '../components/common/SplitText'
import Footer from '../components/layout/PageFooter'
import GetStartedDropdown from '../components/buttons/HomeDropdown'
import { DarkThemeToggle } from 'flowbite-react'
import PageFooter from '../components/layout/PageFooter'
import { ShieldCheckIcon, MedalIcon, ClockIcon, CheckCircleIcon as CheckCircle, GpsFixIcon } from '@phosphor-icons/react'
import {easeInOut, motion} from 'motion/react'

// Trust Indicators Component
const TrustIndicators = () => {
    const indicators = [
        { icon: ShieldCheckIcon, label: "HIPAA Compliant", description: "Enterprise-grade security" },
        { icon: MedalIcon, label: "FDA Aligned", description: "Regulatory compliance" },
        { icon: GpsFixIcon, label: "Geographic Proximity", description: "Travel Feasibility" },
        { icon: CheckCircle, label: "Validated Results", description: "Evidence-based matching" }
    ];

    return (
        <div className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">A Clinical Trial Matching Platform</h2>
                    <p className="text-xl text-gray-600">Built for Oncologists by Oncologists</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {indicators.map((indicator, index) => (
                        <motion.div key={index} 
                        className="text-center"
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: easeInOut, delay: index * 0.2 }}
                        >
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md"
                            >
                                <indicator.icon className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{indicator.label}</h3>
                            <p className="text-gray-600">{indicator.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

function HomePage() {
    const LoginDropdownItems = [
        { path: '/patient-login', label: 'Patient Login' },
        { path: '/physician-crc-login', label: 'Physician/CRC Login' }
    ]

    const RegisterDropdownItems = [
        { path: '/patient-register', label: 'Patient Register' },
        { path: '/physician-crc-register', label: 'Physician/CRC Register' }
    ]
    return (
        <>
            <div className='animate-fade-down bg-gradient-to-tl from-blue-100 via-white to-indigo-100'>
                <HomeNavBar />
                <div className='flex flex-col items-center justify-center  min-h-screen'>
                    <div className='flex flex-col items-center justify-center'>

                        <div className='flex flex-row items-center justify-center gap-1'>
                            <img src={'/OncoTrials.png'} alt='OncoTrials Logo' className='h-20 w-20' />
                            <SplitText
                                text="OncoTrials"
                                className="text-5xl font-bold text-center"
                                delay={100}
                                duration={1}
                                ease="power3.out"
                                splitType="chars"
                                from={{ opacity: 0, y: 40 }}
                                to={{ opacity: 1, y: 0 }}
                                threshold={0.1}
                                rootMargin="-100px"
                                textAlign="center"
                            />
                        </div>
                        {/* <div>
                            <p>
                            Advancing cancer care through intelligent clinical trial matching. Connecting patients with breakthrough treatments and researchers with the right participants.
                            </p>
                        </div> */}

                        <div className='flex flex-row items-center justify-center gap-3 md:gap-8 mt-5'>
                            <GetStartedDropdown label={'Login'} menuItems={LoginDropdownItems} />
                            <GetStartedDropdown label={'Register'} menuItems={RegisterDropdownItems} />
                        </div>
                    </div>
                </div>

                <TrustIndicators />

                {/* <div className='flex flex-col items-center justify-center min-h-full'>
                    <div className='flex flex-col items-center justify-start space-y-5'>
                        <h1 className='text-4xl font-bold'>
                            '[Placeholder]'
                        </h1>
                        <h1 className='text-xl text-gray-500'>
                            Built for Oncologists, by Oncologists
                        </h1>
                    </div>

                    <div className='space-y-40'>
                        <div className='flex flex-col md:flex-row  items-center justify-center gap-20'>
                            <p className='max-w-md'>
                                Integration of Molecular Data (NGS, IHC, MSI, etc.)
                                Match patients based on real-time genomics (e.g., KRAS G12C, HER2 amplification, NTRK fusions).
                            </p>
                            <img src={'/vite.svg'} className='flex w-36 h-36' alt='Integration of Molecular Data' />

                        </div>

                        <div className='flex flex-col md:flex-row  items-center justify-center gap-20'>
                            <img src={'/vite.svg'} className='flex w-36 h-36' alt='Geographic Proximity & Travel Feasibility' />
                            <p className='max-w-md'>
                                Geographic Proximity & Travel Feasibility
                                Incorporate location-aware trial matching, with driving time estimates, travel stipends info, etc.
                            </p>


                        </div>

                        <div className='flex flex-col md:flex-row  items-center justify-center gap-20'>
                            <p className='max-w-md'>
                                Community Site Matching
                                Help non-academic sites refer patients quickly to nearby academic or industry-sponsored trials, enhancing trial access and accrual.
                            </p>
                            <img src={'/vite.svg'} className='flex w-36 h-36' alt='Community Site Matching' />

                        </div>
                    </div>
                </div> */}

                <PageFooter />

            </div>
        </>
    )
}

export default HomePage