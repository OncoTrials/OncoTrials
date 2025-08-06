import React from 'react'
import { Link } from 'react-router-dom';
import {Dropdown, DropdownItem} from "flowbite-react";

function GetStartedDropdown({label, menuItems}) {
    return (
        <>
            <Dropdown label={label} dismissOnClick={false} placement='bottom' className='cursor-pointer'>
                {menuItems.map((item, index) => (
                    <DropdownItem key={index}>
                        <Link to={item.path} className='p-1 hover:bg-gray-600'>
                            {item.label}
                        </Link>
                    </DropdownItem>
                ))}
            </Dropdown>
        </>
    )
}

export default GetStartedDropdown