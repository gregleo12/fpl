import axios from 'axios';

const API_BASE_URL = process.env.FPL_API_BASE_URL || 'https://fantasy.premierleague.com/api';

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry helper with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on 404 or other client errors
      if (error.response?.status && error.response.status < 500) {
        throw error;
      }

      // If it's the last attempt, throw
      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff with jitter
      const delayTime = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`Request failed (${error.code || error.message}), retrying in ${Math.round(delayTime)}ms... (attempt ${attempt + 1}/${maxRetries})`);
      await delay(delayTime);
    }
  }

  throw lastError;
}

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
    return retryWithBackoff(async () => {
      const response = await axios.get(`${this.baseUrl}/bootstrap-static/`, {
        timeout: 10000
      });
      return response.data;
    });
  }

  async getH2HLeague(leagueId: number): Promise<H2HLeague> {
    return retryWithBackoff(async () => {
      const response = await axios.get(
        `${this.baseUrl}/leagues-h2h/${leagueId}/standings/`,
        { timeout: 10000 }
      );
      return response.data;
    });
  }

  async getH2HMatches(leagueId: number, page: number = 1): Promise<H2HMatches> {
    return retryWithBackoff(async () => {
      const response = await axios.get(
        `${this.baseUrl}/leagues-h2h-matches/league/${leagueId}/?page=${page}`,
        { timeout: 10000 }
      );
      return response.data;
    });
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

      // Add delay between pages to avoid rate limiting
      if (hasMore) {
        await delay(100);
      }
    }

    return allMatches;
  }

  async getEntry(entryId: number): Promise<any> {
    return retryWithBackoff(async () => {
      const response = await axios.get(`${this.baseUrl}/entry/${entryId}/`, {
        timeout: 10000
      });
      return response.data;
    });
  }

  async getEntryHistory(entryId: number): Promise<any> {
    return retryWithBackoff(async () => {
      const response = await axios.get(`${this.baseUrl}/entry/${entryId}/history/`, {
        timeout: 10000
      });
      return response.data;
    });
  }

  async getEntryPicks(entryId: number, eventId: number): Promise<any> {
    return retryWithBackoff(async () => {
      const response = await axios.get(
        `${this.baseUrl}/entry/${entryId}/event/${eventId}/picks/`,
        { timeout: 10000 }
      );
      return response.data;
    });
  }
}

export const fplApi = new FPLApiClient();
