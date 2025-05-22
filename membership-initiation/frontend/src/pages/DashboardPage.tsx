import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Import CrossPlatformService
import CrossPlatformService, {
  Platform,
  PlatformConnection,
} from "../../shared/CrossPlatformService";

// Assumed components - would be imported from your component library
import {
  Button,
  Card,
  Alert,
  Spinner,
  Badge,
  Tabs,
  Tab,
  Modal,
} from "../components/ui";
import { Container, Header, Footer } from "../components/layout";
import {
  MembershipCard,
  ToolCard,
  ActivityItem,
  QRCodeDisplay,
} from "../components/dashboard";
import ProfileSettings from "../components/dashboard/ProfileSettings";

// Import toast for notifications
import { toast } from "react-toastify";

// Import API configuration
import { API_ENDPOINTS, getAuthHeaders } from "../config/api";

// Import official logos
import companyLogo from "../assets/WhyteHoux.png";
import projectLogo from "../assets/PNG image 5.png";

// Initialize CrossPlatformService
const platformService = new CrossPlatformService("web", `web-${Date.now()}`);

interface UserData {
  id: string;
  name: string;
  tier: string; // archivist, orchestrator, godfather, entity
  membership_key: string;
  created_at: string;
  active: boolean;
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

const DashboardPage: React.FC = () => {
  // Navigation
  const navigate = useNavigate();

  // State management
  const [membershipKey, setMembershipKey] = useState<string>("");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: string;
    message: string;
  } | null>(null);

  // Platform connections
  const [connectedPlatforms, setConnectedPlatforms] = useState<
    PlatformConnection[]
  >([]);
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const [platformToConnect, setPlatformToConnect] = useState<Platform | null>(
    null
  );
  const [connectionLoading, setConnectionLoading] = useState<boolean>(false);
  const [connectionCode, setConnectionCode] = useState<string | null>(null);

  // Check for auth on load and fetch user data
  useEffect(() => {
    const storedKey = localStorage.getItem("membershipKey");
    if (!storedKey) {
      navigate("/setup");
      return;
    }

    setMembershipKey(storedKey);

    // Authenticate with CrossPlatformService
    const authenticateUser = async () => {
      try {
        await platformService.authenticate({ membershipKey: storedKey });
        fetchUserData(storedKey);
        fetchConnectedPlatforms();
      } catch (err) {
        console.error("Authentication error:", err);
        setError("Authentication failed. Please log in again.");
        localStorage.removeItem("membershipKey");
        navigate("/");
      }
    };

    authenticateUser();
  }, [navigate]);

  // Fetch tools when user data is available
  useEffect(() => {
    if (userData) {
      fetchTools();
      fetchActivities();
      generateQRCode();
    }
  }, [userData]);

  // API Integration Methods
  const fetchUserData = async (key: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_ENDPOINTS.VALIDATE_MEMBERSHIP_KEY}`,
        { membership_key: key },
        {
          headers: getAuthHeaders(key),
        }
      );

      if (response.data.valid) {
        // Transform the API response to match our UserData interface
        setUserData({
          id: response.data.user_id || "unknown",
          name: response.data.user_name || "Space Member",
          tier: response.data.tier_name || "ARCHIVIST",
          membership_key: key,
          created_at:
            response.data.registration_date || new Date().toISOString(),
          active: true,
        });
      } else {
        setError("Invalid membership key. Please try again.");
        localStorage.removeItem("membershipKey");
        navigate("/setup");
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError("Error connecting to the server. Please try again later.");
      setUserData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch connected platforms using CrossPlatformService
  const fetchConnectedPlatforms = async () => {
    try {
      const platforms = await platformService.getConnectedPlatforms();
      setConnectedPlatforms(platforms);

      // Update tools based on connected platforms
      updateToolsFromConnections(platforms);
    } catch (err) {
      console.error("Error fetching connected platforms:", err);
      setNotification({
        type: "error",
        message: "Failed to load connected platforms. Please refresh the page.",
      });
    }
  };

  // Update tools status based on connected platforms
  const updateToolsFromConnections = (platforms: PlatformConnection[]) => {
    const connectedPlatformTypes = platforms.map((p) => p.platform);

    setTools((prev) =>
      prev.map((tool) => {
        // Update Telegram bot status
        if (
          tool.id === "connector" &&
          connectedPlatformTypes.includes("telegram-bot")
        ) {
          return {
            ...tool,
            enabled: true,
            status: "online",
          };
        }

        // Update other tool statuses based on platform connections
        // ...

        return tool;
      })
    );
  };

  const fetchTools = async () => {
    try {
      // This would be a real API call in production
      // const response = await axios.get(`${API_BASE_URL}/api/tools`, {
      //   headers: { 'Authorization': `Bearer ${membershipKey}` }
      // });
      // setTools(response.data);

      // Using mock data for now
      setTools([
        {
          id: "rag",
          name: "Knowledge Base",
          description: "Access the Space collective knowledge base",
          enabled: true,
          status: "online",
          icon: "📚",
        },
        {
          id: "planner",
          name: "AI Planner",
          description: "Plan and organize your projects with AI assistance",
          enabled: true,
          status: "online",
          icon: "📅",
        },
        {
          id: "educator",
          name: "Educator Mode",
          description: "Learn about complex topics with guided AI explanations",
          enabled: true,
          status: "online",
          icon: "🧠",
        },
        {
          id: "connector",
          name: "Telegram Bot",
          description: "Connect your Space account with Telegram",
          enabled: false,
          status: "offline",
          icon: "🤖",
        },
      ]);
    } catch (err) {
      console.error("Error fetching tools:", err);
      setNotification({
        type: "error",
        message: "Failed to load tools. Please refresh the page.",
      });
    }
  };

  const fetchActivities = async () => {
    try {
      // This would be a real API call in production
      // const response = await axios.get(`${API_BASE_URL}/api/activities`, {
      //   headers: { 'Authorization': `Bearer ${membershipKey}` }
      // });
      // setActivities(response.data);

      // Using mock data for now
      setActivities([
        {
          id: "act1",
          type: "login",
          description: "New login from Chrome on Windows",
          timestamp: new Date(Date.now() - 15000).toISOString(),
          status: "success",
        },
        {
          id: "act2",
          type: "platform_connection",
          description: "Connected web platform",
          timestamp: new Date(Date.now() - 120000).toISOString(),
          status: "success",
        },
        {
          id: "act3",
          type: "query",
          description: "Accessed knowledge base for Deep Learning Tutorial",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: "success",
        },
        {
          id: "act4",
          type: "sync",
          description: "Synchronized data across platforms",
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          status: "success",
        },
      ]);
    } catch (err) {
      console.error("Error fetching activities:", err);
    }
  };

  const generateQRCode = async () => {
    // Generate temporary connection data
    const connectionData = {
      membershipKey,
      timestamp: Date.now(),
      type: "space_mobile_connection",
      expires: Date.now() + 300000, // 5-minute expiry
    };

    // Simulate API call to generate a secure connection token
    const connectionToken = `CONN-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)}`;
    connectionData["connectionToken"] = connectionToken;

    // Stringify the data for QR code
    setQrCodeData(JSON.stringify(connectionData));
  };

  // Handle tool click - special handling for connection tools
  const handleToolClick = (tool: Tool) => {
    if (tool.id === "connector") {
      if (!tool.enabled) {
        // Show platform connection modal
        setPlatformToConnect("telegram-bot");
        setShowConnectModal(true);
      } else {
        // Open Telegram bot if already connected
        window.open("https://t.me/SpaceNewBot", "_blank");
      }
    } else {
      // Handle other tools
      toast.info(`Opening ${tool.name}...`);
      // Normally would navigate to the tool or open it in a new tab
    }
  };

  // Connect a platform
  const connectPlatform = async (platform: Platform) => {
    setConnectionLoading(true);

    try {
      if (platform === "telegram-bot") {
        // Generate a random 6-digit code for Telegram connection
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setConnectionCode(code);

        // Connect the platform
        await platformService.connectPlatform({
          platform: "telegram-bot",
          deviceName: "Telegram Bot",
        });
      } else if (platform === "mobile-app") {
        navigate("/mobile-connect", {
          state: { membershipKey },
        });
      } else if (platform === "browser-extension") {
        // Connect browser extension
        await platformService.connectPlatform({
          platform: "browser-extension",
          deviceName: "Browser Extension",
        });

        // Redirect to extension installation page
        window.open(
          "https://chromewebstore.google.com/detail/space-browser-extension/abcdefghijklmnopqrstuvwxyz",
          "_blank"
        );
      }

      // Refresh connected platforms after successful connection
      fetchConnectedPlatforms();
    } catch (error) {
      console.error("Error connecting platform:", error);
      toast.error(`Failed to connect ${platform}. Please try again.`);
    } finally {
      setConnectionLoading(false);
    }
  };

  // Disconnect a platform
  const disconnectPlatform = async (
    connectionId: string,
    platform: Platform
  ) => {
    if (!confirm(`Are you sure you want to disconnect ${platform}?`)) {
      return;
    }

    try {
      await platformService.disconnectPlatform(connectionId);
      toast.success(`${platform} disconnected successfully`);

      // Refresh connected platforms
      fetchConnectedPlatforms();
    } catch (error) {
      console.error("Error disconnecting platform:", error);
      toast.error(`Failed to disconnect ${platform}. Please try again.`);
    }
  };

  // Render platform connection modal
  const renderConnectModal = () => {
    if (!platformToConnect) return null;

    return (
      <Modal
        isOpen={showConnectModal}
        onClose={() => {
          setShowConnectModal(false);
          setPlatformToConnect(null);
          setConnectionCode(null);
        }}
        title={`Connect ${platformToConnect}`}
      >
        {connectionLoading ? (
          <div className="flex flex-col items-center p-6">
            <Spinner size="lg" className="mb-4" />
            <p>Generating connection code...</p>
          </div>
        ) : connectionCode ? (
          <div className="p-6">
            <p className="mb-4 text-center">
              To connect your Telegram account, send the following code to the
              Space bot:
            </p>
            <div className="bg-gray-100 p-4 rounded-lg text-center mb-6">
              <code className="text-3xl font-bold tracking-wide">
                {connectionCode}
              </code>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              1. Open Telegram and search for @SpaceNewBot
              <br />
              2. Start a conversation with the bot
              <br />
              3. Send the command:{" "}
              <code className="bg-gray-100 px-2 py-1 rounded">
                /start {connectionCode}
              </code>
              <br />
              4. The bot will confirm your connection
            </p>
            <Button
              variant="primary"
              fullWidth
              onClick={() => window.open("https://t.me/SpaceNewBot", "_blank")}
            >
              Open Telegram Bot
            </Button>
          </div>
        ) : (
          <div className="p-6">
            <p className="mb-6 text-center">
              Connect your {platformToConnect} to access your Space account
              across multiple platforms.
            </p>
            <Button
              variant="primary"
              fullWidth
              onClick={() => connectPlatform(platformToConnect)}
            >
              Connect {platformToConnect}
            </Button>
          </div>
        )}
      </Modal>
    );
  };

  // Render platform connections section
  const renderPlatformConnections = () => {
    return (
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Connected Platforms
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigate("/setup");
            }}
          >
            Add Platform
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          {connectedPlatforms.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-4">No platforms connected yet</p>
              <Button variant="outline" onClick={() => navigate("/setup")}>
                Connect Platforms
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {connectedPlatforms.map((conn) => (
                <div
                  key={conn.id}
                  className="py-3 flex justify-between items-center"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                      {conn.platform === "web" && (
                        <span className="text-blue-500">🌐</span>
                      )}
                      {conn.platform === "mobile-app" && (
                        <span className="text-green-500">📱</span>
                      )}
                      {conn.platform === "telegram-bot" && (
                        <span className="text-blue-500">🤖</span>
                      )}
                      {conn.platform === "browser-extension" && (
                        <span className="text-orange-500">🧩</span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{conn.platform}</div>
                      <div className="text-sm text-gray-500">
                        {conn.deviceName || "Unknown device"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Badge color={conn.isActive ? "green" : "gray"}>
                      {conn.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <button
                      className="ml-4 text-gray-400 hover:text-red-500"
                      onClick={() => disconnectPlatform(conn.id, conn.platform)}
                      title="Disconnect"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m4-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Tab Sections
  const OverviewSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <MembershipCard userData={userData} />
        </div>

        <div className="md:col-span-1">
          <Card className="h-full">
            <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Account Status</span>
                <Badge color="green">Active</Badge>
              </div>
              <div className="flex justify-between">
                <span>Tools Enabled</span>
                <span>
                  {tools.filter((t) => t.enabled).length} / {tools.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Member Since</span>
                <span>
                  {new Date(userData?.created_at || "").toLocaleDateString()}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Available Tools</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onToggle={(enabled) => toggleTool(tool.id, enabled)}
              onConnect={
                tool.id === "connector" ? connectTelegramBot : undefined
              }
              onClick={() => handleToolClick(tool)}
            />
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          <Button variant="text" size="sm">
            View All
          </Button>
        </div>

        <div className="space-y-3">
          {activities.slice(0, 3).map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      </Card>

      {renderPlatformConnections()}
    </div>
  );

  const ProfileSection = () => (
    <ProfileSettings membershipKey={membershipKey} />
  );

  const MembershipSection = () => (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold mb-4">Membership Details</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-1">Membership Key</h4>
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md font-mono text-sm">
              {membershipKey}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-1">Tier</h4>
            <div className="flex items-center">
              <Badge
                color={
                  userData?.tier === "ENTITY"
                    ? "gold"
                    : userData?.tier === "GODFATHER"
                    ? "purple"
                    : userData?.tier === "ORCHESTRATOR"
                    ? "blue"
                    : "gray"
                }
              >
                {userData?.tier}
              </Badge>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-1">Member Since</h4>
            <p>{new Date(userData?.created_at || "").toLocaleDateString()}</p>
          </div>
        </div>
      </Card>

      {qrCodeData && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Membership QR Code</h3>
          <div className="flex justify-center">
            <QRCodeDisplay
              value={qrCodeData}
              size={200}
              tier={userData?.tier || "ARCHIVIST"}
            />
          </div>
          <p className="text-center mt-4 text-sm text-gray-600">
            Scan this QR code to verify your membership status.
          </p>
        </Card>
      )}
    </div>
  );

  // Main render
  return (
    <Container>
      <Header
        title="Space Dashboard"
        username={userData?.name}
        tier={userData?.tier}
        onLogout={handleLogout}
      />

      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="my-6">
        <Tabs
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "membership", label: "Membership" },
            { id: "profile", label: "Profile" },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <div className="mb-12">
        {activeTab === "overview" && <OverviewSection />}
        {activeTab === "membership" && <MembershipSection />}
        {activeTab === "profile" && <ProfileSection />}
      </div>

      {renderConnectModal()}

      <Footer />
    </Container>
  );
};

export default DashboardPage;
