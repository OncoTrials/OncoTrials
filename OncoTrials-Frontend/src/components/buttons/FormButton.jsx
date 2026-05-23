import React from 'react';

const Button = ({ text, type, onClick, disabled }) => {
    return (
        <button onClick={onClick} type={type} disabled={disabled} className="inline-block cursor-pointer items-center justify-center rounded-xl border-[1.58px] border-zinc-600 bg-zinc-950 px-3 py-2 font-medium text-slate-200 shadow-md transition-all duration-300 hover:[transform:translateY(-.335rem)] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-md">
            {text}
        </button>
    );
}

export default Button;

