import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Button, Input, Form, Alert, Spinner, Card } from "../ui";
import axios from "axios";

// Import API configuration
import { API_ENDPOINTS, getAuthHeaders } from "../../config/api";

// Import official logos
import companyLogo from "../../assets/WhyteHoux.png";
import projectLogo from "../../assets/PNG image 5.png";

interface ProfileSettingsProps {
  membershipKey: string;
}

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  theme: "light" | "dark" | "system";
  notifications: boolean;
  twoFactorEnabled: boolean;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ membershipKey }) => {
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    bio: "",
    theme: "system",
    notifications: true,
    twoFactorEnabled: false,
  });
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("general");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Fetch user profile data on component mount
  useEffect(() => {
    fetchUserProfile();
  }, [membershipKey]);

  const fetchUserProfile = async () => {
    if (!membershipKey) return;

    setIsLoading(true);
    setError(null);

    try {
      // In production, this would be a real API call
      // const response = await axios.get(
      //   API_ENDPOINTS.GET_USER_DATA,
      //   { headers: getAuthHeaders(membershipKey) }
      // );

      // Mock data for development
      await new Promise((resolve) => setTimeout(resolve, 500));
      const mockProfileData: UserProfile = {
        name: "Space Explorer",
        email: "explorer@space-project.io",
        avatar:
          "https://ui-avatars.com/api/?name=Space+Explorer&background=0D8ABC&color=fff",
        bio: "Passionate about exploring the knowledge space and contributing to collective intelligence.",
        theme: "system",
        notifications: true,
        twoFactorEnabled: false,
      };

      setProfile(mockProfileData);
      setOriginalProfile(mockProfileData);

      if (mockProfileData.avatar) {
        setAvatarPreview(mockProfileData.avatar);
      }
    } catch (err: any) {
      console.error("Error fetching user profile:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load profile data. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setProfile((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setProfile((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleThemeChange = (theme: "light" | "dark" | "system") => {
    setProfile((prev) => ({
      ...prev,
      theme,
    }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);

    // Create a preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    setError(null);

    try {
      // In production, this would be a real API call
      // const formData = new FormData();
      // formData.append('name', profile.name);
      // formData.append('email', profile.email);
      // formData.append('bio', profile.bio || '');
      // formData.append('theme', profile.theme);
      // formData.append('notifications', String(profile.notifications));
      // formData.append('twoFactorEnabled', String(profile.twoFactorEnabled));

      // if (avatarFile) {
      //   formData.append('avatar', avatarFile);
      // }

      // const response = await axios.patch(
      //   `${API_BASE_URL}/api/profile`,
      //   formData,
      //   {
      //     headers: {
      //       'Authorization': `Bearer ${membershipKey}`,
      //       'Content-Type': 'multipart/form-data',
      //     },
      //   }
      // );

      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Update original profile after successful save
      setOriginalProfile({ ...profile });

      toast.success("Profile updated successfully");
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setError(
        err.response?.data?.message ||
          "Failed to save profile changes. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const discardChanges = () => {
    if (originalProfile) {
      setProfile({ ...originalProfile });

      if (originalProfile.avatar) {
        setAvatarPreview(originalProfile.avatar);
      } else {
        setAvatarPreview(null);
      }

      setAvatarFile(null);
    }

    toast.info("Changes discarded");
  };

  const hasUnsavedChanges = () => {
    if (!originalProfile) return false;

    return (
      profile.name !== originalProfile.name ||
      profile.email !== originalProfile.email ||
      profile.bio !== originalProfile.bio ||
      profile.theme !== originalProfile.theme ||
      profile.notifications !== originalProfile.notifications ||
      profile.twoFactorEnabled !== originalProfile.twoFactorEnabled ||
      avatarFile !== null
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  const GeneralTab = () => (
    <Form onSubmit={saveProfile}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-emerald-100 text-emerald-600 text-2xl font-bold">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 019.07 4h5.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </label>

              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="sr-only"
              />
            </div>
          </div>

          <div className="flex-grow space-y-4">
            <Input
              label="Name"
              name="name"
              value={profile.name}
              onChange={handleInputChange}
              required
            />

            <Input
              label="Email"
              name="email"
              type="email"
              value={profile.email}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            value={profile.bio || ""}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Theme
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(["light", "dark", "system"] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                className={`py-2 px-3 rounded-md border text-center text-sm capitalize ${
                  profile.theme === theme
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => handleThemeChange(theme)}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Notifications</div>
              <div className="text-sm text-gray-500">
                Receive important updates
              </div>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                name="notifications"
                checked={profile.notifications}
                onChange={handleInputChange}
              />
              <div
                className={`relative w-11 h-6 bg-gray-200 rounded-full transition-colors duration-200 ease-in-out ${
                  profile.notifications ? "bg-emerald-600" : ""
                }`}
              >
                <div
                  className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform duration-200 ease-in-out ${
                    profile.notifications ? "transform translate-x-5" : ""
                  }`}
                ></div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {error && (
        <Alert type="error" className="mt-6">
          {error}
        </Alert>
      )}

      <div className="mt-8 flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={discardChanges}
          disabled={!hasUnsavedChanges() || isSaving}
        >
          Discard Changes
        </Button>
        <Button type="submit" disabled={!hasUnsavedChanges() || isSaving}>
          {isSaving ? <Spinner size="sm" /> : "Save Changes"}
        </Button>
      </div>
    </Form>
  );

  const SecurityTab = () => (
    <div className="space-y-6">
      <Card>
        <h3 className="font-medium mb-4">Two-Factor Authentication</h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">
              Add an extra layer of security to your account
            </p>
            <p className="text-xs text-gray-500">
              {profile.twoFactorEnabled
                ? "Two-factor authentication is enabled on your account."
                : "We recommend enabling two-factor authentication for enhanced security."}
            </p>
          </div>

          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only"
              name="twoFactorEnabled"
              checked={profile.twoFactorEnabled}
              onChange={handleInputChange}
            />
            <div
              className={`relative w-11 h-6 bg-gray-200 rounded-full transition-colors duration-200 ease-in-out ${
                profile.twoFactorEnabled ? "bg-emerald-600" : ""
              }`}
            >
              <div
                className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform duration-200 ease-in-out ${
                  profile.twoFactorEnabled ? "transform translate-x-5" : ""
                }`}
              ></div>
            </div>
          </label>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Membership Key</h3>
          <img
            src={projectLogo}
            alt="Space Project"
            className="h-8"
          />
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Your membership key provides access to the Space platform. Keep it
          secure.
        </p>

        <Button variant="outline">Regenerate Key</Button>
      </Card>

      <Card>
        <div className="flex items-center mb-4">
          <img
            src={companyLogo}
            alt="WhyteHoux"
            className="h-6 mr-2 opacity-70"
          />
          <h3 className="font-medium text-red-600">Danger Zone</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          These actions cannot be undone. Please proceed with caution.
        </p>

        <div className="space-x-4">
          <Button variant="danger" size="sm">
            Deactivate Account
          </Button>
        </div>
      </Card>

      {hasUnsavedChanges() && (
        <div className="mt-8 flex justify-end space-x-4">
          <Button
            variant="outline"
            onClick={discardChanges}
            disabled={!hasUnsavedChanges() || isSaving}
          >
            Discard Changes
          </Button>
          <Button onClick={saveProfile} disabled={isSaving}>
            {isSaving ? <Spinner size="sm" /> : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Profile Settings</h2>
        <p className="text-gray-600">
          Manage your account preferences and settings
        </p>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            className={`px-1 py-3 border-b-2 font-medium text-sm ${
              activeTab === "general"
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            onClick={() => setActiveTab("general")}
          >
            General
          </button>
          <button
            className={`px-1 py-3 border-b-2 font-medium text-sm ${
              activeTab === "security"
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            onClick={() => setActiveTab("security")}
          >
            Security
          </button>
        </nav>
      </div>

      {activeTab === "general" && <GeneralTab />}
      {activeTab === "security" && <SecurityTab />}
    </div>
  );
};

export default ProfileSettings;
