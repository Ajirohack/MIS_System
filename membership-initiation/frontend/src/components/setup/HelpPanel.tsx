import React, { useState } from "react";
import { Card } from "../ui";

interface HelpItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface HelpPanelProps {
  items: HelpItem[];
  className?: string;
}

const HelpPanel: React.FC<HelpPanelProps> = ({ items, className = "" }) => {
  const [expandedId, setExpandedId] = useState<string | null>(
    items[0]?.id || null
  );

  const toggleItem = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="p-4 pb-2 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-800">Help & Resources</h3>
      </div>

      <div>
        {items.map((item) => {
          const isExpanded = expandedId === item.id;

          return (
            <div
              key={item.id}
              className="border-b border-gray-200 last:border-b-0"
            >
              <button
                className="w-full text-left px-4 py-3 flex justify-between items-center hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                onClick={() => toggleItem(item.id)}
              >
                <span className="font-medium text-gray-700">{item.title}</span>
                <svg
                  className={`w-5 h-5 text-gray-500 transform transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600">
                  {item.content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default HelpPanel;
