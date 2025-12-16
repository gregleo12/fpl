# FPL H2H Analytics - Version History

**Project Start:** October 23, 2024
**Total Releases:** 252+ versions
**Current Version:** v2.7.3 (December 16, 2025)

---

## 📚 Version History Index

This project's complete version history has been split into multiple files for better readability and maintainability.

### Current & Recent Versions

- **[v2.5.x - v2.7.x (Dec 2025)](./version-history/v2.5-v2.6.md)** - Latest development
  - v2.7.x: K-27 Database Caching & Hotfixes
  - v2.6.x: Players Tab Database Integration
  - v2.6.0-alpha: Players Tab Foundation
  - v2.5.x: Player Features & UI Polish (30 versions)

- **[v2.4.x Part 2 (Dec 2025)](./version-history/v2.4-part2.md)** - My Team Mobile-First (v2.4.45 - v2.4.25)
  - RivalFPL branding, breakpoint fixes, pitch redesign
  - FPL-style player cards, desktop layout fixes
  - 21 versions

- **[v2.4.x Part 1 (Dec 2025)](./version-history/v2.4-part1.md)** - My Team Mobile-First (v2.4.24 - v2.4.0)
  - GW selector, transfers display, stat boxes
  - Formation layout, responsive design
  - 24+ versions

### Previous Major Versions

- **[v2.2.x - v2.3.x (Dec 2025)](./version-history/v2.2-v2.3.md)** - My Team UI Polish & Redesign
  - v2.3.x: My Team UI Polish & Mobile Optimization
  - v2.2.x: My Team Redesign

- **[v2.0.x - v2.1.x (Dec 2025)](./version-history/v2.0-v2.1.md)** - Multi-League Support
  - v2.0.x: **MAJOR MILESTONE** - Multi-league support
  - v2.1.x: League management improvements

### Legacy Versions

- **[v1.x (Oct 2024 - Dec 2024)](./version-history/v1.x.md)** - Foundation & Initial Features
  - v1.26.x: Large League Support & Error Handling
  - v1.25.x: Position History & Reddit Launch
  - v1.24.x: Live Match Modal & Analytics
  - v1.23.x - v1.0.0: Core features and foundation

---

## 📝 Quick Reference

### Latest Changes (v2.7.1 - Dec 16, 2025)
- 🔧 **HOTFIX: H2H Fixtures showing 0-0** - Fixed scoreCalculator to fetch complete data from K-27 tables
  - Root cause: fetchManagerPicks() only got picks, missed points/transfers from manager_gw_history and chips from manager_chips
  - Fixed by fetching all required data in parallel from 3 tables
  - All completed GW fixtures now display correct scores

### Recent Highlights
- **v2.7.0**: K-27 Comprehensive Database Caching (5 new tables, 10 new scripts)
- **v2.6.x**: Complete Players tab with database integration
- **v2.5.12**: Defensive Contribution points (DEFCON)
- **v2.5.11**: FPL-style player points breakdown
- **v2.5.0**: Players database schema + sync job + API endpoints
- **v2.4.x**: Major My Team mobile-first redesign (45+ versions)
- **v2.0.0**: Multi-league support (MAJOR MILESTONE)

---

## 🔗 Related Documentation

- [CLAUDE.md](./CLAUDE.md) - Project context and development guidelines
- [README.md](./README.md) - Project overview and setup instructions

---

**Note:** For the complete unabridged version history, see the individual files linked above. Each file contains detailed changelogs for its respective version range.
