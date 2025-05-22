import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";

// Import components
import { Container } from "../components/setup";
import {
  Card,
  Button,
  Input,
  Checkbox,
  Alert,
  Spinner,
} from "../components/ui";

// Import API configuration
import { API_ENDPOINTS } from "../config/api";

// Timer duration in seconds (3 hours)
const SESSION_DURATION = 3 * 60 * 60;

interface InvitationParams {
  invitationId?: string;
}

const InvitationPage: React.FC = () => {
  const navigate = useNavigate();
  const { invitationId } = useParams<InvitationParams>();

  // Form state
  const [invitationCode, setInvitationCode] = useState("");
  const [pin, setPin] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [step, setStep] = useState<"code" | "pin">("code");

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Session timer
  useEffect(() => {
    // Check if there's an active session
    const sessionStartTime = sessionStorage.getItem("invitationSessionStart");

    if (sessionStartTime) {
      const startTime = parseInt(sessionStartTime, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      const elapsed = currentTime - startTime;

      if (elapsed >= SESSION_DURATION) {
        // Session expired
        setSessionExpired(true);
        sessionStorage.removeItem("invitationSessionStart");
        sessionStorage.removeItem("invitationCode");
        return;
      }

      // Set remaining time
      setTimeRemaining(SESSION_DURATION - elapsed);

      // Start countdown
      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            setSessionExpired(true);
            sessionStorage.removeItem("invitationSessionStart");
            sessionStorage.removeItem("invitationCode");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else if (invitationId) {
      // New session with invitation ID from URL
      initializeSession();
    }
  }, [invitationId]);

  // Initialize session with invitation ID
  const initializeSession = async () => {
    if (!invitationId) return;

    setIsLoading(true);
    setError(null);

    try {
      // In a real implementation, we would validate the invitation ID with the API
      // const response = await axios.get(
      //   `${API_ENDPOINTS.VALIDATE_INVITATION}/${invitationId}`
      // );

      // Mock API response
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Start session timer
      const startTime = Math.floor(Date.now() / 1000);
      sessionStorage.setItem("invitationSessionStart", startTime.toString());

      // Set initial time remaining
      setTimeRemaining(SESSION_DURATION);

      // Pre-fill invitation code if provided by API
      if (invitationId) {
        setInvitationCode(invitationId);
      }
    } catch (err: any) {
      console.error("Error validating invitation:", err);
      setError("Invalid invitation link. Please contact support.");
    } finally {
      setIsLoading(false);
    }
  };

  // Format seconds to HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ].join(":");
  };

  // Handle invitation code validation
  const handleInvitationSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!invitationCode.trim()) {
      setError("Please enter your invitation code.");
      return;
    }

    if (!acceptTerms) {
      setError("Please accept the terms to continue.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // In a real implementation, we would validate the code with the API
      // const response = await axios.post(API_ENDPOINTS.VALIDATE_CODE, {
      //   code: invitationCode.trim(),
      // });

      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Store invitation code for later
      sessionStorage.setItem("invitationCode", invitationCode.trim());

      // Start session timer if not already started
      if (!sessionStorage.getItem("invitationSessionStart")) {
        const startTime = Math.floor(Date.now() / 1000);
        sessionStorage.setItem("invitationSessionStart", startTime.toString());
        setTimeRemaining(SESSION_DURATION);
      }

      // Proceed to PIN step
      setStep("pin");
      toast.success("Invitation code validated. Please enter your PIN.");
    } catch (err: any) {
      console.error("Error validating code:", err);
      setError(
        err.response?.data?.message ||
          "Invalid invitation code. Please check and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle PIN validation
  const handlePinSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!pin.trim() || pin.length !== 4) {
      setError("Please enter a valid 4-digit PIN.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // In a real implementation, we would validate the PIN with the API
      // const response = await axios.post(API_ENDPOINTS.VALIDATE_PIN, {
      //   code: sessionStorage.getItem("invitationCode"),
      //   pin: pin.trim(),
      // });

      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1800));

      // Store invitation data for later use
      const mockInvitationData = {
        invitationId: Math.random().toString(36).substring(2, 15),
        code: sessionStorage.getItem("invitationCode"),
        name: "John Doe", // This would come from API
        emailAddress: "john.doe@example.com", // This would come from API
        reason:
          "Your expertise in quantum computing and your dedication to advancing technology for the betterment of humanity has brought you to our attention. We believe your unique skills would be a valuable addition to our community.", // This would come from API
        invitedBy: "Jane Smith", // This would come from API
        invitedDate: new Date().toISOString(),
        validated: true,
        validatedAt: new Date().toISOString(),
      };

      sessionStorage.setItem(
        "invitationData",
        JSON.stringify(mockInvitationData)
      );

      toast.success("PIN verified successfully!");

      // Navigate to registration page
      navigate("/registration");
    } catch (err: any) {
      console.error("Error validating PIN:", err);
      setError(
        err.response?.data?.message ||
          "Invalid PIN. Please check and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Render session expired state
  if (sessionExpired) {
    return (
      <Container currentPage="Invitation">
        <div className="max-w-md mx-auto">
          <Card className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-red-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-2">Session Expired</h2>
            <p className="text-gray-600 mb-6">
              Your invitation session has expired. The invitation link and code
              are valid for 3 hours from initial access.
            </p>
            <p className="text-gray-600 mb-6">
              Please contact your inviter to receive a new invitation if you
              still wish to join.
            </p>
            <Button onClick={() => navigate("/")}>Return to Home</Button>
          </Card>
        </div>
      </Container>
    );
  }

  return (
    <Container currentPage="Invitation">
      <div className="max-w-md mx-auto">
        <Card>
          <h2 className="text-2xl font-bold mb-2 text-center">
            {step === "code" ? "Accept Your Invitation" : "Verify Your PIN"}
          </h2>

          <p className="mb-6 text-gray-600 text-center">
            {step === "code"
              ? "Enter your invitation code to begin the membership process."
              : "Please enter the 4-digit PIN sent with your invitation code."}
          </p>

          {timeRemaining !== null && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-blue-700 text-sm">
                  Session Time Remaining:
                </span>
                <span className="font-mono text-blue-800 font-medium">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
          )}

          {error && (
            <Alert type="error" className="mb-6">
              {error}
            </Alert>
          )}

          {step === "code" ? (
            <form onSubmit={handleInvitationSubmit}>
              <div className="mb-6">
                <Input
                  label="Invitation Code"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                  placeholder="Enter your invitation code"
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              <div className="mb-8">
                <Checkbox
                  id="acceptTerms"
                  checked={acceptTerms}
                  onChange={() => setAcceptTerms(!acceptTerms)}
                  label={
                    <span>
                      I agree to the{" "}
                      <a
                        href="#"
                        className="text-emerald-600 hover:text-emerald-700"
                        onClick={(e) => {
                          e.preventDefault();
                          toast.info(
                            "Terms and Conditions would be displayed here"
                          );
                        }}
                      >
                        terms and conditions
                      </a>
                    </span>
                  }
                />
              </div>

              <div className="text-center">
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? <Spinner size="sm" className="mr-2" /> : null}
                  {isLoading ? "Validating..." : "Continue"}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePinSubmit}>
              <div className="mb-8">
                <Input
                  label="4-Digit PIN"
                  value={pin}
                  onChange={(e) => {
                    // Only allow up to 4 digits
                    const value = e.target.value
                      .replace(/\D/g, "")
                      .substring(0, 4);
                    setPin(value);
                  }}
                  placeholder="Enter 4-digit PIN"
                  autoFocus
                  disabled={isLoading}
                  type="password"
                  inputMode="numeric"
                />
              </div>

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("code")}
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Spinner size="sm" className="mr-2" /> : null}
                  {isLoading ? "Verifying..." : "Verify PIN"}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Having trouble?{" "}
            <a
              href="#"
              className="text-emerald-600 hover:text-emerald-700"
              onClick={(e) => {
                e.preventDefault();
                toast.info("Support contact information would be displayed");
              }}
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </Container>
  );
};

export default InvitationPage;
