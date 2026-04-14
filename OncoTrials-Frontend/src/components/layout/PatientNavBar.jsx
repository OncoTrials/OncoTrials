import React from 'react'
import { GearIcon } from '@phosphor-icons/react'
import Card from '../buttons/NavigationButtons';
import { useNavigate } from 'react-router-dom'
import { Navbar, NavbarBrand, NavbarCollapse, NavbarLink, NavbarToggle, Dropdown, DropdownHeader, DropdownItem, DropdownDivider, Avatar } from 'flowbite-react';


function PatientNavBar({user_email}) {
    const navigate = useNavigate();


    

    return (
        <>
            <Navbar fluid>
                <NavbarBrand href="/patient-dashboard" className="flex items-center space-x-1 rtl:space-x-reverse">
                    <img src={'/OncoTrials.png'} className="h-10 md:h-15" alt="OncoTrials Logo" />
                    <span className="self-center text-2xl font-semibold whitespace-nowrap text-white">OncoTrials</span>
                </NavbarBrand>
                <div className='flex items-center space-x-4 md:order-2'>
                    {/* Desktop navigation - hidden on mobile */}
                    {/* <div className="hidden md:flex md:space-x-6">
                    <NavbarLink href="/patient-dashboard" className="text-white">Dashboard</NavbarLink>
                    <NavbarLink href="/patient-settings" className="text-white">Settings</NavbarLink>
                    <NavbarLink href="/" className="text-white">Log Out</NavbarLink>
                </div> */}

                    <Dropdown arrowIcon={false} inline label={<Avatar placeholderInitials='JM' rounded />}>
                        <DropdownHeader>
                            <span className='block truncate text-sm font-medium'>{user_email}</span>
                        </DropdownHeader>
                        <DropdownDivider />
                        <DropdownItem onClick={() => navigate('/patient-dashboard')}>Home</DropdownItem>
                        <DropdownItem onClick={() => navigate('/patient-settings')}>Settings</DropdownItem>
                        <DropdownItem onClick={() => navigate('/')}>Log Out</DropdownItem>
                    </Dropdown>
                    <NavbarToggle />
                </div>

                {/* Mobile navigation - only shown when toggle is clicked */}
                <NavbarCollapse>
                    <NavbarLink href="/patient-dashboard" className="text-white">Dashboard</NavbarLink>
                    <NavbarLink href="/patient-settings" className="text-white">Settings</NavbarLink>
                    <NavbarLink href="/" className="text-white">Log Out</NavbarLink>
                </NavbarCollapse>
            </Navbar>
        </>
    )
}

export default PatientNavBar