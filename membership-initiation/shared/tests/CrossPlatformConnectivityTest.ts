import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import CrossPlatformService, {
  Platform,
  PlatformConnection,
} from "../CrossPlatformService";

// Mock axios for testing
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("CrossPlatformService", () => {
  let webService: CrossPlatformService;
  let mobileService: CrossPlatformService;
  let extensionService: CrossPlatformService;
  let telegramService: CrossPlatformService;

  const testMembershipKey = "test-membership-key-123";
  const testToken = "test-auth-token-456";

  // Mock connected platforms data
  const mockConnections: PlatformConnection[] = [
    {
      id: "1",
      platform: "web",
      deviceName: "Chrome on MacBook",
      lastSeen: new Date(),
      isActive: true,
    },
    {
      id: "2",
      platform: "mobile-app",
      deviceName: "iPhone 14",
      lastSeen: new Date(),
      isActive: true,
    },
    {
      id: "3",
      platform: "browser-extension",
      deviceName: "Firefox Extension",
      lastSeen: new Date(),
      isActive: true,
    },
    {
      id: "4",
      platform: "telegram-bot",
      deviceName: "Telegram Bot (123456789)",
      lastSeen: new Date(),
      isActive: true,
    },
  ];

  beforeEach(() => {
    // Create service instances for each platform
    webService = new CrossPlatformService("web", `web-${uuidv4()}`);
    mobileService = new CrossPlatformService(
      "mobile-app",
      `mobile-${uuidv4()}`
    );
    extensionService = new CrossPlatformService(
      "browser-extension",
      `extension-${uuidv4()}`
    );
    telegramService = new CrossPlatformService(
      "telegram-bot",
      `telegram-${uuidv4()}`
    );

    // Setup mocked axios responses
    mockedAxios.post.mockImplementation((url) => {
      if (url.includes("/auth/validate")) {
        return Promise.resolve({
          data: {
            success: true,
            token: testToken,
            user: {
              id: "user123",
              membershipKey: testMembershipKey,
            },
          },
        });
      }

      if (url.includes("/user/platforms/connect")) {
        return Promise.resolve({
          data: {
            success: true,
            connection: {
              id: uuidv4(),
              platform: "web",
              deviceName: "Test Device",
              lastSeen: new Date(),
              isActive: true,
            },
          },
        });
      }

      if (url.includes("/notifications/send")) {
        return Promise.resolve({
          data: {
            success: true,
            sent: true,
          },
        });
      }

      if (url.includes("/user/sync")) {
        return Promise.resolve({
          data: {
            success: true,
          },
        });
      }

      return Promise.reject(new Error("Not mocked"));
    });

    mockedAxios.get.mockImplementation((url) => {
      if (url.includes("/user/platforms")) {
        return Promise.resolve({
          data: {
            connections: mockConnections,
          },
        });
      }

      if (url.includes("/user/sync")) {
        return Promise.resolve({
          data: {
            state: {
              preferences: {
                darkMode: true,
                notifications: true,
              },
              lastSync: new Date().toISOString(),
            },
          },
        });
      }

      return Promise.reject(new Error("Not mocked"));
    });

    mockedAxios.delete.mockImplementation((url) => {
      if (url.includes("/user/platforms/disconnect/")) {
        return Promise.resolve({
          data: {
            success: true,
          },
        });
      }

      return Promise.reject(new Error("Not mocked"));
    });

    // Clear localStorage mock between tests
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
  });

  describe("Authentication", () => {
    it("should authenticate users across all platforms", async () => {
      // Test authentication on each platform
      const webResult = await webService.authenticate({
        membershipKey: testMembershipKey,
      });
      const mobileResult = await mobileService.authenticate({
        membershipKey: testMembershipKey,
      });
      const extensionResult = await extensionService.authenticate({
        membershipKey: testMembershipKey,
      });
      const telegramResult = await telegramService.authenticate({
        membershipKey: testMembershipKey,
      });

      // Verify all authenticatons succeeded
      expect(webResult.success).toBe(true);
      expect(mobileResult.success).toBe(true);
      expect(extensionResult.success).toBe(true);
      expect(telegramResult.success).toBe(true);

      // Verify authentication state
      expect(webService.isAuthenticated()).toBe(true);
      expect(mobileService.isAuthenticated()).toBe(true);
      expect(extensionService.isAuthenticated()).toBe(true);
      expect(telegramService.isAuthenticated()).toBe(true);
    });
  });

  describe("Platform Connections", () => {
    beforeEach(async () => {
      // Authenticate all services before testing connections
      await webService.authenticate({ membershipKey: testMembershipKey });
      await mobileService.authenticate({ membershipKey: testMembershipKey });
      await extensionService.authenticate({ membershipKey: testMembershipKey });
      await telegramService.authenticate({ membershipKey: testMembershipKey });
    });

    it("should retrieve connected platforms", async () => {
      const webConnections = await webService.getConnectedPlatforms();

      expect(webConnections).toHaveLength(4);
      expect(webConnections.find((c) => c.platform === "web")).toBeDefined();
      expect(
        webConnections.find((c) => c.platform === "mobile-app")
      ).toBeDefined();
      expect(
        webConnections.find((c) => c.platform === "browser-extension")
      ).toBeDefined();
      expect(
        webConnections.find((c) => c.platform === "telegram-bot")
      ).toBeDefined();
    });

    it("should connect new platforms", async () => {
      const connection = await webService.connectPlatform({
        platform: "web",
        deviceName: "New Test Device",
      });

      expect(connection).toBeDefined();
      expect(connection.platform).toBe("web");
      expect(connection.deviceName).toBe("New Test Device");
      expect(connection.isActive).toBe(true);
    });

    it("should disconnect platforms", async () => {
      const connections = await webService.getConnectedPlatforms();
      const webConnection = connections.find((c) => c.platform === "web");

      if (webConnection) {
        const result = await webService.disconnectPlatform(webConnection.id);
        expect(result).toBe(true);
      }
    });
  });

  describe("Cross-Platform Communication", () => {
    beforeEach(async () => {
      // Authenticate all services before testing communication
      await webService.authenticate({ membershipKey: testMembershipKey });
      await mobileService.authenticate({ membershipKey: testMembershipKey });
    });

    it("should send notifications across platforms", async () => {
      const result = await webService.sendCrossPlatformNotification({
        title: "Test Notification",
        body: "This is a test notification",
        data: { type: "test" },
      });

      // Verify notification was sent successfully
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/notifications/send"),
        expect.objectContaining({
          message: expect.objectContaining({
            title: "Test Notification",
            body: "This is a test notification",
          }),
        }),
        expect.anything()
      );
    });

    it("should synchronize state across platforms", async () => {
      // Send state from web service
      await webService.syncState({
        preferences: {
          darkMode: true,
          notifications: true,
        },
      });

      // Retrieve state from mobile service
      const state = await mobileService.getState();

      // Verify state was synchronized
      expect(state).toHaveProperty("preferences");
      expect(state.preferences).toHaveProperty("darkMode", true);
      expect(state.preferences).toHaveProperty("notifications", true);
    });
  });

  describe("Logout", () => {
    beforeEach(async () => {
      await webService.authenticate({ membershipKey: testMembershipKey });
    });

    it("should logout and clear authentication state", () => {
      // Verify authenticated before logout
      expect(webService.isAuthenticated()).toBe(true);

      // Perform logout
      webService.logout();

      // Verify no longer authenticated
      expect(webService.isAuthenticated()).toBe(false);
    });
  });
});
