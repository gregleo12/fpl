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

**v4.3.30** (December 29, 2025)

PERFORMANCE + UX (K-148): Smart validation reduces queries from 18 to 2 (89% reduction). Before: Checked all GWs every load (wasteful), pull-to-refresh returned same bad data. After: Checks latest 2 GWs only, trusts older GWs if valid. If invalid found → scans backwards + syncs. Pull-to-refresh now validates before returning data. Result: 85% faster validation + user sees real data on refresh. Example: 18 finished GWs → 2 queries (happy path) vs 18 queries (old).

See [VERSION_HISTORY.md](./VERSION_HISTORY.md) for full details.

---

## License

MIT
