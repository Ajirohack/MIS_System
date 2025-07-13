import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";

// Import components
import { Container } from "../components/setup";
import { Card, Button, Input, TextArea, Alert, Spinner } from "../components/ui";

// Import API configuration
import { API_ENDPOINTS } from "../config/api";

interface RegistrationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  occupation: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  biography: string;
  referenceDetails: string;
  profilePhotos: File[];
}

interface InvitationData {
  invitationId: string;
  code: string;
  name?: string;
  emailAddress?: string;
  reason?: string;
  invitedBy?: string;
  invitedDate?: string;
  validated: boolean;
  validatedAt?: string;
}

const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE_MB = 5; // Maximum photo size in MB

const RegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [formData, setFormData] = useState<RegistrationFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    dateOfBirth: "",
    occupation: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    biography: "",
    referenceDetails: "",
    profilePhotos: [],
  });
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [photoErrors, setPhotoErrors] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<{ file: File; preview: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  // Check for existing invitation data on mount
  useEffect(() => {
    const invitationDataStr = sessionStorage.getItem("invitationData");
    const sessionStartTime = sessionStorage.getItem("invitationSessionStart");
    
    if (!invitationDataStr || !sessionStartTime) {
      toast.error("No valid invitation found. Please complete the invitation process.");
      navigate("/invitation");
      return;
    }
    
    try {
      const parsedData = JSON.parse(invitationDataStr);
      setInvitationData(parsedData);
      
      // Pre-fill form data if available
      if (parsedData.name) {
        const nameParts = parsedData.name.split(" ");
        setFormData(prev => ({
          ...prev,
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
        }));
      }
      
      if (parsedData.emailAddress) {
        setFormData(prev => ({
          ...prev,
          email: parsedData.emailAddress,
        }));
      }
      
      // Calculate remaining session time
      const startTime = parseInt(sessionStartTime, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      const sessionDuration = 3 * 60 * 60; // 3 hours in seconds
      const remaining = sessionDuration - (currentTime - startTime);
      
      if (remaining <= 0) {
        // Session expired
        toast.error("Your session has expired. Please start over.");
        navigate("/invitation");
        return;
      }
      
      setTimeRemaining(remaining);
      
      // Start countdown
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            toast.error("Your session has expired. Please start over.");
            navigate("/invitation");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
      
    } catch (err) {
      console.error("Error parsing invitation data:", err);
      toast.error("Invalid invitation data. Please start over.");
      navigate("/invitation");
    }
  }, [navigate]);
  
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
  
  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Handle photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newPhotoErrors: string[] = [];
    const newPhotos: { file: File; preview: string }[] = [...photoFiles];
    
    Array.from(files).forEach(file => {
      // Check if maximum photos reached
      if (newPhotos.length >= MAX_PHOTOS) {
        newPhotoErrors.push(`You can only upload a maximum of ${MAX_PHOTOS} photos.`);
        return;
      }
      
      // Check if file is an image
      if (!file.type.startsWith("image/")) {
        newPhotoErrors.push(`File "${file.name}" is not an image.`);
        return;
      }
      
      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > MAX_PHOTO_SIZE_MB) {
        newPhotoErrors.push(
          `File "${file.name}" exceeds the maximum size of ${MAX_PHOTO_SIZE_MB}MB.`
        );
        return;
      }
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        newPhotos.push({ file, preview });
        setPhotoFiles([...newPhotos]);
      };
      reader.readAsDataURL(file);
    });
    
    // Update photo errors
    setPhotoErrors(newPhotoErrors);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  // Remove a photo
  const handleRemovePhoto = (index: number) => {
    const newPhotos = [...photoFiles];
    newPhotos.splice(index, 1);
    setPhotoFiles(newPhotos);
  };
  
  // Trigger file input click
  const handleAddPhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    // Required fields
    const requiredFields: (keyof RegistrationFormData)[] = [
      "firstName",
      "lastName",
      "email",
      "phoneNumber",
      "dateOfBirth",
      "occupation",
      "addressLine1",
      "city",
      "state",
      "postalCode",
      "country",
    ];
    
    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = "This field is required";
      }
    });
    
    // Email validation
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    // Phone validation
    if (formData.phoneNumber && !/^\+?[\d\s()-]{8,20}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = "Please enter a valid phone number";
    }
    
    // Date validation
    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth);
      const now = new Date();
      const minAge = 18;
      
      // Check if birthDate is valid and user is at least minAge years old
      if (isNaN(birthDate.getTime())) {
        newErrors.dateOfBirth = "Please enter a valid date";
      } else {
        const ageDate = new Date(now.getTime() - birthDate.getTime());
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);
        
        if (age < minAge) {
          newErrors.dateOfBirth = `You must be at least ${minAge} years old`;
        }
      }
    }
    
    // Check if at least one photo is uploaded
    if (photoFiles.length === 0) {
      newErrors.profilePhotos = "Please upload at least one profile photo";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Scroll to the first error
      const firstErrorField = document.querySelector("[data-error='true']");
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // In a real implementation, we would send the form data to the API
      // const formDataToSend = new FormData();
      // Object.entries(formData).forEach(([key, value]) => {
      //   if (key !== "profilePhotos") {
      //     formDataToSend.append(key, value);
      //   }
      // });
      
      // photoFiles.forEach(({ file }) => {
      //   formDataToSend.append("profilePhotos", file);
      // });
      
      // formDataToSend.append("invitationId", invitationData?.invitationId || "");
      // formDataToSend.append("invitationCode", invitationData?.code || "");
      
      // const response = await axios.post(API_ENDPOINTS.SUBMIT_REGISTRATION, formDataToSend);
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Store registration data for next step
      const registrationData = {
        ...formData,
        fullName: `${formData.firstName} ${formData.lastName}`,
        photoCount: photoFiles.length,
        invitationId: invitationData?.invitationId,
        invitationCode: invitationData?.code,
        submittedAt: new Date().toISOString(),
      };
      
      sessionStorage.setItem(
        "registrationData",
        JSON.stringify(registrationData)
      );
      
      toast.success("Registration information saved successfully!");
      
      // Navigate to oath page
      navigate("/oath");
      
    } catch (err: any) {
      console.error("Error submitting registration:", err);
      toast.error(
        err.response?.data?.message || "An error occurred while submitting your registration. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Container currentPage="Registration">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Complete Your Registration</h2>
            {timeRemaining !== null && (
              <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-2">
                <div className="flex items-center">
                  <span className="text-blue-700 text-xs mr-2">Time Remaining:</span>
                  <span className="font-mono text-blue-800 font-medium text-sm">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {invitationData?.reason && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-8">
              <h3 className="font-medium text-amber-800 mb-2">Why You Were Invited</h3>
              <p className="text-amber-700">{invitationData.reason}</p>
              {invitationData.invitedBy && (
                <p className="mt-2 text-amber-800 text-sm">
                  Invited by: <span className="font-medium">{invitationData.invitedBy}</span>
                </p>
              )}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  error={errors.firstName}
                  required
                  data-error={!!errors.firstName}
                />
                
                <Input
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  error={errors.lastName}
                  required
                  data-error={!!errors.lastName}
                />
                
                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  error={errors.email}
                  required
                  data-error={!!errors.email}
                />
                
                <Input
                  label="Phone Number"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  error={errors.phoneNumber}
                  required
                  data-error={!!errors.phoneNumber}
                />
                
                <Input
                  label="Date of Birth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  error={errors.dateOfBirth}
                  required
                  data-error={!!errors.dateOfBirth}
                />
                
                <Input
                  label="Occupation"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleInputChange}
                  error={errors.occupation}
                  required
                  data-error={!!errors.occupation}
                />
              </div>
            </div>
            
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4">Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Address Line 1"
                    name="addressLine1"
                    value={formData.addressLine1}
                    onChange={handleInputChange}
                    error={errors.addressLine1}
                    required
                    data-error={!!errors.addressLine1}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Input
                    label="Address Line 2"
                    name="addressLine2"
                    value={formData.addressLine2}
                    onChange={handleInputChange}
                    error={errors.addressLine2}
                  />
                </div>
                
                <Input
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  error={errors.city}
                  required
                  data-error={!!errors.city}
                />
                
                <Input
                  label="State/Province"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  error={errors.state}
                  required
                  data-error={!!errors.state}
                />
                
                <Input
                  label="Postal Code"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  error={errors.postalCode}
                  required
                  data-error={!!errors.postalCode}
                />
                
                <Input
                  label="Country"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  error={errors.country}
                  required
                  data-error={!!errors.country}
                />
              </div>
            </div>
            
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4">Additional Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <TextArea
                  label="Biography"
                  name="biography"
                  value={formData.biography}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Tell us about yourself, your background, interests, and aspirations."
                  helper="This information helps us better understand your fit with our community."
                />
                
                <TextArea
                  label="Reference Details"
                  name="referenceDetails"
                  value={formData.referenceDetails}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Please provide any references or recommendations you may have."
                  helper="Optional: Include names and contact information of references."
                />
              </div>
            </div>
            
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4">Profile Photos</h3>
              <p className="text-gray-600 text-sm mb-4">
                Please upload up to {MAX_PHOTOS} clear photos of yourself. These will be used for identification purposes.
              </p>
              {photoErrors.length > 0 && (
                <Alert type="error" className="mb-4">
                  {photoErrors.map((error, index) => (
                    <div key={index}>{error}</div>
                  ))}
                </Alert>
              )}
              {errors.profilePhotos && (
                <Alert type="error" className="mb-4" data-error="true">
                  {errors.profilePhotos}
                </Alert>
              )}
              <div className="flex flex-wrap gap-4 mb-4">
                {photoFiles.map((photo, index) => (
                  <div
                    key={index}
                    className="w-32 h-32 relative rounded-md overflow-hidden border border-gray-300"
                  >
                    <img
                      src={photo.preview}
                      alt={`Profile photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-red-600 rounded-full w-6 h-6 flex items-center justify-center text-white"
                      onClick={() => handleRemovePhoto(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {photoFiles.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={handleAddPhotoClick}
                    className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <span className="mt-2 text-sm">Add Photo</span>
                  </button>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <p className="text-gray-500 text-sm">
                Supported formats: JPG, PNG, GIF (max {MAX_PHOTO_SIZE_MB}MB each)
              </p>
            </div>
            
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/invitation")}
              >
                Back
              </Button>
              
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting && <Spinner size="sm" className="mr-2" />}
                {isSubmitting ? "Submitting..." : "Continue to Oath"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Container>
  );
};

export default RegistrationPage;
