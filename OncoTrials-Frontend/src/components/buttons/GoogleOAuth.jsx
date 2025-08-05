import React from 'react'
import { GoogleLogoIcon } from '@phosphor-icons/react'

function GoogleOAuth() {
    return (
        <button className="inline-flex items-center justify-center  text-black hover:cursor-pointer hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-center">
                <GoogleLogoIcon size={32} />
            </div>
        </button>
    )
}

export default GoogleOAuth