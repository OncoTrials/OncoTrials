import React from 'react'
import {  XIcon, CheckIcon } from '@phosphor-icons/react'

function PasswordRequirements({ password }) {
    // Password validation
    const passwordLength = password.length >= 6;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasDigitAndSymbol = /[0-9]/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return (
        <div className='space-y-0.5'>
            <h1 className='font-bold'>Password Requirements</h1>
            <div className="">
                <span className='inline-flex items-center'>
                    {passwordLength ? <CheckIcon size={12} color='green' /> : <XIcon size={12} color='red' />}
                    <p className='text-xs font-medium text-gray-600'>At least 6 chars.</p>
                </span>
            </div>
            <div className="">
                <span className='inline-flex items-center'>
                    {hasUppercase ? <CheckIcon size={12} color='green' /> : <XIcon size={12} color='red' />}
                    <p className='text-xs font-medium text-gray-600'>At least 1 uppercase</p>
                </span>
            </div>
            <div className="">
                <span className='inline-flex items-center'>
                    {hasLowercase ? <CheckIcon size={12} color='green' /> : <XIcon size={12} color='red' />}
                    <p className='text-xs font-medium text-gray-600'>At least 1 lowercase</p>
                </span>
            </div>
            <div className="">
                <span className='inline-flex items-center'>
                    {hasDigitAndSymbol ? <CheckIcon size={12} color='green' /> : <XIcon size={12} color='red' />}
                    <p className='text-xs font-medium text-gray-600'>At least 1 digit & symbol</p>
                </span>
            </div>
        </div>
    )
}

export default PasswordRequirements