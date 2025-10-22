# FPL H2H Analytics - Operations Guide

**READ THIS FIRST when starting any new conversation about this project**

## Project Overview

**What:** Fantasy Premier League Head-to-Head Analytics web application
**Tech Stack:** Next.js 14, SQLite, Docker
**Deployed On:** Synology NAS (DS series)
**Access URL:** http://192.168.1.49:3000
**User:** Greg (non-technical user - explain everything clearly and step-by-step)

## Current Deployment Status

✅ **Deployed and Working** as of 2025-10-22

- Docker container: `fpl-h2h-analytics`
- Running on Synology NAS at 192.168.1.49:3000
- Database: SQLite stored in `/volume1/docker/fpl/data/fpl.db`
- Auto-restart enabled: `restart: unless-stopped`
- Network: Port 3000 (previously had conflict with Grafana - now resolved)

## Architecture

```
Local Development (Mac)
└── /Users/matos/Football App Projects/fpl/

Synology NAS Deployment
└── /volume1/docker/fpl/
    ├── src/                    # Application code
    ├── data/                   # SQLite database (CRITICAL: needs 777 permissions)
    ├── docker-compose.yml      # Container configuration
    ├── Dockerfile              # Build configuration
    └── .env                    # Environment variables
```

## Quick Reference Commands

### SSH Access
```bash
ssh gregleo@192.168.1.49
# User must enter password manually
```

### Container Management
```bash
# Navigate to project directory
cd /volume1/docker/fpl

# Check container status
sudo docker ps | grep fpl

# View logs (last 50 lines)
sudo docker logs fpl-h2h-analytics --tail 50

# View live logs
sudo docker logs fpl-h2h-analytics -f

# Restart container
sudo docker-compose restart

# Stop container
sudo docker-compose down

# Start container
sudo docker-compose up -d

# Rebuild and restart (after code changes)
sudo docker-compose up -d --build
```

### Check Container Manager Status
```bash
/usr/syno/bin/synopkg status ContainerManager
```

### Restart Container Manager (if Docker daemon not responding)
```bash
sudo /usr/syno/bin/synopkg stop ContainerManager
sleep 5
sudo /usr/syno/bin/synopkg start ContainerManager
sleep 10
sudo /usr/local/bin/docker ps  # Verify it works
```

## Deploying Code Updates

When the user makes code changes locally and wants to deploy to NAS:

### Option 1: Manual Sync + Deploy (Most Reliable)

**Step 1: SSH to NAS and pull file directly**
```bash
# From local Mac, create temporary file
cat "/Users/matos/Football App Projects/fpl/src/path/to/file.js" | ssh gregleo@192.168.1.49 "cat > /volume1/docker/fpl/src/path/to/file.js"
```

**Step 2: Rebuild and restart**
```bash
ssh gregleo@192.168.1.49
cd /volume1/docker/fpl && sudo docker-compose up -d --build
```

### Option 2: Using rsync (requires password)
```bash
# From local Mac
./scripts/deploy-rsync.sh
# Note: This script has had SSH issues - prefer Option 1
```

### Option 3: Using SCP (for single files)
```bash
scp "/Users/matos/Football App Projects/fpl/src/file.js" gregleo@192.168.1.49:/volume1/docker/fpl/src/file.js
```

## Troubleshooting Guide

### Issue 1: "Failed to fetch league data"

**Symptom:** User searches for league ID but gets error
**Check logs:**
```bash
sudo docker logs fpl-h2h-analytics --tail 30
```

**Common causes:**

#### A) Database Permission Error (`SQLITE_CANTOPEN`)
```bash
# Check permissions inside container
sudo docker exec fpl-h2h-analytics ls -la /app/data

# Should show: drwxrwxrwx (writable by nextjs user)
# If not, fix permissions:
sudo chmod 777 /volume1/docker/fpl/data
cd /volume1/docker/fpl && sudo docker-compose down && sudo docker-compose up -d
```

#### B) API Connection Issue
```bash
# Test API from inside container
sudo docker exec fpl-h2h-analytics wget -q -O - https://fantasy.premierleague.com/api/bootstrap-static/ | head -20

# If this fails, check NAS internet connection
```

#### C) Missing Environment Variables
```bash
# Check .env file exists
ls -la /volume1/docker/fpl/.env

# Should contain:
# DATABASE_PATH=/app/data/fpl.db
# FPL_API_BASE_URL=https://fantasy.premierleague.com/api
```

### Issue 2: Port 3000 Already in Use

**Symptom:** Container fails to start, port conflict error

```bash
# Check what's using port 3000
sudo netstat -tulpn | grep :3000

# Or check running containers
sudo docker ps

# If Grafana or other service using it:
# - Stop that service, or
# - Change FPL app port in docker-compose.yml
```

### Issue 3: Container Manager Shows "Running" But Docker Not Working

**Symptom:** DSM GUI shows Container Manager as running, but `docker ps` fails

```bash
# Check actual daemon status
ps -ef | grep dockerd | grep -v grep

# If no output, daemon is not running
# Restart Container Manager:
sudo /usr/syno/bin/synopkg stop ContainerManager
sleep 5
sudo /usr/syno/bin/synopkg start ContainerManager
```

### Issue 4: Build Fails with CSS Module Error

**Symptom:** `Selector "table" is not pure` during build

**Cause:** CSS Modules don't allow global selectors like `table`, `th`, `td`

**Fix:** Wrap in `:global()`:
```css
.table :global(table) { }
.table :global(th) { }
```

### Issue 5: Build Fails - Missing `/app/public` Directory

**Symptom:** `"/app/public": not found` during Docker build

**Fix:**
```bash
# Create on NAS
ssh gregleo@192.168.1.49 "mkdir -p /volume1/docker/fpl/public"

# Create locally
mkdir -p "/Users/matos/Football App Projects/fpl/public"
```

### Issue 6: "Permission Denied" or "Connection Closed" with rsync/scp

**Symptom:** File sync fails with authentication errors

**Cause:** Synology SSH subsystem issues or SFTP not enabled

**Workaround:** Use cat pipe method:
```bash
cat local-file | ssh gregleo@192.168.1.49 "cat > remote-path"
```

## Important Configuration Details

### Docker Container User
- Container runs as user: `nextjs` (UID 1001)
- Group: `nodejs` (GID 1001)
- Data directory MUST be writable by UID 1001

### Volume Mounts
- `./data:/app/data` - SQLite database storage
- Must have permissions: `chmod 777` or `chown 1001:1001`

### Environment Variables
```env
NODE_ENV=production
DATABASE_PATH=/app/data/fpl.db
FPL_API_BASE_URL=https://fantasy.premierleague.com/api
```

### Network Configuration
- Port: 3000 (mapped to host 3000)
- Network: `fpl-network` (bridge driver)

## Known Issues & Solutions

### Issue: Database File Becomes Read-Only After NAS Reboot

**Solution:** Set permissions permanently:
```bash
sudo chmod 777 /volume1/docker/fpl/data
```

### Issue: Old Tesla Containers (Resolved)

Previously had TeslaMate, Grafana, PostgreSQL, Mosquitto running.
- ✅ Grafana removed (was using port 3000)
- ✅ TeslaMate removed
- ✅ PostgreSQL removed
- ⚠️ Mosquitto still running (may be used by Home Assistant)

## User Context

**Greg is not a technical user:**
- Always provide specific step-by-step instructions
- Specify WHICH terminal (Mac Terminal vs SSH'd into NAS)
- Show exact commands to copy/paste
- Explain what each command does
- Never assume knowledge of Docker, SSH, permissions, etc.
- Be patient - multi-step processes can be exhausting
- Offer simpler alternatives (like Railway) when troubleshooting gets complex

**Greg's Goals:**
- Run FPL analytics app on his Synology NAS
- Avoid paying $5-10/month for cloud hosting
- Minimize ongoing maintenance

## Files on NAS That Were Created During Troubleshooting

```
/volume1/docker/fpl/
├── scripts/
│   ├── diagnose-docker.sh              # Docker diagnostic tool
│   ├── restart-container-manager.sh    # Restart Container Manager
│   ├── deploy-with-sudo.sh             # Deployment with sudo
│   └── deploy-rsync.sh                 # Rsync-based deployment
├── DOCKER_FIX_GUIDE.md                 # Container Manager troubleshooting
├── SSH_FIX_GUIDE.md                    # SSH setup guide
├── DEPLOYMENT.md                       # Original deployment docs
└── OPERATIONS_GUIDE.md                 # This file
```

## Railway Alternative

If Synology troubleshooting becomes too complex:
- Railway.app costs ~$5/month
- Much simpler: git push to deploy
- Built-in logs viewer, no SSH needed
- Greg is open to this if NAS becomes too painful

## How to Start a New Conversation

**At the start of any new conversation, ask:**

1. "What's the current status of the app?" (running, broken, needs update?)
2. "What are you trying to accomplish?"
3. Read this guide to understand the setup

**Quick health check commands:**
```bash
# Check if container is running
ssh gregleo@192.168.1.49 "docker ps | grep fpl"

# Check if app is accessible
curl http://192.168.1.49:3000
```

## Success Metrics

The app is working correctly when:
- ✅ http://192.168.1.49:3000 loads in browser
- ✅ User can enter a league ID (e.g., 804742)
- ✅ League standings and match data displays
- ✅ No errors in `docker logs fpl-h2h-analytics`
- ✅ Database file exists: `/volume1/docker/fpl/data/fpl.db`

## Last Updated

2025-10-22 - Initial deployment completed, all issues resolved, app fully functional
