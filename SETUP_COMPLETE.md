# 🎉 FPL H2H Analytics - Setup Complete!

Your FPL Head-to-Head analytics application is ready for deployment to your Synology NAS!

## 📦 What's Been Created

### Application Files
- ✅ Next.js 14 application with TypeScript
- ✅ SQLite database integration
- ✅ FPL API client
- ✅ H2H statistics UI
- ✅ Docker configuration
- ✅ Docker Compose setup

### Deployment Scripts
- ✅ `setup-nas.sh` - Initial NAS configuration
- ✅ `deploy.sh` - One-command deployment
- ✅ `status.sh` - Check deployment status
- ✅ `logs.sh` - View application logs

### Documentation
- ✅ README.md - Comprehensive project documentation
- ✅ DEPLOYMENT.md - Quick deployment guide
- ✅ .env.example - Environment variables template

## 🚀 Next Steps

### 1. Install Dependencies (Optional - for local development)

```bash
npm install
```

### 2. Setup Your NAS

```bash
./scripts/setup-nas.sh
```

This will:
- Create `/volume1/docker/fpl/` directory
- Create `/volume1/git/fpl.git` repository
- Setup automatic deployment hook

### 3. Deploy to NAS

```bash
./scripts/deploy.sh "Initial deployment"
```

### 4. Access Your Application

Open in browser: **http://192.168.1.49:3000**

## 📊 How to Use

1. Visit http://192.168.1.49:3000
2. Enter your FPL H2H League ID
3. Click "Fetch League Data"
4. View standings and match history!

### Finding Your League ID

Your league ID is in the FPL URL:
```
https://fantasy.premierleague.com/leagues/YOUR_LEAGUE_ID/standings/h
```

## 🔧 Configuration

### NAS Settings
- **IP**: 192.168.1.49
- **User**: gregleo
- **NAS Name**: NATOS
- **Docker Path**: /volume1/docker/fpl/
- **Git Path**: /volume1/git/fpl.git

### Application Settings
- **Port**: 3000
- **Database**: SQLite (/volume1/docker/fpl/data/fpl.db)
- **API**: FPL Official API (https://fantasy.premierleague.com/api)

## 🛠️ Common Commands

```bash
# Deploy changes
./scripts/deploy.sh "Your commit message"

# Check status
./scripts/status.sh

# View logs
./scripts/logs.sh

# Local development
npm run dev

# Build for production
npm run build
npm start
```

## 📱 Features

### Current Features
- ✅ Fetch H2H league data from FPL API
- ✅ Display league standings table
- ✅ Show recent match results
- ✅ Highlight match winners
- ✅ Store data in SQLite database
- ✅ Responsive design

### Potential Enhancements
- 📊 Historical trends and charts
- 📈 Manager performance statistics
- 🏆 Head-to-head records between managers
- 📅 Gameweek-by-gameweek analysis
- 🔔 Data refresh scheduling
- 🎨 Custom themes

## 🏗️ Architecture

```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────┐
│ SQLite│ │ FPL API │
│  DB   │ │         │
└───────┘ └─────────┘
```

Deployed in Docker container on Synology NAS with automatic git-based deployment.

## 📝 Project Structure

```
fpl/
├── src/
│   ├── app/
│   │   ├── api/league/[id]/          # API routes
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Main page
│   │   └── *.css                     # Styles
│   └── lib/
│       ├── db.ts                     # Database
│       └── fpl-api.ts                # API client
├── scripts/
│   ├── setup-nas.sh                  # Setup
│   ├── deploy.sh                     # Deploy
│   ├── status.sh                     # Status
│   └── logs.sh                       # Logs
├── Dockerfile                        # Docker image
├── docker-compose.yml                # Docker compose
├── package.json                      # Dependencies
└── tsconfig.json                     # TypeScript config
```

## 🐛 Troubleshooting

### Can't SSH to NAS
```bash
# Test connection
ssh gregleo@192.168.1.49

# If fails, check:
# - NAS is powered on
# - IP is correct (192.168.1.49)
# - SSH is enabled in NAS settings
```

### Scripts not executable
```bash
chmod +x scripts/*.sh
```

### Port 3000 already in use
Edit `docker-compose.yml` and change `3000:3000` to `3001:3000` (or any available port)

### Container not starting
```bash
./scripts/logs.sh
# Check error messages
```

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [FPL API Documentation](https://fantasy.premierleague.com/api/)
- [Docker Documentation](https://docs.docker.com/)
- [Synology NAS Docker](https://www.synology.com/en-global/dsm/packages/Docker)

## 🎯 Ready to Deploy!

Run these commands to get started:

```bash
# 1. Setup NAS (first time only)
./scripts/setup-nas.sh

# 2. Deploy application
./scripts/deploy.sh "Initial deployment"

# 3. Open in browser
open http://192.168.1.49:3000
```

---

**Happy analyzing! ⚽📊**

For questions or issues, check the logs with `./scripts/logs.sh` or view the full documentation in `README.md`.
