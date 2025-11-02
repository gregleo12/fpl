import styles from './HitBadge.module.css';

interface HitBadgeProps {
  points: number; // -4, -8, -12, etc.
}

export function HitBadge({ points }: HitBadgeProps) {
  if (points >= 0) return null;

  return (
    <span className={styles.hitBadge}>
      {points}
    </span>
  );
}
