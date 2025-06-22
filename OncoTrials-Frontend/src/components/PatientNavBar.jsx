import React from 'react'
import { GearIcon } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'

function PatientNavBar() {
    const navigate = useNavigate();
    return (
        <>


            <nav class="bg-blue-900 border-gray-200">
                <div class="max-w-screen flex flex-wrap items-center justify-between mx-auto p-4 px-8 border-b">
                    <a href="http://localhost:5173/patient-dashboard" class="flex items-center space-x-1 rtl:space-x-reverse">
                        <img src={'/OncoTrials.png'} class="h-10" alt="Flowbite Logo" />
                        <span class="self-center text-2xl font-semibold whitespace-nowrap text-white">OncoTrials</span>
                    </a>
                    <div class="flex items-center md:order-2 space-x-3 md:space-x-5 rtl:space-x-reverse">
                        <button>
                            <div className='relative top-1 inline-flex items-center justify-center'>
                                <GearIcon size={32} className="text-white hover:cursor-pointer" onClick={() => navigate('/patient-settings')}/>
                            </div>
                        </button>
                        <button type="button" class="flex text-sm bg-gray-800 rounded-full md:me-0 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600" id="user-menu-button" aria-expanded="false" data-dropdown-toggle="user-dropdown" data-dropdown-placement="bottom">
                            <span class="sr-only">Open user menu</span>
                            <div class="relative inline-flex items-center justify-center w-8 h-8 overflow-hidden bg-blue-500 rounded-full hover:cursor-pointer">
                                <span class="font-medium text-white">JM</span>
                            </div>
                        </button>
                        <div class="z-50 hidden my-4 text-base list-none bg-white divide-y divide-gray-100 rounded-lg shadow-sm dark:bg-gray-700 dark:divide-gray-600" id="user-dropdown">
                            <div class="px-4 py-3">
                                <span class="block text-sm text-gray-900 dark:text-white">Jeremiah Mensah</span>
                                <span class="block text-sm  text-gray-500 truncate dark:text-gray-400">jmensah365@gmail.com</span>
                            </div>
                            <ul class="py-2" aria-labelledby="user-menu-button">
                                <li>
                                    <a href="/patient-dashboard" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white">Dashboard</a>
                                </li>
                                <li>
                                    <a href="/patient-settings" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white">Settings</a>
                                </li>
                                <li>
                                    {/**This will be a button to trigger the supabase sign out API on the backend */}
                                    <a href="/" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white">Sign out</a>
                                </li>
                            </ul>
                        </div>

                    </div>

                </div>
            </nav>

        </>
    )
}

export default PatientNavBar