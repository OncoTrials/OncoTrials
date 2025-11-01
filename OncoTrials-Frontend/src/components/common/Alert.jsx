import React from 'react'
import {Alert} from 'flowbite-react'
import {InfoIcon} from '@phosphor-icons/react'

function CustomAlert({type ,message, onClose}) {
    return (
        <Alert color={type} onDismiss={onClose} icon={InfoIcon}>
            <span className='font-medium'>{message}</span>
        </Alert>
    )
}

export default CustomAlert