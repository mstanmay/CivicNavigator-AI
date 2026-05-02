/**
 * @file tests/api.test.js
 * @description CivicNavigator AI — Mocha/Chai Integration Test Suite.
 */

import { expect } from 'chai';
import fetch from 'node-fetch';
import { detectIntent, generateSuggestions } from '../src/civicAgent.js';

const PORT = process.env.PORT || 8080;
const BASE = `http://localhost:${PORT}`;

describe('🚀 CivicNavigator AI API Suite', () => {

  describe('1. Health & Config', () => {
    it('GET /health returns 200 with status:healthy', async () => {
      const res = await fetch(`${BASE}/health`);
      const body = await res.json();
      expect(res.status).to.equal(200);
      expect(body.status).to.equal('healthy');
      expect(body).to.have.property('version');
      expect(body.services).to.have.all.keys('gemini', 'maps');
    });

    it('GET /api/config does NOT expose GEMINI_API_KEY', async () => {
      const res = await fetch(`${BASE}/api/config`);
      const body = await res.json();
      expect(body).to.not.have.property('geminiKey');
      expect(body).to.not.have.property('GEMINI_API_KEY');
    });
  });

  describe('2. Chat API', () => {
    it('should return 400 when message is missing', async () => {
      const res = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).to.equal(400);
    });

    it('should return 400 when message is too long', async () => {
      const res = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'x'.repeat(1001) }),
      });
      expect(res.status).to.equal(400);
    });
  });

  describe('3. Unit Tests', () => {
    it('detectIntent should identify polling queries', () => {
      expect(detectIntent('Where do I vote?')).to.equal('polling_location');
      expect(detectIntent('Find my polling station')).to.equal('polling_location');
    });

    it('generateSuggestions should return exactly 3 items', () => {
      const suggestions = generateSuggestions('registration', null);
      expect(suggestions).to.be.an('array').with.lengthOf(3);
    });
  });

});
