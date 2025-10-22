#!/bin/bash

# Simple SSH Fix using ssh-copy-id
# This will prompt for password once

set -e

NAS_USER="gregleo"
NAS_IP="192.168.1.49"
NAS_HOST="$NAS_USER@$NAS_IP"

echo "🔐 Simple SSH Authentication Fix"
echo "================================="
echo ""
echo "This script will use ssh-copy-id to properly configure SSH keys."
echo "You will be prompted for your NAS password ONCE."
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Use ssh-copy-id with the ed25519 key
echo "📤 Copying SSH key to NAS..."
echo ""

ssh-copy-id -i ~/.ssh/id_ed25519.pub "$NAS_HOST"

echo ""
echo "🧪 Testing passwordless SSH..."
echo ""

if ssh -o BatchMode=yes -o ConnectTimeout=5 "$NAS_HOST" "echo '✅ SSH authentication successful!'" 2>/dev/null; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ SUCCESS! SSH now works without password!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Next steps:"
    echo "  1. npm install"
    echo "  2. ./scripts/setup-nas.sh"
    echo "  3. ./scripts/deploy.sh 'Initial deployment'"
    echo ""
else
    echo ""
    echo "❌ SSH still requires password. Trying Synology-specific fix..."
    echo ""

    # Synology-specific fix - check alternative home directories
    echo "🔧 Checking Synology home directories..."

    ssh "$NAS_HOST" << 'ENDSSH'
        # Get the actual home directory
        ACTUAL_HOME=$(eval echo ~)
        echo "Current home: $ACTUAL_HOME"

        # Check if Synology uses /var/services/homes
        SYNOLOGY_HOME="/var/services/homes/gregleo"

        if [ -d "$SYNOLOGY_HOME" ] && [ "$ACTUAL_HOME" != "$SYNOLOGY_HOME" ]; then
            echo "Found Synology home: $SYNOLOGY_HOME"
            echo "Copying SSH config to Synology home..."

            # Copy .ssh directory
            if [ -d "$ACTUAL_HOME/.ssh" ]; then
                mkdir -p "$SYNOLOGY_HOME/.ssh"
                cp -r "$ACTUAL_HOME/.ssh/"* "$SYNOLOGY_HOME/.ssh/" 2>/dev/null || true
                chmod 700 "$SYNOLOGY_HOME/.ssh"
                chmod 600 "$SYNOLOGY_HOME/.ssh/authorized_keys" 2>/dev/null || true
                chown -R gregleo:users "$SYNOLOGY_HOME/.ssh" 2>/dev/null || true
                echo "✅ Copied SSH config to $SYNOLOGY_HOME/.ssh/"
            fi
        fi

        # Also check /volume1/homes
        VOLUME_HOME="/volume1/homes/gregleo"

        if [ -d "$VOLUME_HOME" ] && [ "$ACTUAL_HOME" != "$VOLUME_HOME" ]; then
            echo "Found volume home: $VOLUME_HOME"
            echo "Copying SSH config to volume home..."

            if [ -d "$ACTUAL_HOME/.ssh" ]; then
                mkdir -p "$VOLUME_HOME/.ssh"
                cp -r "$ACTUAL_HOME/.ssh/"* "$VOLUME_HOME/.ssh/" 2>/dev/null || true
                chmod 700 "$VOLUME_HOME/.ssh"
                chmod 600 "$VOLUME_HOME/.ssh/authorized_keys" 2>/dev/null || true
                chown -R gregleo:users "$VOLUME_HOME/.ssh" 2>/dev/null || true
                echo "✅ Copied SSH config to $VOLUME_HOME/.ssh/"
            fi
        fi

        echo ""
        echo "📊 SSH directories:"
        ls -la "$ACTUAL_HOME/.ssh/" 2>/dev/null || true
        ls -la "$SYNOLOGY_HOME/.ssh/" 2>/dev/null || true
        ls -la "$VOLUME_HOME/.ssh/" 2>/dev/null || true
ENDSSH

    echo ""
    echo "🧪 Testing again..."

    if ssh -o BatchMode=yes -o ConnectTimeout=5 "$NAS_HOST" "echo '✅ SSH authentication successful!'" 2>/dev/null; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✅ SUCCESS! SSH now works without password!"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
    else
        echo ""
        echo "❌ Still having issues. Manual intervention needed."
        echo ""
        echo "Please check:"
        echo "  1. SSH daemon configuration on NAS"
        echo "  2. Try restarting SSH service via Synology GUI"
        echo "  3. Check /var/log/messages on NAS for SSH errors"
        echo ""
    fi
fi
