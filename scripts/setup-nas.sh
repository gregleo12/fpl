#!/bin/bash

# Setup script for Synology NAS
# This script creates necessary directories and sets up git repository

NAS_USER="gregleo"
NAS_IP="192.168.1.49"
NAS_HOST="$NAS_USER@$NAS_IP"
PROJECT_NAME="fpl"

echo "🚀 Setting up deployment environment on Synology NAS..."

# Create directories on NAS
echo "📁 Creating directories..."
ssh "$NAS_HOST" bash << 'ENDSSH'
  # Create docker directory
  sudo mkdir -p /volume1/docker/fpl/data
  sudo chown -R gregleo:users /volume1/docker/fpl
  echo "  ✅ Docker directory created: /volume1/docker/fpl/"

  # Create git directory
  sudo mkdir -p /volume1/git/fpl.git
  sudo chown -R gregleo:users /volume1/git/fpl.git
  echo "  ✅ Git directory created: /volume1/git/fpl.git/"

  echo "✅ Directories created successfully"
ENDSSH

# Initialize bare git repository
echo "📦 Initializing git repository..."
ssh "$NAS_HOST" bash << 'ENDSSH'
  # Find git executable
  GIT_PATH=$(which git 2>/dev/null || echo "/usr/bin/git")

  if [ ! -x "$GIT_PATH" ]; then
    echo "❌ Git not found. Checking common locations..."
    for path in /usr/bin/git /usr/local/bin/git /opt/bin/git; do
      if [ -x "$path" ]; then
        GIT_PATH="$path"
        break
      fi
    done
  fi

  if [ ! -x "$GIT_PATH" ]; then
    echo "❌ ERROR: Git is not installed on the NAS"
    echo "Please install Git Server package from Synology Package Center"
    exit 1
  fi

  echo "  Using git: $GIT_PATH"

  cd /volume1/git/fpl.git
  $GIT_PATH init --bare
  echo "✅ Git repository initialized"
ENDSSH

# Create post-receive hook
echo "🔗 Setting up git post-receive hook..."
ssh "$NAS_HOST" bash << 'ENDSSH'
  # Find git and docker-compose
  GIT_PATH=$(which git 2>/dev/null || echo "/usr/bin/git")
  DOCKER_COMPOSE_PATH=$(which docker-compose 2>/dev/null || echo "/usr/local/bin/docker-compose")

  cat > /volume1/git/fpl.git/hooks/post-receive << EOF
#!/bin/bash

# Git post-receive hook for automatic deployment
TARGET="/volume1/docker/fpl"
GIT_DIR="/volume1/git/fpl.git"
BRANCH="main"
GIT="$GIT_PATH"
DOCKER_COMPOSE="$DOCKER_COMPOSE_PATH"

while read oldrev newrev ref
do
  # Check if main branch is being pushed
  if [[ \$ref = refs/heads/"\$BRANCH" ]]; then
    echo "🚀 Deploying branch: \$BRANCH"

    # Checkout latest code
    echo "📥 Checking out code..."
    \$GIT --work-tree=\$TARGET --git-dir=\$GIT_DIR checkout -f \$BRANCH

    # Navigate to project directory
    cd \$TARGET

    # Stop and remove old containers
    echo "🛑 Stopping existing containers..."
    \$DOCKER_COMPOSE down || true

    # Build and start new containers
    echo "🔨 Building and starting containers..."
    \$DOCKER_COMPOSE up -d --build

    # Show status
    echo "✅ Deployment complete!"
    \$DOCKER_COMPOSE ps

    echo "🌐 Application should be available at http://192.168.1.49:3000"
  fi
done
EOF

  chmod +x /volume1/git/fpl.git/hooks/post-receive
  echo "✅ Post-receive hook created"
ENDSSH

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Initialize git repository locally: git init"
echo "2. Add NAS as remote: git remote add nas ssh://$NAS_HOST/volume1/git/fpl.git"
echo "3. Commit your code: git add . && git commit -m 'Initial commit'"
echo "4. Deploy: git push nas main"
echo ""
