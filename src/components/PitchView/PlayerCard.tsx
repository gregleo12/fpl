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
  const points = player.event_points * pick.multiplier;
  const isPositive = points > 0;
  const isNegative = points < 0;

  return (
    <div className={`${styles.card} ${isBench ? styles.bench : ''}`}>
      {/* Captain/Vice Badge */}
      {pick.is_captain && (
        <div className={styles.captainBadge}>C</div>
      )}
      {pick.is_vice_captain && (
        <div className={styles.viceBadge}>V</div>
      )}

      {/* Kit Image */}
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

      {/* Player Name */}
      <div className={styles.name}>
        {player.web_name}
      </div>

      {/* Points */}
      <div className={`${styles.points} ${
        isPositive ? styles.positive :
        isNegative ? styles.negative :
        ''
      }`}>
        {points > 0 ? `+${points}` : points}
      </div>
    </div>
  );
}
