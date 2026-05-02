/**
 * Election Information Service
 * Provides election data, candidate information, and voting resources.
 * In production, this integrates with Google Civic Information API.
 */

const CIVIC_API_BASE = 'https://www.googleapis.com/civicinfo/v2';
const MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY; // Civic API uses same key

/**
 * Get upcoming elections for a given address using Google Civic Information API
 */
export async function getElectionInfo(address) {
  if (!MAPS_API_KEY) {
    return getFallbackElectionData(address);
  }

  try {
    const { default: axios } = await import('axios');
    const res = await axios.get(`${CIVIC_API_BASE}/elections`, {
      params: { key: MAPS_API_KEY },
      timeout: 8000,
    });

    const elections = res.data?.elections || [];

    // Filter to relevant upcoming elections
    const now = new Date();
    const upcoming = elections
      .filter(e => {
        const electionDate = new Date(e.electionDay);
        return electionDate >= now;
      })
      .slice(0, 5)
      .map(e => ({
        id: e.id,
        name: e.name,
        date: e.electionDay,
        ocdDivisionId: e.ocdDivisionId,
        formattedDate: new Date(e.electionDay).toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }),
      }));

    return upcoming.length > 0 ? upcoming : getFallbackElectionData(address);
  } catch (err) {
    console.warn('[Elections] Civic API error:', err.message);
    return getFallbackElectionData(address);
  }
}

/**
 * Get representative and candidate info using Google Civic Information API
 */
export async function getCandidateInfo(address) {
  if (!MAPS_API_KEY) {
    return getFallbackCandidates();
  }

  try {
    const { default: axios } = await import('axios');
    const res = await axios.get(`${CIVIC_API_BASE}/representatives`, {
      params: { address, key: MAPS_API_KEY, includeOffices: true },
      timeout: 8000,
    });

    const officials = res.data?.officials || [];
    const offices = res.data?.offices || [];

    // Map officials to their offices
    const candidates = [];
    offices.forEach(office => {
      (office.officialIndices || []).forEach(idx => {
        const official = officials[idx];
        if (official) {
          candidates.push({
            name: official.name,
            party: official.party || 'Independent',
            office: office.name,
            division: office.divisionId,
            phone: official.phones?.[0],
            website: official.urls?.[0],
            photoUrl: official.photoUrl,
            channels: official.channels || [],
          });
        }
      });
    });

    return candidates.slice(0, 20);
  } catch (err) {
    console.warn('[Candidates] Civic API error:', err.message);
    return getFallbackCandidates();
  }
}

/**
 * Fallback election data when API is unavailable
 */
function getFallbackElectionData(address) {
  const stateMatch = address?.match(/\b([A-Z]{2})\b/);
  const state = stateMatch?.[1] || 'your state';

  return [
    {
      id: 'general-2026',
      name: `2026 General Election`,
      date: '2026-11-03',
      formattedDate: 'Tuesday, November 3, 2026',
      note: 'Contact your local election office for exact dates in your area.',
    },
    {
      id: 'primary-2026',
      name: `2026 Primary Election`,
      date: '2026-06-02',
      formattedDate: 'Tuesday, June 2, 2026',
      note: 'Dates vary by state. Check vote.gov for your specific primary date.',
    },
  ];
}

/**
 * Fallback candidate data
 */
function getFallbackCandidates() {
  return [];
}

/**
 * Get key election resources and links
 */
export function getElectionResources() {
  return [
    { name: 'Vote.gov', url: 'https://vote.gov', description: 'Official U.S. voter registration portal' },
    { name: 'BallotReady', url: 'https://www.ballotready.org', description: 'Research your local ballot' },
    { name: 'Ballotpedia', url: 'https://ballotpedia.org', description: 'Nonpartisan election encyclopedia' },
    { name: 'VOTE411', url: 'https://www.vote411.org', description: 'Voter guide from League of Women Voters' },
    { name: 'CanIVote', url: 'https://www.canivote.org', description: 'Check registration & polling place' },
    { name: 'TurboVote', url: 'https://turbovote.org', description: 'Voting reminders and registration help' },
  ];
}

/**
 * Calculate registration deadline (simplified — real impl. uses state-specific rules)
 */
export function getRegistrationDeadline(state, electionDate) {
  const deadlines = {
    'CA': 15, 'TX': 30, 'FL': 29, 'NY': 25, 'PA': 15,
    'OH': 30, 'GA': 29, 'NC': 25, 'MI': 15, 'WA': 8,
    'AZ': 29, 'WI': 0, 'MN': 0, 'CO': 8, 'NV': 8,
  };
  const daysBeforeElection = deadlines[state] ?? 30;
  const election = new Date(electionDate || '2026-11-03');
  const deadline = new Date(election);
  deadline.setDate(deadline.getDate() - daysBeforeElection);

  return {
    deadline: deadline.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    daysBeforeElection,
    sameDayRegistration: daysBeforeElection === 0,
  };
}
