import React from 'react'
import LoginDropdown from '../components/buttons/LoginDropdown'
import RegisterDropdown from '../components/buttons/RegisterDropdown'
import HomeNavBar from '../components/HomeNavBar'
import SplitText from '../components/SplitText'
import Footer from '../components/Footer'

function HomePage() {
    return (
        <>
        <div className='animate-fade-down'>
        <HomeNavBar />
            <div className='flex flex-col items-center justify-center  min-h-screen'>
                <div className='flex flex-col items-center justify-center'>

                    <div className='flex flex-row gap-3'>
                        <img src={'/vite.svg'} alt='OncoTrials Logo' className='h-12 w-12'/>
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

                    <div className='flex flex-col md:flex-row gap-3 md:gap-10 mt-5'>
                        <LoginDropdown />
                        <RegisterDropdown />
                    </div>
                </div>
            </div>

            <div className='flex flex-col items-center justify-center min-h-full'>
                <div className='flex flex-col items-center justify-start'>
                    <h1 className='text-4xl font-bold'>
                        Features
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
            </div>

            <Footer/>

            </div>
        </>
    )
}

export default HomePage