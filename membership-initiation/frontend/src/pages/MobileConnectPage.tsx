import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Container } from "../components/setup";
import { Card, Button, Alert, Spinner } from "../components/ui";
import { QRCodeDisplay } from "../components/dashboard";

// Import SVG for app stores
import appStoreSvg from "../assets/app-store-badge.svg";
import googlePlaySvg from "../assets/google-play-badge.svg";

const MobileConnectPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pollingStatus, setPollingStatus] = useState<
    "pending" | "connected" | "failed"
  >("pending");
  const [connectionId, setConnectionId] = useState<string | null>(null);

  // Extract membership key from location state
  const membershipKey = location.state?.membershipKey;

  useEffect(() => {
    if (!membershipKey) {
      navigate("/setup");
      return;
    }

    // Generate QR code data with the membership key and connection details
    const generateQRCodeData = async () => {
      try {
        // In a real implementation, this would make an API call to generate a secure QR code
        const timestamp = Date.now();
        const connectionToken = `CONN-${timestamp}-${Math.random()
          .toString(36)
          .substring(2, 10)}`;
        setConnectionId(connectionToken);

        // Create QR code data including connection token and membership key
        const qrData = JSON.stringify({
          type: "space_mobile_connection",
          membershipKey,
          connectionToken,
          timestamp,
          expires: timestamp + 300000, // 5 minutes expiry
        });

        setQrCodeData(qrData);

        // Start polling for connection status
        startPollingConnectionStatus(connectionToken);
      } catch (error) {
        console.error("Failed to generate QR code:", error);
        toast.error("Failed to generate QR code for mobile connection");
      } finally {
        setIsLoading(false);
      }
    };

    generateQRCodeData();
  }, [membershipKey, navigate]);

  // Poll for connection status
  const startPollingConnectionStatus = (connToken: string) => {
    // In a real implementation, this would make API calls to check connection status
    const interval = setInterval(() => {
      // Simulate API call to check status
      // In production, this would be:
      // const response = await axios.get(`${API_URL}/connections/${connToken}/status`);

      // Simulate connection after 15 seconds for demo purposes
      const elapsed = Date.now() - parseInt(connToken.split("-")[1]);

      if (elapsed > 15000) {
        setPollingStatus("connected");
        clearInterval(interval);

        // Show success notification
        toast.success("Mobile app successfully connected!");

        // Redirect after a short delay
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      }
    }, 2000);

    // Clear interval when component unmounts
    return () => clearInterval(interval);
  };

  const handleBack = () => {
    navigate("/setup");
  };

  const openAppStore = () => {
    window.open("https://apps.apple.com/app/spacenew", "_blank");
  };

  const openGooglePlay = () => {
    window.open(
      "https://play.google.com/store/apps/details?id=com.spacenew",
      "_blank"
    );
  };

  return (
    <Container currentPage="Mobile Connection">
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
            <h2 className="text-2xl font-bold mb-2 text-gray-800">
              Connect Mobile App
            </h2>
            <p className="text-gray-600">
              Scan this QR code with the Space mobile app to connect your
              account.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center mb-8">
            {isLoading ? (
              <div className="py-12">
                <Spinner size="lg" />
                <p className="mt-4 text-gray-600">
                  Generating connection code...
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mb-4">
                  {qrCodeData && (
                    <QRCodeDisplay
                      value={qrCodeData}
                      size={220}
                      tier="ARCHIVIST"
                    />
                  )}
                </div>

                <div className="text-center">
                  {pollingStatus === "pending" && (
                    <div className="flex items-center text-amber-700 mb-2">
                      <Spinner size="sm" className="text-amber-500 mr-2" />
                      <span>Waiting for mobile app connection...</span>
                    </div>
                  )}

                  {pollingStatus === "connected" && (
                    <div className="flex items-center text-emerald-700 mb-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
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
                      <span>Mobile app connected successfully!</span>
                    </div>
                  )}

                  <p className="text-sm text-gray-600">
                    QR code expires in 5 minutes
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 mb-8">
            <h3 className="font-medium text-lg mb-4">
              Don't have the app yet?
            </h3>
            <p className="text-gray-600 mb-4">
              Download the Space mobile app from your app store:
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={openAppStore} className="flex-shrink-0">
                <img
                  src={appStoreSvg}
                  alt="Download on the App Store"
                  className="h-10"
                />
              </button>
              <button onClick={openGooglePlay} className="flex-shrink-0">
                <img
                  src={googlePlaySvg}
                  alt="Get it on Google Play"
                  className="h-10"
                />
              </button>
            </div>
          </div>

          <Alert type="info" className="mb-6">
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
                  <li>Download and install the Space mobile app</li>
                  <li>Open the app and tap "Connect account"</li>
                  <li>Scan the QR code above</li>
                  <li>Confirm the connection on your mobile device</li>
                </ol>
              </div>
            </div>
          </Alert>
        </Card>
      </div>
    </Container>
  );
};

export default MobileConnectPage;
