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

**v4.3.37** (December 29, 2025)

CRITICAL BUG FIX (K-146e): Fixed syncCompletedGW ON CONFLICT constraints. Root cause: K-142's syncCompletedGW used wrong ON CONFLICT clauses that didn't match actual database UNIQUE constraints, causing PostgreSQL errors that were silently swallowed by try-catch blocks. Result: admin manual sync reported success but wrote ZERO manager rows to database. Fix: Corrected all three ON CONFLICT clauses (manager_gw_history, manager_chips, manager_transfers) to match actual constraints, and fixed column names (element_in/out → player_in/out, time → transfer_time). Admin sync now properly writes manager data.

See [VERSION_HISTORY.md](./VERSION_HISTORY.md) for full details.

---

## License

MIT
