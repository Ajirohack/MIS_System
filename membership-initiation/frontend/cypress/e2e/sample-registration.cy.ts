// Sample Cypress E2E test for registration flow

describe("Registration Flow", () => {
  it("should allow a user to register", () => {
    cy.visit("/registration");
    cy.get('input[name="email"]').type("testuser@example.com");
    cy.get('input[name="password"]').type("TestPassword123!");
    cy.get('input[name="confirmPassword"]').type("TestPassword123!");
    cy.get('button[type="submit"]').click();
    cy.contains("Welcome").should("exist");
  });
});
