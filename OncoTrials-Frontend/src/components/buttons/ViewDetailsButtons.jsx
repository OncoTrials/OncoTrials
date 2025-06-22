import React from 'react';

const Button = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="flex justify-center gap-1 items-center mx-auto shadow-md text-sm bg-gray-50 backdrop-blur-md lg:font-medium isolation-auto border-gray-50 before:absolute before:w-full before:transition-all before:duration-500 before:hover:w-full before:-left-full before:hover:left-0 before:rounded-full  hover:text-black before:-z-10 before:aspect-square before:hover:scale-125 before:hover:duration-500 relative z-10 px-2 py-1 overflow-hidden border rounded-full group cursor-pointer"
        >
            View Details
            <svg
                className="w-5 h-5 justify-end group-hover:rotate-90 group-hover:bg-gray-50 text-gray-50 ease-linear duration-200 rounded-full border border-gray-700 group-hover:border-none p-1 rotate-45"
                viewBox="0 0 16 19"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M7 18C7 18.5523 7.44772 19 8 19C8.55228 19 9 18.5523 9 18H7ZM8.70711 0.292893C8.31658 -0.0976311 7.68342 -0.0976311 7.29289 0.292893L0.928932 6.65685C0.538408 7.04738 0.538408 7.68054 0.928932 8.07107C1.31946 8.46159 1.95262 8.46159 2.34315 8.07107L8 2.41421L13.6569 8.07107C14.0474 8.46159 14.6805 8.46159 15.0711 8.07107C15.4616 7.68054 15.4616 7.04738 15.0711 6.65685L8.70711 0.292893ZM9 18L9 1H7L7 18H9Z"
                    className="fill-gray-800 group-hover:fill-gray-800"
                />
            </svg>
        </button>
    );
};

export default Button;
