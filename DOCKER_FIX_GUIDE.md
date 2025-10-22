# Docker Permissions Issue - Complete Fix Guide

## 🔍 Issue Identified

**Root Cause**: Container Manager (Synology's Docker service) is **STOPPED**

### Diagnostic Results

```
✅ Docker installed: Version 24.0.2
✅ Docker Compose installed: Version 2.20.1
✅ Project files deployed: /volume1/docker/fpl/
✅ User is administrator: gregleo in administrators group
❌ Container Manager: STOPPED
❌ Docker daemon: Not accessible
```

## 🚀 Solutions (Choose One)

### Option 1: Start via Web Interface (Easiest - Recommended)

1. Open your browser and go to: **http://192.168.1.49:5000**
2. Log in to Synology DSM
3. Open **Package Center**
4. Search for **"Container Manager"**
5. Click the **"Run"** or **"Start"** button
6. Wait 10-20 seconds for it to start
7. Run verification: `./scripts/diagnose-docker.sh`
8. If green, deploy: `./scripts/deploy-with-sudo.sh`

### Option 2: Start via Script (From Your Mac)

Run this command from your project directory:

```bash
./scripts/start-container-manager.sh
```

This will:
- SSH to your NAS
- Start Container Manager with sudo
- Verify it's running
- Tell you next steps

### Option 3: Start via SSH (Manual)

```bash
# SSH to NAS
ssh gregleo@192.168.1.49

# Start Container Manager
sudo /usr/syno/bin/synopkg start ContainerManager

# Wait for it to start
sleep 10

# Verify it's running
/usr/syno/bin/synopkg status ContainerManager

# Test Docker
sudo /usr/local/bin/docker ps
```

## ✅ Verification Steps

After starting Container Manager, verify it's working:

### Step 1: Run Diagnostics

```bash
./scripts/diagnose-docker.sh
```

Look for:
```
8️⃣  Container Manager Status
   ✅ Container Manager is RUNNING

7️⃣  Docker Access Test
   (Should show containers or empty list, not "permission denied")
```

### Step 2: Test Docker Command

```bash
ssh gregleo@192.168.1.49 "sudo /usr/local/bin/docker ps"
```

Should show:
```
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```

(Empty list is OK - means no containers running yet)

## 🚀 Deploy Your App

Once Container Manager is running, deploy your FPL app:

```bash
./scripts/deploy-with-sudo.sh
```

This will:
1. SSH to NAS
2. Navigate to `/volume1/docker/fpl/`
3. Build Docker image
4. Start containers
5. Show status

## 🌐 Access Your App

After deployment:
- **URL**: http://192.168.1.49:3000
- **Check status**: `ssh gregleo@192.168.1.49 "cd /volume1/docker/fpl && sudo docker-compose ps"`
- **View logs**: `ssh gregleo@192.168.1.49 "cd /volume1/docker/fpl && sudo docker-compose logs -f"`

## 🔧 Understanding the Permission Issue

### Why Does gregleo Need sudo?

On Synology NAS:

1. **Docker socket** is owned by `root:root` with `660` permissions
2. **No docker group** exists (unlike standard Linux)
3. **Only root** can access `/var/run/docker.sock`
4. **Solution**: Use `sudo` for Docker commands OR access via Synology DSM

This is **by design** - Synology wants Docker access controlled through:
- Container Manager GUI (DSM)
- sudo for CLI access

### Normal Synology Behavior

```bash
# This fails (no sudo):
docker ps
# Error: permission denied

# This works (with sudo):
sudo docker ps
# Shows containers

# This also works (with full path):
sudo /usr/local/bin/docker ps
```

## 📝 Complete Deployment Workflow

```bash
# 1. Start Container Manager
./scripts/start-container-manager.sh

# 2. Verify it's running
./scripts/diagnose-docker.sh

# 3. Deploy app
./scripts/deploy-with-sudo.sh

# 4. Access app
open http://192.168.1.49:3000
```

## 🔄 Future Deployments

For subsequent deployments, Container Manager should stay running, so you can skip step 1:

```bash
# Quick redeploy after changes
cd "/Users/matos/Football App Projects/fpl"

# Copy files
tar --exclude='node_modules' --exclude='.git' --exclude='.next' --exclude='*.db' --exclude='.claude' --exclude='scripts' -czf - . | ssh gregleo@192.168.1.49 "cd /volume1/docker/fpl && tar -xzf -"

# Rebuild and restart
ssh gregleo@192.168.1.49 "cd /volume1/docker/fpl && sudo /usr/local/bin/docker-compose up -d --build"
```

## ⚠️ If Container Manager Won't Start

If Container Manager fails to start:

### Check 1: Is it installed?
```bash
ssh gregleo@192.168.1.49 "/usr/syno/bin/synopkg list | grep -i container"
```

### Check 2: Check logs
```bash
ssh gregleo@192.168.1.49 "sudo tail -50 /var/log/packages/ContainerManager.log"
```

### Check 3: Reinstall via DSM
1. Open DSM Package Center
2. Uninstall Container Manager
3. Reinstall Container Manager
4. Start it

### Check 4: Restart NAS
As a last resort, restart the entire NAS:
- DSM → Control Panel → Info Center → General → Restart

## 🎯 Quick Reference

| Command | Purpose |
|---------|---------|
| `./scripts/diagnose-docker.sh` | Check Docker status |
| `./scripts/start-container-manager.sh` | Start Container Manager |
| `./scripts/deploy-with-sudo.sh` | Deploy app |
| `ssh gregleo@192.168.1.49 "sudo docker ps"` | List containers |
| `ssh gregleo@192.168.1.49 "cd /volume1/docker/fpl && sudo docker-compose logs -f"` | View logs |
| `ssh gregleo@192.168.1.49 "cd /volume1/docker/fpl && sudo docker-compose restart"` | Restart app |

## ✨ Summary

The issue is **NOT** a permissions bug - Container Manager simply needs to be started. Once running:

1. ✅ Docker daemon will be accessible
2. ✅ You can deploy with sudo
3. ✅ Your FPL app will run at http://192.168.1.49:3000

Start Container Manager now and you'll be ready to deploy! 🚀
