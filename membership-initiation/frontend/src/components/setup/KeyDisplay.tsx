import React, { useState } from "react";
import { Button } from "../ui";

interface KeyDisplayProps {
  membershipKey: string;
  showCopyOption?: boolean;
}

const KeyDisplay: React.FC<KeyDisplayProps> = ({
  membershipKey,
  showCopyOption = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // Format key with dashes for better readability
  const formatKey = (key: string): string => {
    // Add a dash after every 4 characters
    return key.replace(/(.{4})/g, "$1-").slice(0, -1);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(membershipKey);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy key:", err);
    }
  };

  const toggleReveal = () => {
    setRevealed(!revealed);
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50 p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">
          Your Membership Key
        </h3>

        <button
          onClick={toggleReveal}
          className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center"
        >
          {revealed ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
              Hide
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              Reveal
            </>
          )}
        </button>
      </div>

      <div className="font-mono bg-white border border-gray-200 rounded-md px-3 py-2 text-base break-all">
        {revealed ? (
          <span>{formatKey(membershipKey)}</span>
        ) : (
          <span>
            {Array(membershipKey.length)
              .fill("•")
              .join("")
              .replace(/(.{4})/g, "$1-")
              .slice(0, -1)}
          </span>
        )}
      </div>

      {showCopyOption && (
        <div className="mt-3 flex justify-end">
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            {copied ? (
              <span className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied!
              </span>
            ) : (
              <span className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                  />
                </svg>
                Copy to Clipboard
              </span>
            )}
          </Button>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500">
        Keep this key secure. You'll need it to authenticate with the Space
        platform.
      </p>
    </div>
  );
};

export default KeyDisplay;
