#!/usr/bin/env bash
#
# Setup SSL for DEV domains (*.dev.x-bro.com)
#
# IMPORTANT: Run this on the SERVER, not locally
# Usage: ssh root@46.224.19.173 'bash -s' < scripts/setup-dev-ssl.sh
#

set -euo pipefail

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Setting up SSL for *.dev.x-bro.com"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
  echo "❌ certbot not found"
  echo ""
  echo "Install certbot first:"
  echo "  apt-get update"
  echo "  apt-get install -y certbot python3-certbot-nginx"
  exit 1
fi

# Request wildcard certificate
echo ""
echo "📜 Requesting SSL certificate..."
echo "Domains: dev.x-bro.com, *.dev.x-bro.com"
echo ""

certbot certonly --nginx \
  -d dev.x-bro.com \
  -d "*.dev.x-bro.com" \
  --agree-tos \
  --non-interactive

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ SSL certificate obtained successfully!"
  echo ""
  echo "Certificate location:"
  echo "  /etc/letsencrypt/live/dev.x-bro.com/fullchain.pem"
  echo "  /etc/letsencrypt/live/dev.x-bro.com/privkey.pem"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Next steps:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "1. Update /etc/nginx/sites-available/x-bro.com"
  echo "2. Add wildcard server block for *.dev.x-bro.com → localhost:3001"
  echo "3. nginx -t && systemctl reload nginx"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
  echo "❌ Failed to obtain SSL certificate"
  exit 1
fi
