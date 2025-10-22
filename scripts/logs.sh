#!/bin/bash

# View logs from the deployed application

set -e

NAS_USER="gregleo"
NAS_IP="192.168.1.49"
NAS_HOST="$NAS_USER@$NAS_IP"

echo "📋 Viewing application logs..."
echo "Press Ctrl+C to exit"
echo ""

ssh "$NAS_HOST" << 'ENDSSH'
  cd /volume1/docker/fpl
  docker-compose logs -f --tail=50
ENDSSH
