# 🧪 CivicNavigator AI — Testing Strategy

This document outlines the comprehensive multi-layered testing strategy used to ensure the reliability, security, and accessibility of CivicNavigator AI.

## 1. Automated Validation (CI/CD)
The project uses **GitHub Actions** (`.github/workflows/test.yml`) to perform automated validation on every push.
- **Environment**: Ubuntu Linux
- **Check**: NPM Audit for dependency vulnerabilities
- **Check**: Full API Integration test suite
- **Gate**: Main branch requires passing tests for deployment.

## 2. Layered Testing Suite

### 🔒 Security Audit (`tests/security.test.js`)
Dedicated suite for security-specific validations:
- **Header Protection**: Validates Helmet security headers (X-Frame-Options, CSP, etc).
- **CORS Enforcement**: Ensures cross-origin protection.
- **Anti-Abuse**: Validates rate-limiting headers.
- **Sanitization**: Verifies that XSS and script injection are neutralized.

### 🚀 API Integration (`tests/api.test.js`)
Mocha/Chai suite covering all core endpoints:
- **Health & Liveness**: `/health` checks for Cloud Run.
- **Gemini Chat**: Validates AI intent detection and response shape.
- **Maps Integration**: Validates address geocoding and polling search.
- **Error Handling**: Validates status codes (400, 429, 503).

### 🖥️ End-to-End (E2E) (`civic-navigator-ui/cypress/`)
UI-level validation of critical user paths:
- **Dashboard Load**: Core UI element presence.
- **Search Flow**: Testing the address → map results workflow.
- **Theme Support**: Dark/Light mode toggle verification.

## 3. Accessibility Validation
Testing includes automated checks for:
- **ARIA Roles**: Presence of `aria-live`, `role="main"`, and `aria-label`.
- **Keyboard Nav**: Validating skip-links and focus states.
- **Semantic HTML**: Ensuring proper use of `<nav>`, `<main>`, and `<h1>`.

---
*For questions regarding the testing infrastructure, contact the CivicNavigator dev team.*
