# Scripts Directory

**Last Organized:** December 29, 2025 (K-161)
**Total Scripts:** 43

This directory contains utility scripts for database management, data syncing, testing, and development.

---

## Directory Structure

```
scripts/
├── sync/          # Active sync scripts (10 files)
├── migrations/    # Database migrations (14 files)
├── archive/       # Completed fixes (4 files)
└── utils/         # Development utilities (15 files)
```

---

## `/sync/` - Active Sync Scripts

Scripts for syncing data from FPL API to database. Run regularly or on-demand.

### Available Scripts

| Script | Package.json Command | Description |
|--------|---------------------|-------------|
| `bulk-sync-all-leagues.ts` | `npm run sync:all-leagues` | Sync all tracked leagues |
| `sync-manager-history.ts` | `npm run sync:manager-history` | Sync manager GW history |
| `sync-manager-picks.ts` | `npm run sync:manager-picks` | Sync manager picks |
| `sync-manager-chips.ts` | `npm run sync:manager-chips` | Sync chip usage |
| `sync-manager-transfers.ts` | `npm run sync:manager-transfers` | Sync transfer history |
| `sync-pl-fixtures.ts` | `npm run sync:pl-fixtures` | Sync Premier League fixtures |
| `sync-player-gw-stats.ts` | `npm run sync:player-gw-stats` | Sync player gameweek stats |
| `sync-all-leagues-full.ts` | - | Full league sync (all data) |
| `sync-all-players-defcon.ts` | - | Emergency player data sync |
| `sync-player-defcon.ts` | - | Single player emergency sync |

---

## `/migrations/` - Database Migrations

Schema changes and data migrations. Run when setting up or updating database.

### Available Scripts

| Script | Package.json Command | Description |
|--------|---------------------|-------------|
| `run-k108-migration.ts` | `npm run migrate:k108` | K-108 architecture migration |
| `run-manager-history-migration.ts` | `npm run migrate:manager-history` | Manager history table |
| `run-manager-picks-migration.ts` | `npm run migrate:manager-picks` | Manager picks table |
| `run-manager-chips-migration.ts` | `npm run migrate:manager-chips` | Manager chips table |
| `run-manager-transfers-migration.ts` | `npm run migrate:manager-transfers` | Manager transfers table |
| `run-pl-fixtures-migration.ts` | `npm run migrate:pl-fixtures` | PL fixtures table |
| `run-player-migration.ts` | `npm run migrate:players` | Players table |
| `migrate-analytics.ts` | `npm run migrate:analytics` | Analytics table |
| `add-missing-columns.ts` | `npm run migrate:columns` | Add missing DB columns |
| `add-defensive-contribution.ts` | - | Add defensive contribution field |
| `add-league-sync-columns.ts` | - | Add sync tracking columns |
| `add-performance-indexes.ts` | - | Add database indexes for performance |
| `migrate-players.ts` | - | Legacy player migration |
| `run-sync-error-migration.ts` | - | Sync error tracking migration |

---

## `/archive/` - Completed Fixes

Historical one-time fix scripts. Kept for reference, not actively used.

### Scripts

| Script | Package.json Command | Description |
|--------|---------------------|-------------|
| `fix-incomplete-manager-history.ts` | `npm run fix:incomplete-history` | Fixed incomplete GW history (completed) |
| `reset-league-sync.ts` | - | Reset league sync status |
| `reset-league-for-testing.ts` | - | Reset league for testing |
| `delete-gw16-test.ts` | - | Delete GW16 test data |

---

## `/utils/` - Development Utilities

Helper scripts for debugging, verification, and testing.

### Testing Scripts

| Script | Package.json Command | Description |
|--------|---------------------|-------------|
| `test-provisional-bonus.ts` | `npm run test:provisional-bonus` | Test provisional bonus calculation |
| `test-team-totals.ts` | `npm run test:team-totals` | Test team total points calculation |
| `test-incremental-sync.ts` | - | Test incremental sync logic |
| `test-player-sync.ts` | - | Test player sync process |
| `test-players-api.ts` | - | Test FPL players API |

### Verification Scripts

| Script | Description |
|--------|-------------|
| `verify-manager-chips.ts` | Verify chip data integrity |
| `verify-manager-history.ts` | Verify manager history data |
| `verify-manager-picks.ts` | Verify manager picks data |
| `verify-manager-transfers.ts` | Verify transfer data |
| `verify-pl-fixtures.ts` | Verify fixture data |

### Database Utilities

| Script | Description |
|--------|-------------|
| `check-and-add-indexes.ts` | Check and add missing indexes |
| `check-tables.ts` | Verify table structure |
| `check-gw-history.ts` | Check GW history data |
| `check-gw16-state.ts` | Check GW16 AFCON state |
| `check-h2h-scores.ts` | Check H2H match scores |

---

## Running Scripts

### Via Package.json (Recommended)

```bash
# Sync operations
npm run sync:all-leagues
npm run sync:manager-history
npm run sync:pl-fixtures

# Migrations
npm run migrate:k108
npm run migrate:players

# Testing
npm run test:provisional-bonus
```

### Direct Execution

```bash
# Using tsx
npx tsx src/scripts/sync/bulk-sync-all-leagues.ts

# Using ts-node
npx ts-node src/scripts/migrations/migrate-analytics.ts
```

---

## Notes

- **Don't delete scripts** - archive instead in `/archive/`
- **Migrations** are kept for reference and potential re-runs
- **Utils scripts** are for development/debugging only
- Scripts use environment variables from `.env.local`

---

## Recent Changes

**K-161 (Dec 29, 2025):** Reorganized 43 scripts into categorized subfolders
- Created `/sync/`, `/migrations/`, `/archive/`, `/utils/` structure
- Updated all package.json script paths
- All files moved with git history preserved
