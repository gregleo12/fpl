export interface ColumnDef {
  key: string;
  label: string;
  tooltip?: string;
  width: number;
  format?: (value: any, player?: any) => string;
  align?: 'left' | 'center' | 'right';
}

export const COMPACT_COLUMNS: ColumnDef[] = [
  {
    key: 'now_cost',
    label: '£',
    width: 70,
    format: (v) => `£${(v / 10).toFixed(1)}m`,
    align: 'center'
  },
  {
    key: 'selected_by_percent',
    label: 'TSB',
    tooltip: 'Team Selection %',
    width: 70,
    format: (v) => `${v}%`,
    align: 'center'
  },
  {
    key: 'total_points',
    label: 'Pts',
    tooltip: 'Total Points',
    width: 60,
    align: 'center'
  },
  {
    key: 'form',
    label: 'Form',
    width: 60,
    align: 'center'
  },
];

export const ALL_COLUMNS: ColumnDef[] = [
  // Basic
  {
    key: 'now_cost',
    label: 'Price',
    width: 80,
    format: (v) => `£${(v / 10).toFixed(1)}m`,
    align: 'center'
  },
  {
    key: 'selected_by_percent',
    label: 'TSB',
    tooltip: 'Team Selection %',
    width: 70,
    format: (v) => `${v}%`,
    align: 'center'
  },
  {
    key: 'total_points',
    label: 'Total',
    tooltip: 'Total Points',
    width: 70,
    align: 'center'
  },
  {
    key: 'form',
    label: 'Form',
    width: 70,
    align: 'center'
  },
  {
    key: 'event_points',
    label: 'GW',
    tooltip: 'Gameweek Points',
    width: 60,
    align: 'center'
  },
  {
    key: 'points_per_game',
    label: 'Pts/G',
    tooltip: 'Points Per Game',
    width: 70,
    align: 'center'
  },

  // Appearances
  {
    key: 'starts',
    label: 'Starts',
    width: 70,
    align: 'center'
  },
  {
    key: 'minutes',
    label: 'Mins',
    tooltip: 'Minutes Played',
    width: 70,
    align: 'center'
  },

  // Attacking
  {
    key: 'goals_scored',
    label: 'Goals',
    width: 70,
    align: 'center'
  },
  {
    key: 'expected_goals',
    label: 'xG',
    tooltip: 'Expected Goals',
    width: 70,
    format: (v) => v ? parseFloat(v).toFixed(2) : '0.00',
    align: 'center'
  },
  {
    key: 'assists',
    label: 'Assists',
    width: 70,
    align: 'center'
  },
  {
    key: 'expected_assists',
    label: 'xA',
    tooltip: 'Expected Assists',
    width: 70,
    format: (v) => v ? parseFloat(v).toFixed(2) : '0.00',
    align: 'center'
  },
  {
    key: 'expected_goal_involvements',
    label: 'xGI',
    tooltip: 'Expected Goal Involvements',
    width: 70,
    format: (v) => v ? parseFloat(v).toFixed(2) : '0.00',
    align: 'center'
  },

  // Defensive
  {
    key: 'clean_sheets',
    label: 'CS',
    tooltip: 'Clean Sheets',
    width: 60,
    align: 'center'
  },
  {
    key: 'goals_conceded',
    label: 'GC',
    tooltip: 'Goals Conceded',
    width: 60,
    align: 'center'
  },
  {
    key: 'saves',
    label: 'Saves',
    width: 70,
    align: 'center'
  },
  {
    key: 'dc',
    label: 'DC',
    tooltip: 'Defensive Contribution (Clean Sheets + Saves)',
    width: 60,
    align: 'center'
  },
  {
    key: 'dc_per_90',
    label: 'DC/90',
    tooltip: 'Defensive Contribution per 90 minutes',
    width: 70,
    format: (v) => v ? parseFloat(v).toFixed(2) : '0.00',
    align: 'center'
  },

  // Bonus & Discipline
  {
    key: 'bonus',
    label: 'Bonus',
    width: 70,
    align: 'center'
  },
  {
    key: 'bps',
    label: 'BPS',
    tooltip: 'Bonus Points System',
    width: 70,
    align: 'center'
  },
  {
    key: 'yellow_cards',
    label: 'YC',
    tooltip: 'Yellow Cards',
    width: 60,
    align: 'center'
  },
  {
    key: 'red_cards',
    label: 'RC',
    tooltip: 'Red Cards',
    width: 60,
    align: 'center'
  },

  // Value
  {
    key: 'cost_change_start',
    label: 'Δ Price',
    tooltip: 'Price Change from Start',
    width: 80,
    format: (v) => {
      const change = v / 10;
      return change >= 0 ? `+£${change.toFixed(1)}m` : `£${change.toFixed(1)}m`;
    },
    align: 'center'
  },
];
