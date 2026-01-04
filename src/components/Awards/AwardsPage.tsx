'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AwardCard } from './AwardCard';
import { ModeToggle } from './ModeToggle';
import styles from './AwardsPage.module.css';
import {
  Crown, Target, Rocket, Home,
  TrendingUp, Flame, Shield, Zap, CloudLightning, Globe, ArrowDownCircle, Cog, Activity, TrendingDown,
  RefreshCw, Moon, Gem, Dumbbell, AlertTriangle,
  Star, Skull,
  Bomb, Trophy, Frown, HeartCrack, Timer,
  Coffee, FastForward, Armchair, Meh,
  Snowflake, AlertCircle, ThumbsDown,
  Wind, Award
} from 'lucide-react';
import WalkPreview from './WalkPreview';
import WalkTables from './WalkTables';

interface Award {
  title: string;
  winner: {
    entry_id: number;
    player_name: string;
    team_name: string;
  };
  winner_value: number;
  runner_up?: {
    entry_id: number;
    player_name: string;
    team_name: string;
  };
  runner_up_value?: number;
  third_place?: {
    entry_id: number;
    player_name: string;
    team_name: string;
  };
  third_place_value?: number;
  unit: string;
  description: string;
  isShame?: boolean;
}

interface AwardCategory {
  category: string;
  icon: string;
  awards: Award[];
}

interface MedalEntry {
  rank: number;
  entry_id: number;
  player_name: string;
  team_name: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
  score: number;
}

interface AwardsData {
  league_id: number;
  period: string;
  categories: AwardCategory[];
  walkOfFame?: MedalEntry[];
  walkOfShame?: MedalEntry[];
}

interface Props {
  leagueId: string;
}

// Award pair mappings (Fame → Shame)
const AWARD_PAIRS: Record<string, string> = {
  'King of the Hill': 'Basement Dweller',
  'Points Machine': 'Points Poverty',
  'Steady Eddie': 'Ice Cold',
  'On Fire': 'Ice Cold', // Ice Cold is shared by both Steady Eddie and On Fire
  'Captain Fantastic': 'Captain Calamity',
  'Gameweek God': 'Nightmare Week',
  'World Beater': 'Rock Bottom',
  'Mr. Reliable': 'Wild Ride',
  'Chip Wizard': 'Chip Flop',
  'Lucky Charm': 'Cursed Soul',
  'Rocket Man': 'Falling Star',
  'Demolition Expert': 'Demolished',
  'Nail Biter': 'Close But No Cigar',
  'Unstoppable Force': 'The Struggle Bus',
};

// Reverse mapping (Shame → Fame) - for filtering
const SHAME_TO_FAME: Record<string, string[]> = {};
Object.entries(AWARD_PAIRS).forEach(([fame, shame]) => {
  if (!SHAME_TO_FAME[shame]) {
    SHAME_TO_FAME[shame] = [];
  }
  SHAME_TO_FAME[shame].push(fame);
});

// Fame and Shame award names
const FAME_AWARDS = new Set(Object.keys(AWARD_PAIRS));
const SHAME_AWARDS = new Set(Object.values(AWARD_PAIRS));

// Icon mapping function
function getAwardIcon(title: string) {
  const iconMap: { [key: string]: JSX.Element } = {
    // The Big Ones
    'King of the Hill': <Crown size={20} />,
    'Basement Dweller': <Home size={20} />,
    'Points Machine': <Target size={20} />,
    'Points Poverty': <TrendingDown size={20} />,
    'Rocket Man': <Rocket size={20} />,

    // Performance
    'Steady Eddie': <TrendingUp size={20} />,
    'Roller Coaster': <Wind size={20} />,
    'On Fire': <Flame size={20} />,
    'Ice Cold': <Snowflake size={20} />,
    'Captain Fantastic': <Shield size={20} />,
    'Captain Calamity': <AlertCircle size={20} />,
    'Gameweek God': <Zap size={20} />,
    'Nightmare Week': <CloudLightning size={20} />,
    'Falling Star': <TrendingDown size={20} />,
    'World Beater': <Globe size={20} />,
    'Rock Bottom': <ArrowDownCircle size={20} />,
    'Mr. Reliable': <Activity size={20} />,
    'Wild Ride': <AlertTriangle size={20} />,

    // Strategy
    'Transfer Addict': <RefreshCw size={20} />,
    'The Sleeper': <Moon size={20} />,
    'Chip Wizard': <Gem size={20} />,
    'Chip Flop': <ThumbsDown size={20} />,
    'Raw Talent': <Dumbbell size={20} />,
    'Point Chaser': <Cog size={20} />,

    // Luck
    'Lucky Charm': <Star size={20} />,
    'Cursed Soul': <Skull size={20} />,
    'Bench Boss': <Award size={20} />,

    // H2H Battle
    'Early Dominator': <Trophy size={20} />,
    'The Underdog': <Star size={20} />,
    'Demolition Expert': <Bomb size={20} />,
    'Demolished': <Skull size={20} />,
    'Nail Biter': <Timer size={20} />,
    'Unstoppable Force': <Trophy size={20} />,
    'The Struggle Bus': <Frown size={20} />,
    'Close But No Cigar': <HeartCrack size={20} />,

    // Fun
    'Slow Starter': <Coffee size={20} />,
    'Second Half Surge': <FastForward size={20} />,
    'Bench Warmer': <Armchair size={20} />,
    'Mr. Average': <Meh size={20} />,
  };

  return iconMap[title] || null;
}

// Filter awards based on mode
function getVisibleAwards(awards: Award[], mode: 'fame' | 'shame'): Award[] {
  const seenTitles = new Set<string>();

  return awards.filter(award => {
    // Skip duplicates (e.g., Ice Cold appears only once in shame mode)
    if (seenTitles.has(award.title)) {
      return false;
    }

    const isFame = FAME_AWARDS.has(award.title);
    const isShame = SHAME_AWARDS.has(award.title);

    // Standalone awards (not in any pair): always show
    if (!isFame && !isShame) {
      seenTitles.add(award.title);
      return true;
    }

    // Paired awards: show based on mode
    if (mode === 'fame' && isFame) {
      seenTitles.add(award.title);
      return true;
    }

    if (mode === 'shame' && isShame) {
      seenTitles.add(award.title);
      return true;
    }

    return false;
  });
}

export function AwardsPage({ leagueId }: Props) {
  const router = useRouter();
  const [awardsData, setAwardsData] = useState<AwardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'fame' | 'shame'>('fame');

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

      {/* Walk of Fame & Shame Preview (Top 3) - Always Visible */}
      {awardsData.walkOfFame && awardsData.walkOfShame && (
        <WalkPreview
          fame={awardsData.walkOfFame}
          shame={awardsData.walkOfShame}
          myTeamId={myTeamId}
        />
      )}

      {/* Global Mode Toggle */}
      <ModeToggle mode={mode} onChange={setMode} />

      {/* Award Categories - Filtered by Mode */}
      <div className={styles.categories}>
        {awardsData.categories.map((category) => {
          const visibleAwards = getVisibleAwards(category.awards, mode);

          // Skip empty categories
          if (visibleAwards.length === 0) {
            return null;
          }

          return (
            <div key={category.category} className={styles.category}>
              <h2 className={styles.categoryTitle}>
                <span className={styles.categoryIcon}>{category.icon}</span>
                {category.category}
              </h2>
              <div className={styles.awardsGrid}>
                {visibleAwards.map((award) => (
                  <AwardCard
                    key={award.title}
                    award={award}
                    myTeamId={myTeamId}
                    icon={getAwardIcon(award.title)}
                    isShame={award.isShame}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Walk of Fame & Shame Tables (Full Rankings) - Always Visible */}
      {awardsData.walkOfFame && awardsData.walkOfShame && (
        <WalkTables
          fame={awardsData.walkOfFame}
          shame={awardsData.walkOfShame}
          myTeamId={myTeamId}
        />
      )}
    </div>
  );
}
