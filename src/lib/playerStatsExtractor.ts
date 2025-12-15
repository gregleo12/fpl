/**
 * Player Stats Extractor - Single Source of Truth
 *
 * Utility for extracting player statistics from the FPL API's event/{gw}/live/ endpoint.
 * Handles the complex nested structure where some stats are direct properties and others
 * are in the explain[].stats[] array structure.
 */

export interface PlayerStats {
  // Direct stats (from element.stats)
  total_points: number;
  minutes: number;
  bps: number;
  bonus: number;

  // Fixture-specific stats (from element.explain[].stats[])
  goals_scored: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
}

/**
 * Extracts all player stats from a single live element
 * Uses direct stats from element.stats (FPL API provides all stats directly)
 */
export function extractPlayerStats(liveElement: any): PlayerStats {
  const stats = liveElement.stats || {};

  return {
    // All stats are directly available in element.stats
    total_points: stats.total_points || 0,
    minutes: stats.minutes || 0,
    bps: stats.bps || 0,
    bonus: stats.bonus || 0,
    goals_scored: stats.goals_scored || 0,
    assists: stats.assists || 0,
    yellow_cards: stats.yellow_cards || 0,
    red_cards: stats.red_cards || 0,
    saves: stats.saves || 0,
    clean_sheets: stats.clean_sheets || 0,
    goals_conceded: stats.goals_conceded || 0,
    own_goals: stats.own_goals || 0,
    penalties_saved: stats.penalties_saved || 0,
    penalties_missed: stats.penalties_missed || 0,
  };
}

/**
 * Extracts player stats for a specific fixture
 * Useful when you need stats from a particular match
 */
export function extractPlayerStatsForFixture(liveElement: any, fixtureId: number): PlayerStats {
  // Get direct stats from the stats object
  const directStats = liveElement.stats || {};

  // Find the specific fixture
  const explain = liveElement.explain || [];
  const fixtureExplain = explain.find((exp: any) => exp.fixture === fixtureId);

  // Initialize fixture stats
  const fixtureStats = {
    goals_scored: 0,
    assists: 0,
    yellow_cards: 0,
    red_cards: 0,
    saves: 0,
    clean_sheets: 0,
    goals_conceded: 0,
    own_goals: 0,
    penalties_saved: 0,
    penalties_missed: 0,
  };

  // Extract stats for this specific fixture
  if (fixtureExplain) {
    const stats = fixtureExplain.stats || [];

    for (const stat of stats) {
      const identifier = stat.identifier;
      const value = stat.value || 0;

      if (identifier in fixtureStats) {
        fixtureStats[identifier as keyof typeof fixtureStats] = value;
      }
    }
  }

  return {
    // Direct stats (these are gameweek totals, not fixture-specific)
    total_points: directStats.total_points || 0,
    minutes: directStats.minutes || 0,
    bps: directStats.bps || 0,
    bonus: directStats.bonus || 0,

    // Fixture-specific stats
    ...fixtureStats,
  };
}

/**
 * Finds a player's live element by ID from the live data response
 */
export function findPlayerLiveElement(liveData: any, playerId: number): any | null {
  if (!liveData || !liveData.elements) {
    return null;
  }

  return liveData.elements.find((el: any) => el.id === playerId) || null;
}

/**
 * Convenience function: Get player stats by ID from live data
 */
export function getPlayerStats(liveData: any, playerId: number): PlayerStats | null {
  const liveElement = findPlayerLiveElement(liveData, playerId);

  if (!liveElement) {
    return null;
  }

  return extractPlayerStats(liveElement);
}

/**
 * Convenience function: Get player stats for a specific fixture
 */
export function getPlayerStatsForFixture(
  liveData: any,
  playerId: number,
  fixtureId: number
): PlayerStats | null {
  const liveElement = findPlayerLiveElement(liveData, playerId);

  if (!liveElement) {
    return null;
  }

  return extractPlayerStatsForFixture(liveElement, fixtureId);
}
