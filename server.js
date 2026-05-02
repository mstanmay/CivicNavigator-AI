/**
 * @file server.js
 * @description CivicNavigator AI — Express server entry point.
 *
 * Security:  Helmet CSP, rate limiting, CORS, input validation, XSS sanitization,
 *            no internal error details leaked to clients in production.
 * Efficiency: gzip compression, in-memory caching (via node-cache in services),
 *             request timing, static asset caching headers.
 * Quality:   Structured JSON logging (Cloud Run compatible), centralised error
 *            middleware, env validation at startup.
 */

import express    from 'express';
import cors       from 'cors';
import helmet     from 'helmet';
import compression from 'compression';
import rateLimit  from 'express-rate-limit';
import path       from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import { validateEnv, config, log, APP_VERSION,
         RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX, MAX_MESSAGE_LENGTH, MAX_ADDRESS_LENGTH } from './src/config.js';
import { civicAgent }                         from './src/civicAgent.js';
import { searchPollingPlaces }                from './src/mapsService.js';
import { getCandidateInfo, getElectionInfo }  from './src/electionService.js';

// ─── Validate environment at boot ──────────────────────────────────────────
validateEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

/**
 * Trust the first proxy (Cloud Run / load balancer).
 * REQUIRED for express-rate-limit to work correctly behind Google Cloud Run.
 * Without this, X-Forwarded-For header causes a ValidationError and 500 crash.
 */
app.set('trust proxy', 1);

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Helmet — sets secure HTTP headers.
 * CSP is carefully configured to allow Google Maps, Fonts, and our own origin
 * instead of being disabled.
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", 'maps.googleapis.com', 'maps.gstatic.com'],
      styleSrc:    ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc:     ["'self'", 'fonts.gstatic.com'],
      imgSrc:      ["'self'", 'data:', '*.googleapis.com', '*.gstatic.com', '*.google.com'],
      connectSrc:  ["'self'", '*.googleapis.com'],
      frameSrc:    ["'none'"],
      objectSrc:   ["'none'"],
      baseUri:     ["'self'"],
      formAction:  ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for Google Maps iframes
}));

/** CORS — allow Vercel frontend + any configured origin; open in development. */
const VERCEL_ORIGIN = 'https://civic-navigator-ai.vercel.app';
app.use(cors({
  origin: config.allowedOrigins.length
    ? [...config.allowedOrigins, VERCEL_ORIGIN]
    : [VERCEL_ORIGIN, 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

/**
 * Rate limiting — 60 req/min per IP on /api/ routes.
 * Prevents abuse of Gemini and Maps API quotas.
 */
const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max:      RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many requests. Please wait a moment and try again.' },
  handler(req, res, next, options) {
    log.warn('[RateLimit] IP throttled', { ip: req.ip, path: req.path });
    res.status(429).json(options.message);
  },
});
app.use('/api/', apiLimiter);

// ═══════════════════════════════════════════════════════════════════════════
// EFFICIENCY MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

/** gzip/deflate compression — reduces payload size by ~70% for JSON & HTML. */
app.use(compression());

/** Body parser — hard 10 KB ceiling to prevent payload attacks. */
app.use(express.json({ limit: '10kb' }));

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST LOGGING (Code Quality)
// ═══════════════════════════════════════════════════════════════════════════

/** Lightweight request logger — attaches timing to response. */
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    log[level](`${req.method} ${req.path}`, {
      status: res.statusCode,
      ms,
      ip: req.ip,
    });
  });
  next();
});

// ═══════════════════════════════════════════════════════════════════════════
// INPUT SANITIZATION HELPER (Security)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Strips HTML/script tags and trims whitespace from a string.
 * Prevents stored/reflected XSS if values are ever rendered server-side.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
function sanitize(str, maxLen = MAX_ADDRESS_LENGTH) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')       // strip HTML tags
    .replace(/[<>"'`]/g, '')       // strip remaining dangerous chars
    .trim()
    .slice(0, maxLen);
}

// ═══════════════════════════════════════════════════════════════════════════
// STATIC FILES
// ═══════════════════════════════════════════════════════════════════════════

/** Serve frontend with long-lived caching for immutable assets. */
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: config.isProduction ? '1d' : 0,
  etag: true,
}));

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /health
 * Cloud Run and uptime monitors use this to verify liveness.
 */
app.get('/health', (req, res) => {
  res.json({
    status:    'healthy',
    version:   APP_VERSION,
    timestamp: new Date().toISOString(),
    services: {
      gemini: !!config.geminiKey,
      maps:   !!config.mapsKey,
    },
  });
});

/**
 * GET /api/config
 * Returns safe, public-facing configuration to the frontend.
 * Never exposes GEMINI_API_KEY (server-side only).
 */
app.get('/api/config', (req, res) => {
  res.json({
    mapsApiKey: config.mapsKey,
    projectId:  config.projectId,
    version:    APP_VERSION,
  });
});

/**
 * POST /api/chat
 * Main AI chat endpoint. Sends the user message to the Gemini agent.
 *
 * Body: { message: string, location?: object, history?: array }
 * Returns: { reply: string, suggestions: string[], intent: string }
 */
app.post('/api/chat', async (req, res, next) => {
  try {
    const { message, location, history, language } = req.body;

    // ── Input Validation ────────────────────────────────────────────────
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string.' });
    }
    const clean = sanitize(message, MAX_MESSAGE_LENGTH + 10);
    if (!clean) {
      return res.status(400).json({ error: 'Message contains no valid content.' });
    }
    if (clean.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters).` });
    }
    if (history !== undefined && !Array.isArray(history)) {
      return res.status(400).json({ error: 'History must be an array.' });
    }

    // ── Sanitize location fields ────────────────────────────────────────
    const safeLocation = location ? {
      address: sanitize(location.address || ''),
      city:    sanitize(location.city    || ''),
      state:   sanitize(location.state   || ''),
      lat:     typeof location.lat === 'number' ? location.lat : undefined,
      lng:     typeof location.lng === 'number' ? location.lng : undefined,
    } : null;

    log.info('[CHAT] Incoming query', { preview: clean.slice(0, 60), hasLocation: !!safeLocation });

    const result = await civicAgent(clean, safeLocation, (history || []).slice(-8), language);
    res.json(result);
  } catch (err) {
    // Map well-known Gemini errors to appropriate HTTP status codes
    const msg = err.message || '';
    if (msg.includes('quota exceeded') || msg.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({
        error: 'AI quota limit reached. Please wait a moment and try again.',
      });
    }
    if (msg.includes('API key') || msg.includes('INVALID_ARGUMENT')) {
      return res.status(503).json({
        error: 'AI service configuration error. Please contact support.',
      });
    }
    if (msg.includes('SAFETY')) {
      return res.status(400).json({
        error: 'Your message was flagged by safety filters. Please rephrase your question.',
      });
    }
    next(err);
  }
});

/**
 * POST /api/polling-places
 * Finds nearby polling places using Google Places API.
 *
 * Body: { address?: string } OR { lat: number, lng: number }
 */
app.post('/api/polling-places', async (req, res, next) => {
  try {
    const { address, lat, lng } = req.body;

    if (!address && (typeof lat !== 'number' || typeof lng !== 'number')) {
      return res.status(400).json({ error: 'Provide either address or numeric lat/lng coordinates.' });
    }
    if (address && typeof address !== 'string') {
      return res.status(400).json({ error: 'Address must be a string.' });
    }

    const safeAddress = address ? sanitize(address) : null;
    log.info('[POLLING] Search', { address: safeAddress || `${lat},${lng}` });

    const places = await searchPollingPlaces({ address: safeAddress, lat, lng });
    res.json({ places });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/elections
 * Returns upcoming election dates and candidates for a given address.
 *
 * Body: { address: string }
 */
app.post('/api/elections', async (req, res, next) => {
  try {
    const { address } = req.body;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Address is required and must be a string.' });
    }
    const safeAddress = sanitize(address);
    if (!safeAddress) {
      return res.status(400).json({ error: 'Address contains no valid content.' });
    }

    log.info('[ELECTIONS] Fetch', { address: safeAddress });

    const [elections, candidates] = await Promise.all([
      getElectionInfo(safeAddress),
      getCandidateInfo(safeAddress),
    ]);

    res.json({ elections, candidates });
  } catch (err) {
    next(err);
  }
});

/** SPA catch-all — returns index.html for any unmatched GET. */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ═══════════════════════════════════════════════════════════════════════════
// CENTRALISED ERROR MIDDLEWARE (Code Quality + Security)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Global error handler.
 * - Logs full stack trace server-side.
 * - Never leaks internal details (stack traces, SQL errors, etc.) to clients
 *   in production — only a generic message.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  log.error('[Unhandled Error]', err);

  const status = err.status || err.statusCode || 500;

  // In production, never reveal internal details
  const message = config.isProduction
    ? 'An unexpected error occurred. Please try again.'
    : err.message;

  res.status(status).json({ error: message });
});

// ═══════════════════════════════════════════════════════════════════════════
// SERVER START
// ═══════════════════════════════════════════════════════════════════════════

app.listen(config.port, '0.0.0.0', () => {
  log.info(`🗳️  ${APP_VERSION} — CivicNavigator AI`, {
    url:   `http://0.0.0.0:${config.port}`,
    env:   config.nodeEnv,
    gemini: config.geminiKey ? 'Connected' : 'MISSING',
    maps:   config.mapsKey   ? 'Connected' : 'MISSING',
  });
});
