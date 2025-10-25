# Fixtures Live Status Implementation

## Current Implementation Overview

The system determines gameweek status by checking match scores in the database and displaying appropriate live/completed/upcoming states.

## Status Detection Logic

**Location**: `/src/app/api/league/[id]/fixtures/[gw]/route.ts` (lines 39-56)

```typescript
let status: 'completed' | 'in_progress' | 'upcoming' = 'upcoming';

if (matches.length > 0) {
  const hasScores = matches.some((m: any) =>
    (m.entry_1_points && m.entry_1_points > 0) ||
    (m.entry_2_points && m.entry_2_points > 0)
  );

  if (hasScores) {
    const allComplete = matches.every((m: any) =>
      (m.entry_1_points !== null && m.entry_1_points >= 0) &&
      (m.entry_2_points !== null && m.entry_2_points >= 0)
    );
    status = allComplete ? 'completed' : 'in_progress';
  }
}
```

## Status States

### 1. `'upcoming'`
- **Condition**: No matches have scores in the database yet
- **Display**: Default state before gameweek starts or before sync runs

### 2. `'in_progress'`
- **Condition**: Some matches have scores, but not all matches are complete
- **Display**: Shows live scores as they update
- **Example**: GW9 currently showing this state

### 3. `'completed'`
- **Condition**: All matches have non-null points (including 0)
- **Display**: Final scores, no more updates expected

## Data Flow

1. **Data Source**: `h2h_matches` table in PostgreSQL database

2. **Data Update**: Background sync jobs pull from FPL API and update match scores

3. **Status Refresh**: Each time a user views the fixtures page, the API recalculates status based on current database state

## Example Timeline

**Yesterday Evening** (GW9):
- No scores in `h2h_matches` table
- Status: `'upcoming'`

**Today** (GW9):
- Background sync detected live FPL matches
- Updated database with live scores (some matches completed, some in progress)
- Status: `'in_progress'`

**Future** (GW9):
- All H2H matches finish
- All scores finalized in database
- Status: `'completed'`

## Key Implementation Details

- Status is calculated **on-demand** during API call, not stored
- Checks use `null` awareness: `entry_1_points !== null && entry_1_points >= 0`
- This allows 0-point scores to count as valid completed matches
- The `some()` check looks for any match with points > 0
- The `every()` check ensures all matches have final scores (including 0)

## Database Schema Reference

**Table**: `h2h_matches`

Relevant columns:
- `entry_1_points`: Points scored by first entry (null if not played yet)
- `entry_2_points`: Points scored by second entry (null if not played yet)
- `event`: Gameweek number

## Future Improvement Considerations

When preparing your fixtures improvement brief, consider:
- How to handle partial live data (some managers' scores updated, others delayed)
- Visual indicators for "LIVE" vs "Final" status
- Refresh mechanisms for live score updates
- Handling of edge cases (postponed matches, data sync failures)
