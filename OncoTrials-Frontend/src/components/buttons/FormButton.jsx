import React from 'react';

const Button = ({ text, onClick }) => {
    return (
        <button onClick={onClick} className="inline-block cursor-pointer items-center justify-center rounded-xl border-[1.58px] border-zinc-600 bg-zinc-950 px-3 py-2 font-medium text-slate-200 shadow-md transition-all duration-300 hover:[transform:translateY(-.335rem)] hover:shadow-xl">
            {text}
        </button>
    );
}

export default Button;

