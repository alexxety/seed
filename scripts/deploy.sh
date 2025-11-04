#!/usr/bin/env bash
#
# Universal Deploy Script (Standard-2025)
#
# Usage: ./scripts/deploy.sh <env>
# Example:
#   ./scripts/deploy.sh dev   # Deploy to DEV
#   ./scripts/deploy.sh prod  # Deploy to PROD
#
# Prerequisites:
# - .env.ci.<env> file must exist
# - SSH access to deploy server
# - PM2 running on target server
#

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

ENV=${1:-}

if [ -z "$ENV" ]; then
  echo "❌ Error: Environment not specified"
  echo ""
  echo "Usage: ./scripts/deploy.sh <env>"
  echo "  env: dev | prod"
  echo ""
  echo "Examples:"
  echo "  ./scripts/deploy.sh dev   # Deploy to DEV"
  echo "  ./scripts/deploy.sh prod  # Deploy to PROD"
  exit 1
fi

if [ "$ENV" != "dev" ] && [ "$ENV" != "prod" ]; then
  echo "❌ Error: Invalid environment: $ENV"
  echo "Valid options: dev, prod"
  exit 1
fi

# ============================================================================
# LOAD CI CONFIG
# ============================================================================

CI_CONFIG=".env.ci.$ENV"

if [ ! -f "$CI_CONFIG" ]; then
  echo "❌ Error: CI config file not found: $CI_CONFIG"
  exit 1
fi

# shellcheck source=/dev/null
source "$CI_CONFIG"

# Validate required variables
if [ -z "${DEPLOY_USER:-}" ] || [ -z "${DEPLOY_HOST:-}" ] || [ -z "${DEPLOY_PATH:-}" ] || [ -z "${PM2_APP_NAME:-}" ] || [ -z "${ENV_FILE:-}" ]; then
  echo "❌ Error: Missing required variables in $CI_CONFIG"
  echo "Required: DEPLOY_USER, DEPLOY_HOST, DEPLOY_PATH, PM2_APP_NAME, ENV_FILE"
  exit 1
fi

# ============================================================================
# DEPLOY
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Deploying to $ENV"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Host: $DEPLOY_HOST"
echo "Path: $DEPLOY_PATH"
echo "PM2:  $PM2_APP_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Build
echo ""
echo "📦 Step 1/4: Building application..."
npm run build:all

if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

# Step 2: Sync dist/
echo ""
echo "📤 Step 2/4: Syncing dist/ to server..."
rsync -avz --delete \
  dist/ \
  "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/dist/"

if [ $? -ne 0 ]; then
  echo "❌ Sync failed"
  exit 1
fi

# Step 3: Copy .env file
echo ""
echo "📋 Step 3/4: Copying $ENV_FILE to server..."

if [ ! -f "$ENV_FILE" ]; then
  echo "⚠️  Warning: $ENV_FILE not found locally"
  echo "   Assuming .env already exists on server"
else
  scp "./$ENV_FILE" "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/.env"

  if [ $? -ne 0 ]; then
    echo "❌ Failed to copy $ENV_FILE"
    exit 1
  fi
fi

# Step 4: Restart PM2
echo ""
echo "🔄 Step 4/4: Restarting $PM2_APP_NAME..."
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" \
  "cd ${DEPLOY_PATH} && pm2 restart ${PM2_APP_NAME}"

if [ $? -ne 0 ]; then
  echo "❌ PM2 restart failed"
  exit 1
fi

# Success
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deploy to $ENV completed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  npm run verify:$ENV    # Verify deployment"
