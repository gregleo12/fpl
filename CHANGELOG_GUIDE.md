# Changelog Maintenance Guide

**Purpose:** Guidelines for maintaining `/src/data/changelog.json` - the user-facing "What's New" page.

**Last Updated:** December 24, 2025

---

## Core Principles

### 1. User-Focused, Not Developer-Focused

**Do:**
- "Fixed score calculations across all screens"
- "Added automatic data sync"
- "Improved app performance and reliability"

**Don't:**
- "Migrated to K-108c architecture"
- "Refactored scoreCalculator.ts"
- "Added K-112 integration"

### 2. Production Deployments Only

**Include:**
- Versions deployed to production (`main` branch)
- Changes users can see or benefit from
- Bug fixes that affected user experience

**Exclude:**
- Staging-only versions
- Internal refactors (unless they improve UX)
- Debug commits
- Documentation-only updates

### 3. Maximum One Entry Per Day

**Rules:**
- If multiple versions deployed same day, group them into ONE entry
- Use the **highest version number** from that day
- Combine all user-facing changes into one list
- Order changes by importance (most impactful first)

**Example:**

❌ **Wrong:**
```json
{
  "version": "4.0.3",
  "date": "2024-12-24",
  "title": "Feedback Banner",
  "changes": ["Added feedback banner"]
},
{
  "version": "4.0.2",
  "date": "2024-12-24",
  "title": "Bulk Sync",
  "changes": ["Added bulk sync script"]
},
{
  "version": "4.0.0",
  "date": "2024-12-24",
  "title": "Architecture Update",
  "changes": ["Migrated to K-108c"]
}
```

✅ **Correct:**
```json
{
  "version": "4.0.3",
  "date": "2024-12-24",
  "title": "Major Scoring Engine Update",
  "changes": [
    "Complete rewrite of point calculations for better accuracy",
    "Faster page loads with optimized queries",
    "Improved data sync reliability"
  ]
}
```

---

## Changelog Structure

### Entry Format

```json
{
  "version": "X.Y.Z",
  "date": "YYYY-MM-DD",
  "title": "Short User-Friendly Title",
  "changes": [
    "User-facing change 1",
    "User-facing change 2",
    "User-facing change 3"
  ]
}
```

### Field Guidelines

#### `version`
- Use **highest version** from that day's deployments
- Format: `"X.Y.Z"` (no "v" prefix)
- Source: Check `git log origin/main --oneline --since="YYYY-MM-DD" --until="YYYY-MM-DD"`

#### `date`
- Format: `"YYYY-MM-DD"`
- Use deployment date to production (when merged to `main`)
- Not the commit date or staging date

#### `title`
- Short (3-6 words)
- User-friendly language
- Describes the overall theme of the release
- Examples:
  - ✅ "Team Value Improvements"
  - ✅ "Auto-Sync & Background Updates"
  - ❌ "K-108c Migration"
  - ❌ "Database Schema Changes"

#### `changes`
- Array of user-facing improvements
- 2-5 items per release (more than 5 = too detailed)
- Start with active verbs: "Fixed", "Added", "Improved"
- Focus on benefits, not implementation
- Order by impact (most important first)

---

## Update Process

### When to Update

Update `changelog.json` whenever a version is deployed to **production** (merged to `main` branch).

### Step-by-Step

1. **Check production commits:**
   ```bash
   git log origin/main --oneline --since="2024-12-24" --until="2024-12-25"
   ```

2. **Identify highest version that day:**
   - Example: v4.0.3, v4.0.2, v4.0.0 → Use **v4.0.3**

3. **Review VERSION_HISTORY.md:**
   - Read all entries for that day
   - Extract user-facing changes
   - Combine similar changes

4. **Translate technical → user language:**
   - "K-108c architecture" → "Improved scoring engine"
   - "Added provisional bonus" → "More accurate live scores"
   - "Fixed database query" → "Faster page loads"

5. **Write changelog entry:**
   ```json
   {
     "version": "4.0.3",
     "date": "2024-12-24",
     "title": "Major Scoring Engine Update",
     "changes": [
       "Complete rewrite of point calculations",
       "Faster page loads with optimized queries",
       "Improved sync reliability"
     ]
   }
   ```

6. **Add to TOP of `changelog.json` array:**
   - Most recent entries first
   - Keep 8-12 entries visible (delete old ones)

7. **Verify JSON syntax:**
   ```bash
   cat src/data/changelog.json | jq .
   ```

---

## How Far Back to Go

### Ideal Depth
- **8-12 entries** (about 1-2 weeks of changes)
- Go back as far as helpful for context
- Don't include ancient versions (>1 month old)

### Minimum Coverage
- At least **3 entries** (last 3 production deployments)
- Show progression of recent improvements

### Maximum Coverage
- No more than **15 entries** (page becomes too long)
- Users don't read beyond recent updates

---

## Examples

### Good Entry (v4.0.3)
```json
{
  "version": "4.0.3",
  "date": "2024-12-24",
  "title": "Scoring Engine Update",
  "changes": [
    "Complete rewrite of point calculations for accuracy",
    "Faster page loads with optimized data queries",
    "Improved reliability for league data sync",
    "Added feedback banner for bug reports"
  ]
}
```

**Why Good:**
- Groups 4 versions (4.0.0, 4.0.1, 4.0.2, 4.0.3) from same day
- User-friendly language (no K-108c, K-112, etc.)
- Benefits-focused ("faster", "improved", "accuracy")
- 4 changes (not overwhelming)

### Bad Entry
```json
{
  "version": "3.7.4",
  "date": "2024-12-23",
  "title": "K-112 Integration",
  "changes": [
    "Integrated K-108 sync into leagueSync function",
    "Added syncPlayerGameweekStats to league sync",
    "Modified src/lib/leagueSync.ts",
    "Updated database schema for calculated_points"
  ]
}
```

**Why Bad:**
- Technical jargon (K-112, K-108)
- Implementation details (file paths, function names)
- Not user-focused (users don't care about schema)
- No benefits mentioned

### Better Version
```json
{
  "version": "3.7.4",
  "date": "2024-12-23",
  "title": "Auto-Sync & Background Updates",
  "changes": [
    "Automatic data sync when viewing leagues",
    "Background updates for returning users",
    "Faster load times for live gameweeks"
  ]
}
```

---

## Checklist

Before updating `changelog.json`:

- [ ] Checked `git log origin/main` for production commits
- [ ] Identified highest version for the day
- [ ] Read VERSION_HISTORY.md for that day's changes
- [ ] Translated technical changes to user language
- [ ] Combined multiple versions into one entry (max 1 per day)
- [ ] Verified JSON syntax with `jq`
- [ ] Entry is user-focused (no K-codes, no file paths)
- [ ] Changes are benefit-focused (not implementation)
- [ ] Title is short and descriptive (3-6 words)
- [ ] Array has 8-12 entries total (not too many)

---

## Quick Reference

### Translation Guide

| Technical | User-Friendly |
|-----------|---------------|
| "K-108c architecture" | "Improved scoring engine" |
| "Provisional bonus calculation" | "More accurate live scores" |
| "Database query optimization" | "Faster page loads" |
| "Added sync integration" | "Automatic data updates" |
| "Fixed scoreCalculator.ts" | "Fixed score calculations" |
| "Migrated to new system" | "Complete rewrite for reliability" |
| "Added error handling" | "Improved app stability" |
| "Refactored component" | "Improved performance" |
| "Updated API endpoint" | "More reliable data fetching" |

### Version Selection

**Scenario:** Same day has v3.5.1, v3.5.2, v3.5.3
**Action:** Use **v3.5.3** as the version number

**Scenario:** Staging has v3.5.4 but main only has v3.5.3
**Action:** Use **v3.5.3** (production only)

**Scenario:** Multiple days with many micro-versions
**Action:** Group by day, max 1 entry per day

---

## Questions?

If unclear whether to include a change:

1. **Would users notice this change?** → Include
2. **Does this fix a bug users experienced?** → Include
3. **Is this purely internal/refactoring?** → Exclude
4. **Does this improve UX indirectly?** → Include with user benefit

**Example:**
- ❌ "Refactored scoreCalculator.ts" → Users don't care
- ✅ "Fixed incorrect scores on My Team page" → Users benefit

When in doubt, ask: **"What's in it for the user?"**
