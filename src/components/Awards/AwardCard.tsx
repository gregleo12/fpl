import styles from './AwardCard.module.css';

interface AwardCardProps {
  type: 'positive' | 'negative';
  icon: string;
  title: string;
  subtitle: string;
  winner: {
    manager: string;
    team: string;
    value: string;
  } | null;
}

export function AwardCard({ type, icon, title, subtitle, winner }: AwardCardProps) {
  return (
    <div className={`${styles.awardCard} ${styles[type]}`}>
      {/* Header */}
      <div className={styles.cardHeader}>
        <div className={styles.iconContainer}>
          <span className={styles.icon}>{icon}</span>
        </div>
        <div className={styles.titleContainer}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
      </div>

      {/* Winner */}
      <div className={styles.winnerSection}>
        {winner ? (
          <>
            <div className={styles.managerName}>{winner.manager}</div>
            <div className={styles.teamName}>{winner.team}</div>
            <div className={styles.value}>{winner.value}</div>
          </>
        ) : (
          <div className={styles.noWinner}>No data available</div>
        )}
      </div>
    </div>
  );
}
