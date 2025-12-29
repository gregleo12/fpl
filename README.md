# RivalFPL

**Fantasy Premier League Head-to-Head Analytics**

A web app for analyzing H2H league statistics, tracking live scores, and comparing performance against opponents.

🌐 **Live:** [rivalfpl.com](https://rivalfpl.com)

---

## Quick Links

| Resource | Description |
|----------|-------------|
| [CLAUDE.md](./CLAUDE.md) | Development context & rules |
| [DATABASE.md](./DATABASE.md) | Database tables & sync scripts |
| [ENDPOINTS.md](./ENDPOINTS.md) | API routes reference |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | File structure & data flow |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | How to deploy |
| [VERSION_HISTORY.md](./VERSION_HISTORY.md) | Changelog |

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (Railway)
- **Hosting:** Railway

---

## Local Development

```bash
# Install
npm install

# Run dev server
npm run dev

# Build
npm run build
```

---

## Current Version

**v4.3.42** (December 29, 2025)

P0-CRITICAL BUG FIX: Fixed production crash causing `TypeError: Cannot read properties of null (reading 'toLocaleString')` in stats/rankings components. Root cause: Multiple components called `.toLocaleString()` on null/undefined values without null checks. Fix: Added null coalescing operator (`value ?? 0`) to ALL toLocaleString calls in RankProgressModal, GWRankModal, PointsAnalysisModal, MyTeamTab, and PlayerDetailModal. Empty/null data now safely displays "0" instead of crashing. Ready for immediate production deployment.

See [VERSION_HISTORY.md](./VERSION_HISTORY.md) for full details.

---

## License

MIT
