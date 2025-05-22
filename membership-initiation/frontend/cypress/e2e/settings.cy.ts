// Cypress E2E test for settings flow

describe("Settings Flow", () => {
  beforeEach(() => {
    cy.login("testuser@example.com", "TestPassword123!"); // Custom command or stub
  });

  it("should allow user to update notification preferences", () => {
    cy.visit("/settings");
    cy.get('input[name="emailNotifications"]').check();
    cy.get('button[type="submit"]').click();
    cy.contains("Settings updated").should("exist");
  });

  it("should allow user to change password", () => {
    cy.visit("/settings");
    cy.contains("Change Password").click();
    cy.get('input[name="currentPassword"]').type("TestPassword123!");
    cy.get('input[name="newPassword"]').type("NewPassword456!");
    cy.get('input[name="confirmNewPassword"]').type("NewPassword456!");
    cy.get('button[type="submit"]').click();
    cy.contains("Password changed").should("exist");
  });
});
