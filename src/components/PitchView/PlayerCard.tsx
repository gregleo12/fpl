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
}

interface Props {
  player: PlayerInfo;
  pick: Player;
  isBench?: boolean;
}

export function PlayerCard({ player, pick, isBench = false }: Props) {
  const kitUrl = `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${player.team_code}-110.webp`;
  // For bench players, show their actual points without multiplying by 0
  const points = isBench ? player.event_points : (player.event_points * pick.multiplier);
  const isZeroPoints = points === 0;

  return (
    <div className={`${styles.card} ${isBench ? styles.bench : ''}`}>
      {/* Captain/Vice Badge */}
      {pick.is_captain && (
        <div className={styles.captainBadge}>C</div>
      )}
      {pick.is_vice_captain && (
        <div className={styles.viceBadge}>V</div>
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

      {/* Player Name - Red bar for zero points, purple otherwise */}
      <div className={`${styles.name} ${isZeroPoints ? styles.zeroPoints : ''}`}>
        {player.web_name}
      </div>

      {/* Points - Green bar with dark text */}
      <div className={styles.points}>
        {points}
      </div>
    </div>
  );
}
