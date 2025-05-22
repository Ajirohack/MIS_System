import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";

// Import components
import { Container } from "../components/setup";
import { Card, Button, Checkbox, Alert, Spinner } from "../components/ui";

// Import API configuration
import { API_ENDPOINTS } from "../config/api";

// Oath statement text
const OATH_TEXT = `I solemnly swear to uphold the principles and values of Space. 
I will protect the knowledge shared within this community and contribute positively to its growth.
I will respect the privacy and dignity of all members and adhere to the ethical guidelines established by the community.
I understand that my membership is a privilege, and I commit to maintain the highest standards of integrity in all my interactions.
I make this oath freely and sincerely, acknowledging my responsibility as a member of the Space community.`;

interface RegistrationData {
  firstName?: string;
  lastName?: string;
  email?: string;
  submittedAt?: string;
}

const OathPage: React.FC = () => {
  const navigate = useNavigate();

  // Audio recording related refs and state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Policy acceptance state
  const [acceptedPolicies, setAcceptedPolicies] = useState<{
    generalTerms: boolean;
    privacyPolicy: boolean;
    codeOfConduct: boolean;
    ethicalGuidelines: boolean;
  }>({
    generalTerms: false,
    privacyPolicy: false,
    codeOfConduct: false,
    ethicalGuidelines: false,
  });

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationData, setRegistrationData] =
    useState<RegistrationData | null>(null);

  // Check for registration data on load
  useEffect(() => {
    const storedRegistrationData = sessionStorage.getItem("registrationData");

    if (!storedRegistrationData) {
      toast.error("Please complete your registration first.");
      navigate("/registration");
      return;
    }

    try {
      const parsedData = JSON.parse(storedRegistrationData);
      setRegistrationData(parsedData);
    } catch (error) {
      console.error("Error parsing registration data:", error);
      toast.error("Invalid registration data. Please try again.");
      navigate("/registration");
    }
  }, [navigate]);

  // Clean up audio URL when component unmounts
  useEffect(() => {
    return () => {
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [audioURL]);

  // Start recording the oath
  const startRecording = async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioURL(audioUrl);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer for recording duration
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError(
        "Unable to access your microphone. Please check your browser permissions and try again."
      );
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  // Verify recorded oath
  const verifyRecording = async () => {
    if (!audioURL) {
      setError("Please record your oath before verifying.");
      return;
    }

    setIsVerifying(true);

    try {
      // In production, this would be a real API call to verify the audio
      // const audioBlob = await fetch(audioURL).then(r => r.blob());
      // const formData = new FormData();
      // formData.append('audio', audioBlob);
      // const response = await axios.post(API_ENDPOINTS.VERIFY_OATH_AUDIO, formData);

      // Mock verification process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock success
      setIsVerified(true);
      toast.success("Oath recording verified successfully!");
    } catch (err: any) {
      console.error("Error verifying audio:", err);
      setError("Failed to verify your oath recording. Please try again.");
      setIsVerified(false);
    } finally {
      setIsVerifying(false);
    }
  };

  // Reset recording
  const resetRecording = () => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }

    setAudioURL(null);
    setIsRecording(false);
    setRecordingDuration(0);
    setIsVerified(false);
  };

  // Handle policy checkbox change
  const handlePolicyChange = (policy: keyof typeof acceptedPolicies) => {
    setAcceptedPolicies((prev) => ({
      ...prev,
      [policy]: !prev[policy],
    }));
  };

  // Check if all required items are completed
  const isSubmissionReady = () => {
    const allPoliciesAccepted = Object.values(acceptedPolicies).every(
      (value) => value
    );
    return isVerified && allPoliciesAccepted;
  };

  // Submit the complete application
  const handleSubmit = async () => {
    if (!isSubmissionReady()) {
      setError("Please complete all requirements before submitting.");
      return;
    }

    if (!audioURL) {
      setError("Oath recording is required.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // In production, this would be a real API call
      // const audioBlob = await fetch(audioURL).then(r => r.blob());
      // const formData = new FormData();
      // formData.append('audio', audioBlob);
      // formData.append('acceptedPolicies', JSON.stringify(acceptedPolicies));
      // const response = await axios.post(
      //   API_ENDPOINTS.SUBMIT_MEMBERSHIP_APPLICATION,
      //   formData
      // );

      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Store application reference in session storage
      const applicationReference = `MIS-${Date.now().toString().substring(5)}`;
      sessionStorage.setItem(
        "applicationSubmitted",
        JSON.stringify({
          reference: applicationReference,
          name: `${registrationData?.firstName} ${registrationData?.lastName}`,
          email: registrationData?.email,
          submittedAt: new Date().toISOString(),
        })
      );

      toast.success("Application submitted successfully!");
      navigate("/submission-confirmation");
    } catch (err: any) {
      console.error("Error submitting application:", err);
      setError(
        err.response?.data?.message ||
          "Failed to submit your application. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Format seconds to MM:SS
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <Container currentPage="Membership Oath">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <Card className="mb-8 shadow-elevated border-0">
          <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">
            Membership Oath
          </h2>

          <div className="mb-8">
            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-8 rounded-xl border border-emerald-100 mb-8">
              <h3 className="text-xl font-medium mb-6 text-gray-800 text-center">
                Official Oath Statement
              </h3>
              <div className="relative">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line text-center italic text-lg">
                  {OATH_TEXT}
                </p>
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 h-0.5 w-16 bg-emerald-500"></div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-8 animate-fade-in">
              <div className="flex items-start">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5"
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
                  <h4 className="font-medium text-blue-800 mb-1">
                    Instructions:
                  </h4>
                  <p className="text-blue-700 text-sm">
                    Please record yourself clearly reciting the oath statement
                    above. Speak clearly and at a reasonable pace. Your
                    recording will be verified for clarity and completeness.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <Alert type="error" className="mb-6 animate-fade-in">
                {error}
              </Alert>
            )}

            <div className="bg-white border border-gray-200 rounded-xl shadow-soft p-8 transition-all duration-300">
              {!audioURL ? (
                <div className="flex flex-col items-center">
                  {isRecording ? (
                    <div className="flex flex-col items-center w-full animate-fade-in">
                      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-5 relative">
                        <span className="absolute w-6 h-6 bg-red-600 rounded-full animate-pulse"></span>
                      </div>
                      <p className="text-xl font-medium text-red-600 mb-3">
                        Recording...
                      </p>
                      <p className="text-sm text-gray-600 mb-4">
                        Please read the oath statement clearly
                      </p>
                      <p className="font-mono text-xl mb-6 bg-gray-100 px-4 py-2 rounded-lg">
                        {formatDuration(recordingDuration)}
                      </p>
                      <Button
                        onClick={stopRecording}
                        className="px-8 hover:bg-red-50"
                        variant="outline"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                          />
                        </svg>
                        Stop Recording
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center w-full animate-fade-in">
                      <button
                        onClick={startRecording}
                        className="w-24 h-24 bg-emerald-100 hover:bg-emerald-200 rounded-full flex items-center justify-center mb-5 focus:outline-none focus:ring-4 focus:ring-emerald-200 transition-all duration-300 transform hover:scale-105 hover:shadow-membership"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-10 w-10 text-emerald-600"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      <p className="text-center text-lg font-medium text-gray-700 mb-1">
                        Click to Start Recording
                      </p>
                      <p className="text-center text-sm text-gray-500">
                        Your microphone will be activated
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center animate-fade-in">
                  <div className="mb-8 w-full max-w-md">
                    <h4 className="text-lg font-medium mb-4 text-center text-gray-700">
                      Your Recorded Oath
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <audio src={audioURL} controls className="w-full" />
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    {!isVerified && (
                      <Button
                        onClick={verifyRecording}
                        disabled={isVerifying}
                        className="px-6 hover:shadow-membership"
                      >
                        {isVerifying ? (
                          <Spinner size="sm" className="mr-2" />
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                        {isVerifying ? "Verifying..." : "Verify Recording"}
                      </Button>
                    )}

                    <Button
                      onClick={resetRecording}
                      variant="outline"
                      disabled={isVerifying}
                      className="px-6"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Record Again
                    </Button>
                  </div>

                  {isVerified && (
                    <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200 w-full max-w-md animate-fade-in">
                      <div className="flex items-center text-green-700">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="font-medium">
                          Recording verified successfully
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <hr className="my-10 border-gray-200" />

          <h3 className="text-2xl font-medium mb-8 text-center">
            Policies, Rules, and Regulations
          </h3>

          <div className="space-y-5 mb-10">
            <div className="border border-gray-200 rounded-xl p-5 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
              <div className="flex items-start">
                <Checkbox
                  id="generalTerms"
                  checked={acceptedPolicies.generalTerms}
                  onChange={() => handlePolicyChange("generalTerms")}
                  className="mt-1"
                />
                <div className="ml-3">
                  <label
                    htmlFor="generalTerms"
                    className="font-medium text-gray-800 cursor-pointer"
                  >
                    General Terms and Conditions
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    I have read and agree to the general terms and conditions of
                    Space membership, including all rights and responsibilities
                    of members.
                  </p>
                  <a
                    href="#"
                    className="text-xs text-emerald-600 hover:text-emerald-700 mt-2 inline-block"
                    onClick={(e) => {
                      e.preventDefault();
                      toast.info("General Terms document would be displayed");
                    }}
                  >
                    Read full terms
                  </a>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-5 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
              <div className="flex items-start">
                <Checkbox
                  id="privacyPolicy"
                  checked={acceptedPolicies.privacyPolicy}
                  onChange={() => handlePolicyChange("privacyPolicy")}
                  className="mt-1"
                />
                <div className="ml-3">
                  <label
                    htmlFor="privacyPolicy"
                    className="font-medium text-gray-800 cursor-pointer"
                  >
                    Privacy Policy
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    I understand and consent to how my personal information will
                    be collected, used, stored, and protected by the Space
                    organization.
                  </p>
                  <a
                    href="#"
                    className="text-xs text-emerald-600 hover:text-emerald-700 mt-2 inline-block"
                    onClick={(e) => {
                      e.preventDefault();
                      toast.info("Privacy Policy document would be displayed");
                    }}
                  >
                    Read privacy policy
                  </a>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-5 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
              <div className="flex items-start">
                <Checkbox
                  id="codeOfConduct"
                  checked={acceptedPolicies.codeOfConduct}
                  onChange={() => handlePolicyChange("codeOfConduct")}
                  className="mt-1"
                />
                <div className="ml-3">
                  <label
                    htmlFor="codeOfConduct"
                    className="font-medium text-gray-800 cursor-pointer"
                  >
                    Code of Conduct
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    I agree to adhere to the Space community's code of conduct,
                    which governs interactions between members and use of
                    community resources.
                  </p>
                  <a
                    href="#"
                    className="text-xs text-emerald-600 hover:text-emerald-700 mt-2 inline-block"
                    onClick={(e) => {
                      e.preventDefault();
                      toast.info("Code of Conduct document would be displayed");
                    }}
                  >
                    Read code of conduct
                  </a>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-5 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
              <div className="flex items-start">
                <Checkbox
                  id="ethicalGuidelines"
                  checked={acceptedPolicies.ethicalGuidelines}
                  onChange={() => handlePolicyChange("ethicalGuidelines")}
                  className="mt-1"
                />
                <div className="ml-3">
                  <label
                    htmlFor="ethicalGuidelines"
                    className="font-medium text-gray-800 cursor-pointer"
                  >
                    Ethical Guidelines
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    I acknowledge and agree to follow the ethical guidelines
                    that govern the use of knowledge, technology, and resources
                    within the Space community.
                  </p>
                  <a
                    href="#"
                    className="text-xs text-emerald-600 hover:text-emerald-700 mt-2 inline-block"
                    onClick={(e) => {
                      e.preventDefault();
                      toast.info(
                        "Ethical Guidelines document would be displayed"
                      );
                    }}
                  >
                    Read ethical guidelines
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-400 p-5 rounded-r-xl mb-10 animate-fade-in">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-amber-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-amber-800">
                  Important Notice
                </h4>
                <p className="text-sm text-amber-700 mt-1">
                  Your membership application will undergo a review process that
                  may take several days or weeks. You will be notified once a
                  decision has been made by the membership board.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => navigate("/registration")}
              disabled={isLoading}
              className="px-6"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
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
              Back to Registration
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !isSubmissionReady()}
              className="px-8 hover:shadow-membership"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" className="mr-2" /> Submitting...
                </>
              ) : (
                <>
                  Submit Application
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 ml-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </Container>
  );
};

export default OathPage;
