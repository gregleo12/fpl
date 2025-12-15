'use client';

import { Trophy, Crown, BarChart3, Skull } from 'lucide-react';
import type { WinnersData } from '../StatsHub';
import styles from './Section.module.css';

interface Props {
  data: WinnersData;
}

export function GameweekWinners({ data }: Props) {
  if (!data) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Trophy size={18} color="#00ff87" /> Gameweek Winners
        </h3>
        <div className={styles.noData}>Data not available - visit Rankings to sync</div>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Trophy size={18} color="#00ff87" /> Gameweek Winners
      </h3>
      <div className={styles.subtitle}>
        Highest and lowest scoring managers
      </div>
      <div className={styles.winnersGrid}>
        {data.highest_score && (
          <div className={styles.winnerCard}>
            <div className={styles.winnerBadge} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <Crown size={16} /> Highest
            </div>
            <div className={styles.winnerName}>{data.highest_score.player_name}</div>
            <div className={styles.winnerTeam}>{data.highest_score.team_name}</div>
            <div className={styles.winnerScore}>{data.highest_score.score} pts</div>
          </div>
        )}

        <div className={styles.winnerCard}>
          <div className={styles.winnerBadge} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <BarChart3 size={16} /> Average
          </div>
          <div className={styles.winnerScore}>{data.average_score.toFixed(1)} pts</div>
        </div>

        {data.lowest_score && (
          <div className={styles.winnerCard}>
            <div className={styles.winnerBadge} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <Skull size={16} /> Lowest
            </div>
            <div className={styles.winnerName}>{data.lowest_score.player_name}</div>
            <div className={styles.winnerTeam}>{data.lowest_score.team_name}</div>
            <div className={styles.winnerScore}>{data.lowest_score.score} pts</div>
          </div>
        )}
      </div>
    </div>
  );
}
