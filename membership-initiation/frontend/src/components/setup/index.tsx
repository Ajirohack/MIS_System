import React from "react";
// Import official logos
import projectLogo from "../../assets/PNG image 5.png";
import companyLogo from "../../assets/WhyteHoux.png";

// Step Indicator Component
interface Step {
  id: string;
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: string;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
}) => {
  const getCurrentStepIndex = () => {
    return steps.findIndex((step) => step.id === currentStep);
  };

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between w-full mb-2">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 flex items-center justify-center rounded-full ${
                  currentStep === step.id
                    ? "bg-emerald-600 text-white"
                    : getCurrentStepIndex() > index
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {getCurrentStepIndex() > index ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <div className="text-xs mt-1 text-gray-600">{step.label}</div>
            </div>

            {/* Connector line between steps */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-2">
                <div
                  className={`h-1 ${
                    getCurrentStepIndex() > index
                      ? "bg-emerald-500"
                      : "bg-gray-200"
                  }`}
                ></div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// KeyDisplay Component
interface KeyDisplayProps {
  membershipKey: string;
  tier?: string;
}

export const KeyDisplay: React.FC<KeyDisplayProps> = ({
  membershipKey,
  tier = "ARCHIVIST",
}) => {
  // Function to check if a key has special separators like ARK-, ORC:, etc.
  const formatKey = (key: string) => {
    // Check if key already has special separators
    if (
      key.includes("-") ||
      key.includes(":") ||
      key.includes("⟡") ||
      key.includes("∞")
    ) {
      return key;
    }

    // Add visual separators if key doesn't have them
    // Based on our key format prefixes (from docs)
    if (key.startsWith("ARK")) {
      return key.replace(/(.{3})(.{5})(.{5})(.{5})(.{4})/, "$1-$2-$3-$4-$5");
    } else if (key.startsWith("ORC")) {
      return key.replace(/(.{3})(.{5})(.{5})(.{5})(.{4})/, "$1:$2:$3:$4:$5");
    } else if (key.startsWith("GOD")) {
      return key.replace(/(.{3})(.{5})(.{5})(.{5})(.{4})/, "$1∞$2∞$3∞$4∞$5");
    } else if (key.startsWith("NXS")) {
      return key.replace(/(.{3})(.{5})(.{5})(.{5})(.{4})/, "$1⟡$2⟡$3⟡$4⟡$5");
    }

    // If key doesn't match known formats, just group by 5
    return key.replace(/(.{5})/g, "$1-").slice(0, -1);
  };

  // Get tier-specific styling
  const getTierStyles = () => {
    const styles = {
      background: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-700",
    };

    switch (tier?.toUpperCase()) {
      case "ORCHESTRATOR":
        return {
          background: "bg-blue-50",
          border: "border-blue-200",
          text: "text-blue-700",
        };
      case "GODFATHER":
        return {
          background: "bg-purple-50",
          border: "border-purple-200",
          text: "text-purple-700",
        };
      case "ENTITY":
        return {
          background: "bg-amber-50",
          border: "border-amber-200",
          text: "text-amber-700",
        };
      default: // ARCHIVIST and fallback
        return styles;
    }
  };

  const tierStyles = getTierStyles();

  return (
    <div
      className={`${tierStyles.background} border ${tierStyles.border} rounded-lg p-4 shadow-sm`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <img src={projectLogo} alt="Space Project" className="h-6 mr-2" />
          <span
            className={`text-xs font-semibold uppercase ${tierStyles.text}`}
          >
            {tier} Key
          </span>
        </div>
        {tier !== "ARCHIVIST" && (
          <span className="px-2 py-1 text-xs rounded-full bg-opacity-20 font-medium bg-emerald-100 text-emerald-700">
            Premium
          </span>
        )}
      </div>
      <div className="font-mono text-sm break-all border border-opacity-50 rounded p-2 bg-white">
        {formatKey(membershipKey)}
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Keep this key secure. You'll need it to access Space platform resources.
      </div>
    </div>
  );
};

// Progress Bar Component
interface ProgressBarProps {
  progress: number; // 0 to 100
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  className = "",
}) => {
  return (
    <div
      className={`w-full h-2 bg-gray-200 rounded-full overflow-hidden ${className}`}
    >
      <div
        className="h-full bg-emerald-500 transition-all duration-500 ease-in-out"
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
};

// Success Animation Component
interface SuccessAnimationProps {
  size?: "sm" | "md" | "lg";
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  size = "md",
}) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  return (
    <div
      className={`${sizeClasses[size]} mx-auto rounded-full bg-green-100 flex items-center justify-center`}
    >
      <svg
        className="text-green-500 animate-[scale_0.5s_ease-in-out]"
        xmlns="http://www.w3.org/2000/svg"
        width="65%"
        height="65%"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
  );
};

// Container Component (specific to setup flow)
interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  className = "",
}) => {
  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col ${className}`}
    >
      <div className="w-full">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center mb-8">
            {/* Company and Project Logos */}
            <div className="flex justify-center items-center mb-4">
              {/* Uncomment and replace with actual logo paths */}
              <img
                src={companyLogo}
                alt="WhyteHoux"
                className="h-10 mr-4"
                title="WhyteHoux"
              />
              <img
                src={projectLogo}
                alt="Space Project"
                className="h-14"
                title="Space Project"
              />
            </div>
            <h1 className="text-3xl font-bold">Space Membership</h1>
            <p className="text-center text-gray-600 text-sm max-w-md">
              Manage your membership, view keys, and monitor progress in the
              Space platform setup.
            </p>
          </div>
          {/* StepIndicator, KeyDisplay, ProgressBar, SuccessAnimation components will be used here */}
          {children}
        </div>
      </div>
    </div>
  );
};
