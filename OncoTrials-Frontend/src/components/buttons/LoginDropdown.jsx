import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'

function LoginDropdown() {

    return (
        <>
        
            <button  id="dropdownLoginButton" data-dropdown-toggle="dropdownLogin" class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-3 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800" type="button">Login
                <svg class="w-2.5 h-2.5 ms-3 text-center" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4" />
                </svg>
            </button>

            <div id="dropdownLogin" class="z-10 hidden bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-44 dark:bg-gray-700">
                <ul class="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="dropdownLoginButton">
                    <li>
                        <Link to='/patient-login' class="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Patient Login</Link>
                    </li>
                    <li>
                        <a href="/physician-crc-login" class="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Physcian/CRC Login</a>
                    </li>
                </ul>
            </div>
        </>
    )
}

export default LoginDropdown