// K-163N: Shared luck formatting utilities
// Ensures consistent 10× weighted display across all luck components

export const SEASON_WEIGHTS = {
  variance: 0.4,
  rank: 0.3,
  schedule: 0.2,
  chip: 0.1
};

export const GW_WEIGHTS = {
  variance: 0.6,
  rank: 0.4
};

export interface ManagerLuck {
  variance_luck: { total: number };
  rank_luck: { total: number };
  schedule_luck: { value: number };
  chip_luck: { value: number };
  season_luck_index: number;
}

export interface GWLuck {
  variance: number;
  rank: number;
  total: number;
}

export interface FormattedSeasonLuck {
  variance: number;
  rank: number;
  schedule: number;
  chip: number;
  index: number;
}

export interface FormattedGWLuck {
  variance: number;
  rank: number;
  index: number;
}

/**
 * Format season luck components for display (×10 weighted values)
 * Components will sum to index (within rounding)
 */
export function formatSeasonLuck(manager: ManagerLuck): FormattedSeasonLuck {
  const varianceNormalized = manager.variance_luck?.total ? manager.variance_luck.total / 10 : 0;
  const rankNormalized = manager.rank_luck?.total ?? 0;
  const scheduleNormalized = manager.schedule_luck?.value ? manager.schedule_luck.value / 5 : 0;
  const chipNormalized = manager.chip_luck?.value ? manager.chip_luck.value / 3 : 0;

  return {
    variance: varianceNormalized * SEASON_WEIGHTS.variance * 10,
    rank: rankNormalized * SEASON_WEIGHTS.rank * 10,
    schedule: scheduleNormalized * SEASON_WEIGHTS.schedule * 10,
    chip: chipNormalized * SEASON_WEIGHTS.chip * 10,
    index: manager.season_luck_index * 10
  };
}

/**
 * Format gameweek luck for display (×10 weighted values)
 * Only variance and rank - no schedule/chip for single GW
 */
export function formatGWLuck(gwLuck: GWLuck): FormattedGWLuck {
  const varianceNormalized = gwLuck.variance / 10;
  const rankNormalized = gwLuck.rank;

  return {
    variance: varianceNormalized * GW_WEIGHTS.variance * 10,
    rank: rankNormalized * GW_WEIGHTS.rank * 10,
    index: gwLuck.total * 10
  };
}

/**
 * Format a single luck value for display
 * Always shows sign and 1 decimal place
 */
export function formatLuckValue(value: number): string {
  const absVal = Math.abs(value);
  const formatted = absVal < 10 ? absVal.toFixed(1) : absVal.toFixed(1);
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

/**
 * Get CSS class based on luck value
 */
export function getLuckClass(value: number, styles: any): string {
  if (value > 0.5) return styles.lucky;
  if (value < -0.5) return styles.unlucky;
  return styles.neutral;
}
