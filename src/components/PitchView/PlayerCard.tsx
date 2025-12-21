import styles from './PlayerCard.module.css';

interface Player {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

interface PlayerInfo {
  id: number;
  web_name: string;
  team: number;
  team_code: number;
  element_type: number;
  event_points: number;
  minutes?: number;
  opponent_short?: string | null;
  was_home?: boolean | null;
  fixture_started?: boolean;
  fixture_finished?: boolean;
  isLive?: boolean;  // K-64: Live fixture indicator
  is_sub_in?: boolean;  // K-69: Player was auto-subbed into starting XI
  is_sub_out?: boolean;  // K-69: Player was auto-subbed out to bench
}

interface Props {
  player: PlayerInfo;
  pick: Player;
  isBench?: boolean;
  onClick?: () => void;
}

export function PlayerCard({ player, pick, isBench = false, onClick }: Props) {
  const kitUrl = `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${player.team_code}-110.webp`;
  // For bench players, show their actual points without multiplying by 0
  const points = isBench ? player.event_points : (player.event_points * pick.multiplier);
  // Use minutes to determine if player has played, not points
  const hasNotPlayed = !player.minutes || player.minutes === 0;
  // Show fixture only if player hasn't played AND fixture hasn't started
  const showFixture = hasNotPlayed && !player.fixture_started && player.opponent_short;

  return (
    <div
      className={`${styles.card} ${isBench ? styles.bench : ''} ${onClick ? styles.clickable : ''}`}
      onClick={onClick}
    >
      {/* Captain/Vice Badge */}
      {pick.is_captain && (
        <div className={styles.captainBadge}>C</div>
      )}
      {pick.is_vice_captain && (
        <div className={styles.viceBadge}>V</div>
      )}

      {/* K-64: Live Fixture Indicator */}
      {player.isLive && (
        <div className={styles.liveIndicator} />
      )}

      {/* K-69: Auto-Sub Indicators */}
      {player.is_sub_in && (
        <div className={styles.subInIcon} title="Auto-subbed into starting XI">
          ↑
        </div>
      )}
      {player.is_sub_out && (
        <div className={styles.subOutIcon} title="Auto-subbed out to bench">
          ↓
        </div>
      )}

      {/* Kit Image - Cropped to show top 60-70% */}
      <div className={styles.kitContainer}>
        <img
          src={kitUrl}
          alt={player.web_name}
          className={styles.kit}
          onError={(e) => {
            // Fallback if image fails to load
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>

      {/* Player Name - Purple bar for all players (status shown in points/fixture bar) */}
      <div className={styles.name}>
        {player.web_name}
      </div>

      {/* Points or Fixture - Show upcoming fixture or points */}
      {showFixture ? (
        <div className={styles.fixture}>
          {player.opponent_short} ({player.was_home ? 'H' : 'A'})
        </div>
      ) : (
        <div className={styles.points}>
          {points}
        </div>
      )}
    </div>
  );
}
