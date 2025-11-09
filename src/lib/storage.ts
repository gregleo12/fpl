export interface SavedState {
  leagueId: string;
  leagueName: string;
  myTeamId: string;
  myTeamName: string;
  myManagerName: string;
  lastFetched: string; // ISO timestamp
}

export interface RecentLeague {
  leagueId: string;
  leagueName: string;
  lastVisited: string;
}

const STORAGE_KEY = 'fpl_h2h_state';
const RECENT_KEY = 'fpl_h2h_recent';

export function saveState(state: SavedState): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    // Also add to recent leagues
    addToRecent({
      leagueId: state.leagueId,
      leagueName: state.leagueName,
      lastVisited: new Date().toISOString()
    });
  }
}

export function loadState(): SavedState | null {
  if (typeof window !== 'undefined') {
    // First try localStorage (persistent)
    const persistentData = localStorage.getItem(STORAGE_KEY);
    if (persistentData) {
      return JSON.parse(persistentData);
    }

    // Fall back to sessionStorage (current session only)
    const sessionData = sessionStorage.getItem('app_state');
    return sessionData ? JSON.parse(sessionData) : null;
  }
  return null;
}

export function clearState(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem('app_state');
  }
}

export function updateLastFetched(): void {
  const state = loadState();
  if (state) {
    state.lastFetched = new Date().toISOString();
    saveState(state);
  }
}

// Recent leagues functionality
export function getRecentLeagues(): RecentLeague[] {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(RECENT_KEY);
    return data ? JSON.parse(data) : [];
  }
  return [];
}

function addToRecent(league: RecentLeague): void {
  const recent = getRecentLeagues();

  // Remove if already exists
  const filtered = recent.filter(l => l.leagueId !== league.leagueId);

  // Add to front
  const updated = [league, ...filtered].slice(0, 3); // Keep last 3

  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

export function clearRecentLeagues(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(RECENT_KEY);
  }
}
