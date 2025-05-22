import React from "react";
import { Card, Badge } from "../ui";
import { QRCodeSVG } from "qrcode.react";

// Import official logos
import companyLogo from "../../assets/WhyteHoux.png";
import projectLogo from "../../assets/PNG image 5.png";

// Types needed by dashboard components
interface UserData {
  id?: string;
  name?: string;
  tier?: string;
  membership_key?: string;
  created_at?: string;
  active?: boolean;
}

interface Tool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  status: "online" | "offline" | "maintenance";
  icon: string;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  status: "success" | "failed" | "pending";
}

// MembershipCard Component
interface MembershipCardProps {
  userData: UserData | null;
}

export const MembershipCard: React.FC<MembershipCardProps> = ({ userData }) => {
  if (!userData) return null;

  // Determine tier color and icon
  const getTierDetails = (tier: string = "ARCHIVIST") => {
    switch (tier) {
      case "ENTITY":
        return {
          color: "bg-amber-100 text-amber-800",
          borderColor: "border-amber-400",
          icon: "🌟",
        };
      case "GODFATHER":
        return {
          color: "bg-purple-100 text-purple-800",
          borderColor: "border-purple-400",
          icon: "👑",
        };
      case "ORCHESTRATOR":
        return {
          color: "bg-blue-100 text-blue-800",
          borderColor: "border-blue-400",
          icon: "🔮",
        };
      case "ARCHIVIST":
      default:
        return {
          color: "bg-gray-100 text-gray-800",
          borderColor: "border-gray-300",
          icon: "📚",
        };
    }
  };

  const tierDetails = getTierDetails(userData.tier);

  return (
    <Card
      className={`bg-gradient-to-br from-white to-gray-50 border ${tierDetails.borderColor}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex">
          {/* Company logo */}
          <img
            src={companyLogo}
            alt="WhyteHoux"
            className="h-10 mr-3 self-start mt-1"
            title="WhyteHoux"
          />

          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome, {userData.name}
            </h2>
            <p className="text-gray-500 mb-3">
              Member since{" "}
              {new Date(userData.created_at || "").toLocaleDateString()}
            </p>

            <div className="flex items-center mt-2 gap-2">
              <div
                className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${tierDetails.color}`}
              >
                <span className="mr-1">{tierDetails.icon}</span>
                {userData.tier}
              </div>

              <Badge color={userData.active ? "green" : "gray"}>
                {userData.active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>

        <div>
          <img
            src={projectLogo}
            alt="Space Project"
            className="h-12"
            title="Space Project"
          />
        </div>
      </div>
    </Card>
  );
};

// ToolCard Component
interface ToolCardProps {
  tool: Tool;
  onToggle: (enabled: boolean) => void;
  onConnect?: () => void;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  onToggle,
  onConnect,
}) => {
  const statusColors = {
    online: "bg-green-100 text-green-800",
    offline: "bg-gray-100 text-gray-800",
    maintenance: "bg-yellow-100 text-yellow-800",
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <span className="text-2xl mr-2">{tool.icon}</span>
          <h3 className="font-semibold">{tool.name}</h3>
        </div>

        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            statusColors[tool.status]
          }`}
        >
          {tool.status}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4">{tool.description}</p>

      <div className="mt-auto flex justify-between items-center">
        <div className="flex items-center">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only"
              checked={tool.enabled}
              onChange={() => onToggle(!tool.enabled)}
              disabled={tool.status === "maintenance"}
            />
            <div
              className={`relative w-10 h-5 bg-gray-200 rounded-full transition duration-200 ease-in-out ${
                tool.enabled ? "bg-emerald-600" : ""
              }`}
            >
              <div
                className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition duration-200 ease-in-out ${
                  tool.enabled ? "transform translate-x-5" : ""
                }`}
              ></div>
            </div>
            <span className="ml-2 text-sm">
              {tool.enabled ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>

        {onConnect && (
          <button
            onClick={onConnect}
            className="text-xs text-emerald-600 hover:text-emerald-800 underline"
          >
            Connect
          </button>
        )}
      </div>
    </Card>
  );
};

// ActivityItem Component
interface ActivityItemProps {
  activity: Activity;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const statusColors = {
    success: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    pending: "bg-yellow-100 text-yellow-800",
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "login":
        return "🔑";
      case "tool_activation":
        return "🛠️";
      case "api_call":
        return "🔄";
      case "update":
        return "📝";
      default:
        return "📌";
    }
  };

  return (
    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
      <div className="flex-shrink-0 mr-3">
        <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full border border-gray-200">
          <span>{getActivityIcon(activity.type)}</span>
        </div>
      </div>

      <div className="flex-1">
        <p className="text-sm font-medium">{activity.description}</p>
        <p className="text-xs text-gray-500">
          {new Date(activity.timestamp).toLocaleString()}
        </p>
      </div>

      <div className="ml-4">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            statusColors[activity.status]
          }`}
        >
          {activity.status}
        </span>
      </div>
    </div>
  );
};

// QRCodeDisplay Component
interface QRCodeDisplayProps {
  value: string;
  size?: number;
  tier?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 200,
  tier = "ARCHIVIST",
}) => {
  const getTierStyle = (tier: string) => {
    switch (tier) {
      case "ENTITY":
        return "border-amber-500 shadow-amber-100";
      case "GODFATHER":
        return "border-purple-500 shadow-purple-100";
      case "ORCHESTRATOR":
        return "border-blue-500 shadow-blue-100";
      case "ARCHIVIST":
      default:
        return "border-gray-500 shadow-gray-100";
    }
  };

  // Custom QR logo using project logo
  const getTierLogo = () => {
    const commonStyle = {
      width: size * 0.25,
      height: size * 0.25,
      position: "absolute" as "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      background: "white",
      borderRadius: "50%",
      padding: size * 0.03,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    };

    return (
      <div style={commonStyle}>
        <img
          src={projectLogo}
          alt="Space Project"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
    );
  };

  const tierColorOptions: Record<string, string> = {
    ENTITY: "#f59e0b",
    GODFATHER: "#8b5cf6",
    ORCHESTRATOR: "#3b82f6",
    ARCHIVIST: "#6b7280",
  };

  const fgColor = tierColorOptions[tier] || "#6b7280";

  return (
    <div
      className={`relative border-4 rounded-lg shadow-lg ${getTierStyle(tier)}`}
      style={{ width: size, height: size }}
    >
      <QRCodeSVG
        value={value}
        size={size}
        bgColor={"#ffffff"}
        fgColor={fgColor}
        level={"H"}
        includeMargin={false}
      />
      {getTierLogo()}

      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-xs bg-white shadow border">
        <div className="flex items-center">
          <img src={companyLogo} alt="WhyteHoux" className="h-3 mr-1" />
          <span className="font-semibold">{tier}</span>
        </div>
      </div>
    </div>
  );
};
