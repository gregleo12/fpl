# K-163c: Zero-Sum Variance Luck Analysis

## Greg Lienart (Entry 2511225) - Season Luck Comparison

### K-163b (Result-Filtered): +1 luck
### K-163c (Zero-Sum): +12 luck

---

## What Changed: Variance Luck Calculation

### Old (K-163b) - Result-Filtered Logic:
```typescript
let luck = 0;
if (result === 'win') {
  luck = Math.max(0, -normalized);  // Only positive if negative swing
} else if (result === 'loss') {
  luck = Math.min(0, normalized);   // Only negative if negative swing
} else {
  luck = -normalized * 0.5;
}
return luck * 10 * 0.6;
```

**Problem**: NOT zero-sum. Variance luck could be 0 for both players in a match.

### New (K-163c) - Zero-Sum Logic:
```typescript
return normalized * 10 * 0.6;  // Direct calculation
```

**Benefit**: Truly zero-sum. Your luck + opponent luck = 0 for every match.

---

## Biggest Changes

### GW7: 82-55 Win vs Olivier Dufrasne (chip)
- **Old**: +2.37 (Rank: 0.37, Variance: 0.00, Chip: +2)
- **New**: +6.25 (Rank: 0.37, Variance: +3.89, Chip: +2)
- **Why**: You had massive swing (+20.6), opponent minimal (+1.1)
- **Net swing**: +19.4 points in your favor = **LUCKY**

### GW4: 85-67 Win vs Hadrien van Doosselaere
- **Old**: +0.11 (Rank: 0.11, Variance: 0.00)
- **New**: +2.61 (Rank: 0.11, Variance: +2.50)
- **Why**: You had +22.8 swing, opponent +10.3
- **Net swing**: +12.5 points in your favor = **LUCKY**

### GW14: 74-67 Win vs Antoine Mouchati
- **Old**: +1.37 (Rank: 0.37, Variance: +0.50)
- **New**: -0.63 (Rank: 0.37, Variance: -1.00)
- **Why**: You had +14.1 swing, opponent +19.1 swing
- **Net swing**: -5.0 against you = **UNLUCKY** (despite winning!)

### GW15: 62-61 Win vs Sorivan Chhem-Kieth
- **Old**: +1.63 (Rank: 0.58, Variance: +0.53)
- **New**: -0.47 (Rank: 0.58, Variance: -1.05)
- **Why**: You had +1.7 swing, opponent +7.0 swing
- **Net swing**: -5.3 against you = **UNLUCKY** (despite winning!)

---

## Key Insight: You Can Win and Still Be Unlucky

### GW14 Example:
- You: 74 pts (avg 59.9) = +14.1 above average
- Them: 67 pts (avg 47.9) = +19.1 above average
- **Result**: You won by 7 points
- **Variance Luck**: -1.00 (UNLUCKY)

**Why unlucky?** Your opponent had a BIGGER performance boost relative to their average than you did. If both had played to average, you would have won by 12 points (59.9 vs 47.9). Instead, you only won by 7 because they outperformed more.

This is the essence of **variance luck** - it's not about winning/losing, it's about **relative form timing**.

---

## Zero-Sum Property

For every match, the variance luck values are perfectly opposite:

### GW7 Example:
- **Your variance**: +3.89 (net swing = +19.4)
- **Opponent's variance**: -3.89 (net swing = -19.4)
- **Sum**: 0.00 ✓

This ensures league-wide balance - one player's good variance timing is another's bad timing.

---

## Why Your Luck Increased (+1 → +12)

The old formula **suppressed positive variance luck** when you won:
- If you won WITH a positive swing, it gave you 0 variance luck
- It only rewarded you if you won DESPITE a negative swing

The new formula **correctly captures all variance**:
- GW7: Huge positive swing while winning = +3.89 (was 0.00)
- GW4: Strong positive swing while winning = +2.50 (was 0.00)
- GW10: Moderate positive swing while winning = +1.00 (was 0.00)

These weren't being counted before, but they ARE luck - you had better form timing than your opponents in those weeks.

---

## Summary

The zero-sum variance calculation is **more mathematically correct**:
1. Ensures league-wide balance (total variance luck = 0)
2. Captures all form timing, not just negative swings
3. Allows you to be "unlucky" even when winning (GW14, GW15)
4. Properly rewards positive form timing (GW7, GW4)

Your +12 luck reflects that you've had **better form timing** than your opponents across the season, particularly in GW4, GW7, and GW10 where you peaked at the right moments.
