// Cypress E2E test for cross-platform connection flow

describe("Cross-Platform Connection Flow", () => {
  beforeEach(() => {
    // Assume user is already registered and logged in for this test
    cy.login("testuser@example.com", "TestPassword123!"); // Custom command or stub
  });

  it("should display QR code for mobile connection", () => {
    cy.visit("/settings/connections");
    cy.contains("Connect Mobile App").click();
    cy.get("canvas[aria-label='QR code']").should("exist");
  });

  it("should show connection status after scanning QR code", () => {
    cy.visit("/settings/connections");
    cy.contains("Connect Mobile App").click();
    // Simulate QR code scan event (stub or mock as needed)
    cy.window().then((win) => {
      win.dispatchEvent(
        new CustomEvent("qrScan", {
          detail: { device: "mobile", status: "connected" },
        })
      );
    });
    cy.contains("Mobile device connected").should("exist");
  });
});
