import React, { useState } from "react";
import { Button, Input, Form, Alert, Spinner } from "../ui";
import { PasswordStrengthMeter } from "../auth";

interface CredentialSetupProps {
  onSubmit: (data: CredentialData) => Promise<void>;
  initialEmail?: string;
}

export interface CredentialData {
  email: string;
  password: string;
  confirmPassword: string;
  securityQuestion: string;
  securityAnswer: string;
}

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "In what city were you born?",
  "What was the make of your first car?",
  "What was your childhood nickname?",
  "What is the name of your favorite childhood teacher?",
  "What is your favorite movie?",
  "What was your favorite food as a child?",
  "What is the name of the street you grew up on?",
  "What was the name of your first school?",
];

const CredentialSetup: React.FC<CredentialSetupProps> = ({
  onSubmit,
  initialEmail = "",
}) => {
  const [formData, setFormData] = useState<CredentialData>({
    email: initialEmail,
    password: "",
    confirmPassword: "",
    securityQuestion: SECURITY_QUESTIONS[0],
    securityAnswer: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.email || !formData.password) {
      setError("All fields are required");
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    // Password validation
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }

    // Password confirmation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    // Security question answer
    if (!formData.securityAnswer) {
      setError("Please provide an answer to your security question");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
    } catch (err: any) {
      console.error("Credential setup error:", err);
      setError(
        err.message ||
          "There was a problem setting up your credentials. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <Input
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          disabled={!!initialEmail}
          autoFocus={!initialEmail}
        />

        <div>
          <Input
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            autoFocus={!!initialEmail}
          />
          <div className="mt-1">
            <PasswordStrengthMeter password={formData.password} />
          </div>
        </div>

        <Input
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
        />

        <div>
          <label
            htmlFor="securityQuestion"
            className="block text-sm font-medium text-gray-700"
          >
            Security Question
          </label>
          <select
            id="securityQuestion"
            name="securityQuestion"
            value={formData.securityQuestion}
            onChange={handleChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 rounded-md"
            required
          >
            {SECURITY_QUESTIONS.map((question) => (
              <option key={question} value={question}>
                {question}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Answer to Security Question"
          name="securityAnswer"
          value={formData.securityAnswer}
          onChange={handleChange}
          required
        />

        {error && <Alert type="error">{error}</Alert>}

        <div className="pt-2">
          <p className="text-sm text-gray-500 mb-4">
            Your password must be at least 8 characters long and include a mix
            of letters, numbers, and special characters for optimal security.
          </p>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Spinner size="sm" />
              ) : (
                "Set Credentials & Continue"
              )}
            </Button>
          </div>
        </div>
      </div>
    </Form>
  );
};

export default CredentialSetup;
