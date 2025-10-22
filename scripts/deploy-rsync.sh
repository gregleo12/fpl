#!/bin/bash

# Rsync-based deployment script
# Deploys the app to Synology NAS without requiring git

set -e

NAS_USER="gregleo"
NAS_IP="192.168.1.49"
NAS_HOST="$NAS_USER@$NAS_IP"
REMOTE_PATH="/volume1/docker/fpl"
COMMIT_MSG="${1:-Deployment at $(date +'%Y-%m-%d %H:%M:%S')}"

echo "🚀 FPL H2H Analytics - Deployment"
echo "=================================="
echo ""
echo "Deploying to: $NAS_HOST:$REMOTE_PATH"
echo "Message: $COMMIT_MSG"
echo ""

# Sync files to NAS (excluding node_modules, .git, etc.)
echo "📤 Syncing files to NAS..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.claude' \
  --exclude '*.db' \
  --exclude '*.db-shm' \
  --exclude '*.db-wal' \
  --exclude 'scripts' \
  --exclude '.env' \
  --exclude '*.md' \
  --exclude '.DS_Store' \
  ./ "$NAS_HOST:$REMOTE_PATH/"

echo ""
echo "✅ Files synced successfully!"
echo ""

# Deploy on NAS
echo "🐳 Building and starting Docker containers..."
echo ""

ssh "$NAS_HOST" bash << ENDSSH
  cd $REMOTE_PATH

  echo "📂 Current directory: \$(pwd)"
  echo "📋 Files:"
  ls -la | head -15

  echo ""
  echo "🛑 Stopping existing containers..."
  docker-compose down 2>/dev/null || echo "  (No existing containers)"

  echo ""
  echo "🔨 Building Docker image..."
  docker-compose build

  echo ""
  echo "🚀 Starting containers..."
  docker-compose up -d

  echo ""
  echo "📊 Container status:"
  docker-compose ps

  echo ""
  echo "🌐 Application should be available at: http://$NAS_IP:3000"
ENDSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Access your app at: http://$NAS_IP:3000"
echo ""
echo "Useful commands:"
echo "  • View logs:   ssh $NAS_HOST 'cd $REMOTE_PATH && docker-compose logs -f'"
echo "  • Restart:     ssh $NAS_HOST 'cd $REMOTE_PATH && docker-compose restart'"
echo "  • Stop:        ssh $NAS_HOST 'cd $REMOTE_PATH && docker-compose down'"
echo ""
