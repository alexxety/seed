-- Store Settings table for each tenant schema
-- This table holds theme and branding configuration for each shop

CREATE TABLE IF NOT EXISTS store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    brand_color TEXT NOT NULL DEFAULT '#0ea5e9',
    logo_path TEXT,
    currency TEXT NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups (though usually only 1 row)
CREATE INDEX IF NOT EXISTS idx_store_settings_updated ON store_settings(updated_at);

-- Insert default settings (if table is empty)
-- This will be customized per tenant during seeding
