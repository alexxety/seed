#!/usr/bin/env bash
#
# Verify cleanup changes (Standard-2025 compliance)
#

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Verifying Cleanup Changes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PASS=0
FAIL=0

# 1. Placeholder logo exists (SVG format)
echo ""
echo "[1] Placeholder logo exists (SVG)"
if test -f public/assets/placeholder-logo.svg; then
  echo "  ✅ PASS"
  ((PASS++))
else
  echo "  ❌ FAIL"
  ((FAIL++))
fi

# 2. Duplicate database-tenant.ts deleted
echo ""
echo "[2] Duplicate database-tenant.ts deleted"
if test ! -f database-tenant.ts; then
  echo "  ✅ PASS"
  ((PASS++))
else
  echo "  ❌ FAIL"
  ((FAIL++))
fi

# 3. Scripts structure (ops/)
echo ""
echo "[3] Scripts ops/ directory exists"
if test -d scripts/ops; then
  echo "  ✅ PASS"
  ((PASS++))
else
  echo "  ❌ FAIL"
  ((FAIL++))
fi

# 4. Migrations archive exists
echo ""
echo "[4] Migrations archive/ directory exists"
if test -d scripts/migrations/archive; then
  echo "  ✅ PASS"
  ((PASS++))
else
  echo "  ❌ FAIL"
  ((FAIL++))
fi

# 5. create-tenant.ts in ops/
echo ""
echo "[5] create-tenant.ts in ops/"
if test -f scripts/ops/create-tenant.ts; then
  echo "  ✅ PASS"
  ((PASS++))
else
  echo "  ❌ FAIL"
  ((FAIL++))
fi

# 6. Ecosystem moved to ops/pm2/
echo ""
echo "[6] Ecosystem example in ops/pm2/"
if test -f ops/pm2/ecosystem.example.cjs; then
  echo "  ✅ PASS"
  ((PASS++))
else
  echo "  ❌ FAIL"
  ((FAIL++))
fi

# 7. .gitignore updated
echo ""
echo "[7] .gitignore contains archive pattern"
if grep -q 'scripts/migrations/archive/' .gitignore; then
  echo "  ✅ PASS"
  ((PASS++))
else
  echo "  ❌ FAIL"
  ((FAIL++))
fi

# 8. database.ts removed (VARIANT B)
echo ""
echo "[8] Legacy database.ts deleted"
if test ! -f database.ts; then
  echo "  ✅ PASS"
  ((PASS++))
else
  echo "  ❌ FAIL"
  ((FAIL++))
fi

# 9. Logo paths use .svg (not .png) in service.ts
echo ""
echo "[9] service.ts uses placeholder-logo.svg"
if grep -q 'placeholder-logo.svg' server/src/storefront/service.ts; then
  echo "  ✅ PASS"
  ((PASS++))
else
  echo "  ❌ FAIL"
  ((FAIL++))
fi

# 10. Logo paths use .svg in tenants.ts
echo ""
echo "[10] tenants.ts uses placeholder-logo.svg"
if grep -q 'placeholder-logo.svg' server/src/db/tenants.ts; then
  echo "  ✅ PASS"
  ((PASS++))
else
  echo "  ❌ FAIL"
  ((FAIL++))
fi

# 11. TypeScript compiles
echo ""
echo "[11] TypeScript compiles without errors"
if npx tsc --noEmit > /dev/null 2>&1; then
  echo "  ✅ PASS"
  ((PASS++))
else
  echo "  ❌ FAIL (run 'npx tsc --noEmit' for details)"
  ((FAIL++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Results: $PASS passed, $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAIL -gt 0 ]; then
  echo "❌ Some checks failed"
  exit 1
fi

echo "✅ All cleanup verification checks passed!"
