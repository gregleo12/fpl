'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AwardCard } from './AwardCard';
import styles from './AwardsPage.module.css';

interface Award {
  title: string;
  winner: {
    entry_id: number;
    player_name: string;
    team_name: string;
  };
  value: number;
  unit: string;
  description: string;
}

interface AwardCategory {
  category: string;
  icon: string;
  awards: Award[];
}

interface AwardsData {
  league_id: number;
  period: string;
  categories: AwardCategory[];
}

interface Props {
  leagueId: string;
}

export function AwardsPage({ leagueId }: Props) {
  const router = useRouter();
  const [awardsData, setAwardsData] = useState<AwardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const myTeamId = typeof window !== 'undefined'
    ? localStorage.getItem('myTeamId') || ''
    : '';

  useEffect(() => {
    async function fetchAwards() {
      try {
        setLoading(true);
        const response = await fetch(`/api/league/${leagueId}/awards`);

        if (!response.ok) {
          throw new Error('Failed to fetch awards data');
        }

        const result = await response.json();

        if (result.success) {
          setAwardsData(result.data);
        } else {
          throw new Error(result.error || 'Failed to load awards');
        }
      } catch (err) {
        console.error('Error fetching awards:', err);
        setError(err instanceof Error ? err.message : 'Failed to load awards');
      } finally {
        setLoading(false);
      }
    }

    fetchAwards();
  }, [leagueId]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => router.back()}>
            ← Back
          </button>
          <h1 className={styles.mainTitle}>
            <span className={styles.titleIcon}>🏆</span>
            Mid-Season Awards
          </h1>
          <div className={styles.period}>GW1-19</div>
        </div>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading awards...</p>
        </div>
      </div>
    );
  }

  if (error || !awardsData) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => router.back()}>
            ← Back
          </button>
          <h1 className={styles.mainTitle}>
            <span className={styles.titleIcon}>🏆</span>
            Mid-Season Awards
          </h1>
        </div>
        <div className={styles.error}>
          <p>{error || 'Failed to load awards'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => router.back()}>
          ← Back
        </button>
        <h1 className={styles.mainTitle}>
          <span className={styles.titleIcon}>🏆</span>
          Mid-Season Awards
        </h1>
        <div className={styles.period}>{awardsData.period}</div>
      </div>

      <div className={styles.intro}>
        <p>Celebrating the best (and most entertaining) performances of the first half of the season!</p>
      </div>

      <div className={styles.categories}>
        {awardsData.categories.map((category) => (
          <div key={category.category} className={styles.category}>
            <h2 className={styles.categoryTitle}>
              <span className={styles.categoryIcon}>{category.icon}</span>
              {category.category}
            </h2>
            <div className={styles.awardsGrid}>
              {category.awards.map((award) => (
                <AwardCard
                  key={award.title}
                  award={award}
                  myTeamId={myTeamId}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
