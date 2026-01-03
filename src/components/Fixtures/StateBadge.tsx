import styles from './StateBadge.module.css';

export type FixtureStatus = 'upcoming' | 'live' | 'completed';

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
      <span className={styles.label}>{config.label}</span>
    </div>
  );
}

function getStatusConfig(status: FixtureStatus) {
  switch (status) {
    case 'live':
      return {
        label: 'LIVE',
        color: '#ff0066',
        bgColor: 'rgba(255, 0, 102, 0.15)',
      };
    case 'completed':
      return {
        label: 'COMPLETED',
        color: 'rgba(255, 255, 255, 0.5)',
        bgColor: 'rgba(255, 255, 255, 0.05)',
      };
    case 'upcoming':
      return {
        label: 'UPCOMING',
        color: '#8b5cf6',
        bgColor: 'rgba(139, 92, 246, 0.15)',
      };
  }
}
