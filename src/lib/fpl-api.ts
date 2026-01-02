import axios from 'axios';

// Configure axios for large leagues (up to 50 teams)
axios.defaults.timeout = 90000; // 90 seconds
axios.defaults.timeoutErrorMessage = 'Request timed out - league might be too large';

const API_BASE_URL = process.env.FPL_API_BASE_URL || 'https://fantasy.premierleague.com/api';

export interface BootstrapData {
  events: Event[];
  teams: Team[];
  elements: Player[];
}

export interface Event {
  id: number;
  name: string;
  deadline_time: string;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
}

export interface Team {
  id: number;
  name: string;
  short_name: string;
}

export interface Player {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number;
}

export interface H2HLeague {
  league: {
    id: number;
    name: string;
  };
  standings: {
    results: H2HStanding[];
  };
}

export interface H2HStanding {
  id: number;
  entry: number;
  entry_name: string;
  player_name: string;
  rank: number;
  matches_played: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  points_for: number;
  points_against: number;
  total: number;
}

export interface H2HMatches {
  results: H2HMatch[];
}

export interface H2HMatch {
  id: number;
  event: number;
  entry_1_entry: number;
  entry_1_name: string;
  entry_1_player_name: string;
  entry_1_points: number;
  entry_2_entry: number;
  entry_2_name: string;
  entry_2_player_name: string;
  entry_2_points: number;
  winner: number | null;
}

export class FPLApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async getBootstrapData(): Promise<BootstrapData> {
    const response = await axios.get(`${this.baseUrl}/bootstrap-static/`);
    return response.data;
  }

  async getH2HLeague(leagueId: number): Promise<H2HLeague> {
    const response = await axios.get(
      `${this.baseUrl}/leagues-h2h/${leagueId}/standings/`
    );
    return response.data;
  }

  async getH2HMatches(leagueId: number, page: number = 1): Promise<H2HMatches> {
    const response = await axios.get(
      `${this.baseUrl}/leagues-h2h-matches/league/${leagueId}/?page=${page}`
    );
    return response.data;
  }

  async getAllH2HMatches(leagueId: number): Promise<H2HMatch[]> {
    let allMatches: H2HMatch[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const data = await this.getH2HMatches(leagueId, page);
      allMatches = allMatches.concat(data.results);
      hasMore = data.results.length > 0;
      page++;
    }

    return allMatches;
  }

  async getEntry(entryId: number): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/entry/${entryId}/`);
    return response.data;
  }

  async getEntryHistory(entryId: number): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/entry/${entryId}/history/`);
    return response.data;
  }

  async getEntryPicks(entryId: number, eventId: number): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/entry/${entryId}/event/${eventId}/picks/`);
    return response.data;
  }

  async getEventLive(eventId: number): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/event/${eventId}/live/`);
    return response.data;
  }
}

export const fplApi = new FPLApiClient();

// ============ K-164: BULLETPROOF GW STATUS HELPERS ============

/**
 * K-164: Determines if it's safe to use database for a given GW
 *
 * CRITICAL RULE: Only use database when the NEXT gameweek has started.
 * This gives us days (not hours) for sync to complete, preventing the
 * recurring bug where GW finishes (Sunday night) but DB hasn't synced yet.
 *
 * Timeline Example:
 * - Sunday 8pm: GW19 finishes, marked finished=true → Continue using FPL API ✅
 * - Monday-Friday: GW19 still uses FPL API, sync has days to complete ✅
 * - Saturday 3pm: GW20 starts (is_current=true) → NOW safe to use DB for GW19 ✅
 *
 * @param gw - The gameweek to check
 * @param events - Array of all events from bootstrap-static
 * @returns true if safe to use database, false if should use FPL API
 */
export function safeToUseDatabase(gw: number, events: Event[]): boolean {
  const event = events.find(e => e.id === gw);
  const nextEvent = events.find(e => e.id === gw + 1);

  // GW must be finished
  if (!event?.finished) return false;

  // Next GW must have started (is_current = true means it's active)
  // This is the KEY DIFFERENCE from old logic - we wait for next GW to start
  if (!nextEvent?.is_current) return false;

  // Safe to use database - next GW has started, so we had 5+ days for sync
  return true;
}

/**
 * K-164: Get gameweek status with bulletproof logic
 *
 * Returns:
 * - 'completed': Next GW has started, safe to use database
 * - 'live': GW is current OR GW finished but next GW hasn't started yet (use FPL API)
 * - 'upcoming': GW hasn't started yet
 *
 * @param gw - The gameweek to check
 * @param events - Array of all events from bootstrap-static
 * @returns Status string for determining data source
 */
export function getGWStatus(gw: number, events: Event[]): 'completed' | 'live' | 'upcoming' {
  const event = events.find(e => e.id === gw);

  if (!event) {
    console.warn(`[K-164] No event found for GW${gw}`);
    return 'upcoming';
  }

  // Current/live GW - always use FPL API
  if (event.is_current && !event.finished) {
    return 'live';
  }

  // K-164: Only mark as completed if NEXT GW has started
  // This ensures we have days (not hours) for sync to complete
  if (safeToUseDatabase(gw, events)) {
    return 'completed';  // Safe to use database
  }

  // GW finished but next GW hasn't started yet
  // Stay on API to be safe (prevents 0-point bug)
  if (event.finished) {
    return 'live';  // Treat as live = use FPL API
  }

  return 'upcoming';
}
