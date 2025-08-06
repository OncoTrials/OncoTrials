import React, {useEffect} from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Navbar, NavbarBrand, NavbarCollapse, NavbarLink, NavbarToggle } from 'flowbite-react';
import GetStartedDropdown from './buttons/HomeDropdown';

function HomeNavBar() {
    const DropdownItems = [
        { path: '/patient-register', label: 'Patient Register' },
        { path: '/physician-crc-register', label: 'Physician/CRC Register' }
    ]

    return (
        <>
            <Navbar fluid className='!bg-transparent !border-b-1'>
                <NavbarBrand href="http://localhost:5173/" className="flex items-center space-x-1 rtl:space-x-reverse">
                    <img src={'/OncoTrials.png'} className="h-10 md:h-15" alt="OncoTrials Logo" />
                    <span className='self-center whitespace-nowrap text-xl md:text-2xl font-semibold text-black'>OncoTrials</span>
                </NavbarBrand>
                <div className='flex md:order-2 gap-2'>
                    <GetStartedDropdown label={'Get Started'} menuItems={DropdownItems} />
                    <NavbarToggle className='cursor-pointer'/>
                </div>
                <NavbarCollapse>
                    <NavbarLink href="http://localhost:5173/" active className='hover:underline underline-offset-2 !text-black md:text-lg'>
                        Home
                    </NavbarLink>
                    <NavbarLink href="#" className='hover:underline underline-offset-2 !text-black md:text-lg'>About</NavbarLink>
                    <NavbarLink href="#" className='hover:underline underline-offset-2 !text-black md:text-lg'>Services</NavbarLink>
                </NavbarCollapse>
            </Navbar>
        </>
    )
}

export default HomeNavBar