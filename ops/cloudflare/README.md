# Cloudflare Cache Rules Management

## Overview

This directory contains automation for managing Cloudflare Cache Rules for the `x-bro.com` zone.

## Architecture

### Two-Token Security Model

We use **two separate API tokens** for different operations to follow the principle of least privilege:

1. **`CF_RULES_TOKEN`** (Cache Rules Management)
   - Permission: `Zone → Cache Rules: Edit`
   - Purpose: Create, update, and manage cache rules via Rulesets API
   - Used in: `.github/workflows/cf-cache-rules.yml` (apply-cache-rules job)

2. **`CLOUDFLARE_API_TOKEN`** (Cache Purge)
   - Permission: `Zone → Cache Purge: Purge`
   - Purpose: Purge specific URLs from Cloudflare cache
   - Used in: `.github/workflows/cf-cache-rules.yml` (purge-cache job)

3. **`CLOUDFLARE_ZONE_ID`**
   - The zone identifier for `x-bro.com`
   - Required for all Cloudflare API requests

**Why separate tokens?**
- **Security**: If one token is compromised, the attacker only has access to a limited set of operations
- **Auditability**: Different tokens make it easier to track which system performed which action
- **Compliance**: Follows security best practices for API token management

## Domain Configuration

### DNS Mode Status

- **demo.x-bro.com**: DNS only (⚪ grey cloud)
  - Traffic goes directly to origin (46.224.19.173)
  - Cloudflare cache rules do NOT apply
  - No `cf-*` headers in responses
  - **This is expected and correct**

- **testshop.x-bro.com**: Proxied (🟠 orange cloud)
  - Traffic goes through Cloudflare proxy
  - Cache rules apply to this subdomain
  - `cf-cache-status` header shows cache behavior
  - Should show `BYPASS` or `DYNAMIC` for `/robots.txt` and `/sitemap.xml` (both mean NOT cached)

## SEO Endpoints Implementation

The application correctly returns proper Content-Type headers:
- `/robots.txt`: `text/plain; charset=utf-8`
- `/sitemap.xml`: `application/xml; charset=utf-8`

These endpoints are tenant-aware and dynamically generated based on subdomain.

## Current Cache Rules

The following cache rules are applied to **Proxied subdomains only**:

### 1. Bypass robots.txt
```
Expression: (http.request.uri.path eq "/robots.txt")
Action: Bypass cache (cache: false)
Status: ✅ Active
```

### 2. Bypass sitemap.xml
```
Expression: (http.request.uri.path eq "/sitemap.xml")
Action: Bypass cache (cache: false)
Status: ✅ Active
```

### 3. Cache assets (future)
```
Expression: (http.request.uri.path matches "^/assets/.*")
Action: Cache everything, Edge TTL 30 days
Status: 💤 Commented out in workflow (ready to enable)
```

## How to Use

### Manual Workflow Trigger

To apply or update cache rules manually:

1. Go to **Actions** tab in GitHub
2. Select **"Cloudflare Cache Rules"** workflow
3. Click **"Run workflow"**
4. Select branch (usually `dev` or `main`)
5. Click **"Run workflow"** button

This will:
- Apply cache rules to Cloudflare
- **Automatically perform targeted purge** for SEO endpoints (testshop.x-bro.com)
- Verify the rules are active
- Test cache status on live domains

**Important**: Targeted purge is executed automatically in the `apply-cache-rules` job to ensure new rules take effect immediately.

### Automatic Triggers

The workflow also runs automatically on:
- Push to `dev` or `main` branches (when workflow file changes)

## Verification

### Check Cache Status

After applying rules, verify they work correctly:

```bash
# testshop.x-bro.com (Proxied - should show BYPASS or DYNAMIC)
curl -I https://testshop.x-bro.com/robots.txt | grep -i cf-cache-status
# Expected: cf-cache-status: BYPASS or DYNAMIC (both mean NOT cached)

curl -I https://testshop.x-bro.com/sitemap.xml | grep -i cf-cache-status
# Expected: cf-cache-status: BYPASS or DYNAMIC (both mean NOT cached)

# demo.x-bro.com (DNS only - no CF headers)
curl -I https://demo.x-bro.com/robots.txt | grep -i server
# Expected: server: nginx/1.24.0 (Ubuntu)
# No cf-* headers - this is correct for DNS only mode
```

### Understanding Cache Status Headers

- **`BYPASS`**: Rule is working, request bypasses cache ✅
- **`DYNAMIC`**: Content not cached (bypass rules working correctly) ✅
- **`MISS`**: First request after purge, not in cache yet (rule will apply) ✅
- **`HIT`**: Served from cache (rule NOT working) ❌
- **No header**: DNS only mode (expected for demo) ✅

**Important**: `DYNAMIC` and `BYPASS` both indicate successful cache bypass. Cloudflare shows `DYNAMIC` when the content-type suggests dynamic content (e.g., HTML). Since the current server implementation returns `text/html` for robots.txt/sitemap.xml (separate issue), Cloudflare correctly classifies them as dynamic and does NOT cache them - which is exactly what we want.

## Manual Cache Purge

If you need to purge cache for specific URLs without running the full workflow:

### Using GitHub Actions (Recommended)

1. Trigger the workflow with `workflow_dispatch`
2. The `purge-cache` job will automatically run after rules are applied

### Using Server .env (Direct access)

If you have SSH access to the server:

```bash
ssh root@46.224.19.173
cd /var/www/telegram-shop-dev
set -a; source .env; set +a

curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"files":[
    "https://testshop.x-bro.com/robots.txt",
    "https://testshop.x-bro.com/sitemap.xml"
  ]}' | grep -o '"success":[^,]*'
```

This will show `"success":true` if purge completed successfully.

### Using curl (for debugging)

**⚠️ Never expose your API token in logs or commit it to git!**

```bash
# Set environment variables (never echo these!)
export CF_PURGE_TOKEN="<your-token-here>"
export ZONE_ID="<your-zone-id>"

# Purge specific files
curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_PURGE_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "files": [
      "https://testshop.x-bro.com/robots.txt",
      "https://testshop.x-bro.com/sitemap.xml"
    ]
  }'
```

## Troubleshooting

### Cache rules not working (still seeing HIT)

1. **Verify the subdomain is Proxied**
   ```bash
   curl -I https://testshop.x-bro.com/robots.txt | grep -i server
   # Should show: server: cloudflare
   ```

2. **Check if rules are applied**
   - Go to Cloudflare Dashboard → x-bro.com → Caching → Cache Rules
   - Should see 2 rules for robots.txt and sitemap.xml

3. **Purge cache manually**
   - Run workflow with `workflow_dispatch` to trigger purge
   - Or use Cloudflare Dashboard → Caching → Purge Cache

4. **Wait for propagation**
   - Cache rules can take 1-2 minutes to propagate globally
   - Try again after a few minutes

5. **Perform targeted purge after rule changes**
   - After updating cache rules, existing cached content won't be affected
   - Always run targeted purge to force new rules to apply immediately
   - The workflow includes automatic purge job when triggered via `workflow_dispatch`
   - Or purge manually via server (see Manual Cache Purge section)

### demo.x-bro.com not showing BYPASS

This is **expected behavior**! Demo is DNS only (grey cloud), so:
- No Cloudflare proxy
- No cache rules apply
- No `cf-*` headers in responses
- Direct connection to origin server

**This is correct and optimal** - no action needed.

### Workflow fails with authentication error

1. **Check GitHub Secrets**
   ```bash
   gh secret list -R alexxety/seed | grep CLOUDFLARE
   ```
   Should show:
   - CF_RULES_TOKEN
   - CLOUDFLARE_API_TOKEN
   - CLOUDFLARE_ZONE_ID

2. **Verify token permissions in Cloudflare**
   - Go to Cloudflare Dashboard → Profile → API Tokens
   - Check that CF_RULES_TOKEN has `Zone → Cache Rules: Edit`
   - Check that CLOUDFLARE_API_TOKEN has `Zone → Cache Purge: Purge`

3. **Rotate tokens if needed**
   - Create new tokens in Cloudflare Dashboard
   - Update GitHub Secrets:
     ```bash
     gh secret set CF_RULES_TOKEN -R alexxety/seed
     gh secret set CLOUDFLARE_API_TOKEN -R alexxety/seed
     ```

## Security Best Practices

### ✅ DO
- Use separate tokens for different operations
- Always mask secrets in GitHub Actions logs
- Rotate tokens periodically (every 3-6 months)
- Use minimal required permissions for each token
- Store tokens in GitHub Secrets, never in code

### ❌ DON'T
- Never commit tokens to git
- Never echo token values in logs
- Never use a single token for all operations
- Never share tokens between environments (dev/prod)
- Never expose tokens in error messages

## Future Enhancements

### Enable Assets Caching

To enable 30-day caching for `/assets/*`:

1. Edit `.github/workflows/cf-cache-rules.yml`
2. Uncomment the "Add Assets Caching Rule" step
3. Commit and push
4. Run workflow to apply

This will cache all files under `/assets/` for 30 days with:
- Edge TTL: 30 days (override origin)
- Browser TTL: respect origin headers

## References

- [Cloudflare Cache Rules API](https://developers.cloudflare.com/api/operations/rulesets-create-a-zone-ruleset)
- [Cloudflare Purge Cache API](https://developers.cloudflare.com/api/operations/zone-purge)
- [Cache Rules Documentation](https://developers.cloudflare.com/cache/how-to/cache-rules/)

## Support

For issues or questions:
1. Check GitHub Actions logs for error details
2. Review this README for common issues
3. Check Cloudflare Dashboard for rule status
4. Create an issue in the repository

---

**Last Updated**: November 1, 2025
**Maintainer**: DevOps Team
**Status**: ✅ Active
