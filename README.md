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

**v4.3.27** (December 29, 2025)

UI IMPROVEMENT: Reordered Season Stats sections - swapped Classic Pts and Chips positions. Chips moved from 7th to 4th, Classic Pts moved from 4th to 7th. New order: Form → Luck → Captain → Chips → Streak → GW Records → Classic Pts → Team Value → Bench Points. Part of K-143 improvements.

See [VERSION_HISTORY.md](./VERSION_HISTORY.md) for full details.

---

## License

MIT
