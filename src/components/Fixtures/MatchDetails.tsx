import styles from './MatchDetails.module.css';
import { StrategicIntel } from './StrategicIntel';
import { DifferentialPlayers } from './DifferentialPlayers';
import { CommonPlayers } from './CommonPlayers';

interface CaptainPick {
  playerName: string;
  count: number;
}

interface BenchPoints {
  total: number;
  average: number;
  breakdown: number[];
}

interface HitsTaken {
  total: number;
  count: number;
  breakdown: Array<{ gameweek: number; cost: number }>;
}

interface CommonPlayers {
  count: number;
  percentage: number;
  players: string[];
}

interface StrategicIntelData {
  captainHistory: CaptainPick[];
  benchPoints: BenchPoints;
  teamValue: number;
  hitsTaken: HitsTaken;
  overallRank: number;
  commonPlayers: CommonPlayers;
}

interface PlayerStats {
  id: number;
  player_name: string;
  team_name: string;
  recent_form: Array<{ result: string; event: number }>;
  avg_points_last_5: string;
  chips_remaining: string[];
  free_transfers: number;
  strategicIntel: StrategicIntelData;
}

interface H2HRecord {
  total_meetings: number;
  entry_1_wins: number;
  entry_2_wins: number;
  draws: number;
  last_meeting: {
    event: number;
    entry_1_score: number;
    entry_2_score: number;
  } | null;
}

interface DifferentialPlayer {
  playerName: string;
  avgPoints: number;
  form: number[];
  formMinutes: number[];
  position: string;
}

interface DifferentialPlayers {
  entry_1: DifferentialPlayer[];
  entry_2: DifferentialPlayer[];
}

interface MatchDetailsProps {
  entry1: PlayerStats;
  entry2: PlayerStats;
  headToHead?: H2HRecord;
  differentialPlayers?: DifferentialPlayers;
}

function getChipAbbreviation(chip: string): string {
  const chipMap: { [key: string]: string } = {
    'wildcard': 'WC',
    'bboost': 'BB',
    '3xc': 'TC',
    'freehit': 'FH'
  };
  return chipMap[chip.toLowerCase()] || chip;
}

export function MatchDetails({ entry1, entry2, headToHead, differentialPlayers }: MatchDetailsProps) {
  return (
    <div className={styles.detailsGrid}>
      {/* Header */}
      <div className={styles.detailsHeader}>
        <div className={styles.playerName}>{entry1.player_name}</div>
        <div className={styles.vsLabel}>VS</div>
        <div className={styles.playerName}>{entry2.player_name}</div>
      </div>

      {/* Stats Grid - 2 columns */}
      <div className={styles.statsGrid}>
        {/* Player 1 Column */}
        <div className={styles.playerColumn}>
          {/* Recent Form */}
          <div className={styles.statRow}>
            <div className={styles.statLabel}>Recent Form</div>
            <div className={styles.formDisplay}>
              {entry1.recent_form.map((item, idx) => (
                <div key={idx} className={styles.formItem}>
                  <div
                    className={`${styles.formBadge} ${
                      item.result === 'W' ? styles.w :
                      item.result === 'D' ? styles.d :
                      styles.l
                    }`}
                  >
                    {item.result}
                  </div>
                  <div className={styles.gwLabel}>GW{item.event}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Average Points */}
          <div className={styles.statRow}>
            <div className={styles.statLabel}>Avg Points (Last 5)</div>
            <div className={styles.statValue}>{entry1.avg_points_last_5}</div>
          </div>

          {/* Chips Remaining */}
          <div className={styles.statRow}>
            <div className={styles.statLabel}>Chips</div>
            <div className={styles.chipsDisplay}>
              {entry1.chips_remaining.length > 0 ? (
                entry1.chips_remaining.map(chip => (
                  <span key={chip} className={styles.chipBadge}>
                    {getChipAbbreviation(chip)}
                  </span>
                ))
              ) : (
                <span className={styles.noChips}>None</span>
              )}
            </div>
          </div>

          {/* Free Transfers */}
          <div className={styles.statRow}>
            <div className={styles.statLabel}>Free Transfers</div>
            <div className={styles.statValue}>{entry1.free_transfers} FT</div>
          </div>
        </div>

        {/* Player 2 Column */}
        <div className={styles.playerColumn}>
          {/* Recent Form */}
          <div className={styles.statRow}>
            <div className={styles.statLabel}>Recent Form</div>
            <div className={styles.formDisplay}>
              {entry2.recent_form.map((item, idx) => (
                <div key={idx} className={styles.formItem}>
                  <div
                    className={`${styles.formBadge} ${
                      item.result === 'W' ? styles.w :
                      item.result === 'D' ? styles.d :
                      styles.l
                    }`}
                  >
                    {item.result}
                  </div>
                  <div className={styles.gwLabel}>GW{item.event}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Average Points */}
          <div className={styles.statRow}>
            <div className={styles.statLabel}>Avg Points (Last 5)</div>
            <div className={styles.statValue}>{entry2.avg_points_last_5}</div>
          </div>

          {/* Chips Remaining */}
          <div className={styles.statRow}>
            <div className={styles.statLabel}>Chips</div>
            <div className={styles.chipsDisplay}>
              {entry2.chips_remaining.length > 0 ? (
                entry2.chips_remaining.map(chip => (
                  <span key={chip} className={styles.chipBadge}>
                    {getChipAbbreviation(chip)}
                  </span>
                ))
              ) : (
                <span className={styles.noChips}>None</span>
              )}
            </div>
          </div>

          {/* Free Transfers */}
          <div className={styles.statRow}>
            <div className={styles.statLabel}>Free Transfers</div>
            <div className={styles.statValue}>{entry2.free_transfers} FT</div>
          </div>
        </div>
      </div>

      {/* Common Players */}
      <CommonPlayers
        count={entry1.strategicIntel.commonPlayers.count}
        percentage={entry1.strategicIntel.commonPlayers.percentage}
        players={entry1.strategicIntel.commonPlayers.players}
      />

      {/* Differential Players */}
      {differentialPlayers && (
        <DifferentialPlayers
          entry1Name={entry1.player_name}
          entry2Name={entry2.player_name}
          entry1Differentials={differentialPlayers.entry_1}
          entry2Differentials={differentialPlayers.entry_2}
        />
      )}

      {/* Strategic Intel */}
      <StrategicIntel
        entry1={{
          player_name: entry1.player_name,
          strategicIntel: entry1.strategicIntel
        }}
        entry2={{
          player_name: entry2.player_name,
          strategicIntel: entry2.strategicIntel
        }}
      />

      {/* H2H History (if available) */}
      {headToHead && headToHead.total_meetings > 0 && (
        <div className={styles.h2hSection}>
          <div className={styles.h2hTitle}>Head-to-Head</div>
          <div className={styles.h2hRecord}>
            {headToHead.entry_1_wins} - {headToHead.draws} - {headToHead.entry_2_wins}
          </div>
          {headToHead.last_meeting && (
            <div className={styles.lastMeeting}>
              Last meeting: GW{headToHead.last_meeting.event} ({headToHead.last_meeting.entry_1_score}-{headToHead.last_meeting.entry_2_score})
            </div>
          )}
        </div>
      )}
    </div>
  );
}
