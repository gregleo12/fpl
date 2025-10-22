# FPL H2H Analytics

A Next.js web application for analyzing Fantasy Premier League Head-to-Head league statistics, deployed on Synology NAS using Docker.

## Features

- Fetch and display H2H league standings
- View match history and results
- Track league statistics over time
- SQLite database for data persistence
- Automatic deployment via git push

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Database**: SQLite (better-sqlite3)
- **API**: FPL Official API
- **Deployment**: Docker, Docker Compose
- **Infrastructure**: Synology NAS

## Project Structure

```
fpl/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── league/
│   │   │       └── [id]/
│   │   │           ├── route.ts        # Fetch and store league data
│   │   │           └── stats/
│   │   │               └── route.ts    # Get league statistics
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Main UI
│   │   ├── page.module.css
│   │   └── globals.css
│   └── lib/
│       ├── db.ts                       # SQLite database setup
│       └── fpl-api.ts                  # FPL API client
├── scripts/
│   ├── setup-nas.sh                    # Initial NAS setup
│   ├── deploy.sh                       # One-command deployment
│   ├── status.sh                       # Check deployment status
│   └── logs.sh                         # View application logs
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

## Deployment Setup

### Prerequisites

- Synology NAS with Docker installed
- SSH access to NAS enabled
- SSH key authentication configured (recommended)

### Step 1: Initial NAS Setup

Run the setup script to create directories and configure git repository on your NAS:

```bash
./scripts/setup-nas.sh
```

This script will:
- Create `/volume1/docker/fpl/` directory for the application
- Create `/volume1/git/fpl.git` bare repository
- Set up a post-receive git hook for automatic deployment

### Step 2: Deploy Application

Use the one-command deployment script:

```bash
./scripts/deploy.sh "Initial deployment"
```

Or deploy manually:

```bash
# Initialize git (if not already done)
git init
git branch -M main

# Add NAS as remote
git remote add nas ssh://gregleo@192.168.1.49/volume1/git/fpl.git

# Commit and push
git add .
git commit -m "Initial deployment"
git push nas main
```

The deployment script will:
1. Initialize git repository (if needed)
2. Add NAS remote (if needed)
3. Commit any changes
4. Push to NAS
5. Trigger automatic Docker deployment

### Step 3: Access Application

Once deployed, access the application at:

```
http://192.168.1.49:3000
```

## Usage

### Viewing League Statistics

1. Open the application in your browser
2. Enter your FPL H2H League ID
3. Click "Fetch League Data"
4. View standings and match history

### Finding Your League ID

1. Go to the FPL website
2. Navigate to your H2H league
3. The league ID is in the URL: `https://fantasy.premierleague.com/leagues/LEAGUE_ID/...`

## Management Scripts

### Check Deployment Status

```bash
./scripts/status.sh
```

Shows running containers and recent logs.

### View Live Logs

```bash
./scripts/logs.sh
```

Stream application logs in real-time (Ctrl+C to exit).

### Deploy Updates

```bash
./scripts/deploy.sh "Your commit message"
```

Commits changes and deploys to NAS.

## Local Development

### Install Dependencies

```bash
npm install
```

### Create Environment File

```bash
cp .env.example .env
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Database

The application uses SQLite for data persistence. The database file is stored at `/volume1/docker/fpl/data/fpl.db` on the NAS.

### Database Schema

- **leagues**: League information
- **managers**: Manager/team information
- **h2h_matches**: Match results
- **league_standings**: Current league standings

## Docker Configuration

### Dockerfile

Multi-stage build for optimized production image:
- Stage 1: Install dependencies
- Stage 2: Build application
- Stage 3: Production runtime

### docker-compose.yml

- Port 3000 exposed
- Data volume mounted for SQLite persistence
- Automatic restart policy

## Troubleshooting

### SSH Connection Issues

Ensure SSH key is added to NAS:

```bash
ssh-copy-id gregleo@192.168.1.49
```

### Container Not Starting

Check logs:

```bash
./scripts/logs.sh
```

Or SSH into NAS:

```bash
ssh gregleo@192.168.1.49
cd /volume1/docker/fpl
docker-compose logs
```

### Port Already in Use

Change port in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Change 3001 to any available port
```

### Database Locked

Stop all containers:

```bash
ssh gregleo@192.168.1.49 "cd /volume1/docker/fpl && docker-compose down"
```

Then redeploy.

## API Endpoints

### GET /api/league/[id]

Fetches league data from FPL API and stores in database.

**Response:**
```json
{
  "league": { "id": 123, "name": "League Name" },
  "standings": [...],
  "matches": [...]
}
```

### GET /api/league/[id]/stats

Retrieves league statistics from local database.

**Response:**
```json
{
  "league": { "id": 123, "name": "League Name" },
  "standings": [...],
  "recentMatches": [...]
}
```

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
