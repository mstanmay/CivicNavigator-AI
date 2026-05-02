/**
 * @file mapsService.js
 * @description Google Maps Platform integration.
 *
 * Integrates: Maps JavaScript API, Places API (Text Search),
 *             Geocoding API, Distance Matrix API, Directions API.
 *
 * Efficiency: Results are cached in-memory using node-cache to avoid
 *             redundant API calls for identical queries (TTL: 5 minutes).
 * Security:   API key read from config (never hardcoded).
 *             All network calls have explicit timeouts.
 */

import axios  from 'axios';
import NodeCache from 'node-cache';
import { config, log, MAPS_BASE, PLACES_CACHE_TTL } from './config.js';

/** In-memory LRU cache for Places and Geocoding results. */
const cache = new NodeCache({ stdTTL: PLACES_CACHE_TTL, checkperiod: 60, useClones: false });

// ─── Polling Place Search ──────────────────────────────────────────────────

/**
 * Searches for civic/polling locations near a given address or coordinates.
 * Results are cached by (address|lat,lng) key for 5 minutes.
 *
 * @param {{ address?: string, lat?: number, lng?: number, radius?: number }} opts
 * @returns {Promise<{ places: PlaceResult[], center: Coords }>}
 */
export async function searchPollingPlaces({ address, lat, lng, radius = 5000 }) {
  if (!config.mapsKey) throw new Error('GOOGLE_MAPS_API_KEY is not configured.');

  // ── Cache lookup ────────────────────────────────────────────────────────
  const cacheKey = `polling:${address || `${lat},${lng}`}`;
  const cached   = cache.get(cacheKey);
  if (cached) {
    log.info('[Cache] HIT polling-places', { key: cacheKey });
    return cached;
  }

  // ── Geocode if needed ───────────────────────────────────────────────────
  let coords = { lat, lng };
  if (address && (!lat || !lng)) {
    coords = await geocodeAddress(address);
  }

  // ── Parallel place searches ─────────────────────────────────────────────
  const queries = [
    'polling place voting location',
    'county election office',
    'public library',
    'community center',
  ];

  const searchResults = await Promise.allSettled(
    queries.map(q =>
      axios.get(`${MAPS_BASE}/place/textsearch/json`, {
        params: {
          query:    `${q} near ${address || `${coords.lat},${coords.lng}`}`,
          location: `${coords.lat},${coords.lng}`,
          radius,
          key:      config.mapsKey,
        },
        timeout: 8000,
      })
    )
  );

  // ── Merge & deduplicate ─────────────────────────────────────────────────
  const seen    = new Set();
  const allPlaces = [];

  for (const result of searchResults) {
    if (result.status !== 'fulfilled') {
      log.warn('[Maps] Place search failed', { reason: result.reason?.message });
      continue;
    }
    for (const p of (result.value.data?.results || [])) {
      if (!seen.has(p.place_id)) {
        seen.add(p.place_id);
        allPlaces.push(p);
      }
    }
  }

  // ── Normalise ────────────────────────────────────────────────────────────
  const places = allPlaces.slice(0, 10).map(p => ({
    id:      p.place_id,
    name:    p.name,
    address: p.formatted_address || p.vicinity,
    lat:     p.geometry?.location?.lat,
    lng:     p.geometry?.location?.lng,
    rating:  p.rating,
    openNow: p.opening_hours?.open_now,
    types:   p.types || [],
    icon:    categorizePlace(p.types),
  }));

  // ── Enrich with distance (single batch call) ─────────────────────────────
  if (coords.lat && coords.lng && places.length) {
    try {
      const destinations = places.map(p => `${p.lat},${p.lng}`).join('|');
      const distRes = await axios.get(`${MAPS_BASE}/distancematrix/json`, {
        params: {
          origins:      `${coords.lat},${coords.lng}`,
          destinations,
          units:        'imperial',
          key:          config.mapsKey,
        },
        timeout: 8000,
      });

      const elements = distRes.data?.rows?.[0]?.elements || [];
      elements.forEach((el, i) => {
        if (el.status === 'OK' && places[i]) {
          places[i].distance = el.distance?.text;
          places[i].duration = el.duration?.text;
        }
      });
    } catch (err) {
      log.warn('[Maps] Distance Matrix failed', { error: err.message });
    }
  }

  const result = { places, center: coords };
  cache.set(cacheKey, result);
  log.info('[Cache] SET polling-places', { key: cacheKey, count: places.length });
  return result;
}

// ─── Geocoding ────────────────────────────────────────────────────────────

/**
 * Geocodes an address string to latitude/longitude and address components.
 * Results cached for 5 minutes.
 *
 * @param {string} address - Human-readable address string.
 * @returns {Promise<Coords>}
 */
export async function geocodeAddress(address) {
  if (!config.mapsKey) throw new Error('GOOGLE_MAPS_API_KEY missing.');

  const cacheKey = `geocode:${address.toLowerCase()}`;
  const cached   = cache.get(cacheKey);
  if (cached) return cached;

  const res = await axios.get(`${MAPS_BASE}/geocode/json`, {
    params: { address, key: config.mapsKey },
    timeout: 8000,
  });

  const result = res.data?.results?.[0];
  if (!result) throw new Error(`Could not geocode: "${address}"`);

  const { lat, lng }  = result.geometry.location;
  const components    = result.address_components || [];
  const city       = components.find(c => c.types.includes('locality'))?.long_name;
  const state      = components.find(c => c.types.includes('administrative_area_level_1'))?.long_name;
  const stateShort = components.find(c => c.types.includes('administrative_area_level_1'))?.short_name;

  const coords = { lat, lng, city, state, stateShort, formattedAddress: result.formatted_address };
  cache.set(cacheKey, coords);
  return coords;
}

// ─── Directions ───────────────────────────────────────────────────────────

/**
 * Fetches driving directions between two points via the Directions API.
 *
 * @param {string|{lat:number,lng:number}} origin
 * @param {string|{lat:number,lng:number}} destination
 * @returns {Promise<object>} Raw Directions API response.
 */
export async function getDirections(origin, destination) {
  if (!config.mapsKey) throw new Error('GOOGLE_MAPS_API_KEY missing.');

  const originStr      = typeof origin      === 'string' ? origin      : `${origin.lat},${origin.lng}`;
  const destinationStr = typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`;

  const res = await axios.get(`${MAPS_BASE}/directions/json`, {
    params: { origin: originStr, destination: destinationStr, alternatives: true, key: config.mapsKey },
    timeout: 10000,
  });

  return res.data;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Maps a Google place type array to a UI icon category.
 * @param {string[]} types
 * @returns {'library'|'school'|'government'|'community'|'polling'}
 */
function categorizePlace(types = []) {
  if (types.includes('library'))                                             return 'library';
  if (types.includes('school') || types.includes('university'))             return 'school';
  if (types.includes('city_hall') || types.includes('local_government_office')) return 'government';
  if (types.includes('community_center'))                                   return 'community';
  if (types.includes('church') || types.includes('place_of_worship'))      return 'community';
  return 'polling';
}

/**
 * @typedef {{ lat: number, lng: number, city?: string, state?: string,
 *             stateShort?: string, formattedAddress?: string }} Coords
 * @typedef {{ id: string, name: string, address: string, lat: number, lng: number,
 *             rating?: number, openNow?: boolean, types: string[], icon: string,
 *             distance?: string, duration?: string }} PlaceResult
 */
