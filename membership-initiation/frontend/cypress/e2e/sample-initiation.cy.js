describe('Membership Initiation E2E', () => {
    it('should load the landing page and show the registration link', () => {
        cy.visit('/');
        cy.contains('Register').should('exist');
    });
    it('should navigate to registration and submit form', () => {
        cy.visit('/');
        cy.contains('Register').click();
        cy.get('form').should('exist');
        cy.get('input[type="email"]').type('testuser@example.com');
        cy.get('input[type="password"]').type('TestPassword123!');
        cy.get('button[type="submit"]').click();
        cy.contains('Confirmation').should('exist');
    });
});
