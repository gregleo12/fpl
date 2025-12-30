# K-163b: Luck Weight Rebalancing Analysis

## Greg Lienart (Entry 2511225) - Season Luck Comparison

### Old Weights (50/30/20): +13 luck → rounds to **+10**
### New Weights (20/60/20): +1 luck → rounds to **+1**

---

## Most Impacted Gameweeks

### GW5: 39-34 Win (vs Guillaume de Posson)
- **Old**: +3.70 luck (Rank: +3.68, Variance: +0.02)
- **New**: +1.51 luck (Rank: +1.47, Variance: +0.04)
- **Impact**: Rank luck reduced by 60% (3.68 → 1.47)
- **Why**: You only outscored 5/19 teams but still won

### GW10: 69-59 Win (vs Manuel Abellan)
- **Old**: +3.42 luck (Rank: +3.42, Variance: +0.00)
- **New**: +1.37 luck (Rank: +1.37, Variance: +0.00)
- **Impact**: Rank luck reduced by 60% (3.42 → 1.37)
- **Why**: You only outscored 6/19 teams but still won

### GW18: 45-30 Win (vs Slim Ben Dekhil)
- **Old**: +3.89 luck (Rank: +3.89, Variance: +0.00)
- **New**: +1.56 luck (Rank: +1.56, Variance: +0.00)
- **Impact**: Rank luck reduced by 60% (3.89 → 1.56)
- **Why**: You only outscored 4/18 teams but still won

### GW9: 32-64 Loss (vs Adriaan Mertens)
- **Old**: -3.53 luck (Rank: -0.53, Variance: -3.00)
- **New**: -6.21 luck (Rank: -0.21, Variance: -6.00)
- **Impact**: Variance luck amplified (−3.00 → −6.00)
- **Why**: Massive negative swing (you -28.1, them +9.1 vs averages)

### GW6: 60-71 Loss (vs thomas lehardy)
- **Old**: -6.20 luck (Rank: -2.63, Variance: -1.57, Chip: -2.00)
- **New**: -6.19 luck (Rank: -1.05, Variance: -3.14, Chip: -2.00)
- **Impact**: Variance contribution doubled (−1.57 → −3.14)
- **Why**: They had +17.7 swing vs their average, you had +2.0

---

## Why This Makes More Sense for H2H

### Problem with Old Weights (50% Rank Luck)
- **Rank Luck** compares your score against all 19 other teams in the league
- In H2H, you only need to beat **one specific opponent**, not the whole league
- Winning 45-30 is a **deserved win**, even if 14 other teams scored higher than you
- Old formula over-rewarded low-scoring wins as "lucky"

### Solution with New Weights (60% Variance Luck)
- **Variance Luck** compares both you and your opponent against your season averages
- Captures true H2H performance: "Did you both play to form, or was there a timing swing?"
- GW9 loss now properly reflects unlucky timing: you had worst GW (-28 vs avg) when opponent had best GW (+9 vs avg)
- Emphasizes what matters in H2H: relative performance vs expectations

---

## Impact on Rankings

With new weights:
- You went from **+10** (most lucky) to **+1** (neutral/slightly lucky)
- More accurate reflection: leading in points AND H2H standings = skill, not luck
- Variance-heavy formula better captures the "timing is everything" aspect of H2H matchups
- Chip luck remains at 20% - correctly captures opponent chip decisions affecting your result

---

## Recommendation

**Deploy K-163b weights (20/60/20)** to production. This better represents H2H luck by:
1. Reducing over-emphasis on league-wide rank comparisons (50% → 20%)
2. Emphasizing performance variance and timing (30% → 60%)
3. Maintaining chip impact (20%)

The formula now correctly identifies that:
- Leading in both points and H2H = skill, not luck (+1 vs +10)
- Massive form swings at wrong times = unlucky (GW9: -6.21)
- Beating chipped opponents = lucky (GW7/13/17: +2 each)
