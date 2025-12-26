'use client';

import styles from './AwardCard.module.css';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Target,
  Clover,
  Users,
  Star,
  Award
} from 'lucide-react';

export interface AwardWinner {
  entry_id: number;
  player_name: string;
  team_name: string;
  value: number;
  formatted_value: string;
  gameweek?: number;
}

export interface AwardData {
  category: string;
  best: AwardWinner | null;
  worst: AwardWinner | null;
}

interface Props {
  award: AwardData;
}

// Map award categories to icons
function getAwardIcon(category: string) {
  switch (category) {
    case 'top_scorer':
      return <Trophy size={32} />;
    case 'best_gameweek':
      return <Award size={32} />;
    case 'form':
      return <TrendingUp size={32} />;
    case 'consistency':
      return <Target size={32} />;
    case 'luck':
      return <Clover size={32} />;
    case 'captain':
      return <Star size={32} />;
    case 'bench':
      return <Users size={32} />;
    default:
      return <Trophy size={32} />;
  }
}

// Map award categories to display names
function getAwardTitle(category: string): string {
  switch (category) {
    case 'top_scorer':
      return 'Scorer';
    case 'best_gameweek':
      return 'Gameweek';
    case 'form':
      return 'Form';
    case 'consistency':
      return 'Consistency';
    case 'luck':
      return 'Luck';
    case 'captain':
      return 'Captain';
    case 'bench':
      return 'Bench';
    default:
      return category;
  }
}

export function AwardCard({ award }: Props) {
  // K-134: Dynamic labels for consistency (High/Low instead of Best/Worst)
  const getBestLabel = () => {
    if (award.category === 'consistency') {
      return '📊 HIGH';
    }
    return '👑 BEST';
  };

  const getWorstLabel = () => {
    if (award.category === 'consistency') {
      return '📈 LOW';
    }
    return '😅 WORST';
  };

  return (
    <div className={styles.card}>
      {/* Icon and Title */}
      <div className={styles.header}>
        <div className={styles.iconContainer}>
          {getAwardIcon(award.category)}
        </div>
        <h3 className={styles.awardTitle}>{getAwardTitle(award.category)}</h3>
      </div>

      {/* Best and Worst Winners Side by Side */}
      <div className={styles.winners}>
        {/* Best Winner */}
        <div className={styles.winnerColumn}>
          <div className={styles.winnerLabel}>
            <span className={styles.bestLabel}>{getBestLabel()}</span>
          </div>
          {award.best ? (
            <div className={styles.winnerInfo}>
              <p className={styles.teamName}>{award.best.team_name}</p>
              <p className={styles.managerName}>{award.best.player_name}</p>
              <p className={`${styles.value} ${styles.bestValue}`}>
                {award.best.formatted_value}
              </p>
              {award.best.gameweek && (
                <p className={styles.gameweek}>GW {award.best.gameweek}</p>
              )}
            </div>
          ) : (
            <div className={styles.noWinner}>
              <p>No data</p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className={styles.divider}></div>

        {/* Worst Winner */}
        <div className={styles.winnerColumn}>
          <div className={styles.winnerLabel}>
            <span className={styles.worstLabel}>{getWorstLabel()}</span>
          </div>
          {award.worst ? (
            <div className={styles.winnerInfo}>
              <p className={styles.teamName}>{award.worst.team_name}</p>
              <p className={styles.managerName}>{award.worst.player_name}</p>
              <p className={`${styles.value} ${styles.worstValue}`}>
                {award.worst.formatted_value}
              </p>
              {award.worst.gameweek && (
                <p className={styles.gameweek}>GW {award.worst.gameweek}</p>
              )}
            </div>
          ) : (
            <div className={styles.noWinner}>
              <p>No data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
