#!/bin/bash

# Deploy FPL app using sudo for Docker commands
# Use this until gregleo user is added to docker group

NAS_HOST="gregleo@192.168.1.49"
REMOTE_PATH="/volume1/docker/fpl"

echo "🚀 Deploying FPL H2H Analytics with sudo..."
echo "============================================"
echo ""
echo "Note: You may be prompted for your NAS password for sudo commands"
echo ""

# Deploy and start containers
echo "🐳 Building and starting Docker containers..."
ssh -t "$NAS_HOST" bash << 'ENDSSH'
  cd /volume1/docker/fpl

  echo ""
  echo "📂 Working directory: $(pwd)"
  echo ""

  echo "🛑 Stopping existing containers..."
  sudo /usr/local/bin/docker-compose down 2>/dev/null || echo "  (No containers to stop)"

  echo ""
  echo "🔨 Building Docker image..."
  sudo /usr/local/bin/docker-compose build

  echo ""
  echo "🚀 Starting containers..."
  sudo /usr/local/bin/docker-compose up -d

  echo ""
  echo "📊 Container status:"
  sudo /usr/local/bin/docker-compose ps

  echo ""
  echo "✅ Deployment complete!"
  echo ""
  echo "🌐 Application should be available at: http://192.168.1.49:3000"
  echo ""
ENDSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment script completed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Access your app at: http://192.168.1.49:3000"
echo ""
echo "📋 View logs:"
echo "  ssh gregleo@192.168.1.49 'cd /volume1/docker/fpl && sudo docker-compose logs -f'"
echo ""
