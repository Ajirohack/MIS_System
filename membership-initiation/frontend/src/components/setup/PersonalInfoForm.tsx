import React, { useState } from "react";
import { Button, Input, Form, Alert, Spinner } from "../ui";

interface PersonalInfoFormProps {
  onSubmit: (data: PersonalInfoData) => Promise<void>;
  initialData?: Partial<PersonalInfoData>;
}

export interface PersonalInfoData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  interests?: string[];
}

const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "Japan",
  "India",
  "Brazil",
  "Other",
];

const INTEREST_OPTIONS = [
  { id: "ai", label: "Artificial Intelligence" },
  { id: "blockchain", label: "Blockchain" },
  { id: "data-science", label: "Data Science" },
  { id: "space-exp", label: "Space Exploration" },
  { id: "iot", label: "Internet of Things" },
  { id: "research", label: "Academic Research" },
  { id: "education", label: "Education" },
  { id: "social", label: "Social Impact" },
  { id: "env", label: "Environment" },
];

const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({
  onSubmit,
  initialData = {},
}) => {
  const [formData, setFormData] = useState<PersonalInfoData>({
    firstName: initialData.firstName || "",
    lastName: initialData.lastName || "",
    email: initialData.email || "",
    phone: initialData.phone || "",
    country: initialData.country || COUNTRIES[0],
    interests: initialData.interests || [],
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

  const handleInterestToggle = (interestId: string) => {
    setFormData((prev) => {
      const interests = [...(prev.interests || [])];

      if (interests.includes(interestId)) {
        return {
          ...prev,
          interests: interests.filter((id) => id !== interestId),
        };
      } else {
        return {
          ...prev,
          interests: [...interests, interestId],
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(formData);
    } catch (err: any) {
      console.error("Form submission error:", err);
      setError(
        err.message ||
          "There was a problem saving your information. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Input
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            autoFocus
          />

          <Input
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
        </div>

        <Input
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <Input
          label="Phone Number (optional)"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          placeholder="+1 (555) 123-4567"
        />

        <div>
          <label
            htmlFor="country"
            className="block text-sm font-medium text-gray-700"
          >
            Country
          </label>
          <select
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 rounded-md"
            required
          >
            {COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Areas of Interest
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {INTEREST_OPTIONS.map((interest) => (
              <div key={interest.id} className="relative flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id={`interest-${interest.id}`}
                    type="checkbox"
                    checked={formData.interests?.includes(interest.id) || false}
                    onChange={() => handleInterestToggle(interest.id)}
                    className="focus:ring-emerald-500 h-4 w-4 text-emerald-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label
                    htmlFor={`interest-${interest.id}`}
                    className="text-gray-700 cursor-pointer"
                  >
                    {interest.label}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner size="sm" /> : "Save & Continue"}
          </Button>
        </div>
      </div>
    </Form>
  );
};

export default PersonalInfoForm;
