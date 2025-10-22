#!/bin/bash

# Restart Container Manager on Synology NAS
# This fixes the issue where GUI shows "running" but daemon is stopped

NAS_HOST="gregleo@192.168.1.49"

echo "🔄 Restarting Container Manager on Synology NAS"
echo "================================================"
echo ""
echo "Issue: GUI shows running, but Docker daemon is actually stopped"
echo "Solution: Stop and start Container Manager to sync the state"
echo ""
echo "You will be prompted for your NAS password..."
echo ""

ssh -t "$NAS_HOST" bash << 'ENDSSH'
    echo "Step 1: Stopping Container Manager..."
    sudo /usr/syno/bin/synopkg stop ContainerManager

    echo ""
    echo "Step 2: Waiting 5 seconds..."
    sleep 5

    echo ""
    echo "Step 3: Starting Container Manager..."
    sudo /usr/syno/bin/synopkg start ContainerManager

    echo ""
    echo "Step 4: Waiting for Docker daemon to initialize..."
    sleep 10

    echo ""
    echo "Step 5: Checking status..."
    /usr/syno/bin/synopkg status ContainerManager

    echo ""
    echo "Step 6: Verifying Docker daemon..."
    if sudo /usr/local/bin/docker info >/dev/null 2>&1; then
        echo "✅ SUCCESS! Docker daemon is now running!"
        echo ""
        sudo /usr/local/bin/docker version
    else
        echo "⚠️  Docker daemon still not responding"
        echo "Try waiting another 20 seconds and run:"
        echo "  ssh gregleo@192.168.1.49 'sudo /usr/local/bin/docker ps'"
    fi
ENDSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Verify Docker works: ssh gregleo@192.168.1.49 'sudo /usr/local/bin/docker ps'"
echo "  2. Deploy your app: ./scripts/deploy-with-sudo.sh"
echo ""
