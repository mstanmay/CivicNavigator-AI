/**
 * @file app.cy.js
 * @description Core E2E tests for the CivicNavigator UI.
 */

describe('🗳️ CivicNavigator AI - Core Workflows', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load the dashboard with all core components', () => {
    cy.get('nav').should('be.visible');
    cy.get('h1').contains(/CivicNavigator/i);
    cy.get('[aria-live="polite"]').should('exist'); // Chat panel
  });

  it('should allow searching for polling places', () => {
    const address = '1600 Pennsylvania Ave NW, Washington, DC';
    cy.get('input[placeholder*="address"]').first().type(address);
    cy.get('button').contains(/search|find/i).click();
    
    // Check if the map or results area updates
    cy.get('.glass').should('exist');
  });

  it('should toggle accessibility themes', () => {
    cy.get('button[aria-label*="theme" i]').click();
    cy.get('html').should('have.class', 'dark');
  });
});
