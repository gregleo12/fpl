#!/bin/bash

# Docker Diagnostic Script for Synology NAS
# Checks Docker installation, permissions, and Container Manager status

NAS_HOST="gregleo@192.168.1.49"

echo "🔍 Docker Diagnostic Report for Synology NAS"
echo "=============================================="
echo ""

# Check 1: User information
echo "1️⃣  User Information"
echo "   User: gregleo"
USER_INFO=$(ssh "$NAS_HOST" "id" 2>&1)
echo "   $USER_INFO"
echo ""

# Check 2: Docker installation
echo "2️⃣  Docker Installation"
DOCKER_EXISTS=$(ssh "$NAS_HOST" "ls -la /usr/local/bin/docker 2>&1")
if [[ $DOCKER_EXISTS == *"docker"* ]]; then
    echo "   ✅ Docker binary found at /usr/local/bin/docker"
    DOCKER_VERSION=$(ssh "$NAS_HOST" "/usr/local/bin/docker --version 2>&1")
    echo "   Version: $DOCKER_VERSION"
else
    echo "   ❌ Docker not found"
fi
echo ""

# Check 3: Docker Compose installation
echo "3️⃣  Docker Compose Installation"
COMPOSE_EXISTS=$(ssh "$NAS_HOST" "ls -la /usr/local/bin/docker-compose 2>&1")
if [[ $COMPOSE_EXISTS == *"docker-compose"* ]]; then
    echo "   ✅ Docker Compose found at /usr/local/bin/docker-compose"
    COMPOSE_VERSION=$(ssh "$NAS_HOST" "/usr/local/bin/docker-compose --version 2>&1")
    echo "   Version: $COMPOSE_VERSION"
else
    echo "   ❌ Docker Compose not found"
fi
echo ""

# Check 4: PATH configuration
echo "4️⃣  PATH Configuration"
PATH_INFO=$(ssh "$NAS_HOST" "echo \$PATH")
echo "   Current PATH: $PATH_INFO"
if [[ $PATH_INFO == *"/usr/local/bin"* ]]; then
    echo "   ✅ /usr/local/bin is in PATH"
else
    echo "   ⚠️  /usr/local/bin NOT in PATH (this is normal for SSH sessions)"
fi
echo ""

# Check 5: Docker socket
echo "5️⃣  Docker Socket Permissions"
SOCKET_INFO=$(ssh "$NAS_HOST" "ls -l /var/run/docker.sock 2>&1")
echo "   $SOCKET_INFO"
SOCKET_PERMS=$(ssh "$NAS_HOST" "stat -c '%a' /var/run/docker.sock 2>&1")
echo "   Permissions: $SOCKET_PERMS (Owner: root, Group: root)"
echo ""

# Check 6: Docker groups
echo "6️⃣  Docker Group Membership"
DOCKER_GROUP=$(ssh "$NAS_HOST" "grep docker /etc/group 2>&1")
if [[ -z "$DOCKER_GROUP" ]]; then
    echo "   ⚠️  No 'docker' group exists on the system"
    echo "   This is normal for Synology - Docker socket is owned by root:root"
else
    echo "   Docker groups found:"
    echo "$DOCKER_GROUP" | sed 's/^/   /'
fi
echo ""

# Check 7: Can user access Docker?
echo "7️⃣  Docker Access Test"
DOCKER_TEST=$(ssh "$NAS_HOST" "/usr/local/bin/docker ps 2>&1")
if [[ $DOCKER_TEST == *"permission denied"* ]]; then
    echo "   ❌ Permission denied - user cannot access Docker"
    echo "   Error: User 'gregleo' cannot connect to Docker socket"
elif [[ $DOCKER_TEST == *"Cannot connect"* ]]; then
    echo "   ⚠️  Docker daemon not running"
else
    echo "   ✅ Docker accessible!"
    echo "$DOCKER_TEST" | head -5 | sed 's/^/   /'
fi
echo ""

# Check 8: Container Manager status
echo "8️⃣  Container Manager Status"
CM_STATUS=$(ssh "$NAS_HOST" "/usr/syno/bin/synopkg status ContainerManager 2>&1")
echo "$CM_STATUS" | sed 's/^/   /'

if [[ $CM_STATUS == *'"status":"stop"'* ]] || [[ $CM_STATUS == *'stopped'* ]]; then
    echo "   ❌ Container Manager is STOPPED"
elif [[ $CM_STATUS == *'"status":"start"'* ]] || [[ $CM_STATUS == *'running'* ]]; then
    echo "   ✅ Container Manager is RUNNING"
else
    echo "   ⚠️  Unknown status"
fi
echo ""

# Check 9: Project files
echo "9️⃣  Project Files on NAS"
PROJECT_FILES=$(ssh "$NAS_HOST" "ls -la /volume1/docker/fpl/ 2>&1 | head -10")
if [[ $PROJECT_FILES == *"No such file"* ]]; then
    echo "   ❌ Project directory not found"
else
    echo "   ✅ Project directory exists: /volume1/docker/fpl/"
    echo "$PROJECT_FILES" | sed 's/^/   /'
fi
echo ""

# Summary and Recommendations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 SUMMARY & RECOMMENDATIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ $CM_STATUS == *'"status":"stop"'* ]]; then
    echo "⚠️  ISSUE FOUND: Container Manager is stopped"
    echo ""
    echo "SOLUTIONS:"
    echo ""
    echo "Option 1: Start via Synology DSM (Recommended)"
    echo "  1. Log into DSM: http://192.168.1.49:5000"
    echo "  2. Open Package Center"
    echo "  3. Find 'Container Manager'"
    echo "  4. Click 'Run' or 'Start'"
    echo ""
    echo "Option 2: Start via SSH (if you have sudo access)"
    echo "  ssh gregleo@192.168.1.49"
    echo "  sudo /usr/syno/bin/synopkg start ContainerManager"
    echo ""
elif [[ $DOCKER_TEST == *"permission denied"* ]]; then
    echo "⚠️  ISSUE FOUND: Permission denied for Docker access"
    echo ""
    echo "SOLUTIONS:"
    echo ""
    echo "On Synology, Docker requires sudo for non-root users."
    echo ""
    echo "Option 1: Use sudo (Quick solution)"
    echo "  Run: ./scripts/deploy-with-sudo.sh"
    echo ""
    echo "Option 2: Add user to administrators (if not already)"
    echo "  User 'gregleo' is already in 'administrators' group"
    echo "  But still needs sudo for Docker commands"
    echo ""
    echo "Option 3: Enable Docker access for user"
    echo "  This requires Synology DSM configuration:"
    echo "  1. Log into DSM: http://192.168.1.49:5000"
    echo "  2. Container Manager → Settings"
    echo "  3. Check user permissions"
    echo ""
else
    echo "✅ System looks good!"
    echo ""
    echo "Next step: Deploy your application"
    echo "  Run: ./scripts/deploy-with-sudo.sh"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
