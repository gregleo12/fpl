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

**v4.3.35** (December 29, 2025)

BUG FIX (K-146c): Fixed manual sync database connection issue causing false validation failures. Root cause: validation used stale database connection A while sync wrote data using connection B. Connection A couldn't see uncommitted/newly-committed data from B. Fix: Get fresh database connection after sync completes before running validation. Added detailed debug logging showing actual row counts and point totals. Manual sync tool now works correctly.

See [VERSION_HISTORY.md](./VERSION_HISTORY.md) for full details.

---

## License

MIT
