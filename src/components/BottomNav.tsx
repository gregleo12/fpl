'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './BottomNav.module.css';

export default function BottomNav() {
  const pathname = usePathname();

  // Extract leagueId from pathname (e.g., /league/804742 or /league/804742/player/123)
  const leagueMatch = pathname?.match(/^\/league\/(\d+)/);
  const leagueId = leagueMatch ? leagueMatch[1] : null;

  // Only show nav if we're in a league route
  if (!leagueId) {
    return null;
  }

  const isLeague = pathname === `/league/${leagueId}`;
  const isPlayer = pathname?.includes('/player/');

  return (
    <nav className={styles.bottomNav}>
      <Link href={`/league/${leagueId}`} className={`${styles.navItem} ${isLeague ? styles.active : ''}`}>
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className={styles.label}>League</span>
      </Link>

      <div className={`${styles.navItem} ${styles.disabled}`}>
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className={styles.label}>My Stats</span>
      </div>
    </nav>
  );
}
