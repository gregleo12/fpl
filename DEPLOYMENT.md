# Quick Deployment Guide

## TL;DR - One Command Deployment

```bash
# First time only
./scripts/setup-nas.sh

# Deploy (every time)
./scripts/deploy.sh "Your commit message"
```

## Detailed Steps

### 1. First Time Setup (5 minutes)

Run the NAS setup script:

```bash
./scripts/setup-nas.sh
```

This creates:
- Docker directory: `/volume1/docker/fpl/`
- Git repository: `/volume1/git/fpl.git`
- Automatic deployment hook

### 2. Deploy Your Application

```bash
./scripts/deploy.sh "Initial deployment"
```

What happens:
1. Initializes git repository
2. Adds NAS as remote
3. Commits your code
4. Pushes to NAS
5. NAS automatically:
   - Checks out code
   - Builds Docker image
   - Starts containers
   - Makes app available at http://192.168.1.49:3000

### 3. Make Changes & Redeploy

Edit your code, then:

```bash
./scripts/deploy.sh "Added new feature"
```

That's it! The app automatically rebuilds and restarts.

## Useful Commands

```bash
# Check if app is running
./scripts/status.sh

# View live logs
./scripts/logs.sh

# SSH into NAS
ssh gregleo@192.168.1.49

# Manual Docker commands on NAS
ssh gregleo@192.168.1.49
cd /volume1/docker/fpl
docker-compose ps
docker-compose logs
docker-compose restart
docker-compose down
docker-compose up -d --build
```

## Architecture

```
Your Machine                    Synology NAS (192.168.1.49)
─────────────                   ──────────────────────────────

   Code                         /volume1/git/fpl.git
     │                                  │
     │ git push nas main                │
     └──────────────────────────────────┤
                                        │ post-receive hook
                                        ▼
                              /volume1/docker/fpl/
                                        │
                                        │ docker-compose up --build
                                        ▼
                                   Docker Container
                                        │
                                        └─► http://192.168.1.49:3000

                              SQLite DB: /volume1/docker/fpl/data/fpl.db
```

## Workflow

```bash
# Normal workflow
1. Make changes to code
2. ./scripts/deploy.sh "Description of changes"
3. Open http://192.168.1.49:3000

# Check everything is working
./scripts/status.sh

# Debug issues
./scripts/logs.sh
```

## Network Configuration

- **App URL**: http://192.168.1.49:3000
- **NAS IP**: 192.168.1.49
- **SSH User**: gregleo
- **Container Port**: 3000

To access from other devices on your network, use the same URL: `http://192.168.1.49:3000`

## File Locations on NAS

```
/volume1/
├── docker/
│   └── fpl/
│       ├── data/
│       │   └── fpl.db          # SQLite database
│       ├── .next/              # Built Next.js app
│       ├── node_modules/
│       ├── src/
│       ├── docker-compose.yml
│       └── Dockerfile
└── git/
    └── fpl.git/                # Bare git repository
        └── hooks/
            └── post-receive    # Auto-deployment script
```

## Troubleshooting

### "Permission denied" when running scripts

```bash
chmod +x scripts/*.sh
```

### "Could not resolve hostname"

Check SSH access:
```bash
ssh gregleo@192.168.1.49
```

If this fails, verify:
- NAS is powered on
- IP address is correct (192.168.1.49)
- SSH service is enabled on NAS
- You can ping the NAS: `ping 192.168.1.49`

### "Port 3000 already in use"

Change port in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Change 3001 to your preferred port
```

Then redeploy:
```bash
./scripts/deploy.sh "Changed port"
```

### Application not loading

1. Check container status:
```bash
./scripts/status.sh
```

2. View logs:
```bash
./scripts/logs.sh
```

3. Restart manually:
```bash
ssh gregleo@192.168.1.49
cd /volume1/docker/fpl
docker-compose restart
```

## Tips

1. **Fast deployments**: The deployment uses Docker layer caching, so subsequent builds are much faster.

2. **Database persistence**: Your SQLite database is stored in `/volume1/docker/fpl/data/` and persists across deployments.

3. **View in browser**: Bookmark `http://192.168.1.49:3000` for quick access.

4. **Multiple leagues**: You can query different league IDs without redeploying - just enter a new ID in the UI.

5. **Automatic restart**: The container has `restart: unless-stopped` policy, so it survives NAS reboots.
