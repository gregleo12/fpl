#!/bin/bash

# SSH Authentication Fix Script for Synology NAS
# Handles Synology's unique home directory structure

set -e

NAS_USER="gregleo"
NAS_IP="192.168.1.49"
NAS_HOST="$NAS_USER@$NAS_IP"
SSH_KEY="$HOME/.ssh/id_ed25519.pub"

echo "🔐 SSH Authentication Fix for Synology NAS"
echo "==========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH public key not found at $SSH_KEY${NC}"
    exit 1
fi

echo "✅ SSH public key found: $SSH_KEY"
echo ""

# Read the public key
PUB_KEY=$(cat "$SSH_KEY")
echo "📋 Public key:"
echo "$PUB_KEY"
echo ""

# Test current SSH connection
echo "🔍 Testing current SSH connection..."
if ssh -o BatchMode=yes -o ConnectTimeout=5 "$NAS_HOST" "echo 'SSH works!'" 2>/dev/null; then
    echo -e "${GREEN}✅ SSH authentication already works without password!${NC}"
    echo ""
    exit 0
else
    echo -e "${YELLOW}⚠️  SSH requires password - fixing...${NC}"
    echo ""
fi

# Function to run commands on NAS with password prompt
echo "🔧 Fixing SSH authentication on Synology NAS..."
echo ""
echo "This script will:"
echo "  1. Check for alternative home directories"
echo "  2. Create .ssh directory in all possible locations"
echo "  3. Add your SSH key to authorized_keys"
echo "  4. Set correct permissions"
echo ""
echo "You may be prompted for your NAS password a few times..."
echo ""

# Create comprehensive fix script that will run on the NAS
ssh "$NAS_HOST" bash << 'ENDSSH'
#!/bin/bash

echo "🔍 Investigating Synology SSH configuration..."
echo ""

# Find the actual home directory
ACTUAL_HOME=$(eval echo ~)
echo "📂 Home directory from ~: $ACTUAL_HOME"

# Check common Synology home directory locations
SYNOLOGY_HOME="/var/services/homes/gregleo"
ROOT_HOME="/root"
VOLUME_HOME="/volume1/homes/gregleo"

echo "📂 Checking possible home directories..."
echo ""

# Function to setup SSH in a directory
setup_ssh_in_dir() {
    local dir=$1
    echo "  Setting up SSH in: $dir"

    if [ ! -d "$dir" ]; then
        echo "    ⚠️  Directory does not exist, skipping..."
        return
    fi

    # Create .ssh directory
    mkdir -p "$dir/.ssh"
    chmod 700 "$dir/.ssh"
    echo "    ✅ Created .ssh directory with 700 permissions"

    # Create/update authorized_keys
    touch "$dir/.ssh/authorized_keys"
    chmod 600 "$dir/.ssh/authorized_keys"
    echo "    ✅ Created authorized_keys with 600 permissions"

    # Set ownership
    chown -R gregleo:users "$dir/.ssh" 2>/dev/null || chown -R gregleo:gregleo "$dir/.ssh" 2>/dev/null || true
    echo "    ✅ Set ownership"

    echo ""
}

# Setup SSH in all possible locations
setup_ssh_in_dir "$ACTUAL_HOME"
setup_ssh_in_dir "$SYNOLOGY_HOME"
setup_ssh_in_dir "$VOLUME_HOME"
setup_ssh_in_dir "/root"

echo "✅ SSH directories configured"
echo ""

# Check SSH daemon configuration
echo "🔍 Checking SSH daemon configuration..."
if [ -f /etc/ssh/sshd_config ]; then
    echo "  PubkeyAuthentication:"
    grep -i "^PubkeyAuthentication" /etc/ssh/sshd_config || echo "    (not set - defaults to yes)"

    echo "  AuthorizedKeysFile:"
    grep -i "^AuthorizedKeysFile" /etc/ssh/sshd_config || echo "    (not set - defaults to .ssh/authorized_keys)"
fi
echo ""

ENDSSH

echo ""
echo "📤 Copying SSH public key to NAS..."
echo ""

# Copy the public key to the NAS and append it to authorized_keys in all locations
ssh "$NAS_HOST" bash << ENDSSH
#!/bin/bash

# The public key to add
PUB_KEY="$PUB_KEY"

# Function to add key to authorized_keys file
add_key_to_file() {
    local auth_keys_file=\$1

    if [ ! -f "\$auth_keys_file" ]; then
        echo "  ⚠️  File does not exist: \$auth_keys_file"
        return
    fi

    # Check if key already exists
    if grep -Fq "\$PUB_KEY" "\$auth_keys_file" 2>/dev/null; then
        echo "  ℹ️  Key already exists in: \$auth_keys_file"
    else
        echo "\$PUB_KEY" >> "\$auth_keys_file"
        chmod 600 "\$auth_keys_file"
        echo "  ✅ Added key to: \$auth_keys_file"
    fi
}

# Find actual home
ACTUAL_HOME=\$(eval echo ~)

# Add key to all possible locations
echo "Adding SSH key to all authorized_keys files..."
add_key_to_file "\$ACTUAL_HOME/.ssh/authorized_keys"
add_key_to_file "/var/services/homes/gregleo/.ssh/authorized_keys"
add_key_to_file "/volume1/homes/gregleo/.ssh/authorized_keys"
add_key_to_file "/root/.ssh/authorized_keys"

echo ""
echo "✅ SSH key added to all locations"

ENDSSH

echo ""
echo "🔄 Verifying SSH configuration..."
echo ""

# Show the final state
ssh "$NAS_HOST" bash << 'ENDSSH'
#!/bin/bash

ACTUAL_HOME=$(eval echo ~)

echo "📊 Final SSH Configuration:"
echo ""

check_dir() {
    local dir=$1
    if [ -d "$dir/.ssh" ]; then
        echo "  📂 $dir/.ssh/"
        ls -la "$dir/.ssh/" 2>/dev/null | grep -E "(authorized_keys|^total|^d)" | sed 's/^/    /'
        if [ -f "$dir/.ssh/authorized_keys" ]; then
            local key_count=$(wc -l < "$dir/.ssh/authorized_keys")
            echo "    📋 Keys in authorized_keys: $key_count"
        fi
        echo ""
    fi
}

check_dir "$ACTUAL_HOME"
check_dir "/var/services/homes/gregleo"
check_dir "/volume1/homes/gregleo"

ENDSSH

echo ""
echo "🧪 Testing SSH connection without password..."
echo ""

# Test the connection
if ssh -o BatchMode=yes -o ConnectTimeout=5 "$NAS_HOST" "echo '✅ SSH authentication successful!'" 2>/dev/null; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ SUCCESS! SSH now works without password!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "You can now run:"
    echo "  ./scripts/setup-nas.sh"
    echo "  ./scripts/deploy.sh 'Initial deployment'"
    echo ""
    exit 0
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ SSH still requires password${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Additional troubleshooting needed:"
    echo ""
    echo "1. Check if SELinux is enabled on NAS:"
    echo "   ssh $NAS_HOST 'getenforce 2>/dev/null || echo Not applicable'"
    echo ""
    echo "2. Check SSH daemon logs:"
    echo "   ssh $NAS_HOST 'tail -30 /var/log/messages | grep sshd'"
    echo ""
    echo "3. Try verbose SSH connection:"
    echo "   ssh -vvv $NAS_HOST"
    echo ""
    echo "4. Verify SSH daemon is using correct home directory:"
    echo "   ssh $NAS_HOST 'grep -i AuthorizedKeysFile /etc/ssh/sshd_config'"
    echo ""
    echo "5. Restart SSH daemon (may require GUI):"
    echo "   Control Panel > Terminal & SNMP > SSH service (toggle off/on)"
    echo ""
    exit 1
fi
