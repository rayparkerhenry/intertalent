-- ============================================
-- Location Emails Table for InterTalent Portal
-- Azure SQL Database: intertalent_DB
-- ============================================

-- Drop table if exists (for clean re-creation)
IF OBJECT_ID('dbo.location_emails', 'U') IS NOT NULL
    DROP TABLE dbo.location_emails;
GO

-- Create the location_emails table
CREATE TABLE dbo.location_emails (
    id INT IDENTITY(1,1) PRIMARY KEY,
    market NVARCHAR(100) NOT NULL UNIQUE,
    email NVARCHAR(255) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

-- Create index on market for faster lookups
CREATE INDEX IX_location_emails_market ON dbo.location_emails(market);
GO

-- Insert all 77 location-email mappings from client's Excel
INSERT INTO dbo.location_emails (market, email) VALUES
('Albuquerque', 'albuquerque@intersolutions.com'),
('Atlanta East', 'atlantaeast@intersolutions.com'),
('Atlanta West', 'atlanta@intersolutions.com'),
('Austin North', 'austin@intersolutions.com'),
('Austin South', 'austinsouth@intersolutions.com'),
('Baltimore', 'baltimore@intersolutions.com'),
('Baton Rouge', 'batonrouge@intersolutions.com'),
('Bay Area', 'bayarea@intersolutions.com'),
('Birmingham', 'birmingham@intersolutions.com'),
('Boise', 'boise@intersolutions.com'),
('Boston', 'boston@intersolutions.com'),
('Charleston', 'charleston@intersolutions.com'),
('Charlotte', 'charlotte@intersolutions.com'),
('Chicago', 'chicago@intersolutions.com'),
('Cincinnati', 'cincinnati@intersolutions.com'),
('Cleveland', 'cleveland@intersolutions.com'),
('Columbia', 'columbia@intersolutions.com'),
('Columbus', 'columbus@intersolutions.com'),
('Concierge', 'concierge@intersolutions.com'),
('Dallas North', 'dallas@intersolutions.com'),
('Dallas South', 'southdallas@intersolutions.com'),
('DC Metro', 'maryland_dc@intersolutions.com'),
('Delaware County', 'delawarecounty@intersolutions.com'),
('Denver', 'denver@intersolutions.com'),
('Des Moines', 'desmoines@intersolutions.com'),
('Detroit', 'detroit@intersolutions.com'),
('El Paso', 'elpaso@intersolutions.com'),
('Fort Lauderdale', 'fortlauderdale@intersolutions.com'),
('Fort Worth', 'fortworth@intersolutions.com'),
('Greensboro', 'greensboro@intersolutions.com'),
('Greenville', 'greenville@intersolutions.com'),
('Houston East', 'houstoneast@intersolutions.com'),
('Houston North', 'houston@intersolutions.com'),
('Houston South', 'houstonsouth@intersolutions.com'),
('Houston West', 'houstonwest@intersolutions.com'),
('Indianapolis', 'indianapolis@intersolutions.com'),
('Inland Empire', 'inlandempire@intersolutions.com'),
('Jacksonville', 'jacksonville@intersolutions.com'),
('Kansas City', 'kc@intersolutions.com'),
('Las Vegas', 'lasvegas@intersolutions.com'),
('Little Rock', 'littlerock@intersolutions.com'),
('Los Angeles East', 'losangeleseast@intersolutions.com'),
('Los Angeles West', 'losangeles@intersolutions.com'),
('Louisville', 'louisville@intersolutions.com'),
('Maryland', 'maryland@intersolutions.com'),
('Memphis', 'memphis@intersolutions.com'),
('Miami', 'miami@intersolutions.com'),
('Milwaukee', 'milwaukee@intersolutions.com'),
('Minneapolis', 'twincities@intersolutions.com'),
('Myrtle Beach', 'myrtlebeach@intersolutions.com'),
('Nashville', 'nashville@intersolutions.com'),
('New Orleans', 'neworleans@intersolutions.com'),
('Norfolk', 'norfolk@intersolutions.com'),
('Northern California North', 'norcalnorth@intersolutions.com'),
('Northern California South', 'norcalsouth@intersolutions.com'),
('Northern Virginia', 'virginia@intersolutions.com'),
('Oklahoma City', 'oklahomacity@intersolutions.com'),
('Omaha', 'omaha@intersolutions.com'),
('Orange County', 'orangecounty@intersolutions.com'),
('Orlando', 'orlando@intersolutions.com'),
('Pensacola', 'pensacola@intersolutions.com'),
('Philadelphia', 'philadelphia@intersolutions.com'),
('Phoenix', 'phoenix@intersolutions.com'),
('Pittsburgh', 'pittsburgh@intersolutions.com'),
('Portland', 'portland@intersolutions.com'),
('Raleigh', 'raleigh@intersolutions.com'),
('Richmond', 'richmond@intersolutions.com'),
('Salt Lake City', 'saltlakecity@intersolutions.com'),
('San Antonio', 'sanantonio@intersolutions.com'),
('San Diego', 'sandiego@intersolutions.com'),
('San Francisco', 'sanfran@intersolutions.com'),
('Seattle', 'seattle@intersolutions.com'),
('St. Louis', 'stlouis@intersolutions.com'),
('Tampa', 'tampa@intersolutions.com'),
('Tulsa', 'tulsa@intersolutions.com'),
('West Texas', 'westtexas@intersolutions.com'),
('Wilmington', 'wilmington@intersolutions.com');
GO

-- Add a default entry for fallback
INSERT INTO dbo.location_emails (market, email) VALUES
('Default', 'info@intersolutions.com');
GO

-- Verify the data
SELECT COUNT(*) AS TotalRecords FROM dbo.location_emails;
SELECT * FROM dbo.location_emails ORDER BY market;
GO
