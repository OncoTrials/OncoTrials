import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query';
import { Navbar, NavbarBrand, NavbarCollapse, NavbarLink, NavbarToggle, Dropdown, DropdownHeader, DropdownItem, DropdownDivider, Avatar } from 'flowbite-react';
import { ClipboardIcon } from '@phosphor-icons/react';
import supabase from '../../utils/SupabaseClient';

const logoutUser = async () => {
    const {error} = await supabase.auth.signOut();

    if (error) return error;
}



function CRCNavbar({user_email}) {
    const navigate = useNavigate();

    const logoutMutation = useMutation({
        mutationFn: logoutUser,
        onSuccess: () => {
            navigate('/', {replace: true})
        }
    })


    

    return (
        <>
            <Navbar fluid>
                <NavbarBrand href="/crc-dashboard" className="flex items-center space-x-1 rtl:space-x-reverse">
                    <img src={'/TrialsOnco.png'} className="h-10 md:h-15" alt="TrialsOnco Logo" />
                    <span className="self-center text-2xl font-semibold whitespace-nowrap text-white">OncoTrials</span>
                </NavbarBrand>
                <div className='flex items-center space-x-4 md:order-2'>
                    {/* Desktop navigation - hidden on mobile */}
                    {/* <div className="hidden md:flex md:space-x-6">
                    <NavbarLink href="/patient-dashboard" className="text-white">Dashboard</NavbarLink>
                    <NavbarLink href="/patient-settings" className="text-white">Settings</NavbarLink>
                    <NavbarLink href="/" className="text-white">Log Out</NavbarLink>
                </div> */}

                    <Dropdown arrowIcon={false} inline label={<Avatar placeholderInitials={user_email && user_email.slice(0,1).toUpperCase()} rounded className='cursor-pointer'/>}>
                        <DropdownHeader>
                            <span className='block truncate text-sm font-medium'>{user_email}</span>
                        </DropdownHeader>
                        <DropdownDivider />
                        <DropdownItem onClick={() => navigate('/crc-dashboard')}>Home</DropdownItem>
                        <DropdownItem onClick={() => navigate('/crc-trials')}>Trials</DropdownItem>
                        <DropdownItem onClick={() => navigate('/crc-patients')}>Patients</DropdownItem>
                        <DropdownItem onClick={() => navigate('/crc-hub')}>Matching Hub</DropdownItem>
                        <DropdownItem onClick={() => navigate('/crc-settings')}>Settings</DropdownItem>
                        <DropdownItem onClick={() => logoutMutation.mutate()}>Log Out</DropdownItem>
                    </Dropdown>
                    <NavbarToggle />
                </div>

                {/* Mobile navigation - only shown when toggle is clicked */}
                {/* <ClipboardIcon size={16} color='white'/> */}
                <NavbarCollapse>
                    <span className='flex items-center justify-center gap-1'> <NavbarLink href="/crc-dashboard" className="text-white">Dashboard</NavbarLink> </span>
                    <NavbarLink href="/crc-trials" className="text-white">Trials</NavbarLink>
                    <NavbarLink href="crc-patients" className="text-white">Patients</NavbarLink>
                    <NavbarLink href="/crc-hub" className="text-white">Matching Hub</NavbarLink>
                    <NavbarLink href="/crc-settings" className="text-white">Settings</NavbarLink>
                    {/* <NavbarLink href="/" className="text-white">Log Out</NavbarLink> */}
                </NavbarCollapse>
            </Navbar>
        </>
    )
}

export default CRCNavbar