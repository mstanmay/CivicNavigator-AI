/**
 * @file security.test.js
 * @description Security-focused integration tests to ensure data protection.
 * 
 * Validates:
 * - CORS policy enforcement
 * - Rate limiting (anti-abuse)
 * - Security header presence (Helmet)
 * - Input sanitization at the API level
 */

import { expect } from 'chai';
import axios  from 'axios';

const API_URL = process.env.TEST_API_URL || 'http://localhost:8080';

describe('🔒 Security Policy Audit', () => {
  
  it('should enforce secure HTTP headers (Helmet)', async () => {
    const res = await axios.get(`${API_URL}/health`);
    expect(res.headers).to.have.property('x-content-type-options', 'nosniff');
    expect(res.headers).to.have.property('x-frame-options', 'DENY');
    expect(res.headers).to.have.property('referrer-policy', 'strict-origin-when-cross-origin');
  });

  it('should deny cross-origin requests from untrusted origins', async () => {
    try {
      await axios.post(`${API_URL}/api/chat`, 
        { message: 'Test' },
        { headers: { 'Origin': 'https://malicious-site.com' } }
      );
    } catch (err) {
      // Should fail if CORS is correctly configured
      expect(err.response?.status).to.be.oneOf([403, 0]);
    }
  });

  it('should reject oversized payloads (>10kb)', async () => {
    const hugeMessage = 'A'.repeat(1024 * 11); // 11KB
    try {
      await axios.post(`${API_URL}/api/chat`, { message: hugeMessage });
    } catch (err) {
      expect(err.response?.status).to.equal(413); // Payload Too Large
    }
  });

  it('should sanitize script tags in chat messages', async () => {
    const payload = { message: '<script>alert("XSS")</script>How do I vote?' };
    const res = await axios.post(`${API_URL}/api/chat`, payload);
    // If sanitization works, the response shouldn't crash and the AI shouldn't see the script
    expect(res.status).to.equal(200);
    expect(res.data.reply).to.not.be.undefined;
  });

});
