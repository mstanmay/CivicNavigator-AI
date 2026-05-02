/**
 * @file config.js
 * @description Centralised configuration, constants, and startup validation.
 * Validates all required environment variables at boot so misconfiguration
 * fails fast with a clear error rather than at request-time.
 */

// ─── Application Constants ──────────────────────────────────────────────────
export const APP_VERSION  = '1.0.0';
export const APP_NAME     = 'CivicNavigator AI';

/** Maximum allowed chat message length (characters). */
export const MAX_MESSAGE_LENGTH = 1000;

/** Maximum allowed address string length. */
export const MAX_ADDRESS_LENGTH = 300;

/** Maximum conversation history turns sent to Gemini. */
export const MAX_HISTORY_TURNS = 8;

/** TTL for Places API cache entries (seconds). */
export const PLACES_CACHE_TTL = 300;   // 5 minutes

/** TTL for election data cache entries (seconds). */
export const ELECTIONS_CACHE_TTL = 3600; // 1 hour

/** Rate-limit window (ms). */
export const RATE_LIMIT_WINDOW_MS = 60_000;

/** Max API requests per window per IP. */
export const RATE_LIMIT_MAX = 60;

/** Gemini model to use. */
export const GEMINI_MODEL = 'gemini-2.0-flash';

/** Google Maps base URL. */
export const MAPS_BASE = 'https://maps.googleapis.com/maps/api';

/** Google Civic Information API base URL. */
export const CIVIC_API_BASE = 'https://www.googleapis.com/civicinfo/v2';

// ─── Environment Configuration ──────────────────────────────────────────────
/**
 * Parsed and validated environment config.
 * Access via `config.geminiKey` etc. throughout the app.
 */
export const config = {
  geminiKey:    process.env.GEMINI_API_KEY        || '',
  mapsKey:      process.env.GOOGLE_MAPS_API_KEY   || '',
  projectId:    process.env.GOOGLE_CLOUD_PROJECT  || 'civicnavigator',
  port:         parseInt(process.env.PORT || '8080', 10),
  nodeEnv:      process.env.NODE_ENV              || 'development',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || [],
  isProduction: process.env.NODE_ENV === 'production',
};

// ─── Startup Validation ─────────────────────────────────────────────────────
/**
 * Validates required environment variables at application startup.
 * Logs warnings for missing optional keys; throws for hard-required keys
 * only in production to allow local dev without all keys.
 *
 * @throws {Error} If a required key is absent in production.
 */
export function validateEnv() {
  const warnings = [];
  const errors   = [];

  if (!config.geminiKey) {
    const msg = 'GEMINI_API_KEY is not set — AI chat will be unavailable.';
    config.isProduction ? errors.push(msg) : warnings.push(msg);
  }

  if (!config.mapsKey) {
    const msg = 'GOOGLE_MAPS_API_KEY is not set — Maps and Polling Place features will be unavailable.';
    config.isProduction ? errors.push(msg) : warnings.push(msg);
  }

  if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
    errors.push(`PORT "${process.env.PORT}" is not a valid port number.`);
  }

  warnings.forEach(w => log.warn(`[Config] ⚠️  ${w}`));

  if (errors.length > 0) {
    errors.forEach(e => log.error(`[Config] ❌ ${e}`));
    throw new Error(`Fatal configuration error(s):\n${errors.join('\n')}`);
  }
}

// ─── Structured Logger ──────────────────────────────────────────────────────
/**
 * Structured JSON logger for Cloud Run / Cloud Logging compatibility.
 * Cloud Run reads stdout and parses structured JSON logs automatically.
 * Falls back to human-readable format in development.
 */
export const log = {
  /** @param {string} message @param {object} [meta] */
  info(message, meta = {}) {
    this._write('INFO', message, meta);
  },
  /** @param {string} message @param {object} [meta] */
  warn(message, meta = {}) {
    this._write('WARNING', message, meta);
  },
  /** @param {string} message @param {object|Error} [meta] */
  error(message, meta = {}) {
    if (meta instanceof Error) {
      meta = { error: meta.message, stack: meta.stack };
    }
    this._write('ERROR', message, meta);
  },
  /**
   * Writes a structured log entry.
   * @param {'INFO'|'WARNING'|'ERROR'} severity
   * @param {string} message
   * @param {object} meta
   */
  _write(severity, message, meta) {
    const entry = {
      severity,
      message,
      timestamp: new Date().toISOString(),
      service:   APP_NAME,
      version:   APP_VERSION,
      ...meta,
    };
    // Cloud Run structured logging: output JSON to stdout
    if (config.isProduction) {
      process.stdout.write(JSON.stringify(entry) + '\n');
    } else {
      const prefix = { INFO: '📋', WARNING: '⚠️ ', ERROR: '❌' }[severity] || '•';
      const extras = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      console.log(`${prefix} [${severity}] ${message}${extras}`);
    }
  },
};
