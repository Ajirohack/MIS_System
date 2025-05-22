import React from "react";
// Import the official logos
import companyLogo from "../../assets/WhyteHoux.png";
import projectLogo from "../../assets/PNG image 5.png";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  currentPage?: string;
}

const Container: React.FC<ContainerProps> = ({
  children,
  className = "",
  currentPage,
}) => {
  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-6 px-4 sm:px-6 ${className}`}
    >
      <div className="max-w-6xl mx-auto">
        {/* Top navigation bar with company logo on left */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center">
            <img
              src={companyLogo}
              alt="WhyteHoux"
              className="h-10"
              title="WhyteHoux"
            />
          </div>

          {/* Current page indicator */}
          {currentPage && (
            <div className="px-4 py-1 bg-white shadow-sm rounded-full border border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                {currentPage}
              </span>
            </div>
          )}
        </div>

        <div className="text-center mb-10">
          <div className="mb-3">
            <img
              src={projectLogo}
              alt="Space Project"
              className="h-16 mx-auto"
              title="Space Project"
            />
          </div>
          <h1
            className="text-4xl font-bold text-gray-800 font-arial mb-1"
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            Membership Initiation System
          </h1>
        </div>

        {children}

        <footer className="mt-16 text-center text-sm text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} Space Project. All rights
            reserved.
          </p>
          <div className="mt-2">
            <a
              href="#"
              className="text-emerald-600 hover:text-emerald-500 mx-2"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-emerald-600 hover:text-emerald-500 mx-2"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="text-emerald-600 hover:text-emerald-500 mx-2"
            >
              Support
            </a>
          </div>

          {/* Company Logo in Footer */}
          <div className="mt-6 flex justify-center">
            <img src={companyLogo} alt="WhyteHoux" className="h-8 opacity-70" />
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Container;
