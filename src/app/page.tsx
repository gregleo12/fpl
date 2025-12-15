'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadState } from '@/lib/storage';
import LeagueInput from '@/components/SetupFlow/LeagueInput';
import styles from './landing.module.css';

export default function Landing() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has saved state
    const savedState = loadState();

    if (savedState) {
      // User has saved league/team → redirect to dashboard
      router.push('/dashboard');
    } else {
      // No saved state → show setup
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.logo}>
          <span className={styles.logoRival}>Rival</span>
          <span className={styles.logoSlash}>/</span>
          <span className={styles.logoFPL}>FPL</span>
        </div>
        <h1 className={styles.title}>FPL H2H Analytics</h1>
        <p className={styles.subtitle}>Track your Head-to-Head league performance</p>
        <LeagueInput />
      </main>
    </div>
  );
}
