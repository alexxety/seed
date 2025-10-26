#!/bin/bash

# PostgreSQL Setup Script for Ubuntu/Debian
# Run this on your droplet: bash setup-postgres.sh

set -e

echo "🚀 Starting PostgreSQL setup..."

# Update system
echo "📦 Updating system packages..."
apt-get update

# Install PostgreSQL
echo "🐘 Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
echo "▶️  Starting PostgreSQL service..."
systemctl start postgresql
systemctl enable postgresql

# Create database and user
echo "👤 Creating database and user..."
sudo -u postgres psql << EOF
-- Create user
CREATE USER seedshop WITH PASSWORD 'seedshop_secure_password_2025';

-- Create database
CREATE DATABASE seedshop OWNER seedshop;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE seedshop TO seedshop;

-- Connect to database and grant schema privileges
\c seedshop
GRANT ALL ON SCHEMA public TO seedshop;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO seedshop;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO seedshop;

EOF

# Configure PostgreSQL for remote connections (if needed)
echo "🔧 Configuring PostgreSQL..."

# Allow password authentication for local connections
PG_HBA="/etc/postgresql/*/main/pg_hba.conf"
sed -i 's/local\s*all\s*all\s*peer/local   all             all                                     md5/' $PG_HBA

# Optional: Allow remote connections (be careful with security!)
# Uncomment these lines if you need to connect from outside the droplet
# PG_CONF="/etc/postgresql/*/main/postgresql.conf"
# sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" $PG_CONF
# echo "host    all             all             0.0.0.0/0               md5" >> $PG_HBA

# Restart PostgreSQL
echo "🔄 Restarting PostgreSQL..."
systemctl restart postgresql

# Test connection
echo "✅ Testing connection..."
sudo -u postgres psql -c "SELECT version();"

echo ""
echo "✅ PostgreSQL setup complete!"
echo ""
echo "📝 Database credentials:"
echo "  Host: localhost (or 143.198.141.222 for remote)"
echo "  Port: 5432"
echo "  Database: seedshop"
echo "  User: seedshop"
echo "  Password: seedshop_secure_password_2025"
echo ""
echo "🔗 Connection string:"
echo "  postgresql://seedshop:seedshop_secure_password_2025@localhost:5432/seedshop"
echo ""
echo "⚠️  IMPORTANT: Change the password in production!"
echo "  sudo -u postgres psql -c \"ALTER USER seedshop WITH PASSWORD 'your_new_password';\""
