// Cypress E2E test for error and edge case handling

describe("Error Handling Flow", () => {
  it("should show error for duplicate registration", () => {
    cy.visit("/registration");
    cy.get('input[name="email"]').type("testuser@example.com");
    cy.get('input[name="password"]').type("TestPassword123!");
    cy.get('input[name="confirmPassword"]').type("TestPassword123!");
    cy.get('button[type="submit"]').click();
    cy.contains("Email already registered").should("exist");
  });

  it("should show error for expired invitation key", () => {
    cy.visit("/initiate");
    cy.get('input[name="invitationKey"]').type("EXPIREDKEY123");
    cy.get('button[type="submit"]').click();
    cy.contains("Invitation key expired").should("exist");
  });
});
