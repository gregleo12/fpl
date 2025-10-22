#!/bin/bash

# Simple NAS Setup (no git required)
# Uses rsync for deployment instead of git

NAS_USER="gregleo"
NAS_IP="192.168.1.49"
NAS_HOST="$NAS_USER@$NAS_IP"

echo "🚀 Setting up FPL deployment on Synology NAS..."
echo ""

# Create directories
echo "📁 Creating project directories..."
ssh "$NAS_HOST" bash << 'ENDSSH'
  # Create project directory
  mkdir -p /volume1/docker/fpl/data

  # Create a marker file
  echo "FPL H2H Analytics" > /volume1/docker/fpl/.project

  echo "✅ Directories created:"
  ls -la /volume1/docker/fpl/
ENDSSH

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run: ./scripts/deploy-rsync.sh"
echo "  2. App will be available at: http://192.168.1.49:3000"
echo ""
