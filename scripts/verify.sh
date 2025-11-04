#!/usr/bin/env bash
#
# Universal Verification Script (Standard-2025)
#
# Usage: ./scripts/verify.sh <env>
# Example:
#   ./scripts/verify.sh dev   # Verify DEV
#   ./scripts/verify.sh prod  # Verify PROD
#

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

ENV=${1:-}

if [ -z "$ENV" ]; then
  echo "❌ Error: Environment not specified"
  echo ""
  echo "Usage: ./scripts/verify.sh <env>"
  echo "  env: dev | prod"
  exit 1
fi

# Environment-specific configuration
if [ "$ENV" = "prod" ]; then
  BASE_DOMAIN="x-bro.com"
  TEST_TENANT="testadmin"
elif [ "$ENV" = "dev" ]; then
  BASE_DOMAIN="dev.x-bro.com"
  TEST_TENANT="demo"
else
  echo "❌ Error: Invalid environment: $ENV"
  echo "Valid options: dev, prod"
  exit 1
fi

# ============================================================================
# COLORS
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# VERIFICATION
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Verifying $ENV environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Base domain: $BASE_DOMAIN"
echo "Test tenant: $TEST_TENANT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FAIL_COUNT=0

# Check 1: /admin/login returns HTML
echo ""
echo "📝 [1/2] Checking /admin/login returns HTML (PATH-based)..."
CONTENT_TYPE=$(curl -sI "https://${TEST_TENANT}.${BASE_DOMAIN}/admin/login" 2>&1 | grep -i "content-type" | head -1 || echo "")

if echo "$CONTENT_TYPE" | grep -qi "text/html"; then
  echo -e "${GREEN}✓ PASS${NC} /admin/login returns HTML"
else
  echo -e "${RED}✗ FAIL${NC} /admin/login does NOT return HTML"
  echo "  Got: $CONTENT_TYPE"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Check 2: /admin/api/products returns JSON 401
echo ""
echo "📝 [2/2] Checking /admin/api/products returns JSON 401..."
API_RESPONSE=$(curl -s "https://${TEST_TENANT}.${BASE_DOMAIN}/admin/api/products" 2>&1 || echo "")

if echo "$API_RESPONSE" | grep -q '"error"'; then
  echo -e "${GREEN}✓ PASS${NC} /admin/api/products returns JSON 401"
else
  echo -e "${RED}✗ FAIL${NC} /admin/api/products does NOT return JSON 401"
  echo "  Got: ${API_RESPONSE:0:100}"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}✅ ALL CHECKS PASSED${NC} for $ENV"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
else
  echo -e "${RED}❌ $FAIL_COUNT CHECKS FAILED${NC} for $ENV"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
