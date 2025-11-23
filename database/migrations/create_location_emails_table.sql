-- Create location_emails table for office email lookups
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS location_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_location_emails_location ON location_emails(location);

-- Enable Row Level Security (optional - allows public read)
ALTER TABLE location_emails ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access (contacts need to lookup emails)
CREATE POLICY "Allow public read access" ON location_emails
  FOR SELECT
  USING (true);

-- Policy: Only authenticated users can insert/update
CREATE POLICY "Allow authenticated insert" ON location_emails
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update" ON location_emails
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Sample data (update with real office locations and emails)
INSERT INTO location_emails (location, email, city, state) VALUES
  ('Baltimore', 'baltimore@intersolutions.com', 'Baltimore', 'MD'),
  ('Cincinnati', 'cincinnati@intersolutions.com', 'Cincinnati', 'OH'),
  ('Chicago', 'chicago@intersolutions.com', 'Chicago', 'IL'),
  ('Denver', 'denver@intersolutions.com', 'Denver', 'CO'),
  ('Phoenix', 'phoenix@intersolutions.com', 'Phoenix', 'AZ'),
  ('Default', 'info@intersolutions.com', NULL, NULL)
ON CONFLICT (location) DO NOTHING;

-- Function to get email by location with fallback to default
CREATE OR REPLACE FUNCTION get_office_email(office_location TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT email 
    FROM location_emails 
    WHERE location ILIKE office_location
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE location_emails IS 'Maps office locations to contact email addresses for Request Associate feature';
