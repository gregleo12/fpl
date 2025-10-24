# FPL H2H Analytics

A modern Next.js web application for analyzing Fantasy Premier League Head-to-Head league statistics.

## ✨ Features

- 📊 Real-time H2H league standings and match results
- 🎯 Individual player profiles with detailed statistics
- 📈 Match history tracking and performance analytics
- 🏆 Recent form indicators with win/draw/loss streaks
- 🔮 Future opponent insights for upcoming gameweeks
- 📱 Fully responsive mobile-first design
- ⚡ Fast, optimized, and modern UI

## 🚀 Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router), React, TypeScript
- **Database**: PostgreSQL
- **Styling**: CSS Modules with custom design system
- **API**: FPL Official API
- **Deployment**: Railway (automatic deployments)
- **Hosting**: Railway

## 📁 Project Structure

```
fpl/
├── src/
│   ├── app/
│   │   ├── api/                    # API routes
│   │   │   ├── league/[id]/        # League data endpoints
│   │   │   ├── player/[id]/        # Player data endpoints
│   │   │   └── version/            # Version endpoint
│   │   ├── dashboard/              # Main dashboard page
│   │   ├── league/[leagueId]/      # League views
│   │   ├── settings/               # Settings page
│   │   └── setup/                  # Initial setup
│   ├── components/
│   │   ├── Dashboard/              # Dashboard components
│   │   ├── Fixtures/               # Fixtures & gameweek nav
│   │   ├── Layout/                 # Header & layout
│   │   └── League/                 # League table
│   └── lib/
│       ├── db.ts                   # PostgreSQL database
│       ├── fpl-api.ts              # FPL API client
│       └── nameUtils.ts            # Name formatting utils
├── public/                         # Static assets
├── package.json
└── README.md
```

## 🏗️ Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment documentation.

**Quick summary:**
- Deployed on **Railway** with automatic deployments
- Push to GitHub main branch → Railway auto-deploys
- PostgreSQL database hosted on Railway

## 💻 Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL database (or use Railway's local development)

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd fpl
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Add your database connection:
   ```env
   DATABASE_URL=postgresql://...
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

### Build for Production

```bash
npm run build
npm start
```

## 🗄️ Database

The application uses **PostgreSQL** for data persistence.

### Database Schema

- **leagues**: League information
- **managers**: Manager/team information and statistics
- **h2h_matches**: Match results and history
- **league_standings**: Current league standings and rankings
- **match_history**: Historical match data for analytics

## 📱 Usage

### Initial Setup

1. Open the application
2. Navigate to Settings
3. Enter your FPL Team ID
4. Enter your H2H League ID
5. Save settings

### Finding Your IDs

**Team ID:**
- Go to FPL website → Points tab
- URL contains your team ID: `fantasy.premierleague.com/entry/YOUR_TEAM_ID/event/...`

**League ID:**
- Go to your H2H league on FPL website
- URL contains league ID: `fantasy.premierleague.com/leagues/LEAGUE_ID/...`

### Viewing Statistics

- **My Team Tab**: Your performance, stats, and recent form
- **League Tab**: Full league standings and rankings
- **Fixtures Tab**: Gameweek-by-gameweek match results with opponent insights

## 🎨 Design System

The app features a custom Premier League-inspired design:
- **Primary Color**: FPL Purple (#37003c)
- **Accent Color**: Neon Green (#00ff87)
- **Dark Theme**: Optimized for reduced eye strain
- **Responsive**: Mobile-first design with touch-friendly interactions
- **Modern**: Floating cards, smooth animations, gradient backgrounds

## 🔧 Development

### Version Bumping

```bash
npm version patch  # 1.1.25 → 1.1.26
npm version minor  # 1.1.25 → 1.2.0
npm version major  # 1.1.25 → 2.0.0
```

### Deployment Workflow

```bash
# 1. Make changes
# 2. Build and test
npm run build

# 3. Bump version
npm version patch --no-git-tag-version

# 4. Commit and push
git add .
git commit -m "Description of changes"
git push

# Railway automatically deploys!
```

## 🐛 Troubleshooting

### Build Errors

Check that all environment variables are set:
```bash
echo $DATABASE_URL
```

### Database Connection Issues

Verify your PostgreSQL connection string format:
```
postgresql://user:password@host:port/database
```

### App Not Updating

1. Verify git push succeeded: `git log --oneline -1`
2. Check Railway dashboard for deployment status
3. Review Railway build logs if deployment failed

## 📡 API Endpoints

### GET /api/league/[id]
Fetches league data from FPL API and stores in database.

### GET /api/league/[id]/stats
Retrieves league statistics.

### GET /api/league/[id]/fixtures/[gw]
Gets fixtures and results for a specific gameweek.

### GET /api/league/[id]/insights/[entryId]
Gets opponent insights and head-to-head statistics.

### GET /api/player/[id]
Fetches detailed player/team statistics.

### GET /api/version
Returns current app version.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT

## 🙋 Support

For issues or questions, please open an issue on GitHub.

---

**Current Version:** v1.1.25
