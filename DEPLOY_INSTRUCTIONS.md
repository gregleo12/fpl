# FPL App Deployment - Final Steps

## Current Status

✅ SSH authentication working
✅ npm dependencies installed
✅ Project files copied to NAS at `/volume1/docker/fpl/`
✅ Docker and docker-compose installed on NAS
❌ User `gregleo` doesn't have Docker permissions

## Issue

The `gregleo` user cannot run Docker commands because it's not in the `docker` group.

## Quick Solution

### Option A: Manual Deployment (Fastest)

SSH into your NAS and run the commands as admin/root:

```bash
# 1. SSH to NAS
ssh gregleo@192.168.1.49

# 2. Navigate to project directory
cd /volume1/docker/fpl

# 3. Build and start containers (with sudo)
sudo /usr/local/bin/docker-compose build
sudo /usr/local/bin/docker-compose up -d

# 4. Check status
sudo /usr/local/bin/docker-compose ps

# 5. View logs
sudo /usr/local/bin/docker-compose logs -f
```

### Option B: Fix Docker Permissions (Better Long-term)

Add `gregleo` to Docker group via Synology DSM:

1. Open DSM web interface: http://192.168.1.49:5000
2. **Control Panel** → **Terminal & SNMP**
3. Ensure SSH is enabled and user has terminal access
4. Via SSH as admin, run:
   ```bash
   sudo usermod -aG docker gregleo
   ```
   or
   ```bash
   sudo synogroup --add docker gregleo
   ```

5. Log out and log back in for group changes to take effect

6. Then run from your Mac:
   ```bash
   ssh gregleo@192.168.1.49 "cd /volume1/docker/fpl && docker-compose up -d --build"
   ```

## Access Your App

Once the containers are running, your app will be available at:

**http://192.168.1.49:3000**

## Useful Commands

### Check if containers are running:
```bash
ssh gregleo@192.168.1.49 "sudo docker ps"
```

### View logs:
```bash
ssh gregleo@192.168.1.49 "cd /volume1/docker/fpl && sudo docker-compose logs -f"
```

### Restart app:
```bash
ssh gregleo@192.168.1.49 "cd /volume1/docker/fpl && sudo docker-compose restart"
```

### Stop app:
```bash
ssh gregleo@192.168.1.49 "cd /volume1/docker/fpl && sudo docker-compose down"
```

### Rebuild and restart:
```bash
ssh gregleo@192.168.1.49 "cd /volume1/docker/fpl && sudo docker-compose down && sudo docker-compose up -d --build"
```

## Verify Deployment

After starting the containers:

1. Check container status:
   ```bash
   ssh gregleo@192.168.1.49 "cd /volume1/docker/fpl && sudo docker-compose ps"
   ```

2. You should see:
   ```
   NAME                  STATUS          PORTS
   fpl-h2h-analytics     Up X seconds    0.0.0.0:3000->3000/tcp
   ```

3. Open browser to: http://192.168.1.49:3000

4. You should see the FPL H2H Analytics homepage

## Future Deployments

Once Docker permissions are fixed, use this script to update the app:

```bash
# From your Mac, in the project directory:
cd "/Users/matos/Football App Projects/fpl"

# Create tar and deploy
tar --exclude='node_modules' --exclude='.git' --exclude='.next' --exclude='*.db' --exclude='.claude' --exclude='scripts' -czf - . | ssh gregleo@192.168.1.49 "cd /volume1/docker/fpl && tar -xzf -"

# Rebuild and restart
ssh gregleo@192.168.1.49 "cd /volume1/docker/fpl && docker-compose up -d --build"
```

Or save this as `scripts/quick-deploy.sh`:

```bash
#!/bin/bash
echo "🚀 Deploying FPL app..."
tar --exclude='node_modules' --exclude='.git' --exclude='.next' --exclude='*.db' --exclude='.claude' --exclude='scripts' -czf - . | ssh gregleo@192.168.1.49 "cd /volume1/docker/fpl && tar -xzf - && docker-compose up -d --build"
echo "✅ Done! App at http://192.168.1.49:3000"
```

## Troubleshooting

### Container won't start:
```bash
ssh gregleo@192.168.1.49 "cd /volume1/docker/fpl && sudo docker-compose logs"
```

### Port 3000 already in use:
Edit `/volume1/docker/fpl/docker-compose.yml` on the NAS and change the port:
```yaml
ports:
  - "3001:3000"  # Change 3001 to any available port
```

### Database permissions:
```bash
ssh gregleo@192.168.1.49 "chmod 777 /volume1/docker/fpl/data"
```

## Next Steps

1. **SSH into NAS** and run the Docker commands with `sudo`
2. **Access the app** at http://192.168.1.49:3000
3. **Enter an FPL H2H League ID** to test the functionality
4. **Fix Docker permissions** for easier future deployments

Your app is ready to go! 🎉
