import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

// Import our pages
import SetupPage from "./pages/SetupPage";
import DashboardPage from "./pages/DashboardPage";
import InvitationPage from "./pages/InvitationPage";
import RegistrationPage from "./pages/RegistrationPage";
import OathPage from "./pages/OathPage";
import SubmissionConfirmationPage from "./pages/SubmissionConfirmationPage";

// Import UI components
import { Modal, Input, Button, Spinner } from "./components/ui";

// Import Telegram Bot Connect component
import TelegramBotConnect from "./components/TelegramBotConnect";

// Import logos for LandingPage
import companyLogo from "./assets/WhyteHoux.png";
import projectLogo from "./assets/PNG image 5.png";

// Global error handler
window.onerror = (message, source, lineno, colno, error) => {
  console.error("Global error:", { message, source, lineno, colno, error });
  toast.error("An unexpected error occurred. Please try again.");
};

// Unhandled promise rejection handler
window.onunhandledrejection = (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  toast.error("Failed to complete operation. Please try again.");
};

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const membershipKey = localStorage.getItem("membershipKey");
    setIsAuthenticated(!!membershipKey);
  }, []);

  if (isAuthenticated === null) {
    // Still checking authentication
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <img src={projectLogo} alt="Space Project" className="h-16 mb-4" />
          <div className="bg-gray-200 h-2 w-40 rounded"></div>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/setup" />;
};

// Landing page component
const LandingPage = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [membershipKey, setMembershipKey] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [invitationPin, setInvitationPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session
    const storedMembershipKey = localStorage.getItem("membershipKey");
    setIsAuthenticated(!!storedMembershipKey);

    // Auto-redirect after checking authentication
    if (storedMembershipKey) {
      navigate("/dashboard");
    }
  }, [navigate]);

  // Handle member login
  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setErrorReason(null);

    try {
      // In production, this would be a real API call to validate the membership key
      // const response = await axios.post('/api/validate-membership-key', { key: membershipKey });

      // Mock validation for demo
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate different error cases for demonstration
      if (membershipKey === "invalid") {
        setError("Failed");
        setErrorReason(
          "Invalid Key: Please scan a valid Membership Key to continue."
        );
        setIsLoading(false);
        return;
      }

      if (membershipKey === "blocked") {
        setError("Failed");
        setErrorReason(
          "Blocked Key: This Membership Key has been suspended. Please contact support."
        );
        setIsLoading(false);
        return;
      }

      if (membershipKey === "expired") {
        setError("Failed");
        setErrorReason(
          "Expired Key: This Membership Key has expired. Please contact support for renewal."
        );
        setIsLoading(false);
        return;
      }

      // Save the membership key
      localStorage.setItem("membershipKey", membershipKey || "demo-key");

      // Close the modal
      setShowLoginModal(false);

      // Navigate to dashboard/setup
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed");
      setErrorReason(
        "An error occurred while validating your Membership Key. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle invitation verification
  const handleInvitationVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setErrorReason(null);

    try {
      // In production, this would be a real API call to validate the invitation
      // const response = await axios.post('/api/validate-invitation', {
      //   code: invitationCode,
      //   pin: invitationPin
      // });

      // Mock validation for demo
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (!invitationCode || !invitationPin) {
        setError("Failed");
        setErrorReason("Please enter both Invitation Code and PIN.");
        setIsLoading(false);
        return;
      }

      if (invitationPin.length !== 4) {
        setError("Failed");
        setErrorReason("PIN must be 4 digits.");
        setIsLoading(false);
        return;
      }

      // Store invitation data in session storage
      sessionStorage.setItem("invitationCode", invitationCode);
      sessionStorage.setItem(
        "invitationSessionStart",
        Math.floor(Date.now() / 1000).toString()
      );

      // Close the modal
      setShowInvitationModal(false);

      // Navigate to registration page
      navigate("/invitation");
    } catch (err) {
      console.error("Invitation error:", err);
      setError("Failed");
      setErrorReason(
        "An error occurred while verifying your invitation. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-between items-center mb-16">
          <img src={companyLogo} alt="WhyteHoux" className="h-10" />
        </div>

        <div className="max-w-3xl mx-auto text-center">
          <img
            src={projectLogo}
            alt="Space Project"
            className="h-24 mx-auto mb-6"
          />
          <h1
            className="text-5xl font-bold text-gray-800 mb-6"
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            Membership Initiation System
          </h1>

          <div className="mt-16 mb-16 text-center">
            <h2 className="text-2xl text-gray-700 mb-8">
              Hi, welcome. How can I help you today?
            </h2>

            <div className="flex flex-col items-center gap-6">
              <button
                onClick={() => setShowLoginModal(true)}
                className="text-xl font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Coming in?
              </button>

              <button
                onClick={() => setShowInvitationModal(true)}
                className="text-xl font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Were you invited?
              </button>
            </div>
          </div>
        </div>

        <div className="mt-24 text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Whyte Houx Initiative. All rights
            reserved.
          </p>
        </div>
      </div>

      {/* Member Login Modal */}
      <Modal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Member Login"
        size="sm"
      >
        <form onSubmit={handleMemberLogin} className="space-y-6">
          <div className="text-center mb-6">
            <p className="text-gray-600">
              Please enter or scan your Membership Key to access the system.
            </p>
          </div>

          <Input
            label="Membership Key"
            value={membershipKey}
            onChange={(e) => setMembershipKey(e.target.value)}
            placeholder="Enter your membership key"
            required
            autoFocus
            disabled={isLoading}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  {errorReason && (
                    <div className="mt-2 text-sm text-red-700">
                      {errorReason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Scan QR Code option */}
          <div className="border-t border-gray-200 pt-4">
            <button
              type="button"
              className="flex items-center justify-center w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              onClick={() =>
                toast.info("QR Code scanning feature would be activated here")
              }
            >
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
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
              Scan Membership Key
            </button>
          </div>

          <Button type="submit" fullWidth disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner size="sm" className="mr-2" /> Verifying...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      </Modal>

      {/* Invitation Modal */}
      <Modal
        isOpen={showInvitationModal}
        onClose={() => setShowInvitationModal(false)}
        title="Enter Your Invitation"
        size="sm"
      >
        <form onSubmit={handleInvitationVerify} className="space-y-6">
          <div className="text-center mb-6">
            <p className="text-gray-600">
              Please enter your Invitation Code and PIN to begin registration.
            </p>
          </div>

          <Input
            label="Invitation Code"
            value={invitationCode}
            onChange={(e) => setInvitationCode(e.target.value)}
            placeholder="Enter invitation code"
            required
            autoFocus
            disabled={isLoading}
          />

          <Input
            label="4-Digit PIN"
            value={invitationPin}
            onChange={(e) => {
              // Only allow up to 4 digits
              const value = e.target.value.replace(/\D/g, "").substring(0, 4);
              setInvitationPin(value);
            }}
            placeholder="Enter 4-digit PIN"
            type="password"
            inputMode="numeric"
            required
            disabled={isLoading}
            maxLength={4}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  {errorReason && (
                    <div className="mt-2 text-sm text-red-700">
                      {errorReason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <Button type="submit" fullWidth disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner size="sm" className="mr-2" /> Verifying...
              </>
            ) : (
              "Continue with Registration"
            )}
          </Button>
        </form>
      </Modal>
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ToastContainer position="top-right" />
      <Router>
        <Routes>
          {/* Landing page as real index */}
          <Route path="/" element={<LandingPage />} />

          {/* Public routes */}
          <Route path="/setup" element={<SetupPage />} />

          {/* Membership Initiation System routes */}
          <Route
            path="/invitation/:invitationId"
            element={<InvitationPage />}
          />
          <Route path="/invitation" element={<InvitationPage />} />
          <Route path="/registration" element={<RegistrationPage />} />
          <Route path="/oath" element={<OathPage />} />
          <Route
            path="/submission-confirmation"
            element={<SubmissionConfirmationPage />}
          />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/telegram-connect"
            element={
              <ProtectedRoute>
                <TelegramBotConnect />
              </ProtectedRoute>
            }
          />

          {/* Fallback to landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
