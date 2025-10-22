#!/bin/bash

# Setup SSH Keys on Synology NAS
# This script uses password authentication to properly configure SSH keys

set -e

NAS_USER="gregleo"
NAS_IP="192.168.1.49"
NAS_HOST="$NAS_USER@$NAS_IP"
SSH_PUB_KEY=$(cat ~/.ssh/id_ed25519.pub)

echo "🔐 SSH Key Setup for Synology NAS"
echo "=================================="
echo ""
echo "This will configure SSH key authentication on your Synology NAS."
echo "You'll need to enter your NAS password."
echo ""
echo "Press Enter to continue..."
read

echo ""
echo "📤 Setting up SSH keys on NAS..."
echo ""

# Create a comprehensive setup script that handles Synology's directory structure
sshpass -p "$(read -s -p 'Enter NAS password: ' password; echo $password; echo >&2)" ssh "$NAS_HOST" bash << ENDSSH || ssh "$NAS_HOST" bash << ENDSSH
#!/bin/bash

set -e

echo ""
echo "🔍 Setting up SSH authentication..."
echo ""

# Get all possible home directories
SHELL_HOME=\$(eval echo ~)
SYNOLOGY_HOME="/var/services/homes/$NAS_USER"
VOLUME_HOME="/volume1/homes/$NAS_USER"

echo "Detected directories:"
echo "  Shell home: \$SHELL_HOME"
echo "  Synology home: \$SYNOLOGY_HOME"
echo "  Volume home: \$VOLUME_HOME"
echo ""

# The SSH public key to install
SSH_KEY="$SSH_PUB_KEY"

# Function to setup SSH in a directory
setup_ssh_dir() {
    local home_dir=\$1

    if [ ! -d "\$home_dir" ]; then
        echo "  ⏭️  Skipping \$home_dir (doesn't exist)"
        return
    fi

    echo "  📂 Setting up \$home_dir/.ssh/"

    # Create .ssh directory
    mkdir -p "\$home_dir/.ssh"
    chmod 700 "\$home_dir/.ssh"

    # Add key to authorized_keys
    if [ -f "\$home_dir/.ssh/authorized_keys" ]; then
        # Check if key already exists
        if grep -Fq "\$SSH_KEY" "\$home_dir/.ssh/authorized_keys"; then
            echo "     ℹ️  Key already exists"
        else
            echo "\$SSH_KEY" >> "\$home_dir/.ssh/authorized_keys"
            echo "     ✅ Key added"
        fi
    else
        echo "\$SSH_KEY" > "\$home_dir/.ssh/authorized_keys"
        echo "     ✅ authorized_keys created"
    fi

    # Set correct permissions
    chmod 600 "\$home_dir/.ssh/authorized_keys"

    # Set ownership (try different group names)
    chown -R $NAS_USER:users "\$home_dir/.ssh" 2>/dev/null || \
    chown -R $NAS_USER:$NAS_USER "\$home_dir/.ssh" 2>/dev/null || \
    chown -R $NAS_USER "\$home_dir/.ssh" 2>/dev/null || true

    echo "     ✅ Permissions set"

    # Show result
    ls -la "\$home_dir/.ssh/authorized_keys" 2>/dev/null | awk '{print "     " \$0}' || true

    echo ""
}

# Setup in all possible directories
setup_ssh_dir "\$SHELL_HOME"
setup_ssh_dir "\$SYNOLOGY_HOME"
setup_ssh_dir "\$VOLUME_HOME"

echo "✅ SSH key setup complete!"
echo ""
echo "📋 Summary:"

# Count keys in each location
for dir in "\$SHELL_HOME" "\$SYNOLOGY_HOME" "\$VOLUME_HOME"; do
    if [ -f "\$dir/.ssh/authorized_keys" ]; then
        key_count=\$(wc -l < "\$dir/.ssh/authorized_keys" 2>/dev/null || echo "0")
        echo "  \$dir/.ssh/authorized_keys: \$key_count key(s)"
    fi
done

echo ""

ENDSSH

echo ""
echo "🧪 Testing SSH connection..."
sleep 2

if ssh -o BatchMode=yes -o ConnectTimeout=5 "$NAS_HOST" "echo '✅ SSH works!'" 2>/dev/null; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ SUCCESS! Passwordless SSH is working!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Next steps:"
    echo "  1. npm install"
    echo "  2. ./scripts/setup-nas.sh"
    echo "  3. ./scripts/deploy.sh 'Initial deployment'"
    echo ""
    exit 0
else
    echo ""
    echo "⚠️  Passwordless SSH still not working."
    echo ""
    echo "Possible issues:"
    echo "  1. SSH daemon might need to be restarted"
    echo "  2. Synology might have additional security settings"
    echo ""
    echo "Try:"
    echo "  • Restart SSH service in Synology DSM:"
    echo "    Control Panel > Terminal & SNMP > Turn SSH off then on"
    echo ""
    echo "  • Check SSH daemon logs for errors:"
    echo "    ssh $NAS_HOST 'grep sshd /var/log/messages | tail -20'"
    echo ""
    exit 1
fi
