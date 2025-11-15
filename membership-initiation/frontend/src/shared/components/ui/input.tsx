import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input: React.FC<InputProps> = ({ className = "", ...props }) => (
  <input
    className={`bg-white text-gray-900 rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400 ${className}`}
    {...props}
  />
);

export default Input;
