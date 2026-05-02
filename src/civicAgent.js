/**
 * @file civicAgent.js
 * @description Gemini 2.0 Flash AI agent for nonpartisan civic guidance.
 *
 * Google Services used:
 *   - Gemini 2.0 Flash (AI chat with intent detection)
 *   - Google Cloud Translation API (multilingual accessibility)
 *
 * The agent is strictly nonpartisan. It detects user intent (polling, registration,
 * rights, etc.) and returns contextual quick-reply suggestions alongside the reply.
 *
 * Efficiency: Response caching for identical queries (node-cache, TTL 2 min).
 */

import { GoogleGenAI }  from '@google/genai';
import NodeCache         from 'node-cache';
import axios             from 'axios';
import { config, log, GEMINI_MODEL, MAX_HISTORY_TURNS } from './config.js';

/** Gemini client — instantiated once, reused across requests. */
const genai = new GoogleGenAI({ apiKey: config.geminiKey });

/**
 * Short-lived cache for identical questions asked within 2 minutes.
 * Key: sanitized message + location hash. Avoids duplicate Gemini calls.
 */
const replyCache = new NodeCache({ stdTTL: 120, checkperiod: 60 });

// ─── System Prompt ─────────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `You are CivicNavigator AI — a friendly, nonpartisan election assistant \
that helps citizens navigate their civic duties with accuracy and empathy.

## Your Capabilities
1. **Polling Location Guidance** — Help find polling stations; explain ID and registration requirements.
2. **Candidate & Ballot Info** — Explain positions objectively; summarise ballot measures in plain language.
3. **Voting Process** — Guide through registration, absentee voting, early voting, accessibility accommodations.
4. **Civic Rights** — Voting Rights Act, provisional ballots, election observers, anti-discrimination laws.
5. **Election Dates & Deadlines** — Upcoming elections, registration cutoffs, early voting windows.
6. **Accessibility** — Curbside voting, accessible booths, language assistance, audio ballots.

## Rules
- Be STRICTLY nonpartisan. Never endorse or disparage any candidate, party, or policy position.
- Always encourage civic participation regardless of the user's background.
- If asked for political opinions, politely decline and redirect to factual information.
- Cite authoritative sources: vote.gov, usa.gov, ballotpedia.org, VOTE411.org.
- Tailor responses to the user's location when provided.
- Use bullet points or numbered steps for procedural answers.
- Keep responses under 300 words unless a detailed explanation is explicitly needed.
- If you don't know a specific local fact, say so honestly and direct users to official sources.
- For non-English queries, respond in the same language as the question.

## Tone
Warm, approachable, empowering. You are helping someone exercise a fundamental right.

Always end with one concrete action tip or a trustworthy resource link.`;

// ─── Main Agent Function ───────────────────────────────────────────────────

/**
 * Runs the civic AI agent for a given user message.
 *
 * @param {string} message        - Sanitized user input.
 * @param {object|null} location  - { address, lat, lng, city, state }
 * @param {Array}  history        - Prior turns: [{ role, text }]
 * @returns {Promise<AgentResult>}
 */
export async function civicAgent(message, location = null, history = []) {
  if (!config.geminiKey) {
    throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY.');
  }

  // ── Cache check (skip for conversations with history) ──────────────────
  const cacheKey = history.length === 0
    ? `chat:${message.toLowerCase()}:${location?.address || ''}`
    : null;

  if (cacheKey) {
    const cached = replyCache.get(cacheKey);
    if (cached) {
      log.info('[Cache] HIT civicAgent', { preview: message.slice(0, 40) });
      return cached;
    }
  }

  // ── Detect intent early (used for suggestions & UI routing) ────────────
  const intent = detectIntent(message);

  // ── Detect language for Translation API ────────────────────────────────
  const detectedLang = detectLanguage(message);

  // ── Build enriched message with location context ───────────────────────
  let enrichedMessage = message;
  if (location?.address || location?.city) {
    const loc = location.address || `${location.city}, ${location.state || ''}`.trim();
    enrichedMessage = `[User location: ${loc}]\n\n${message}`;
  }
  if (detectedLang && detectedLang !== 'en') {
    enrichedMessage += `\n\n[Note: Please respond in the user's language: ${detectedLang}]`;
  }

  try {
    // ── Create chat session with history ───────────────────────────────
    const chat = genai.chats.create({
      model:  GEMINI_MODEL,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature:       0.3,
        maxOutputTokens:   1024,
        topP:              0.9,
      },
      history: history.slice(-MAX_HISTORY_TURNS).map(h => ({
        role:  h.role,
        parts: [{ text: h.text }],
      })),
    });

    const response = await chat.sendMessage({ message: enrichedMessage });
    const reply    = response.text;

    if (!reply) throw new Error('Empty response received from Gemini.');

    const suggestions = generateSuggestions(intent, location);
    const result = { reply, suggestions, intent, language: detectedLang };

    // ── Cache the result ───────────────────────────────────────────────
    if (cacheKey) {
      replyCache.set(cacheKey, result);
      log.info('[Cache] SET civicAgent', { preview: message.slice(0, 40) });
    }

    return result;
  } catch (err) {
    // ── Graceful error classification ──────────────────────────────────
    if (err.message?.includes('API_KEY') || err.message?.includes('INVALID_ARGUMENT')) {
      throw new Error('Gemini API key is invalid. Please check your configuration.');
    }
    if (err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('quota')) {
      throw new Error('AI quota exceeded. Please try again in a few moments.');
    }
    if (err.message?.includes('SAFETY')) {
      throw new Error('The message was flagged by safety filters. Please rephrase your question.');
    }
    log.error('[Gemini] Unexpected error', err);
    throw err;
  }
}

// ─── Intent Detection ──────────────────────────────────────────────────────

/**
 * Classifies user message into a civic intent category.
 * Used for UI routing (e.g., auto-trigger map search) and suggestion generation.
 *
 * @param {string} message
 * @returns {IntentType}
 */
export function detectIntent(message) {
  const lc = message.toLowerCase();
  const rules = [
    { intent: 'polling_location', pattern: /polling|booth|station|where.*vote|find.*poll|vote.*location/ },
    { intent: 'registration',     pattern: /register|registration|sign.?up|eligible|how.*vote.*first/ },
    { intent: 'candidate_info',   pattern: /candidate|who.*running|ballot measure|proposition|initiative/ },
    { intent: 'absentee_voting',  pattern: /absentee|mail.*ballot|vote.*mail|early.*vot|drop.*box/ },
    { intent: 'voter_id',         pattern: /\bid\b|identification|what.*bring|require.*poll|id.*law/ },
    { intent: 'election_dates',   pattern: /\bdate\b|when.*election|deadline|next.*election|primary.*date/ },
    { intent: 'voter_rights',     pattern: /right|law|legal|discriminat|provisional|turn.*away|observer/ },
    { intent: 'accessibility',    pattern: /disabled|wheelchair|accessibility|curbside|language.*assist|audio.*ballot/ },
  ];

  for (const { intent, pattern } of rules) {
    if (pattern.test(lc)) return intent;
  }
  return 'general';
}

// ─── Language Detection ────────────────────────────────────────────────────

/**
 * Heuristic language detection to decide whether to call Translation API.
 * Detects common non-Latin scripts and Spanish keywords.
 * For production, integrate Google Cloud Natural Language API for accurate detection.
 *
 * @param {string} text
 * @returns {string} BCP-47 language code ('en', 'es', 'zh', etc.)
 */
function detectLanguage(text) {
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';   // Chinese
  if (/[\u0600-\u06ff]/.test(text)) return 'ar';   // Arabic
  if (/[\u0900-\u097f]/.test(text)) return 'hi';   // Hindi/Devanagari
  if (/[\u0400-\u04ff]/.test(text)) return 'ru';   // Cyrillic
  if (/\b(cómo|dónde|votar|elección|registro|papeleta)\b/i.test(text)) return 'es'; // Spanish
  if (/\b(comment|où|voter|élection|inscription)\b/i.test(text)) return 'fr'; // French
  return 'en';
}

/**
 * Translates text using Google Cloud Translation API.
 * Used to translate AI replies into the user's detected language if needed.
 * Falls back silently if API key or quota is unavailable.
 *
 * @param {string} text        - Text to translate.
 * @param {string} targetLang  - BCP-47 target language code.
 * @returns {Promise<string>}  - Translated text, or original on failure.
 */
export async function translateText(text, targetLang) {
  if (targetLang === 'en' || !config.mapsKey) return text; // reuse API key if Translation enabled
  try {
    const res = await axios.post(
      `https://translation.googleapis.com/language/translate/v2`,
      { q: text, target: targetLang, format: 'text' },
      { params: { key: config.mapsKey }, timeout: 5000 }
    );
    return res.data?.data?.translations?.[0]?.translatedText || text;
  } catch (err) {
    log.warn('[Translation] API call failed', { error: err.message, targetLang });
    return text; // graceful fallback — return original
  }
}

// ─── Suggestions ───────────────────────────────────────────────────────────

/**
 * Returns 3 contextual quick-reply suggestions based on detected intent.
 *
 * @param {IntentType} intent
 * @param {object|null} location
 * @returns {string[]}
 */
export function generateSuggestions(intent, location) {
  const city = location?.city || 'my area';

  /** @type {Record<IntentType, string[]>} */
  const map = {
    polling_location: ['What ID do I need to bring?', 'What are the polling hours?', 'Can I vote early?'],
    registration:     ["What's the registration deadline?", 'Can I register on Election Day?', "How do I check if I'm already registered?"],
    candidate_info:   ['How can I research candidates objectively?', 'What is a ballot measure?', 'Where can I find a nonpartisan voter guide?'],
    absentee_voting:  ['When is the mail ballot deadline?', 'How do I track my mail ballot?', 'What if my ballot is rejected?'],
    voter_id:         ["What if I don't have a photo ID?", 'What is a provisional ballot?', 'Are there ID exemptions?'],
    election_dates:   ['How do I register to vote?', `Can I vote early in ${city}?`, "What's on my local ballot?"],
    voter_rights:     ['What is the Voting Rights Act?', 'Can I take time off work to vote?', 'What if I am turned away at the polls?'],
    accessibility:    ['Is curbside voting available?', 'Can I get a ballot in my language?', 'What accommodations exist for disabled voters?'],
    general:          [`Where is my polling place in ${city}?`, 'How do I register to vote?', 'When is the next election?'],
  };

  return map[intent] ?? map.general;
}

/**
 * @typedef {'polling_location'|'registration'|'candidate_info'|'absentee_voting'|
 *           'voter_id'|'election_dates'|'voter_rights'|'accessibility'|'general'} IntentType
 * @typedef {{ reply: string, suggestions: string[], intent: IntentType, language: string }} AgentResult
 */
