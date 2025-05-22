import React from "react";
import { Button, Badge } from "../ui";
// Import the official logos
import companyLogo from "../../assets/WhyteHoux.png";
import projectLogo from "../../assets/PNG image 5.png";

// Container Component
interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  className = "",
}) => {
  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
};

// Header Component
interface HeaderProps {
  title: string;
  username?: string;
  tier?: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  username,
  tier,
  onLogout,
}) => {
  const tierColors = {
    ARCHIVIST: "gray",
    ORCHESTRATOR: "blue",
    GODFATHER: "purple",
    ENTITY: "gold",
  };

  const tierColor = tier
    ? tierColors[tier as keyof typeof tierColors] || "gray"
    : "gray";

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0 flex items-center">
            {/* Company logo */}
            <img
              src={companyLogo}
              alt="WhyteHoux"
              className="h-8 mr-3"
              title="WhyteHoux"
            />
            {/* Project logo */}
            <img
              src={projectLogo}
              alt="Space Project"
              className="h-10 mr-3"
              title="Space Project"
            />
            <h1 className="text-2xl font-semibold">{title}</h1>
          </div>

          {username && (
            <div className="flex items-center">
              {tier && (
                <Badge color={tierColor} className="mr-3">
                  {tier}
                </Badge>
              )}

              <span className="text-gray-700 mr-4">{username}</span>

              {onLogout && (
                <Button variant="outline" size="sm" onClick={onLogout}>
                  Log Out
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// Footer Component
export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {/* Company logo in footer */}
              <img
                src={companyLogo}
                alt="WhyteHoux"
                className="h-6 mr-3 opacity-70"
              />
              <p className="text-sm text-gray-500">
                &copy; {new Date().getFullYear()} Space Project. All rights
                reserved.
              </p>
            </div>
            <div className="flex space-x-4">
              <a href="#" className="text-sm text-gray-500 hover:text-gray-700">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-700">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
