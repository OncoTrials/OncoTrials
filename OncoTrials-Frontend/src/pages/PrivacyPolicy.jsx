import React from 'react'
import PageFooter from '../components/layout/PageFooter'
import HomeNavBar from '../components/layout/HomeNavBar'

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen flex flex-col animate-fade-down bg-gradient-to-tl from-blue-100 via-white to-indigo-100 text-black">
            <HomeNavBar />

            <div className="flex-grow max-w-4xl mx-auto px-6 py-16">
                <h1 className="text-4xl font-bold mb-6 text-center">Privacy Policy</h1>
                {/* <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-12">Effective Date: [Insert Date]</p> */}

                <Section title="1. Introduction">
                    TrialsOnco ("we," "our," or "us") is committed to protecting the privacy and security of users of our platform, including healthcare professionals and authorized users. This Privacy Policy explains how we collect, use, disclose, and safeguard information when you use our services.
                </Section>

                <Section title="2. Information We Collect">
                    <SubSection title="Personal Information">
                        Name, email address, professional credentials, organization affiliation, and account login information.
                    </SubSection>
                    <SubSection title="Patient Data (Provided by Users)">
                        Demographics, clinical data such as diagnosis, cancer stage, treatment history, and eligibility-related health data.
                    </SubSection>
                    <SubSection title="Usage Data">
                        IP address, browser type, device information, and usage patterns within the platform.
                    </SubSection>
                </Section>

                <Section title="3. How We Use Information">
                    We use collected data to match patients to clinical trials, improve platform performance, provide support, ensure compliance, and prevent misuse.
                </Section>

                <Section title="4. Data Sharing and Disclosure">
                    We do not sell personal or patient data. Information may be shared with trusted service providers, for legal compliance, or in aggregated/de-identified form.
                </Section>

                <Section title="5. Data Security">
                    We implement encryption (HTTPS/TLS), secure storage, and access controls. No system is completely secure, and users must protect their credentials.
                </Section>

                <Section title="6. HIPAA and Health Data Compliance">
                    TrialsOnco is designed with healthcare privacy in mind, following HIPAA principles where applicable and minimizing data collection.
                </Section>

                <Section title="7. Data Retention">
                    We retain data only as long as necessary for services, legal compliance, and dispute resolution. Users may request deletion.
                </Section>

                <Section title="8. Your Rights and Choices">
                    You may have rights to access, correct, or delete your data depending on your jurisdiction.
                </Section>

                <Section title="9. Third-Party Services">
                    We may integrate with third-party services such as clinical trial databases and EHR systems, which have their own policies.
                </Section>

                <Section title="10. Changes to This Policy">
                    We may update this policy periodically. Continued use means acceptance of changes.
                </Section>

                <Section title="11. Contact Us">
                    TrialsOnco Team <br />
                    Email: [Insert Email] <br />
                </Section>

                <Section title="12. Disclaimer">
                    TrialsOnco is a clinical decision-support tool and does not replace medical judgment.
                </Section>
            </div>

            <PageFooter />
        </div>
    )
}

const Section = ({ title, children }) => (
    <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-3">{title}</h2>
        <p className="text-black leading-relaxed">{children}</p>
    </div>
)

const SubSection = ({ title, children }) => (
    <div className="mb-4">
        <h3 className="text-lg font-medium mb-1">{title}</h3>
        <p className="text-black">{children}</p>
    </div>
)

export default PrivacyPolicy
