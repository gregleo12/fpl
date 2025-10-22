import axios from 'axios';

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
}

export const fplApi = new FPLApiClient();
