// Cypress E2E test for profile management flow

describe("Profile Management Flow", () => {
  beforeEach(() => {
    // Assume user is already registered and logged in for this test
    cy.login("testuser@example.com", "TestPassword123!"); // Custom command or stub
  });

  it("should allow user to update profile information", () => {
    cy.visit("/profile");
    cy.get('input[name="displayName"]').clear().type("Test User");
    cy.get('input[name="bio"]').clear().type("This is a test bio.");
    cy.get('button[type="submit"]').click();
    cy.contains("Profile updated").should("exist");
  });

  it("should show validation errors for invalid input", () => {
    cy.visit("/profile");
    cy.get('input[name="displayName"]').clear();
    cy.get('button[type="submit"]').click();
    cy.contains("Display name is required").should("exist");
  });
});
