// Cypress E2E test for authentication and login flow

describe("Authentication Flow", () => {
  it("should allow a user to log in", () => {
    cy.visit("/login");
    cy.get('input[name="email"]').type("testuser@example.com");
    cy.get('input[name="password"]').type("TestPassword123!");
    cy.get('button[type="submit"]').click();
    cy.contains("Dashboard").should("exist");
  });

  it("should show error for invalid credentials", () => {
    cy.visit("/login");
    cy.get('input[name="email"]').type("wrong@example.com");
    cy.get('input[name="password"]').type("WrongPassword!");
    cy.get('button[type="submit"]').click();
    cy.contains("Invalid email or password").should("exist");
  });
});
