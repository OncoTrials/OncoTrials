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
import { easeInOut, motion } from 'motion/react';
import { EyebrowLabel, scrollToSection, LoginDropdownItems, RegisterDropdownItems } from '../components/Homepage/HomepageHelpers.jsx';
import { HowItWorksCards } from '../components/Homepage/HowItWorks';
import { ContactSection } from '../components/Homepage/ContactSection.jsx';
import { HeroSection } from '../components/Homepage/HeroSection.jsx';
import { AboutSection } from '../components/Homepage/AboutSection.jsx';
import { WhyItMattersSection } from '../components/Homepage/WhyItMattersSection.jsx';
import { DifferentiatorSection } from '../components/Homepage/DifferentiatorSection.jsx';




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
            <HeroSection />
            {/* <TrustIndicators /> */}
            <AboutSection />
            <DifferentiatorSection />
            <HowItWorksCards />
            <WhyItMattersSection />
            <ContactSection
                formData={formData}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                loading={loading}
                status={status}
                onClose={onClose}
            />
            <PageFooter />
        </div>
    )
}

export default HomePage



