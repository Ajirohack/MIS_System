/**
 * API Configuration
 *
 * This file contains all API endpoints and configurations used in the application.
 * Values are loaded from environment variables with fallbacks to development values.
 */

// Base API URL for all endpoints
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://api.space-project.io";

// API endpoint paths
export const API_ENDPOINTS = {
  // Authentication
  VALIDATE_KEY: `${API_BASE_URL}/api/validate-membership-key`,
  REGENERATE_KEY: `${API_BASE_URL}/api/regenerate-key`,

  // User preferences
  SAVE_PREFERENCES: `${API_BASE_URL}/api/save-preferences`,
  GET_PREFERENCES: `${API_BASE_URL}/api/preferences`,

  // Tools
  GET_AVAILABLE_TOOLS: `${API_BASE_URL}/api/available-tools`,
  SAVE_TOOL_SELECTION: `${API_BASE_URL}/api/save-tool-selection`,
  TOGGLE_TOOL: (toolId: string) => `${API_BASE_URL}/api/tools/${toolId}/toggle`,

  // Dashboard
  GET_USER_DATA: `${API_BASE_URL}/api/user`,
  GET_ACTIVITIES: `${API_BASE_URL}/api/activities`,
  GENERATE_QR_CODE: `${API_BASE_URL}/api/generate-premium-qr-code`,
};

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000;

// API request headers
export const getAuthHeaders = (membershipKey: string) => ({
  Authorization: `Bearer ${membershipKey}`,
  "Content-Type": "application/json",
});
