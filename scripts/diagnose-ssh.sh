#!/bin/bash

# SSH Diagnostic Script
# Helps identify why SSH authentication isn't working

NAS_USER="gregleo"
NAS_IP="192.168.1.49"
NAS_HOST="$NAS_USER@$NAS_IP"

echo "🔍 SSH Connection Diagnostics"
echo "=============================="
echo ""

# Check local SSH key
echo "1️⃣  Checking local SSH key..."
if [ -f ~/.ssh/id_ed25519 ]; then
    echo "   ✅ Private key exists: ~/.ssh/id_ed25519"
    ls -la ~/.ssh/id_ed25519 | awk '{print "   Permissions: " $1}'
else
    echo "   ❌ Private key not found: ~/.ssh/id_ed25519"
fi

if [ -f ~/.ssh/id_ed25519.pub ]; then
    echo "   ✅ Public key exists: ~/.ssh/id_ed25519.pub"
    echo "   Key: $(cat ~/.ssh/id_ed25519.pub)"
else
    echo "   ❌ Public key not found: ~/.ssh/id_ed25519.pub"
fi
echo ""

# Check SSH config
echo "2️⃣  Checking SSH config..."
if [ -f ~/.ssh/config ]; then
    echo "   ℹ️  SSH config exists"
    if grep -q "$NAS_IP" ~/.ssh/config 2>/dev/null; then
        echo "   Config for NAS:"
        grep -A 5 "$NAS_IP" ~/.ssh/config | sed 's/^/   /'
    fi
else
    echo "   ℹ️  No SSH config file"
fi
echo ""

# Check SSH agent
echo "3️⃣  Checking SSH agent..."
if ssh-add -l >/dev/null 2>&1; then
    echo "   ✅ SSH agent is running"
    echo "   Loaded keys:"
    ssh-add -l | sed 's/^/   /'

    # Check if our key is loaded
    if ssh-add -l | grep -q "id_ed25519"; then
        echo "   ✅ ed25519 key is loaded"
    else
        echo "   ⚠️  ed25519 key not loaded, adding it..."
        ssh-add ~/.ssh/id_ed25519 2>&1 | sed 's/^/   /'
    fi
else
    echo "   ⚠️  SSH agent not running or no keys loaded"
    echo "   Attempting to add key..."
    ssh-add ~/.ssh/id_ed25519 2>&1 | sed 's/^/   /'
fi
echo ""

# Test connection with verbose output
echo "4️⃣  Testing SSH connection..."
echo "   Running: ssh -v $NAS_HOST 'echo Connection test' 2>&1 | grep -E '(Authentications|Offering|debug1)'"
echo "   (This will show authentication attempts)"
echo ""

ssh -v "$NAS_HOST" 'echo "Connection test"' 2>&1 | grep -E "(Authentications|Offering public key|publickey|debug1: Trying|debug1: Authentication|Server accepts|Trying private key)" | sed 's/^/   /'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test without password (batch mode)
echo "5️⃣  Testing passwordless authentication..."
if ssh -o BatchMode=yes -o ConnectTimeout=5 "$NAS_HOST" "echo 'SUCCESS'" 2>/dev/null; then
    echo "   ✅ Passwordless SSH works!"
else
    echo "   ❌ Passwordless SSH does not work"
    echo ""
    echo "   Possible issues:"
    echo "   • SSH key not in authorized_keys on NAS"
    echo "   • Wrong permissions on NAS .ssh directory"
    echo "   • SSH daemon not configured for public key auth"
    echo "   • Synology using alternative home directory"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Suggested next steps:"
echo ""
echo "If passwordless SSH doesn't work:"
echo "  1. Run: ./scripts/fix-ssh-simple.sh"
echo "     (Uses ssh-copy-id to properly set up keys)"
echo ""
echo "  2. If that fails, manually verify on NAS:"
echo "     ssh $NAS_HOST"
echo "     cat ~/.ssh/authorized_keys"
echo "     ls -la ~/.ssh/"
echo ""
echo "  3. Check Synology SSH logs:"
echo "     ssh $NAS_HOST 'tail -50 /var/log/messages | grep sshd'"
echo ""
