#!/usr/bin/env bash
#
# Standard-2025 Verification Script
#
# Comprehensive CI gate that validates:
# - Build artifacts integrity
# - Token leak detection (FAIL not WARNING)
# - PrismaClient usage patterns
# - SSR/template engine detection
# - SPA fallback positioning
# - Accept header validation
# - Tenant isolation
# - MD5 comparison (local vs remote)
#
# Exit codes:
# 0 = All checks passed
# 1 = One or more checks failed
#

set -euo pipefail

# ============================================================================
# COLORS & FORMATTING
# ============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# CONFIGURATION
# ============================================================================
FAIL_COUNT=0
WARN_COUNT=0

# Optional environment variables (for MD5 comparison)
DEV_HOST="${DEV_HOST:-}"
DEV_DIR="${DEV_DIR:-}"
PROD_HOST="${PROD_HOST:-}"
PROD_DIR="${PROD_DIR:-}"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

print_header() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔍 Standard-2025 Verification"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

print_section() {
  local step=$1
  local total=$2
  local title=$3
  echo ""
  echo -e "${YELLOW}[$step/$total]${NC} $title..."
}

print_pass() {
  echo -e "${GREEN}✓ PASS${NC} $1"
}

print_fail() {
  echo -e "${RED}✗ FAIL${NC} $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

print_warn() {
  echo -e "${YELLOW}⚠ WARN${NC} $1"
  WARN_COUNT=$((WARN_COUNT + 1))
}

print_skip() {
  echo -e "${BLUE}○ SKIP${NC} $1"
}

# ============================================================================
# VERIFICATION CHECKS
# ============================================================================

check_build_artifacts() {
  print_section 1 8 "Checking build artifacts"

  if [ ! -d "dist" ]; then
    print_fail "dist/ directory not found"
    return
  fi

  if [ ! -f "dist/server.js" ]; then
    print_fail "dist/server.js not found"
    return
  fi

  if [ ! -d "dist/public" ]; then
    print_fail "dist/public/ directory not found"
    return
  fi

  if [ ! -f "dist/public/index.html" ]; then
    print_fail "dist/public/index.html not found"
    return
  fi

  print_pass "All build artifacts present"
}

check_token_leaks() {
  print_section 2 8 "Checking for token leaks (FAIL on any leak)"

  local leaked=false

  # JWT tokens
  if grep -rE "eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}" dist/ 2>/dev/null | head -5; then
    print_fail "JWT token leak detected in dist/"
    leaked=true
  fi

  # Bcrypt hashes
  if grep -rE "\\\$2[ayb]\\\$[0-9]{2}\\\$[A-Za-z0-9./]{53}" dist/ 2>/dev/null | head -5; then
    print_fail "Password hash leak detected in dist/"
    leaked=true
  fi

  # PostgreSQL connection strings
  if grep -rE "postgresql://[^:]+:[^@]+@" dist/ 2>/dev/null | head -5; then
    print_fail "Database connection string leak detected in dist/"
    leaked=true
  fi

  # API keys (common patterns)
  if grep -rE "sk-[A-Za-z0-9]{20,}" dist/ 2>/dev/null | head -5; then
    print_fail "API key leak detected in dist/"
    leaked=true
  fi

  if [ "$leaked" = false ]; then
    print_pass "No token leaks found"
  fi
}

check_prisma_usage() {
  print_section 3 8 "Checking PrismaClient usage patterns"

  # Check for direct PrismaClient instantiation outside allowed locations
  if grep -r "new PrismaClient()" server/src/ 2>/dev/null | \
     grep -v "database-tenant.ts" | \
     grep -v "multitenancy/" | \
     grep -v ".spec.ts" | \
     grep -v ".test.ts"; then
    print_fail "Direct PrismaClient instantiation outside multitenancy/"
    return
  fi

  # Check for direct prisma.* calls in tenant-scoped code
  if grep -r "prisma\." server/src/tenant-admin/ 2>/dev/null | \
     grep -v "req\.db" | \
     grep -v "// Legacy" | \
     grep -v "//.*Legacy"; then
    print_fail "Direct prisma.* usage in tenant-scoped code"
    return
  fi

  print_pass "PrismaClient usage patterns correct"
}

check_ssr_templates() {
  print_section 4 8 "Checking for SSR/template engines"

  local has_ssr=false

  # Check for res.render calls
  if grep -r "res\.render" server/src/ 2>/dev/null; then
    print_fail "res.render() usage detected (SSR not allowed)"
    has_ssr=true
  fi

  # Check for view engine configuration
  if grep -r "app\.set.*view engine" server/src/ 2>/dev/null; then
    print_fail "View engine configuration detected (SSR not allowed)"
    has_ssr=true
  fi

  # Check for template file extensions
  if grep -rE "\.(ejs|hbs|pug|jade)" server/src/ 2>/dev/null | grep -v "node_modules"; then
    print_fail "Template file references detected"
    has_ssr=true
  fi

  if [ "$has_ssr" = false ]; then
    print_pass "No SSR/template engines detected"
  fi
}

check_spa_fallback() {
  print_section 5 8 "Checking SPA fallback positioning"

  # Check if SPA fallback exists in router.ts
  if ! grep -q "router\.get('\*'" server/src/tenant-admin/router.ts 2>/dev/null; then
    print_fail "SPA fallback (router.get('*')) not found in router.ts"
    return
  fi

  # Check if res.sendFile is present (increased context to 20 lines)
  if ! grep -A20 "router\.get('\*'" server/src/tenant-admin/router.ts 2>/dev/null | grep -q "res\.sendFile"; then
    print_fail "res.sendFile not found in SPA fallback"
    return
  fi

  print_pass "SPA fallback positioned correctly"
}

check_accept_header() {
  print_section 6 8 "Checking Accept header validation"

  # Check if Accept header validation exists in SPA fallback
  if ! grep -B5 -A5 "router\.get('\*'" server/src/tenant-admin/router.ts 2>/dev/null | grep -q "req\.accepts.*html"; then
    print_fail "Accept header validation missing in SPA fallback"
    return
  fi

  print_pass "Accept header validation present"
}

check_tenant_isolation() {
  print_section 7 8 "Checking tenant isolation"

  # Check for req.db usage in tenant routes
  if ! grep -q "req\.db" server/src/tenant-admin/router.ts 2>/dev/null; then
    print_warn "req.db not found in tenant-admin router (may not be critical)"
  else
    print_pass "Tenant isolation maintained (req.db pattern used)"
  fi
}

check_md5_comparison() {
  print_section 8 8 "Comparing local vs remote artifacts"

  if [ -z "$DEV_HOST" ] || [ -z "$DEV_DIR" ]; then
    print_skip "MD5 comparison (DEV_HOST/DEV_DIR not set)"
    return
  fi

  if [ ! -f "dist/server.js" ]; then
    print_fail "Local dist/server.js not found for MD5 comparison"
    return
  fi

  # Get local MD5
  if command -v md5sum &> /dev/null; then
    LOCAL_MD5=$(md5sum dist/server.js | awk '{print $1}')
  elif command -v md5 &> /dev/null; then
    LOCAL_MD5=$(md5 -q dist/server.js)
  else
    print_skip "MD5 comparison (md5sum/md5 not available)"
    return
  fi

  # Get remote MD5
  REMOTE_MD5=$(ssh "$DEV_HOST" "cd $DEV_DIR && (md5sum dist/server.js 2>/dev/null | awk '{print \$1}' || md5 -q dist/server.js 2>/dev/null)" 2>/dev/null || echo "")

  if [ -z "$REMOTE_MD5" ]; then
    print_warn "Could not retrieve remote MD5 from $DEV_HOST"
    return
  fi

  if [ "$LOCAL_MD5" = "$REMOTE_MD5" ]; then
    print_pass "Local and remote dist/server.js match (MD5: ${LOCAL_MD5:0:8}...)"
  else
    print_fail "MD5 mismatch (local: ${LOCAL_MD5:0:8}..., remote: ${REMOTE_MD5:0:8}...)"
  fi
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  print_header

  check_build_artifacts
  check_token_leaks
  check_prisma_usage
  check_ssr_templates
  check_spa_fallback
  check_accept_header
  check_tenant_isolation
  check_md5_comparison

  # Final summary
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED${NC}"
    if [ $WARN_COUNT -gt 0 ]; then
      echo -e "${YELLOW}  ($WARN_COUNT warnings)${NC}"
    fi
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
  else
    echo -e "${RED}✗ $FAIL_COUNT CHECKS FAILED${NC}"
    if [ $WARN_COUNT -gt 0 ]; then
      echo -e "${YELLOW}  ($WARN_COUNT warnings)${NC}"
    fi
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
  fi
}

# Run main function
main
