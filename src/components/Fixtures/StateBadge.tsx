import styles from './StateBadge.module.css';

export type FixtureStatus = 'upcoming' | 'in_progress' | 'completed';

interface StateBadgeProps {
  status: FixtureStatus;
}

export function StateBadge({ status }: StateBadgeProps) {
  const config = getStatusConfig(status);

  return (
    <div
      className={`${styles.badge} ${styles[status]}`}
      style={{
        '--badge-color': config.color,
        '--badge-bg': config.bgColor,
      } as React.CSSProperties}
    >
      <span className={styles.emoji}>{config.emoji}</span>
      <span className={styles.label}>{config.label}</span>
    </div>
  );
}

function getStatusConfig(status: FixtureStatus) {
  switch (status) {
    case 'in_progress':
      return {
        emoji: '🔴',
        label: 'LIVE',
        color: '#ff0066',
        bgColor: 'rgba(255, 0, 102, 0.15)',
      };
    case 'completed':
      return {
        emoji: '✅',
        label: 'COMPLETED',
        color: '#00ff87',
        bgColor: 'rgba(0, 255, 135, 0.15)',
      };
    case 'upcoming':
      return {
        emoji: '📅',
        label: 'UPCOMING',
        color: '#8b5cf6',
        bgColor: 'rgba(139, 92, 246, 0.15)',
      };
  }
}
