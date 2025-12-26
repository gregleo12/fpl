'use client';

import styles from './AwardCard.module.css';
import {
  Trophy,
  TrendingUp,
  Target,
  Clover,
  Users,
  Zap,
  Star,
  Flame
} from 'lucide-react';
import type { AwardData } from './Awards';

interface Props {
  award: AwardData;
  leagueId: string;
  monthName: string;
}

// Map award categories to icons
function getAwardIcon(category: string) {
  switch (category) {
    case 'top_scorer':
      return <Trophy size={32} />;
    case 'best_form':
      return <TrendingUp size={32} />;
    case 'most_consistent':
      return <Target size={32} />;
    case 'luckiest':
      return <Clover size={32} />;
    case 'best_bench':
      return <Users size={32} />;
    case 'chip_master':
      return <Zap size={32} />;
    case 'captain_king':
      return <Star size={32} />;
    case 'longest_streak':
      return <Flame size={32} />;
    default:
      return <Trophy size={32} />;
  }
}

// Map award categories to display names
function getAwardName(category: string): string {
  switch (category) {
    case 'top_scorer':
      return 'Top Scorer';
    case 'best_form':
      return 'Best Form';
    case 'most_consistent':
      return 'Most Consistent';
    case 'luckiest':
      return 'Luckiest';
    case 'best_bench':
      return 'Best Bench Manager';
    case 'chip_master':
      return 'Chip Master';
    case 'captain_king':
      return 'Captain King';
    case 'longest_streak':
      return 'Longest Streak';
    default:
      return category;
  }
}

// Format value based on award type
function formatValue(category: string, value: number | string): string {
  if (typeof value === 'string') return value;

  switch (category) {
    case 'top_scorer':
    case 'captain_king':
      return `${value} pts`;
    case 'best_form':
      return `${value} pts (Last 5)`;
    case 'most_consistent':
      return `±${value} pts`;
    case 'luckiest':
      return value > 0 ? `+${value} pts` : `${value} pts`;
    case 'best_bench':
      return `${value}%`;
    case 'longest_streak':
      return `${value} wins`;
    default:
      return String(value);
  }
}

export function AwardCard({ award, leagueId, monthName }: Props) {
  const handleShare = () => {
    if (!award.winner) return;

    const awardName = getAwardName(award.category);
    const value = formatValue(award.category, award.winner.value);

    const message = `🏆 ${monthName} Award: ${awardName}\n\n` +
      `Winner: ${award.winner.team_name}\n` +
      `Manager: ${award.winner.player_name}\n` +
      `${value}\n\n` +
      `#RivalFPL`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Handle empty state (no winner)
  if (!award.winner) {
    return (
      <div className={styles.card}>
        <div className={styles.iconContainer}>
          {getAwardIcon(award.category)}
        </div>
        <h3 className={styles.awardName}>{getAwardName(award.category)}</h3>
        <div className={styles.noWinner}>
          <p>No award winner</p>
          <p className={styles.noWinnerSubtext}>Insufficient data</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      {/* Icon */}
      <div className={styles.iconContainer}>
        {getAwardIcon(award.category)}
      </div>

      {/* Award Name */}
      <h3 className={styles.awardName}>{getAwardName(award.category)}</h3>

      {/* Winner Info */}
      <div className={styles.winnerInfo}>
        <p className={styles.teamName}>{award.winner.team_name}</p>
        <p className={styles.managerName}>{award.winner.player_name}</p>
        <p className={styles.value}>
          {formatValue(award.category, award.winner.value)}
        </p>
      </div>

      {/* Share Button */}
      <button className={styles.shareButton} onClick={handleShare}>
        Share on WhatsApp
      </button>
    </div>
  );
}
