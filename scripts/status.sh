#!/bin/bash

# Check deployment status on Synology NAS

set -e

NAS_USER="gregleo"
NAS_IP="192.168.1.49"
NAS_HOST="$NAS_USER@$NAS_IP"

echo "📊 Checking deployment status on NAS..."
echo ""

ssh "$NAS_HOST" << 'ENDSSH'
  cd /volume1/docker/fpl

  echo "🐳 Docker containers:"
  docker-compose ps

  echo ""
  echo "📋 Recent logs:"
  docker-compose logs --tail=20
ENDSSH

echo ""
echo "🌐 Application: http://$NAS_IP:3000"
