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

**v4.3.36** (December 29, 2025)

BUG FIX (K-146d): Simplified admin manual sync to use proven working sync path. Root cause: custom forceSyncGW() had validation bugs, while Settings force sync (using syncCompletedGW) worked perfectly. Fix: Removed all custom validation logic, just call syncCompletedGW() - the battle-tested function used by Settings force sync, K-148 auto-sync (129 leagues), and first-time setup. Admin manual sync now uses exact same code path as working force sync.

See [VERSION_HISTORY.md](./VERSION_HISTORY.md) for full details.

---

## License

MIT
