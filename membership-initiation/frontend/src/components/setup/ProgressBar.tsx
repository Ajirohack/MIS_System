import React from "react";

interface ProgressBarProps {
  percentage: number;
  showPercentage?: boolean;
  className?: string;
  height?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  showPercentage = false,
  className = "",
  height = "h-2",
}) => {
  // Ensure percentage is between 0 and 100
  const normalizedPercentage = Math.max(0, Math.min(100, percentage));

  return (
    <div
      className={`w-full bg-gray-200 rounded-full overflow-hidden ${height} ${className}`}
    >
      <div
        className="bg-emerald-500 h-full transition-all duration-300 ease-in-out"
        style={{ width: `${normalizedPercentage}%` }}
      ></div>

      {showPercentage && (
        <div className="text-xs font-medium text-gray-700 mt-1">
          {Math.round(normalizedPercentage)}% Complete
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
