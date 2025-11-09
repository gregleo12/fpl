import styles from './CommonPlayers.module.css';

interface CommonPlayersProps {
  count: number;
  percentage: number;
  players: string[];
}

export function CommonPlayers({ count, percentage, players }: CommonPlayersProps) {
  if (count === 0) {
    return null;
  }

  return (
    <div className={styles.commonPlayersSection}>
      <div className={styles.commonPlayersHeader}>
        <span className={styles.commonPlayersEmoji}>⚡</span>
        <span className={styles.commonPlayersTitle}>
          COMMON PLAYERS ({count} shared - {percentage}% overlap)
        </span>
      </div>
      <div className={styles.commonPlayersList}>
        {players.map((player, i) => (
          <span key={i} className={styles.commonPlayer}>
            {player}
            {i < players.length - 1 && ' • '}
          </span>
        ))}
      </div>
    </div>
  );
}
