#!/bin/bash

# One-command deployment script
# Usage: ./scripts/deploy.sh [commit-message]

set -e

NAS_USER="gregleo"
NAS_IP="192.168.1.49"
NAS_HOST="$NAS_USER@$NAS_IP"
REMOTE_NAME="nas"
BRANCH="main"

# Default commit message
COMMIT_MSG="${1:-Update deployment}"

echo "🚀 FPL H2H Analytics - Deployment Script"
echo "========================================"
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
  echo "📦 Initializing git repository..."
  git init
  git branch -M main
fi

# Check if NAS remote exists
if ! git remote get-url "$REMOTE_NAME" &> /dev/null; then
  echo "🔗 Adding NAS remote..."
  git remote add "$REMOTE_NAME" "ssh://$NAS_HOST/volume1/git/fpl.git"
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
  echo "📝 Committing changes..."
  git add .
  git commit -m "$COMMIT_MSG"
else
  echo "ℹ️  No changes to commit"
fi

# Push to NAS
echo "🚀 Deploying to NAS..."
echo ""
git push "$REMOTE_NAME" "$BRANCH"

echo ""
echo "✅ Deployment complete!"
echo "🌐 Application: http://$NAS_IP:3000"
echo ""
