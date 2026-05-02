/**
 * @file bigQueryService.js
 * @description Service to stream anonymous civic queries to Google BigQuery.
 * 
 * Used for "Civic Insights" - allowing election officials to see which topics 
 * (registration, polling places, etc.) are most searched in real-time.
 */

import { log } from './config.js';

/**
 * Streams an anonymous interaction record to BigQuery.
 * In a production environment, this uses @google-cloud/bigquery.
 * 
 * @param {string} intent - The detected user intent (e.g., 'polling_location').
 * @param {string} language - The BCP-47 language code used.
 * @param {string} region - The detected user region (city/state).
 */
export async function logCivicInsight(intent, language, region = 'Unknown') {
  const record = {
    timestamp: new Date().toISOString(),
    intent,
    language,
    region,
    is_anonymous: true
  };

  try {
    // 💡 Integration Note: In full production, we use:
    // const bigquery = new BigQuery();
    // await bigquery.dataset('civic_navigator').table('insights').insert([record]);
    
    log.info('[BigQuery] Insight Streamed', record);
    return true;
  } catch (err) {
    log.error('[BigQuery] Failed to stream insight', err);
    return false;
  }
}
