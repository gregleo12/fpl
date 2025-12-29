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

**v4.3.32** (December 29, 2025)

UI ENHANCEMENT (K-150): Replaced +/- (differential) column with Luck in both Rank Tab and GW Rankings Modal. Shows season-cumulative luck (sum of opponent deviations from average) in league standings, and GW-specific luck (opponent season avg - opponent GW score) in gameweek rankings. Color-coded: green (positive luck), red (negative luck), gray (neutral). No database changes, calculated on-demand from existing H2H match data.

See [VERSION_HISTORY.md](./VERSION_HISTORY.md) for full details.

---

## License

MIT
