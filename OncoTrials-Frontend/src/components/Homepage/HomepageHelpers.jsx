export const EyebrowLabel = ({ children }) => (
    <span className="inline-flex items-center gap-2 font-semibold uppercase tracking-[0.22em] text-blue-600 mb-4">
        <span className="w-4 h-px bg-blue-400 inline-block" />
        {children}
        <span className="w-4 h-px bg-blue-400 inline-block" />
    </span>
)

export const scrollToSection = (section) => {
    document.getElementById(section)?.scrollIntoView({
        behavior: 'smooth',
    })
}

export const LoginDropdownItems = [
    { path: '/physician-login', label: 'Physician Login' },
]

export const RegisterDropdownItems = [
    { path: '/physician-register', label: 'Physician Register' },
]