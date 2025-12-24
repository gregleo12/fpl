import styles from './NotificationBadge.module.css';

interface NotificationBadgeProps {
  show: boolean;
}

export function NotificationBadge({ show }: NotificationBadgeProps) {
  if (!show) return null;

  return <span className={styles.badge} />;
}
