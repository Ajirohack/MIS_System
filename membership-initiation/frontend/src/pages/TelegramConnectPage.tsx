import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Container } from "../components/setup";
import { Card, Button, Alert, Spinner, Badge } from "../components/ui";
import { QRCodeDisplay } from "../components/dashboard";

// Import Telegram logo
import telegramLogo from "../assets/telegram-logo.svg";

const TelegramConnectPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [connectionCode, setConnectionCode] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "pending" | "connected" | "failed"
  >("pending");
  const [timeRemaining, setTimeRemaining] = useState<number>(300); // 5 minutes in seconds

  // Extract membership key from location state or localStorage
  const membershipKey = localStorage.getItem("membershipKey");

  useEffect(() => {
    if (!membershipKey) {
      navigate("/setup");
      return;
    }

    // Generate connection code and QR code
    const generateConnectionDetails = async () => {
      try {
        // In a real implementation, this would make an API call to generate a secure connection code
        const generatedCode = `${Math.floor(100000 + Math.random() * 900000)}`;
        setConnectionCode(generatedCode);

        // Create QR code data that opens the Telegram bot with the code
        const telegramBotUrl = `https://t.me/SpaceNewBot?start=${generatedCode}`;
        setQrCodeData(telegramBotUrl);

        // Start polling for connection status
        startPollingConnectionStatus(generatedCode);

        // Start countdown timer
        startCountdown();
      } catch (error) {
        console.error("Failed to generate connection details:", error);
        toast.error("Failed to generate Telegram connection details");
      } finally {
        setIsLoading(false);
      }
    };

    generateConnectionDetails();
  }, [membershipKey, navigate]);

  // Poll for connection status
  const startPollingConnectionStatus = (code: string) => {
    // In a real implementation, this would make API calls to check connection status
    const interval = setInterval(() => {
      // Simulate API call to check status
      // In production, this would be:
      // const response = await axios.get(`${API_URL}/telegram/connections/${code}/status`);

      // Simulate connection after 20 seconds for demo purposes
      setTimeout(() => {
        setConnectionStatus("connected");
        clearInterval(interval);

        // Show success notification
        toast.success("Telegram bot successfully connected!");

        // Redirect after a short delay
        setTimeout(() => {
          navigate("/dashboard");
        }, 3000);
      }, 20000);
    }, 3000);

    // Clear interval when component unmounts
    return () => clearInterval(interval);
  };

  // Start countdown timer
  const startCountdown = () => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);

          // If still not connected, show timeout message
          if (connectionStatus === "pending") {
            setConnectionStatus("failed");
            toast.error("Connection timed out. Please try again.");
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Clear interval when component unmounts
    return () => clearInterval(interval);
  };

  // Format time remaining
  const formatTimeRemaining = () => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Copy connection code to clipboard
  const copyConnectionCode = () => {
    if (!connectionCode) return;

    navigator.clipboard.writeText(connectionCode);
    setCopied(true);
    toast.success("Connection code copied to clipboard");

    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };

  // Open Telegram bot directly
  const openTelegramBot = () => {
    if (!connectionCode) return;

    const telegramUrl = `https://t.me/SpaceNewBot?start=${connectionCode}`;
    window.open(telegramUrl, "_blank");
  };

  const handleBack = () => {
    navigate("/setup");
  };

  // Generate a new connection code
  const handleRegenerateCode = () => {
    setIsLoading(true);
    setConnectionStatus("pending");
    setTimeRemaining(300);

    // Call the same setup logic again
    setTimeout(() => {
      const generatedCode = `${Math.floor(100000 + Math.random() * 900000)}`;
      setConnectionCode(generatedCode);

      const telegramBotUrl = `https://t.me/SpaceNewBot?start=${generatedCode}`;
      setQrCodeData(telegramBotUrl);

      startPollingConnectionStatus(generatedCode);
      startCountdown();

      setIsLoading(false);
    }, 1000);
  };

  return (
    <Container currentPage="Telegram Connection">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="text"
          className="mb-6"
          onClick={handleBack}
          startIcon={
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          }
        >
          Back to Setup
        </Button>

        <Card className="shadow-elevated">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center">
                <svg
                  viewBox="0 0 32 32"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-blue-500 h-8 w-8"
                >
                  <path
                    d="M16 0.5c-8.563 0-15.5 6.937-15.5 15.5s6.937 15.5 15.5 15.5c8.563 0 15.5-6.937 15.5-15.5s-6.937-15.5-15.5-15.5zM23.613 11.119l-2.544 11.988c-0.188 0.85-0.694 1.056-1.4 0.656l-3.875-2.856-1.869 1.8c-0.206 0.206-0.381 0.381-0.781 0.381l0.275-3.944 7.181-6.488c0.313-0.275-0.069-0.431-0.482-0.156l-8.875 5.587-3.825-1.194c-0.831-0.262-0.85-0.831 0.175-1.231l14.944-5.763c0.694-0.25 1.3 0.169 1.075 1.219z"
                    fill="currentColor"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-800">
              Connect Telegram Bot
            </h2>
            <p className="text-gray-600">
              Follow the instructions below to connect your Space account to our
              Telegram bot.
            </p>
          </div>

          {isLoading ? (
            <div className="py-8 text-center">
              <Spinner size="lg" />
              <p className="mt-4 text-gray-600">
                Generating connection code...
              </p>
            </div>
          ) : connectionStatus === "failed" ? (
            <div className="text-center py-6">
              <div className="bg-red-50 p-4 rounded-xl mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 mx-auto text-red-500 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="font-medium text-lg text-red-800">
                  Connection Timed Out
                </h3>
                <p className="text-red-700 mt-1">
                  The connection code has expired. Please generate a new code
                  and try again.
                </p>
              </div>

              <Button onClick={handleRegenerateCode} fullWidth>
                Generate New Code
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Connection Code:</h3>
                  <Badge color="amber">
                    Expires in {formatTimeRemaining()}
                  </Badge>
                </div>

                <div className="flex bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <code className="flex-1 text-center text-2xl font-mono tracking-wider">
                    {connectionCode}
                  </code>
                  <button
                    onClick={copyConnectionCode}
                    className={`text-gray-500 hover:text-gray-700 ${
                      copied ? "text-green-500" : ""
                    }`}
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
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
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
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
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="font-medium mb-4 text-center">
                    Option 1: Scan QR Code
                  </h3>
                  {qrCodeData && (
                    <div className="bg-white p-3 border border-gray-200 rounded-xl flex justify-center">
                      <QRCodeDisplay value={qrCodeData} size={160} />
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-medium mb-4 text-center">
                    Option 2: Open Telegram
                  </h3>
                  <div className="flex flex-col h-full">
                    <p className="text-sm text-gray-600 mb-4">
                      Click the button below to open our Telegram bot, or search
                      for @SpaceNewBot in Telegram.
                    </p>
                    <Button
                      onClick={openTelegramBot}
                      variant="outline"
                      className="mt-auto"
                      fullWidth
                      startIcon={
                        <svg
                          viewBox="0 0 32 32"
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-blue-500 h-5 w-5"
                        >
                          <path
                            d="M16 0.5c-8.563 0-15.5 6.937-15.5 15.5s6.937 15.5 15.5 15.5c8.563 0 15.5-6.937 15.5-15.5s-6.937-15.5-15.5-15.5zM23.613 11.119l-2.544 11.988c-0.188 0.85-0.694 1.056-1.4 0.656l-3.875-2.856-1.869 1.8c-0.206 0.206-0.381 0.381-0.781 0.381l0.275-3.944 7.181-6.488c0.313-0.275-0.069-0.431-0.482-0.156l-8.875 5.587-3.825-1.194c-0.831-0.262-0.85-0.831 0.175-1.231l14.944-5.763c0.694-0.25 1.3 0.169 1.075 1.219z"
                            fill="currentColor"
                          />
                        </svg>
                      }
                    >
                      Open @SpaceNewBot
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center mb-8">
                <div className="inline-flex items-center">
                  {connectionStatus === "pending" ? (
                    <>
                      <Spinner size="sm" className="mr-2 text-amber-500" />
                      <span className="text-amber-700">
                        Waiting for connection...
                      </span>
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2 text-emerald-500"
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
                      <span className="text-emerald-700">
                        Connected successfully!
                      </span>
                    </>
                  )}
                </div>
              </div>

              <Alert type="info">
                <div className="flex items-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0"
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
                    <p className="font-medium text-blue-800">How to connect</p>
                    <ol className="list-decimal list-inside text-sm text-blue-700 mt-1 space-y-1 ml-1">
                      <li>Open Telegram and search for @SpaceNewBot</li>
                      <li>Start a conversation with the bot</li>
                      <li>Send the command: /start {connectionCode}</li>
                      <li>The bot will confirm your connection</li>
                    </ol>
                  </div>
                </div>
              </Alert>
            </>
          )}
        </Card>
      </div>
    </Container>
  );
};

export default TelegramConnectPage;
