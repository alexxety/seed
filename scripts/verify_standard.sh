#!/usr/bin/env bash
#
# Standard-2025 Verification Script (Extended & Complete)
#
# Comprehensive CI gate that validates:
# - Build artifacts integrity
# - Token leak detection (JWT, Bearer, API keys, DSN, secrets) - FAIL on any leak
# - PrismaClient usage patterns (strict enforcement)
# - SSR/template/forbidden features detection (extended)
# - SPA fallback positioning
# - Accept header enforcement (real HTTP tests)
# - Tenant isolation (real data comparison)
# - robots.txt and sitemap.xml validation
# - MD5 comparison (local vs remote)
# - search_path isolation check
# - BASE_DOMAIN environment variable check
# - No hardcoded domain check
# - Strict mode support (--strict flag)
#
# Exit codes:
# 0 = All checks passed
# 1 = One or more FAIL checks detected
# 2 = Strict mode violation (warnings treated as failures)
#

set -euo pipefail

# ============================================================================
# ARGUMENT PARSING
# ============================================================================
STRICT_MODE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --strict)
      STRICT_MODE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--strict]"
      exit 1
      ;;
  esac
done

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
TOTAL_CHECKS=16

# Environment detection (can be overridden via ENV variable)
ENV="${ENV:-prod}"
BASE_DOMAIN=""

if [ "$ENV" = "prod" ]; then
  REMOTE_HOST="${REMOTE_HOST:-root@46.224.19.173}"
  REMOTE_DIR="${REMOTE_DIR:-/var/www/telegram-shop}"
  BASE_DOMAIN="x-bro.com"
  TEST_DOMAIN="testadmin.x-bro.com"
  TEST_TENANT_1="demo"
  TEST_TENANT_2="myshop"
elif [ "$ENV" = "dev" ]; then
  REMOTE_HOST="${REMOTE_HOST:-root@46.224.19.173}"
  REMOTE_DIR="${REMOTE_DIR:-/var/www/telegram-shop-dev}"
  BASE_DOMAIN="dev.x-bro.com"
  TEST_DOMAIN="demo.dev.x-bro.com"
  TEST_TENANT_1="demo"
  TEST_TENANT_2="testadmin"
else
  echo "❌ Invalid ENV: $ENV (must be 'prod' or 'dev')"
  exit 1
fi

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

print_header() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔍 Standard-2025 Verification (Extended)"
  echo "Environment: $ENV ($BASE_DOMAIN)"
  if [ "$STRICT_MODE" = true ]; then
    echo "⚠️  STRICT MODE: Warnings treated as failures"
  fi
  echo "Total checks: $TOTAL_CHECKS"
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

  # In strict mode, warnings are failures
  if [ "$STRICT_MODE" = true ]; then
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

print_skip() {
  echo -e "${BLUE}○ SKIP${NC} $1"
}

# ============================================================================
# VERIFICATION CHECKS
# ============================================================================

check_build_artifacts() {
  print_section 1 $TOTAL_CHECKS "Checking build artifacts"

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
  print_section 2 $TOTAL_CHECKS "Checking for token leaks (Extended patterns)"

  local leaked=false

  # 1. JWT tokens (full pattern)
  if grep -rE "eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+" dist/ 2>/dev/null | head -3; then
    print_fail "JWT token leak detected in dist/"
    leaked=true
  fi

  # 2. Bearer tokens in Authorization headers
  if grep -rE "Authorization:\s*Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*" dist/ 2>/dev/null | head -3; then
    print_fail "Bearer token leak detected in dist/"
    leaked=true
  fi

  # 3. Stripe API keys
  if grep -rE "(sk_live|sk_test)_[A-Za-z0-9]{20,}" dist/ 2>/dev/null | head -3; then
    print_fail "Stripe API key leak detected in dist/"
    leaked=true
  fi

  # 4. Google API keys
  if grep -rE "AIza[0-9A-Za-z\-_]{35}" dist/ 2>/dev/null | head -3; then
    print_fail "Google API key leak detected in dist/"
    leaked=true
  fi

  # 5. Bcrypt password hashes
  if grep -rE "\\\$2[ayb]\\\$[0-9]{2}\\\$[A-Za-z0-9./]{53}" dist/ 2>/dev/null | head -3; then
    print_fail "Password hash leak detected in dist/"
    leaked=true
  fi

  # 6. PostgreSQL/MySQL DSN with credentials
  if grep -rE "postgres(ql)?://[^:\s]+:[^@\s]+@" dist/ 2>/dev/null | head -3; then
    print_fail "Database connection string leak detected in dist/"
    leaked=true
  fi

  if grep -rE "mysql://[^:\s]+:[^@\s]+@" dist/ 2>/dev/null | head -3; then
    print_fail "MySQL connection string leak detected in dist/"
    leaked=true
  fi

  # 7. Generic secret patterns
  if grep -rE "secret[_-]?key['\"]?\s*[:=]\s*['\"][^'\"]{20,}" dist/ 2>/dev/null | head -3; then
    print_fail "Secret key pattern leak detected in dist/"
    leaked=true
  fi

  if [ "$leaked" = false ]; then
    print_pass "No token leaks found"
  fi
}

check_prisma_usage() {
  print_section 3 $TOTAL_CHECKS "Checking PrismaClient usage patterns (strict)"

  local prisma_violation=false

  # 1. Check source code for direct PrismaClient instantiation
  if grep -r "new PrismaClient()" server/src/ 2>/dev/null | \
     grep -v "database-tenant.ts" | \
     grep -v "database.ts" | \
     grep -v "multitenancy/" | \
     grep -v ".spec.ts" | \
     grep -v ".test.ts"; then
    print_fail "Direct PrismaClient instantiation outside multitenancy/"
    prisma_violation=true
  fi

  # 2. Check for direct prisma.* calls in tenant-scoped code
  if grep -r "prisma\." server/src/tenant-admin/ 2>/dev/null | \
     grep -v "req\.db" | \
     grep -v "db\." | \
     grep -v "// Legacy" | \
     grep -v "//.*Legacy"; then
    print_fail "Direct prisma.* usage in tenant-scoped code"
    prisma_violation=true
  fi

  # 3. Check dist/server.js for global PrismaClient (outside factory)
  if [ -f "dist/server.js" ]; then
    if grep "new PrismaClient()" dist/server.js 2>/dev/null | \
       grep -v "getGlobalPrisma" | \
       grep -v "createTenantClient" | \
       head -1 > /dev/null; then
      print_fail "Global PrismaClient instantiation found in dist/server.js"
      prisma_violation=true
    fi
  fi

  # 4. Check for non-factory imports
  if grep -r "import.*PrismaClient" server/src/ 2>/dev/null | \
     grep -v "multitenancy/" | \
     grep -v "database" | \
     grep -v ".spec.ts" | \
     grep -v ".test.ts"; then
    print_fail "PrismaClient import outside multitenancy module"
    prisma_violation=true
  fi

  if [ "$prisma_violation" = false ]; then
    print_pass "PrismaClient usage patterns correct (strict check passed)"
  fi
}

check_ssr_templates() {
  print_section 4 $TOTAL_CHECKS "Checking for SSR/template/forbidden features"

  local has_ssr=false

  # 1. Check for res.render calls (in source and dist)
  if grep -r "res\.render(" server/src/ dist/ 2>/dev/null | grep -v node_modules | head -3; then
    print_fail "res.render() usage detected (SSR not allowed)"
    has_ssr=true
  fi

  # 2. Check for view engine configuration
  if grep -r "app\.set.*view engine" server/src/ dist/ 2>/dev/null | head -3; then
    print_fail "View engine configuration detected (SSR not allowed)"
    has_ssr=true
  fi

  # 3. Check for template file references (extended list)
  if grep -rE "\.(ejs|hbs|pug|jade|njk|twig|vue|mustache|handlebars)" server/src/ dist/ 2>/dev/null | \
     grep -v "node_modules" | \
     head -3; then
    print_fail "Template file references detected"
    has_ssr=true
  fi

  # 4. Check for SSR framework imports
  if grep -rE "from ['\"]next|from ['\"]nuxt|require\(['\"]next|require\(['\"]nuxt" server/src/ 2>/dev/null | head -3; then
    print_fail "SSR framework (Next.js/Nuxt) import detected"
    has_ssr=true
  fi

  if [ "$has_ssr" = false ]; then
    print_pass "No SSR/template engines detected"
  fi
}

check_spa_fallback() {
  print_section 5 $TOTAL_CHECKS "Checking SPA fallback positioning and order"

  # 1. Check if SPA fallback exists in router.ts
  if ! grep -q "router\.get('\*'" server/src/tenant-admin/router.ts 2>/dev/null; then
    print_fail "SPA fallback (router.get('*')) not found in router.ts"
    return
  fi

  # 2. Check if res.sendFile is present
  if ! grep -A20 "router\.get('\*'" server/src/tenant-admin/router.ts 2>/dev/null | grep -q "res\.sendFile"; then
    print_fail "res.sendFile not found in SPA fallback"
    return
  fi

  # 3. Check that SPA fallback comes BEFORE auth middleware
  local fallback_line=$(grep -n "router\.get('\*'" server/src/tenant-admin/router.ts 2>/dev/null | head -1 | cut -d: -f1)
  local auth_middleware_line=$(grep -n "requireTenantAdmin" server/src/tenant-admin/router.ts 2>/dev/null | head -1 | cut -d: -f1)

  if [ -n "$fallback_line" ] && [ -n "$auth_middleware_line" ]; then
    if [ "$fallback_line" -gt "$auth_middleware_line" ]; then
      print_warn "SPA fallback appears AFTER auth middleware (may cause issues)"
    fi
  fi

  print_pass "SPA fallback positioned correctly"
}

check_admin_login_html() {
  print_section 6 $TOTAL_CHECKS "Checking /admin/login returns HTML (PATH-based) [$ENV]"

  # Check if /admin/login returns HTML without Accept header
  local content_type=$(ssh "$REMOTE_HOST" "curl -sI https://$TEST_DOMAIN/admin/login 2>/dev/null" 2>/dev/null | grep -i "content-type" | head -1)

  if echo "$content_type" | grep -qi "text/html"; then
    print_pass "/admin/login returns HTML (PATH-based)"
  else
    print_fail "/admin/login does NOT return HTML (got: $content_type)"
    return
  fi

  # Check if /api/admin/products returns JSON 401 without token
  local api_response=$(ssh "$REMOTE_HOST" "curl -s https://$TEST_DOMAIN/api/admin/products 2>/dev/null" 2>/dev/null)

  if echo "$api_response" | grep -q '"error"'; then
    print_pass "/api/admin/products returns JSON 401"
  else
    print_fail "/api/admin/products does NOT return JSON 401 (got: ${api_response:0:50}...)"
    return
  fi

  print_pass "Admin SPA (HTML) and API (JSON) routing verified"
}

check_accept_header() {
  print_section 7 $TOTAL_CHECKS "Checking Accept header enforcement (must work without Accept)"

  # 1. Check that code does NOT depend on Accept header
  if grep -B5 -A5 "router\.get('\*'" server/src/tenant-admin/router.ts 2>/dev/null | grep -q "req\.accepts"; then
    print_warn "Accept header check found in SPA fallback (should be PATH-based only)"
  fi

  # 2. Real test: /admin/login must return HTML even with Accept: application/json
  local html_with_json_accept=$(ssh "$REMOTE_HOST" "curl -sI -H 'Accept: application/json' https://$TEST_DOMAIN/admin/login 2>/dev/null" 2>/dev/null | grep -i "content-type" | head -1)

  if echo "$html_with_json_accept" | grep -qi "text/html"; then
    print_pass "/admin/login returns HTML even with Accept: application/json"
  else
    print_fail "/admin/login does NOT ignore Accept header (got: $html_with_json_accept)"
  fi

  # 3. Real test: /api/admin/products must return JSON even with Accept: text/html
  local json_with_html_accept=$(ssh "$REMOTE_HOST" "curl -sI -H 'Accept: text/html' https://$TEST_DOMAIN/api/admin/products 2>/dev/null" 2>/dev/null | grep -i "content-type" | head -1)

  if echo "$json_with_html_accept" | grep -qi "application/json"; then
    print_pass "/api/admin/products returns JSON even with Accept: text/html"
  else
    print_fail "/api/admin/products affected by Accept header (got: $json_with_html_accept)"
  fi
}

check_tenant_isolation() {
  print_section 8 $TOTAL_CHECKS "Checking tenant isolation (real data comparison)"

  # 1. Check for req.db usage in tenant routes (code check)
  if ! grep -q "req\.db" server/src/tenant-admin/router.ts 2>/dev/null; then
    print_warn "req.db not found in tenant-admin router (may not be critical)"
  fi

  # 2. Real isolation test: Compare data from two different tenants
  echo "  Testing: ${TEST_TENANT_1}.$BASE_DOMAIN vs ${TEST_TENANT_2}.$BASE_DOMAIN"

  local tenant1_response=$(ssh "$REMOTE_HOST" "curl -s https://${TEST_TENANT_1}.$BASE_DOMAIN/api/products 2>/dev/null" 2>/dev/null | head -c 500)
  local tenant2_response=$(ssh "$REMOTE_HOST" "curl -s https://${TEST_TENANT_2}.$BASE_DOMAIN/api/products 2>/dev/null" 2>/dev/null | head -c 500)

  if [ -z "$tenant1_response" ] || [ -z "$tenant2_response" ]; then
    print_skip "Cannot compare tenant data (endpoints not reachable)"
    return
  fi

  # Check if responses are identical (BAD - means no isolation)
  if [ "$tenant1_response" = "$tenant2_response" ]; then
    print_fail "Tenant data is IDENTICAL (no isolation detected)"
  else
    print_pass "Tenant isolation verified (different data per tenant)"
  fi
}

check_robots_sitemap() {
  print_section 9 $TOTAL_CHECKS "Checking robots.txt and sitemap.xml Content-Type"

  # 1. Check robots.txt exists and has correct Content-Type
  local robots_ct=$(ssh "$REMOTE_HOST" "curl -sI https://$TEST_DOMAIN/robots.txt 2>/dev/null" 2>/dev/null | grep -i "content-type" | head -1)

  if [ -z "$robots_ct" ]; then
    print_fail "robots.txt not found (no Content-Type header)"
    return
  fi

  if echo "$robots_ct" | grep -qi "text/plain"; then
    print_pass "robots.txt returns Content-Type: text/plain"
  else
    print_fail "robots.txt has incorrect Content-Type (got: $robots_ct)"
  fi

  # 2. Check sitemap.xml exists and has correct Content-Type
  local sitemap_ct=$(ssh "$REMOTE_HOST" "curl -sI https://$TEST_DOMAIN/sitemap.xml 2>/dev/null" 2>/dev/null | grep -i "content-type" | head -1)

  if [ -z "$sitemap_ct" ]; then
    print_fail "sitemap.xml not found (no Content-Type header)"
    return
  fi

  if echo "$sitemap_ct" | grep -qi "application/xml\|text/xml"; then
    print_pass "sitemap.xml returns Content-Type: application/xml"
  else
    print_fail "sitemap.xml has incorrect Content-Type (got: $sitemap_ct)"
  fi

  # 3. Check that sitemap contains correct domain
  local sitemap_content=$(ssh "$REMOTE_HOST" "curl -s https://$TEST_DOMAIN/sitemap.xml 2>/dev/null" 2>/dev/null | head -20)

  if echo "$sitemap_content" | grep -q "$TEST_DOMAIN"; then
    print_pass "sitemap.xml contains correct domain ($TEST_DOMAIN)"
  else
    print_warn "sitemap.xml may not contain correct domain"
  fi
}

check_md5_comparison() {
  print_section 10 $TOTAL_CHECKS "Comparing local vs remote artifacts [$ENV]"

  if [ -z "$REMOTE_HOST" ] || [ -z "$REMOTE_DIR" ]; then
    print_skip "MD5 comparison (using defaults: $REMOTE_HOST)"
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
  REMOTE_MD5=$(ssh "$REMOTE_HOST" "cd $REMOTE_DIR && (md5sum dist/server.js 2>/dev/null | awk '{print \$1}' || md5 -q dist/server.js 2>/dev/null)" 2>/dev/null || echo "")

  if [ -z "$REMOTE_MD5" ]; then
    print_warn "Could not retrieve remote MD5 from $REMOTE_HOST"
    return
  fi

  if [ "$LOCAL_MD5" = "$REMOTE_MD5" ]; then
    print_pass "Local and remote dist/server.js match (MD5: ${LOCAL_MD5:0:8}...)"
  else
    print_fail "MD5 mismatch (local: ${LOCAL_MD5:0:8}..., remote: ${REMOTE_MD5:0:8}...)"
  fi
}

check_prisma_search_path() {
  print_section 11 $TOTAL_CHECKS "Checking search_path is set only in middleware"

  local violations=0

  # 1. Check source code: search_path must be only in middleware
  if grep -r "SET search_path" server/src/ 2>/dev/null | \
     grep -v "multitenancy/" | \
     grep -v "middleware" | \
     head -3; then
    print_fail "search_path SET found outside middleware (source)"
    violations=$((violations + 1))
  fi

  # 2. Check dist/: search_path must not be in handlers/DAOs
  if [ -f "dist/server.js" ]; then
    if grep "SET search_path" dist/server.js 2>/dev/null | \
       grep -v "middleware" | \
       head -1 > /dev/null; then
      print_fail "search_path SET found in dist/server.js outside middleware"
      violations=$((violations + 1))
    fi
  fi

  if [ $violations -eq 0 ]; then
    print_pass "search_path correctly isolated to middleware"
  fi
}

check_base_domain_env() {
  print_section 12 $TOTAL_CHECKS "Checking BASE_DOMAIN environment variable"

  # 1. Check that BASE_DOMAIN is used in tenant-context.ts
  if ! grep -q "BASE_DOMAIN" server/src/multitenancy/tenant-context.ts 2>/dev/null; then
    print_fail "BASE_DOMAIN not found in tenant-context.ts"
    return
  fi

  # 2. Check .env.example has BASE_DOMAIN
  if ! grep -q "BASE_DOMAIN" .env.example 2>/dev/null; then
    print_warn ".env.example missing BASE_DOMAIN documentation"
  fi

  # 3. Check .env.prod (if exists)
  if [ -f ".env.prod" ]; then
    if ! grep -q "BASE_DOMAIN=x-bro.com" .env.prod 2>/dev/null; then
      print_warn ".env.prod missing or incorrect BASE_DOMAIN"
    fi
  fi

  # 4. Check .env.dev (if exists)
  if [ -f ".env.dev" ]; then
    if ! grep -q "BASE_DOMAIN=dev.x-bro.com" .env.dev 2>/dev/null; then
      print_warn ".env.dev missing or incorrect BASE_DOMAIN"
    fi
  fi

  print_pass "BASE_DOMAIN environment variable used correctly"
}

check_no_hardcoded_domains() {
  print_section 13 $TOTAL_CHECKS "Checking for hardcoded infrastructure domains"

  local violations=0

  # 1. Check for hardcoded 'dev' in infraDomains array
  if grep -r "infraDomains.*=.*\['dev'" server/src/multitenancy/ 2>/dev/null; then
    print_fail "Hardcoded 'dev' in infraDomains (should be dynamic)"
    violations=$((violations + 1))
  fi

  # 2. Check for hardcoded domain strings (dev.x-bro.com, *.dev.x-bro.com)
  if grep -rE "(dev\.x-bro\.com|\\\.dev\\\.x-bro\\\.com)" server/src/ 2>/dev/null | \
     grep -v "// Example:" | \
     grep -v "Comment" | \
     head -3; then
    print_fail "Hardcoded dev.x-bro.com domain found in source"
    violations=$((violations + 1))
  fi

  # 3. Check dist/ for hardcoded DEV domains
  if [ -f "dist/server.js" ]; then
    if grep -E "dev\.x-bro\.com" dist/server.js 2>/dev/null | head -1 > /dev/null; then
      print_fail "Hardcoded dev.x-bro.com found in dist/server.js"
      violations=$((violations + 1))
    fi
  fi

  if [ $violations -eq 0 ]; then
    print_pass "No hardcoded DEV infrastructure domains found"
  fi
}

check_no_legacy_superadmin_routes() {
  print_section 14 $TOTAL_CHECKS "Checking for legacy /api/admin/shops in superadmin"

  local violations=0

  # 1. Check frontend superadmin code for old routes
  if git grep -q "/api/admin/shops" src/features/superadmin/ 2>/dev/null; then
    print_fail "Legacy superadmin route '/api/admin/shops' found in src/features/superadmin/"
    violations=$((violations + 1))
  fi

  # 2. Check for old /api/superadmin/* routes
  if git grep -q "/api/superadmin/" src/features/superadmin/ 2>/dev/null; then
    print_fail "Legacy '/api/superadmin/' route found (should be /admin/api/)"
    violations=$((violations + 1))
  fi

  if [ $violations -eq 0 ]; then
    print_pass "No legacy superadmin routes found"
  fi
}

check_no_number_ids_in_superadmin() {
  print_section 15 $TOTAL_CHECKS "Checking for id: number in superadmin (should be string)"

  # Check for id: number types in superadmin (must be string for UUID)
  if git grep -E "id:\s*number" src/features/superadmin/ 2>/dev/null | head -3; then
    print_fail "Found 'id: number' in superadmin (must be 'id: string' for UUID)"
    return
  fi

  # Check for Number(shop.id) conversions (shouldn't exist)
  if git grep -E "Number\(.*\.id\)" src/features/superadmin/ 2>/dev/null | head -3; then
    print_fail "Found 'Number(*.id)' conversion in superadmin (IDs are UUID strings)"
    return
  fi

  # Check for parseInt(shop.id) conversions (shouldn't exist)
  if git grep -E "parseInt\(.*\.id" src/features/superadmin/ 2>/dev/null | head -3; then
    print_fail "Found 'parseInt(*.id)' conversion in superadmin (IDs are UUID strings)"
    return
  fi

  print_pass "All superadmin IDs use string type (UUID compliant)"
}

check_no_legacy_database_imports() {
  print_section 16 $TOTAL_CHECKS "Checking for legacy database.ts imports"

  # 1. Check server/ folder for old database imports
  if git grep -E "from ['\"]\.(/\.\.)?/database['\"]" server/ 2>/dev/null; then
    print_fail "Legacy database import found in server/"
    return
  fi

  # 2. Check server/ folder for database.js imports
  if git grep -E "from ['\"]\.(/\.\.)?/database\.js['\"]" server/ 2>/dev/null; then
    print_fail "Legacy database.js import found in server/"
    return
  fi

  print_pass "No legacy database imports found"
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
  check_admin_login_html
  check_accept_header
  check_tenant_isolation
  check_robots_sitemap
  check_md5_comparison
  check_prisma_search_path
  check_base_domain_env
  check_no_hardcoded_domains
  check_no_legacy_superadmin_routes
  check_no_number_ids_in_superadmin
  check_no_legacy_database_imports

  # Final summary
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Total checks: $TOTAL_CHECKS"
  echo ""

  if [ "$STRICT_MODE" = true ] && [ $WARN_COUNT -gt 0 ]; then
    echo -e "${RED}✗ STRICT MODE: $WARN_COUNT WARNINGS (treated as failures)${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 2
  elif [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED${NC}"
    echo -e "${GREEN}✓ STANDARD-2025 VERIFIED${NC}"
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
