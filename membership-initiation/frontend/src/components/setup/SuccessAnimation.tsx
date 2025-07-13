import React, { useEffect, useState } from "react";

interface SuccessAnimationProps {
  size?: "sm" | "md" | "lg";
}

const SuccessAnimation: React.FC<SuccessAnimationProps> = ({ size = "md" }) => {
  const [animate, setAnimate] = useState(false);

  // Trigger animation after component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimate(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Size mapping
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  return (
    <div className={`flex items-center justify-center ${sizeClasses[size]}`}>
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Outer circle */}
        <div
          className={`absolute inset-0 rounded-full border-4 border-emerald-500 opacity-0 ${
            animate ? "animate-ping-once" : ""
          }`}
          style={{
            animationDelay: "0.1s",
            animationDuration: "1s",
          }}
        ></div>

        {/* Middle circle */}
        <div
          className={`absolute inset-2 rounded-full bg-emerald-100 opacity-0 ${
            animate ? "animate-scale-in" : ""
          }`}
          style={{
            animationDelay: "0.2s",
            animationDuration: "0.5s",
            animationFillMode: "forwards",
          }}
        ></div>

        {/* Checkmark */}
        <div
          className={`absolute inset-0 flex items-center justify-center opacity-0 ${
            animate ? "animate-fade-in" : ""
          }`}
          style={{
            animationDelay: "0.5s",
            animationDuration: "0.5s",
            animationFillMode: "forwards",
          }}
        >
          <svg
            className="text-emerald-600"
            width="50%"
            height="50%"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7 10L9 12L13 8M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default SuccessAnimation;
