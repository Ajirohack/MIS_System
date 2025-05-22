import React from "react";

interface Step {
  id: string;
  label: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: string;
  className?: string;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  className = "",
}) => {
  return (
    <div className={`py-4 ${className}`}>
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          {/* Progress bar base */}
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2"></div>

          <ol className="relative z-10 flex justify-between">
            {steps.map((step, index) => {
              const isActive = currentStep === step.id;
              const isPassed =
                steps.findIndex((s) => s.id === currentStep) >
                steps.findIndex((s) => s.id === step.id);

              return (
                <li key={step.id} className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 mb-2 ${
                      isActive
                        ? "bg-emerald-100 border-emerald-600 text-emerald-700"
                        : isPassed
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-white border-gray-300 text-gray-500"
                    }`}
                  >
                    {isPassed ? (
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      isActive
                        ? "text-emerald-700"
                        : isPassed
                        ? "text-emerald-600"
                        : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>

          {/* Progress bar filled part */}
          <div
            className="absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 transition-all duration-300 ease-in-out"
            style={{
              width: `${
                (steps.findIndex((step) => step.id === currentStep) /
                  (steps.length - 1)) *
                100
              }%`,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default StepIndicator;
