import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Navbar, NavbarBrand, NavbarCollapse, NavbarLink, NavbarToggle, Dropdown, DropdownHeader, DropdownItem, DropdownDivider, Avatar } from 'flowbite-react';


function PhysicianNavbar({user_email}) {
    const navigate = useNavigate();

    return (
        <>
            <Navbar fluid>
                <NavbarBrand href="/physician-dashboard" className="flex items-center space-x-1 rtl:space-x-reverse">
                    <img src={'/OncoTrials.png'} className="h-10 md:h-15" alt="OncoTrials Logo" />
                    <span className="self-center text-2xl font-semibold whitespace-nowrap text-white">OncoTrials</span>
                </NavbarBrand>
                <div className='flex items-center space-x-4 md:order-2'>
                    <Dropdown arrowIcon={false} inline label={<Avatar placeholderInitials={user_email && user_email.slice(0,1).toUpperCase()} rounded className='cursor-pointer'/>}>
                        <DropdownHeader>
                            <span className='block truncate text-sm font-medium'>{user_email}</span>
                        </DropdownHeader>
                        <DropdownDivider />
                        <DropdownItem onClick={() => navigate('/physician-dashboard')}>Home</DropdownItem>
                        <DropdownItem onClick={() => navigate('/physician-input-trials')}>Input Trials</DropdownItem>
                        <DropdownItem onClick={() => navigate('/physician-settings')}>Settings</DropdownItem>
                        <DropdownItem onClick={() => navigate('/')}>Log Out</DropdownItem>
                    </Dropdown>
                    <NavbarToggle />
                </div>

                {/* Mobile navigation - only shown when toggle is clicked */}
                <NavbarCollapse>
                    <NavbarLink href="/physician-dashboard" className="text-white">Dashboard</NavbarLink>
                    <NavbarLink href="/physician-input-trials" className="text-white">Input Trials</NavbarLink>
                    <NavbarLink href="/physician-settings" className="text-white">Settings</NavbarLink>
                    <NavbarLink href="/" className="text-white">Log Out</NavbarLink>
                </NavbarCollapse>
            </Navbar>
        </>
    )
}

export default PhysicianNavbar