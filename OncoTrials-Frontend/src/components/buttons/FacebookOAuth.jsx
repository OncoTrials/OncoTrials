import React from 'react'
import { FacebookLogoIcon } from '@phosphor-icons/react'

function FacebookOAuth() {
    return (
        <button className="inline-flex items-center justify-center  text-black hover:cursor-pointer hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-center">
                <FacebookLogoIcon size={32} />
            </div>
        </button>
    )
}

export default FacebookOAuth