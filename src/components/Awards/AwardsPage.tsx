'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AwardCard } from './AwardCard';
import { AwardCardToggle } from './AwardCardToggle';
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

      {/* Walk of Fame & Shame Preview (Top 3) */}
      {awardsData.walkOfFame && awardsData.walkOfShame && (
        <WalkPreview
          fame={awardsData.walkOfFame}
          shame={awardsData.walkOfShame}
          myTeamId={myTeamId}
        />
      )}

      <div className={styles.categories}>
        {awardsData.categories.map((category) => {
          // Special handling for "The Big Ones" - use toggle pairs
          if (category.category === 'The Big Ones') {
            // Pair up awards: King/Basement, Points Machine/Poverty
            const kingAward = category.awards.find(a => a.title === 'King of the Hill');
            const basementAward = category.awards.find(a => a.title === 'Basement Dweller');
            const machineAward = category.awards.find(a => a.title === 'Points Machine');
            const povertyAward = category.awards.find(a => a.title === 'Points Poverty');

            return (
              <div key={category.category} className={styles.category}>
                <h2 className={styles.categoryTitle}>
                  <span className={styles.categoryIcon}>{category.icon}</span>
                  {category.category}
                </h2>
                <div className={styles.awardsGrid}>
                  {kingAward && basementAward && (
                    <AwardCardToggle
                      fameAward={kingAward}
                      shameAward={basementAward}
                      myTeamId={myTeamId}
                      fameIcon={getAwardIcon('King of the Hill')}
                      shameIcon={getAwardIcon('Basement Dweller')}
                    />
                  )}
                  {machineAward && povertyAward && (
                    <AwardCardToggle
                      fameAward={machineAward}
                      shameAward={povertyAward}
                      myTeamId={myTeamId}
                      fameIcon={getAwardIcon('Points Machine')}
                      shameIcon={getAwardIcon('Points Poverty')}
                    />
                  )}
                </div>
              </div>
            );
          }

          // Special handling for Performance section
          if (category.category === 'Performance') {
            const togglePairs = [
              { fame: 'Steady Eddie', shame: 'Roller Coaster' },
              { fame: 'On Fire', shame: 'Ice Cold' },
              { fame: 'Captain Fantastic', shame: 'Captain Calamity' },
            ];

            const toggleAwards: JSX.Element[] = [];
            const standaloneAwards: Award[] = [];

            const usedTitles = new Set<string>();

            // Find toggle pairs
            togglePairs.forEach(pair => {
              const fameAward = category.awards.find(a => a.title === pair.fame);
              const shameAward = category.awards.find(a => a.title === pair.shame);
              if (fameAward && shameAward) {
                toggleAwards.push(
                  <AwardCardToggle
                    key={pair.fame}
                    fameAward={fameAward}
                    shameAward={shameAward}
                    myTeamId={myTeamId}
                    fameIcon={getAwardIcon(pair.fame)}
                    shameIcon={getAwardIcon(pair.shame)}
                  />
                );
                usedTitles.add(pair.fame);
                usedTitles.add(pair.shame);
              }
            });

            // Collect standalone awards
            category.awards.forEach(award => {
              if (!usedTitles.has(award.title)) {
                standaloneAwards.push(award);
              }
            });

            return (
              <div key={category.category} className={styles.category}>
                <h2 className={styles.categoryTitle}>
                  <span className={styles.categoryIcon}>{category.icon}</span>
                  {category.category}
                </h2>
                <div className={styles.awardsGrid}>
                  {toggleAwards}
                  {standaloneAwards.map((award) => (
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
          }

          // Special handling for Strategy section
          if (category.category === 'Strategy') {
            const togglePairs = [
              { fame: 'Chip Wizard', shame: 'Chip Flop' },
            ];

            const toggleAwards: JSX.Element[] = [];
            const standaloneAwards: Award[] = [];

            const usedTitles = new Set<string>();

            // Find toggle pairs
            togglePairs.forEach(pair => {
              const fameAward = category.awards.find(a => a.title === pair.fame);
              const shameAward = category.awards.find(a => a.title === pair.shame);
              if (fameAward && shameAward) {
                toggleAwards.push(
                  <AwardCardToggle
                    key={pair.fame}
                    fameAward={fameAward}
                    shameAward={shameAward}
                    myTeamId={myTeamId}
                    fameIcon={getAwardIcon(pair.fame)}
                    shameIcon={getAwardIcon(pair.shame)}
                  />
                );
                usedTitles.add(pair.fame);
                usedTitles.add(pair.shame);
              }
            });

            // Collect standalone awards
            category.awards.forEach(award => {
              if (!usedTitles.has(award.title)) {
                standaloneAwards.push(award);
              }
            });

            return (
              <div key={category.category} className={styles.category}>
                <h2 className={styles.categoryTitle}>
                  <span className={styles.categoryIcon}>{category.icon}</span>
                  {category.category}
                </h2>
                <div className={styles.awardsGrid}>
                  {toggleAwards}
                  {standaloneAwards.map((award) => (
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
          }

          // Special handling for H2H Battle section
          if (category.category === 'H2H Battle') {
            const togglePairs = [
              { fame: 'Rocket Man', shame: 'Falling Star' },
              { fame: 'Demolition Expert', shame: 'Demolished' },
            ];

            const toggleAwards: JSX.Element[] = [];
            const standaloneAwards: Award[] = [];

            const usedTitles = new Set<string>();

            // Find toggle pairs
            togglePairs.forEach(pair => {
              const fameAward = category.awards.find(a => a.title === pair.fame);
              const shameAward = category.awards.find(a => a.title === pair.shame);
              if (fameAward && shameAward) {
                toggleAwards.push(
                  <AwardCardToggle
                    key={pair.fame}
                    fameAward={fameAward}
                    shameAward={shameAward}
                    myTeamId={myTeamId}
                    fameIcon={getAwardIcon(pair.fame)}
                    shameIcon={getAwardIcon(pair.shame)}
                  />
                );
                usedTitles.add(pair.fame);
                usedTitles.add(pair.shame);
              }
            });

            // Collect standalone awards
            category.awards.forEach(award => {
              if (!usedTitles.has(award.title)) {
                standaloneAwards.push(award);
              }
            });

            return (
              <div key={category.category} className={styles.category}>
                <h2 className={styles.categoryTitle}>
                  <span className={styles.categoryIcon}>{category.icon}</span>
                  {category.category}
                </h2>
                <div className={styles.awardsGrid}>
                  {toggleAwards}
                  {standaloneAwards.map((award) => (
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
          }

          // Special handling for Luck section
          if (category.category === 'Luck') {
            const togglePairs = [
              { fame: 'Lucky Charm', shame: 'Cursed Soul' },
            ];

            const toggleAwards: JSX.Element[] = [];
            const standaloneAwards: Award[] = [];

            const usedTitles = new Set<string>();

            // Find toggle pairs
            togglePairs.forEach(pair => {
              const fameAward = category.awards.find(a => a.title === pair.fame);
              const shameAward = category.awards.find(a => a.title === pair.shame);
              if (fameAward && shameAward) {
                toggleAwards.push(
                  <AwardCardToggle
                    key={pair.fame}
                    fameAward={fameAward}
                    shameAward={shameAward}
                    myTeamId={myTeamId}
                    fameIcon={getAwardIcon(pair.fame)}
                    shameIcon={getAwardIcon(pair.shame)}
                  />
                );
                usedTitles.add(pair.fame);
                usedTitles.add(pair.shame);
              }
            });

            // Collect standalone awards
            category.awards.forEach(award => {
              if (!usedTitles.has(award.title)) {
                standaloneAwards.push(award);
              }
            });

            return (
              <div key={category.category} className={styles.category}>
                <h2 className={styles.categoryTitle}>
                  <span className={styles.categoryIcon}>{category.icon}</span>
                  {category.category}
                </h2>
                <div className={styles.awardsGrid}>
                  {toggleAwards}
                  {standaloneAwards.map((award) => (
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
          }

          // Default rendering for other categories
          return (
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
                    icon={getAwardIcon(award.title)}
                    isShame={award.isShame}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Walk of Fame & Shame Tables (Full Rankings) */}
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
