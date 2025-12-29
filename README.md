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

**v4.3.40** (December 29, 2025)

FEATURE (K-155): Added "Show Only Invalid/Missing" filter checkbox to admin manual sync tool. When checked, league dropdown filters to show only leagues with sync issues (⚠ Invalid or ○ Missing gameweeks), making it easier to identify and re-sync problematic leagues without scrolling through all 69. Dropdown label updates dynamically: "Invalid Leagues (6)" vs "All Leagues (69)".

See [VERSION_HISTORY.md](./VERSION_HISTORY.md) for full details.

---

## License

MIT
