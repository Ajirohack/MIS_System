// Cypress E2E test for onboarding flow

describe("Onboarding Flow", () => {
  it("should guide new users through onboarding steps", () => {
    cy.visit("/onboarding");
    cy.contains("Welcome to SpaceNew").should("exist");
    cy.contains("Next").click();
    cy.contains("Set up your profile").should("exist");
    cy.get('input[name="displayName"]').type("Test User");
    cy.contains("Next").click();
    cy.contains("Connect your devices").should("exist");
    cy.contains("Finish").click();
    cy.contains("Onboarding complete").should("exist");
  });
});
