import React from 'react'
import LoginDropdown from '../components/buttons/LoginDropdown'
import RegisterDropdown from '../components/buttons/RegisterDropdown'
import HomeNavBar from '../components/HomeNavBar'
import SplitText from '../components/SplitText'

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


            <footer class="rounded-lg  m-4 ">
                <div class="w-full max-w-screen mx-auto p-4 md:py-8">
                    <div class="sm:flex sm:items-center sm:justify-between">
                        <a href="http://localhost:5173/" class="flex items-center mb-4 sm:mb-0 space-x-3 rtl:space-x-reverse">
                            <img src={'/vite.svg'} class="h-8" alt="Flowbite Logo" />
                            <span class="self-center text-2xl font-semibold whitespace-nowrap text-black">OncoTrials</span>
                        </a>
                        <ul class="flex flex-wrap items-center mb-6 text-sm font-medium text-gray-500 sm:mb-0 dark:text-gray-400">
                            <li>
                                <a href="#" class="hover:underline me-4 md:me-6">About</a>
                            </li>
                            <li>
                                <a href="#" class="hover:underline me-4 md:me-6">Privacy Policy</a>
                            </li>
                            <li>
                                <a href="#" class="hover:underline me-4 md:me-6">Licensing</a>
                            </li>
                            <li>
                                <a href="#" class="hover:underline">Contact</a>
                            </li>
                        </ul>
                    </div>
                    <hr class="my-6 border-gray-200 sm:mx-auto dark:border-gray-700 lg:my-8" />
                    <span class="block text-sm text-gray-500 sm:text-center dark:text-gray-400">© 2025 OncoTrials™. All Rights Reserved.</span>
                </div>
            </footer>

            </div>
        </>
    )
}

export default HomePage