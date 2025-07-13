import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

// Import components
import { Container } from "../components/setup";
import { Card, Button } from "../components/ui";

interface ApplicationData {
  reference?: string;
  name?: string;
  email?: string;
  submittedAt?: string;
}

const SubmissionConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const [applicationData, setApplicationData] =
    useState<ApplicationData | null>(null);

  // Check for application data on load
  useEffect(() => {
    const storedApplicationData = sessionStorage.getItem(
      "applicationSubmitted"
    );

    if (!storedApplicationData) {
      // Redirect to invitation page if no application data exists
      toast.error("No application submission found.");
      navigate("/invitation");
      return;
    }

    try {
      const parsedData = JSON.parse(storedApplicationData);
      setApplicationData(parsedData);
    } catch (error) {
      console.error("Error parsing application data:", error);
      toast.error("Invalid application data.");
      navigate("/invitation");
    }
  }, [navigate]);

  // Format date string
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  };

  return (
    <Container currentPage="Application Submitted">
      <div className="max-w-2xl mx-auto animate-fade-in">
        <Card className="text-center shadow-elevated border-0">
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center shadow-membership">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-emerald-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-3xl font-bold mb-2 text-gray-800">
            Application Submitted
          </h2>

          <p className="text-gray-600 mb-10 text-lg">
            Thank you,{" "}
            <span className="font-medium text-emerald-700">
              {applicationData?.name || "Applicant"}
            </span>
            . Your membership application has been successfully submitted and
            will be reviewed by our membership board.
          </p>

          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-8 mb-8 text-left shadow-soft animate-fade-in">
            <h3 className="font-semibold text-xl mb-6 text-center text-gray-800">
              Application Details
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                <span className="text-gray-600">Reference Number:</span>
                <span className="font-medium bg-white px-3 py-1 rounded-md border border-gray-200 text-emerald-700">
                  {applicationData?.reference}
                </span>
              </div>

              <div className="flex justify-between border-b border-gray-200 pb-3">
                <span className="text-gray-600">Full Name:</span>
                <span className="font-medium">{applicationData?.name}</span>
              </div>

              <div className="flex justify-between border-b border-gray-200 pb-3">
                <span className="text-gray-600">Email:</span>
                <span>{applicationData?.email}</span>
              </div>

              <div className="flex justify-between border-b border-gray-200 pb-3">
                <span className="text-gray-600">Submission Date:</span>
                <span>{formatDate(applicationData?.submittedAt)}</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-10 text-left animate-fade-in">
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-4">
                <div className="bg-amber-100 rounded-full p-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-amber-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-amber-800 text-lg mb-2">
                  What happens next?
                </h4>
                <ul className="list-disc list-inside text-amber-700 space-y-2">
                  <li>
                    Your application will be reviewed by the membership board
                  </li>
                  <li>The review process may take several days to weeks</li>
                  <li>
                    You will receive an email notification once a decision has
                    been made
                  </li>
                  <li>
                    Please keep your application reference number for future
                    inquiries
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Button
              variant="outline"
              className="px-6 py-3"
              onClick={() => {
                // Copy reference number to clipboard
                if (applicationData?.reference) {
                  navigator.clipboard.writeText(applicationData.reference);
                  toast.success("Reference number copied to clipboard");
                }
              }}
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
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
              </svg>
              Copy Reference Number
            </Button>

            <Button
              onClick={() => navigate("/")}
              className="px-6 py-3 hover:shadow-membership"
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
                  d="M3 12l2-2m0 0l7-7 7 7m-14 0l2 2m0 0l7 7 7-7m-14 0l2-2"
                />
              </svg>
              Return to Home
            </Button>
          </div>

          <div className="mt-12 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-500 text-sm">
              Thank you for your interest in joining the Space community.
            </p>
          </div>
        </Card>
      </div>
    </Container>
  );
};

export default SubmissionConfirmationPage;
