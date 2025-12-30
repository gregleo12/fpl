import styles from './LuckMethodology.module.css';

interface LuckMethodologyProps {
  weights: {
    gw_luck: { variance: number; rank: number };
    season_luck: { variance: number; rank: number; schedule: number; chip: number };
  };
}

export default function LuckMethodology({ weights }: LuckMethodologyProps) {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>How Luck Is Calculated</h3>

      <p className={styles.intro}>
        Your Season Luck Index combines four independent factors, each measuring a different aspect of fortune:
      </p>

      <div className={styles.components}>
        {/* Variance Luck */}
        <div className={styles.component}>
          <div className={styles.componentHeader}>
            <span className={styles.icon}>📊</span>
            <h4 className={styles.componentTitle}>Variance Luck</h4>
            <span className={styles.badge}>{(weights.season_luck.variance * 100).toFixed(0)}% weight</span>
          </div>
          <p className={styles.componentDesc}>
            Measures whether you peaked at the right time. Did you score big when your opponent struggled,
            or did both of you have great weeks (wasting your high score)?
          </p>
          <div className={styles.example}>
            <strong>Example:</strong> You score 80 (20 above your average) while your opponent scores 50
            (10 below their average). That's lucky! You got a 30-point swing in your favor.
          </div>
          <div className={styles.property}>
            <strong>Property:</strong> Zero-sum per match (your luck + opponent's luck = 0)
          </div>
        </div>

        {/* Rank Luck */}
        <div className={styles.component}>
          <div className={styles.componentHeader}>
            <span className={styles.icon}>🎯</span>
            <h4 className={styles.componentTitle}>Rank Luck</h4>
            <span className={styles.badge}>{(weights.season_luck.rank * 100).toFixed(0)}% weight</span>
          </div>
          <p className={styles.componentDesc}>
            Based on your GW rank, what % of managers would you be expected to beat?
            If you're 2nd in the league that week, you should beat most opponents.
            If you're 18th, you probably shouldn't win.
          </p>
          <div className={styles.example}>
            <strong>Example:</strong> Ranked 18th out of 20 (expected 5% win chance), but you WIN your match.
            That's +0.95 luck! You got lucky to face one of the few managers who scored even worse.
          </div>
          <div className={styles.property}>
            <strong>Property:</strong> NOT zero-sum (league-wide performance matters)
          </div>
        </div>

        {/* Schedule Luck */}
        <div className={styles.component}>
          <div className={styles.componentHeader}>
            <span className={styles.icon}>📅</span>
            <h4 className={styles.componentTitle}>Schedule Luck</h4>
            <span className={styles.badge}>{(weights.season_luck.schedule * 100).toFixed(0)}% weight</span>
          </div>
          <p className={styles.componentDesc}>
            Have you faced weaker or stronger opponents than your theoretical average?
            Compared to YOUR expected opponent pool (all managers except yourself).
          </p>
          <div className={styles.example}>
            <strong>Example:</strong> Your theoretical opponent average is 57.5 pts/GW, but you've actually
            faced opponents averaging 54.3 pts/GW. That's +3.2 pts easier schedule across 18 GWs = lucky!
          </div>
          <div className={styles.property}>
            <strong>Property:</strong> Zero-sum (someone's easy schedule = another's hard schedule)
          </div>
        </div>

        {/* Chip Luck */}
        <div className={styles.component}>
          <div className={styles.componentHeader}>
            <span className={styles.icon}>🎰</span>
            <h4 className={styles.componentTitle}>Chip Luck</h4>
            <span className={styles.badge}>{(weights.season_luck.chip * 100).toFixed(0)}% weight</span>
          </div>
          <p className={styles.componentDesc}>
            How many chips (Triple Captain, Bench Boost, Free Hit, Wildcard) have opponents played against you
            compared to league average?
          </p>
          <div className={styles.example}>
            <strong>Example:</strong> League average is 3.65 chips faced. You've faced 4 chips.
            That's 0.35 more than average × 7 pts/chip = -2.45 luck (unlucky to face more boosted opponents).
          </div>
          <div className={styles.property}>
            <strong>Property:</strong> Zero-sum (total chips played = total chips faced)
          </div>
        </div>
      </div>

      {/* Formula Breakdown */}
      <div className={styles.formulaSection}>
        <h4 className={styles.formulaTitle}>The Complete Formula</h4>
        <div className={styles.formulaBox}>
          <div className={styles.formulaLine}>
            <strong>Season Luck Index</strong> =
          </div>
          <div className={styles.formulaLine}>
            &nbsp;&nbsp;(Variance ÷ 10) × {weights.season_luck.variance}
          </div>
          <div className={styles.formulaLine}>
            + (Rank × 1) × {weights.season_luck.rank}
          </div>
          <div className={styles.formulaLine}>
            + (Schedule ÷ 5) × {weights.season_luck.schedule}
          </div>
          <div className={styles.formulaLine}>
            + (Chip ÷ 3) × {weights.season_luck.chip}
          </div>
        </div>
        <p className={styles.formulaNote}>
          Components are normalized to comparable scales before weighting.
        </p>
      </div>

      {/* Interpretation Guide */}
      <div className={styles.interpretation}>
        <h4 className={styles.interpretationTitle}>What Do The Numbers Mean?</h4>
        <div className={styles.interpretationGrid}>
          <div className={styles.interpretationItem}>
            <span className={styles.interpretationRange}>+3.0 to +5.0</span>
            <span className={styles.interpretationLabel}>Very Lucky 🍀🍀🍀</span>
          </div>
          <div className={styles.interpretationItem}>
            <span className={styles.interpretationRange}>+1.0 to +3.0</span>
            <span className={styles.interpretationLabel}>Lucky 🍀</span>
          </div>
          <div className={styles.interpretationItem}>
            <span className={styles.interpretationRange}>-1.0 to +1.0</span>
            <span className={styles.interpretationLabel}>Neutral</span>
          </div>
          <div className={styles.interpretationItem}>
            <span className={styles.interpretationRange}>-3.0 to -1.0</span>
            <span className={styles.interpretationLabel}>Unlucky ⛈️</span>
          </div>
          <div className={styles.interpretationItem}>
            <span className={styles.interpretationRange}>-5.0 to -3.0</span>
            <span className={styles.interpretationLabel}>Very Unlucky ⛈️⛈️⛈️</span>
          </div>
        </div>
      </div>
    </div>
  );
}
