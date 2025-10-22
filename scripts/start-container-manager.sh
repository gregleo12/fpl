#!/bin/bash

# Start Container Manager on Synology NAS
# Required before Docker commands will work

NAS_HOST="gregleo@192.168.1.49"

echo "🚀 Starting Container Manager on Synology NAS"
echo "=============================================="
echo ""

echo "Checking current status..."
STATUS=$(ssh "$NAS_HOST" "/usr/syno/bin/synopkg status ContainerManager 2>&1")

if [[ $STATUS == *'"status":"start"'* ]]; then
    echo "✅ Container Manager is already running!"
    echo ""
    echo "You can proceed with deployment:"
    echo "  ./scripts/deploy-with-sudo.sh"
    exit 0
fi

echo "Container Manager is stopped. Attempting to start..."
echo ""
echo "Note: You may be prompted for your NAS password"
echo ""

# Try to start Container Manager
ssh -t "$NAS_HOST" bash << 'ENDSSH'
    echo "Starting Container Manager..."
    sudo /usr/syno/bin/synopkg start ContainerManager

    echo ""
    echo "Waiting for service to start..."
    sleep 5

    echo ""
    echo "Checking status..."
    /usr/syno/bin/synopkg status ContainerManager

    echo ""
    echo "Verifying Docker daemon..."
    if sudo /usr/local/bin/docker ps >/dev/null 2>&1; then
        echo "✅ Docker daemon is running!"
    else
        echo "⚠️  Docker daemon may still be starting..."
        echo "Wait 10-20 seconds and try: ./scripts/diagnose-docker.sh"
    fi
ENDSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Verify: ./scripts/diagnose-docker.sh"
echo "  2. Deploy: ./scripts/deploy-with-sudo.sh"
echo ""
