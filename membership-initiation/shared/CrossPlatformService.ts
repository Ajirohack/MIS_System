import axios from "axios";

type Platform = "web" | "browser-extension" | "mobile-app" | "telegram-bot";

interface PlatformConnection {
  id: string;
  platform: Platform;
  deviceName?: string;
  lastSeen?: Date;
  isActive: boolean;
  apiToken?: string;
  tokenExpiry?: Date;
}

interface UserCredentials {
  membershipKey: string;
  token?: string;
}

/**
 * CrossPlatformService handles authentication, data sharing, and synchronization
 * across different platforms (web, mobile, browser extension, telegram)
 */
class CrossPlatformService {
  private readonly API_URL = process.env.API_URL || "https://api.spacenew.com";
  private membershipKey: string | null = null;
  private token: string | null = null;
  private connections: PlatformConnection[] = [];
  private currentPlatform: Platform;
  private deviceId: string;

  constructor(platform: Platform, deviceId: string) {
    this.currentPlatform = platform;
    this.deviceId = deviceId;

    // Try to restore session from localStorage/AsyncStorage/etc.
    this.restoreSession();
  }

  /**
   * Restore user session from persistent storage
   */
  private restoreSession() {
    try {
      // Implementation varies based on platform
      if (typeof window !== "undefined" && window.localStorage) {
        // Web or browser extension
        const storedKey = localStorage.getItem("membershipKey");
        const storedToken = localStorage.getItem("authToken");

        if (storedKey) {
          this.membershipKey = storedKey;
          this.token = storedToken;
        }
      }
      // For React Native, AsyncStorage would be used here
      // For Telegram bot, another storage mechanism would be used
    } catch (error) {
      console.error("Failed to restore session:", error);
    }
  }

  /**
   * Authenticate user with membership key
   * @param credentials User credentials containing membership key
   * @returns Promise with authenticated session data
   */
  async authenticate(credentials: UserCredentials): Promise<any> {
    try {
      const response = await axios.post(`${this.API_URL}/auth/validate`, {
        membershipKey: credentials.membershipKey,
        platform: this.currentPlatform,
        deviceId: this.deviceId,
      });

      if (response.data.success) {
        this.membershipKey = credentials.membershipKey;
        this.token = response.data.token;

        // Save to persistent storage
        if (typeof window !== "undefined" && window.localStorage) {
          localStorage.setItem("membershipKey", credentials.membershipKey);
          localStorage.setItem("authToken", response.data.token);
        }

        return response.data;
      } else {
        throw new Error(response.data.message || "Authentication failed");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      throw error;
    }
  }

  /**
   * Fetch connected platforms for current user
   * @returns Promise with array of connected platforms
   */
  async getConnectedPlatforms(): Promise<PlatformConnection[]> {
    if (!this.membershipKey) {
      throw new Error("User not authenticated");
    }

    try {
      const response = await axios.get(`${this.API_URL}/user/platforms`, {
        headers: this.getAuthHeaders(),
      });

      this.connections = response.data.connections;
      return this.connections;
    } catch (error) {
      console.error("Failed to fetch connected platforms:", error);
      throw error;
    }
  }

  /**
   * Connect current device as a new platform
   * @param platformData Information about the platform being connected
   * @returns Promise with connection status
   */
  async connectPlatform(platformData: {
    platform: Platform;
    deviceName: string;
  }): Promise<PlatformConnection> {
    if (!this.membershipKey) {
      throw new Error("User not authenticated");
    }

    try {
      const response = await axios.post(
        `${this.API_URL}/user/platforms/connect`,
        {
          ...platformData,
          deviceId: this.deviceId,
        },
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        // Update local connections list
        await this.getConnectedPlatforms();
        return response.data.connection;
      } else {
        throw new Error(response.data.message || "Failed to connect platform");
      }
    } catch (error) {
      console.error("Failed to connect platform:", error);
      throw error;
    }
  }

  /**
   * Disconnect a specific platform connection
   * @param connectionId ID of the platform connection to remove
   * @returns Promise with operation result
   */
  async disconnectPlatform(connectionId: string): Promise<boolean> {
    if (!this.membershipKey) {
      throw new Error("User not authenticated");
    }

    try {
      const response = await axios.delete(
        `${this.API_URL}/user/platforms/disconnect/${connectionId}`,
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        // Update local connections list
        this.connections = this.connections.filter(
          (conn) => conn.id !== connectionId
        );
        return true;
      } else {
        throw new Error(
          response.data.message || "Failed to disconnect platform"
        );
      }
    } catch (error) {
      console.error("Failed to disconnect platform:", error);
      throw error;
    }
  }

  /**
   * Send a notification to all connected platforms
   * @param message The notification message
   * @param excludePlatforms Optional platforms to exclude
   */
  async sendCrossPlatformNotification(
    message: { title: string; body: string; data?: any },
    excludePlatforms?: Platform[]
  ): Promise<void> {
    if (!this.membershipKey) {
      throw new Error("User not authenticated");
    }

    try {
      await axios.post(
        `${this.API_URL}/notifications/send`,
        {
          message,
          excludePlatforms: excludePlatforms || [],
        },
        { headers: this.getAuthHeaders() }
      );
    } catch (error) {
      console.error("Failed to send cross-platform notification:", error);
      throw error;
    }
  }

  /**
   * Sync user state across platforms (settings, preferences, etc.)
   * @param data The data to sync
   */
  async syncState(data: any): Promise<void> {
    if (!this.membershipKey) {
      throw new Error("User not authenticated");
    }

    try {
      await axios.post(
        `${this.API_URL}/user/sync`,
        { data },
        { headers: this.getAuthHeaders() }
      );
    } catch (error) {
      console.error("Failed to sync state:", error);
      throw error;
    }
  }

  /**
   * Get latest synchronized state
   * @returns Promise with user's synchronized state
   */
  async getState(): Promise<any> {
    if (!this.membershipKey) {
      throw new Error("User not authenticated");
    }

    try {
      const response = await axios.get(`${this.API_URL}/user/sync`, {
        headers: this.getAuthHeaders(),
      });
      return response.data.state;
    } catch (error) {
      console.error("Failed to get synced state:", error);
      throw error;
    }
  }

  /**
   * Logout from current device
   */
  logout(): void {
    this.membershipKey = null;
    this.token = null;
    this.connections = [];

    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem("membershipKey");
      localStorage.removeItem("authToken");
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.membershipKey;
  }

  /**
   * Get authentication headers for API requests
   */
  private getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
      "X-Membership-Key": this.membershipKey,
      "X-Platform": this.currentPlatform,
      "X-Device-ID": this.deviceId,
    };
  }
}

export default CrossPlatformService;
export { Platform, PlatformConnection };
