import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Container } from "../components/setup";
import { Card, Button, Alert, Spinner } from "../components/ui";
import axios from "axios";
import CrossPlatformService, {
  Platform,
} from "../../shared/CrossPlatformService";

// Import logos
import companyLogo from "../assets/WhyteHoux.png";

// Initialize CrossPlatformService
const platformService = new CrossPlatformService("web", `web-${Date.now()}`);

const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [membershipKey, setMembershipKey] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>("Member");
  const [connectedPlatforms, setConnectedPlatforms] = useState<Platform[]>([]);

  // Calculate remaining time for the one-time link
  useEffect(() => {
    // Get link creation timestamp from URL parameters or localStorage
    // In a real implementation, this would be securely stored and verified
    const linkCreationTime = localStorage.getItem("setupLinkCreatedAt");

    if (!linkCreationTime) {
      // If no timestamp exists, create one for demo purposes
      const currentTime = Math.floor(Date.now() / 1000);
      localStorage.setItem("setupLinkCreatedAt", currentTime.toString());

      // Set initial time remaining to 60 minutes (3600 seconds)
      setTimeRemaining(3600);

      // Start countdown
      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            // In production, redirect to expired page
            // navigate("/link-expired");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      // Calculate remaining time
      const creationTime = parseInt(linkCreationTime, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      const elapsed = currentTime - creationTime;
      const linkExpiryTime = 60 * 60; // 1 hour in seconds

      if (elapsed >= linkExpiryTime) {
        // Link has expired
        setTimeRemaining(0);
        // In real app, redirect to expired page
        // navigate("/link-expired");
      } else {
        // Set remaining time
        setTimeRemaining(linkExpiryTime - elapsed);

        // Start countdown
        const interval = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev === null || prev <= 1) {
              clearInterval(interval);
              // In production, redirect to expired page
              // navigate("/link-expired");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(interval);
      }
    }
  }, [navigate]);

  // Check if user has a membership key from login and check connected platforms
  useEffect(() => {
    const storedKey = localStorage.getItem("membershipKey");
    if (storedKey) {
      setMembershipKey(storedKey);

      // Authenticate with the stored key
      const authenticate = async () => {
        try {
          const authResult = await platformService.authenticate({
            membershipKey: storedKey,
          });
          setUserName(authResult.userName || "Space Member");

          // Get connected platforms
          const platforms = await platformService.getConnectedPlatforms();
          setConnectedPlatforms(platforms.map((p) => p.platform));
        } catch (err) {
          console.error("Authentication error:", err);
          toast.error("Error authenticating with your membership key");
        }
      };

      authenticate();
    } else {
      // Redirect to landing page if no membership key exists
      navigate("/");
    }
  }, [navigate]);

  // Format remaining time
  const formatTimeRemaining = (seconds: number | null): string => {
    if (seconds === null) return "--:--";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Connect Telegram bot
  const connectTelegram = async () => {
    setIsLoading(true);
    try {
      // Connect telegram platform
      await platformService.connectPlatform({
        platform: "telegram-bot",
        deviceName: "Telegram Bot",
      });

      toast.success("Telegram connection initiated. Check your Telegram app.");
      navigate("/telegram-connect");
    } catch (err) {
      console.error("Error connecting Telegram:", err);
      toast.error("Failed to connect Telegram");
    } finally {
      setIsLoading(false);
    }
  };

  // Connect web/default bot
  const connectWebBot = async () => {
    setIsLoading(true);
    try {
      // Connect web platform
      await platformService.connectPlatform({
        platform: "web",
        deviceName: navigator.userAgent || "Web Browser",
      });

      toast.success("Web bot connection successful!");
      setConnectedPlatforms((prev) => [...prev, "web"]);
    } catch (err) {
      console.error("Error connecting web bot:", err);
      toast.error("Failed to connect web bot");
    } finally {
      setIsLoading(false);
    }
  };

  // Connect mobile app
  const connectMobileApp = () => {
    // Generate QR code for mobile app scanning
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      navigate("/mobile-connect", {
        state: { membershipKey },
      });
    }, 1000);
  };

  // Connect browser extension
  const connectBrowserExtension = async () => {
    setIsLoading(true);
    try {
      // Create connection for browser extension
      await platformService.connectPlatform({
        platform: "browser-extension",
        deviceName: "Browser Extension",
      });

      // Show connection information for browser extension
      toast.success("Browser extension connection initiated!");
      setConnectedPlatforms((prev) => [...prev, "browser-extension"]);

      // Redirect to extension setup page
      setTimeout(() => {
        window.open(
          "https://chromewebstore.google.com/detail/space-browser-extension/abcdefghijklmnopqrstuvwxyz",
          "_blank"
        );
      }, 1000);
    } catch (err) {
      console.error("Error connecting browser extension:", err);
      toast.error("Failed to connect browser extension");
    } finally {
      setIsLoading(false);
    }
  };

  // Copy membership key
  const copyMembershipKey = () => {
    if (membershipKey) {
      navigator.clipboard.writeText(membershipKey);
      toast.success("Membership key copied to clipboard");
    }
  };

  return (
    <Container currentPage="Setup">
      <div className="max-w-4xl mx-auto">
        {/* Time remaining indicator */}
        {timeRemaining !== null && (
          <div className="mb-8 text-center">
            <div className="inline-flex items-center px-4 py-2 bg-amber-50 border border-amber-300 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-amber-500 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium text-amber-800">
                {timeRemaining > 0
                  ? `This setup link expires in ${formatTimeRemaining(
                      timeRemaining
                    )}`
                  : "This setup link has expired. Contact admin for a new link."}
              </span>
            </div>
          </div>
        )}

        <Card className="mb-8 shadow-elevated">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4 text-gray-800">
              Welcome to Space, {userName}!
            </h2>
            <p className="text-lg text-gray-600">
              Follow the steps below to complete your setup and connect your
              preferred platforms.
            </p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-emerald-700 mb-4">
              Your Membership Key
            </h3>
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between mb-2">
              <code className="text-gray-800 font-mono">
                {membershipKey || "ARK-XXXXX-XXXXX-XXXXX-XXXX"}
              </code>
              <button
                onClick={copyMembershipKey}
                className="text-emerald-600 hover:text-emerald-700"
                title="Copy to clipboard"
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
            <p className="text-sm text-emerald-700">
              This is your unique membership key. You'll need it to authenticate
              with all Space systems.
            </p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 text-center">
              Connect Your Platforms
            </h3>
            <p className="text-gray-600 mb-6 text-center">
              Choose how you want to interact with the Space system. You can
              connect multiple platforms.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Telegram Bot Option */}
              <div className="border border-gray-200 rounded-xl p-6 transition-all hover:border-blue-300 hover:shadow-md">
                <div className="flex items-center mb-4">
                  {/* Telegram logo SVG */}
                  <div className="h-8 w-8 mr-3 flex-shrink-0">
                    <svg
                      viewBox="0 0 32 32"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-blue-500"
                    >
                      <path
                        d="M16 0.5c-8.563 0-15.5 6.937-15.5 15.5s6.937 15.5 15.5 15.5c8.563 0 15.5-6.937 15.5-15.5s-6.937-15.5-15.5-15.5zM23.613 11.119l-2.544 11.988c-0.188 0.85-0.694 1.056-1.4 0.656l-3.875-2.856-1.869 1.8c-0.206 0.206-0.381 0.381-0.781 0.381l0.275-3.944 7.181-6.488c0.313-0.275-0.069-0.431-0.482-0.156l-8.875 5.587-3.825-1.194c-0.831-0.262-0.85-0.831 0.175-1.231l14.944-5.763c0.694-0.25 1.3 0.169 1.075 1.219z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium">Telegram Bot</h4>
                  {connectedPlatforms.includes("telegram-bot") && (
                    <Badge color="green" className="ml-2">
                      Connected
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Connect with our Telegram bot for seamless communication with
                  Space AI from your mobile device or desktop.
                </p>
                <ul className="text-sm text-gray-600 mb-6 space-y-2">
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0"
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
                    Instant notifications
                  </li>
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0"
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
                    Secure end-to-end encryption
                  </li>
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0"
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
                    Access anywhere
                  </li>
                </ul>
                <Button
                  onClick={connectTelegram}
                  fullWidth
                  variant={
                    connectedPlatforms.includes("telegram-bot")
                      ? "outline"
                      : "default"
                  }
                  disabled={isLoading}
                >
                  {isLoading ? <Spinner size="sm" className="mr-2" /> : null}
                  {connectedPlatforms.includes("telegram-bot")
                    ? "Reconnect Telegram"
                    : "Connect Telegram"}
                </Button>
              </div>

              {/* Default Web Bot Option */}
              <div className="border border-gray-200 rounded-xl p-6 transition-all hover:border-emerald-300 hover:shadow-md">
                <div className="flex items-center mb-4">
                  <div className="h-8 w-8 mr-3 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
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
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium">Web Interface</h4>
                  {connectedPlatforms.includes("web") && (
                    <Badge color="green" className="ml-2">
                      Connected
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Use our web interface to interact with Space AI directly from
                  your browser.
                </p>
                <ul className="text-sm text-gray-600 mb-6 space-y-2">
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0"
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
                    No installation required
                  </li>
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0"
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
                    Clean, simple interface
                  </li>
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0"
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
                    Works on all devices
                  </li>
                </ul>
                <Button
                  onClick={connectWebBot}
                  variant={
                    connectedPlatforms.includes("web") ? "outline" : "default"
                  }
                  fullWidth
                  disabled={isLoading}
                >
                  {isLoading ? <Spinner size="sm" className="mr-2" /> : null}
                  {connectedPlatforms.includes("web")
                    ? "Reconnect Web Interface"
                    : "Connect Web Interface"}
                </Button>
              </div>

              {/* Mobile App Option */}
              <div className="border border-gray-200 rounded-xl p-6 transition-all hover:border-indigo-300 hover:shadow-md">
                <div className="flex items-center mb-4">
                  <div className="h-8 w-8 mr-3 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
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
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium">Mobile App</h4>
                  {connectedPlatforms.includes("mobile-app") && (
                    <Badge color="green" className="ml-2">
                      Connected
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Install our mobile app for iOS or Android to access Space AI
                  on the go.
                </p>
                <ul className="text-sm text-gray-600 mb-6 space-y-2">
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0"
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
                    Offline capabilities
                  </li>
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0"
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
                    Push notifications
                  </li>
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0"
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
                    Voice commands
                  </li>
                </ul>
                <Button
                  onClick={connectMobileApp}
                  variant={
                    connectedPlatforms.includes("mobile-app")
                      ? "outline"
                      : "default"
                  }
                  fullWidth
                  disabled={isLoading}
                >
                  {isLoading ? <Spinner size="sm" className="mr-2" /> : null}
                  {connectedPlatforms.includes("mobile-app")
                    ? "Reconnect Mobile App"
                    : "Connect Mobile App"}
                </Button>
              </div>

              {/* Browser Extension Option */}
              <div className="border border-gray-200 rounded-xl p-6 transition-all hover:border-amber-300 hover:shadow-md">
                <div className="flex items-center mb-4">
                  <div className="h-8 w-8 mr-3 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium">Browser Extension</h4>
                  {connectedPlatforms.includes("browser-extension") && (
                    <Badge color="green" className="ml-2">
                      Connected
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Add our browser extension to access Space AI while browsing
                  the web.
                </p>
                <ul className="text-sm text-gray-600 mb-6 space-y-2">
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0"
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
                    Context-aware assistance
                  </li>
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0"
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
                    Quick access from any webpage
                  </li>
                  <li className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0"
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
                    Save content directly to Space
                  </li>
                </ul>
                <Button
                  onClick={connectBrowserExtension}
                  variant={
                    connectedPlatforms.includes("browser-extension")
                      ? "outline"
                      : "default"
                  }
                  fullWidth
                  disabled={isLoading}
                >
                  {isLoading ? <Spinner size="sm" className="mr-2" /> : null}
                  {connectedPlatforms.includes("browser-extension")
                    ? "Reinstall Extension"
                    : "Add Browser Extension"}
                </Button>
              </div>
            </div>
          </div>

          <Alert type="info" className="mb-6">
            <div className="flex items-start">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-blue-600 mr-2 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="font-medium text-blue-800">
                  Important Information
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  This setup link is a one-time use link and will expire in{" "}
                  {formatTimeRemaining(timeRemaining)}. If you don't complete
                  setup before it expires, please contact the administrator to
                  generate a new link.
                </p>
              </div>
            </div>
          </Alert>

          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Need help with your setup? Contact our support team.
            </p>
            <Button
              variant="text"
              onClick={() => toast.info("Support contact would be shown here")}
            >
              Contact Support
            </Button>
          </div>
        </Card>

        <Card className="shadow-sm">
          <h3 className="text-lg font-medium mb-4">Whyte Houx Initiative</h3>
          <p className="text-gray-600 text-sm mb-4">
            The Membership Initiation System (MIS) is designed to register new
            members into the Whyte Houx Initiative, the organization behind the
            SpaceWH project. Your membership key is required to access all
            SpaceWH systems.
          </p>
          <div className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Whyte Houx Initiative. All rights
            reserved.
          </div>
        </Card>
      </div>
    </Container>
  );
};

export default SetupPage;
