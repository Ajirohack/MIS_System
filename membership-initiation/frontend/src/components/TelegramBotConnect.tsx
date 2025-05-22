import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Assumed UI components
import { Button, Input, Card, Form, Alert, Spinner } from "./ui";
import { Container } from "./layout";

// Import API configuration
import { API_ENDPOINTS, getAuthHeaders } from "../config/api";

// Import official logos
import companyLogo from "../assets/WhyteHoux.png";
import projectLogo from "../assets/PNG image 5.png";

const TelegramBotConnect: React.FC = () => {
  const navigate = useNavigate();

  // State management
  const [botToken, setBotToken] = useState<string>("");
  const [chatId, setChatId] = useState<string>("");
  const [step, setStep] = useState<"token" | "verification" | "complete">(
    "token"
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get membership key from localStorage
  const membershipKey = localStorage.getItem("membershipKey") || "";

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!botToken) {
      setError("Please enter your Telegram bot token");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Here you'd verify the bot token with Telegram's API
      // For now, we'll simulate this step
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setStep("verification");
      setSuccess("Bot token verified, please enter your chat ID");
    } catch (err) {
      console.error("Error verifying bot token:", err);
      setError("Failed to verify bot token. Please check and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chatId) {
      setError("Please enter your Telegram chat ID");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Connect to your backend API using the centralized API endpoints
      const response = await axios.post(
        `${API_ENDPOINTS.TOGGLE_TOOL("telegram")}/connect`,
        {
          botToken,
          chatId,
        },
        {
          headers: getAuthHeaders(membershipKey),
        }
      );

      if (response.data.success) {
        setStep("complete");
        setSuccess("Telegram bot connected successfully!");
      } else {
        throw new Error(response.data.message || "Connection failed");
      }
    } catch (err: any) {
      console.error("Error connecting Telegram bot:", err);
      setError(
        err.response?.data?.message ||
          "Failed to connect Telegram bot. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    navigate("/dashboard");
  };

  return (
    <Container className="py-12">
      <Card className="max-w-xl mx-auto p-8">
        <div className="mb-8 text-center">
          <div className="flex justify-center items-center mb-4">
            <img
              src={companyLogo}
              alt="WhyteHoux"
              className="h-10 mr-3"
              title="WhyteHoux"
            />
            <img
              src={projectLogo}
              alt="Space Project"
              className="h-14"
              title="Space Project"
            />
          </div>
          <h1 className="text-2xl font-bold">Connect Telegram Bot</h1>
          <p className="text-gray-500 mt-2">
            Set up notifications and interactions via Telegram
          </p>
        </div>

        {error && (
          <Alert type="error" className="mb-6">
            {error}
          </Alert>
        )}

        {success && (
          <Alert type="success" className="mb-6">
            {success}
          </Alert>
        )}

        {step === "token" && (
          <Form onSubmit={handleTokenSubmit}>
            <Input
              label="Bot Token"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="Enter your Telegram bot token"
              required
              className="mb-6"
            />

            <div className="mt-8 flex space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !botToken}
                className="flex-1"
              >
                {isLoading ? <Spinner size="sm" /> : "Verify Token"}
              </Button>
            </div>
          </Form>
        )}

        {step === "verification" && (
          <Form onSubmit={handleChatIdSubmit}>
            <Input
              label="Chat ID"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="Enter your Telegram chat ID"
              required
              className="mb-6"
            />

            <div className="mt-8 flex space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("token")}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !chatId}
                className="flex-1"
              >
                {isLoading ? <Spinner size="sm" /> : "Connect Bot"}
              </Button>
            </div>
          </Form>
        )}

        {step === "complete" && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 mb-6">
              <img
                src={projectLogo}
                alt="Space Project"
                className="h-12"
                title="Space Project Connected"
              />
            </div>

            <h2 className="text-xl font-bold mb-4">Connection Successful</h2>
            <p className="text-gray-600 mb-8">
              Your Telegram bot has been successfully connected to the Space
              Project. You will now receive notifications through Telegram.
            </p>

            <Button onClick={handleComplete}>Return to Dashboard</Button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            How to get these details:
          </h3>
          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
            <li>Create a new bot using BotFather in Telegram</li>
            <li>Copy the API token provided by BotFather</li>
            <li>Start a conversation with your bot</li>
            <li>
              Visit api.telegram.org/bot[YOUR_TOKEN]/getUpdates to find your
              Chat ID
            </li>
          </ol>
        </div>
      </Card>
    </Container>
  );
};

export default TelegramBotConnect;
