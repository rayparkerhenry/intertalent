"""
GeoLocation Population Script for InterTalentShowcase Table
============================================================

This script populates the GeoLocation column in the InterTalentShowcase table
using coordinates from the free Zippopotam.us API.

Prerequisites:
    pip install pyodbc requests

Usage:
    python populate_geolocation.py

Environment Variables (or edit the config below):
    AZURE_SQL_SERVER=ipsql2025.database.windows.net
    AZURE_SQL_DATABASE=intertalent_DB
    AZURE_SQL_USER=your_username
    AZURE_SQL_PASSWORD=your_password

The script will:
1. Fetch all unique zip codes that don't have GeoLocation set
2. Look up coordinates from Zippopotam.us API (with caching)
3. Update the GeoLocation column with GEOGRAPHY points
4. Create spatial index if it doesn't exist
"""

import os
import json
import time
import requests
import pyodbc
from typing import Optional, Dict, Tuple
from pathlib import Path

# ============================================
# CONFIGURATION - Update these values
# ============================================
CONFIG = {
    'server': os.getenv('AZURE_SQL_SERVER', 'ipsql2025.database.windows.net'),
    'database': os.getenv('AZURE_SQL_DATABASE', 'intertalent_DB'),
    'username': os.getenv('AZURE_SQL_USER', 'YOUR_USERNAME_HERE'),
    'password': os.getenv('AZURE_SQL_PASSWORD', 'YOUR_PASSWORD_HERE'),
    'table_name': 'InterTalentShowcase',  # Change to your table name
    'cache_file': 'zip_coordinates_cache.json',
    'api_delay': 0.1,  # Seconds between API calls (rate limiting)
}

# ============================================
# ZIP COORDINATE CACHE
# ============================================
class ZipCache:
    def __init__(self, cache_file: str):
        self.cache_file = cache_file
        self.cache: Dict[str, Optional[Tuple[float, float]]] = {}
        self.load()
    
    def load(self):
        """Load cache from file"""
        if Path(self.cache_file).exists():
            try:
                with open(self.cache_file, 'r') as f:
                    data = json.load(f)
                    for zip_code, coords in data.items():
                        if coords:
                            self.cache[zip_code] = (coords['lat'], coords['lng'])
                        else:
                            self.cache[zip_code] = None
                print(f"📁 Loaded {len(self.cache)} cached zip coordinates")
            except Exception as e:
                print(f"⚠️  Could not load cache: {e}")
    
    def save(self):
        """Save cache to file"""
        data = {}
        for zip_code, coords in self.cache.items():
            if coords:
                data[zip_code] = {'lat': coords[0], 'lng': coords[1]}
            else:
                data[zip_code] = None
        
        with open(self.cache_file, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"💾 Saved {len(self.cache)} zip coordinates to cache")
    
    def get(self, zip_code: str) -> Optional[Tuple[float, float]]:
        """Get coordinates from cache"""
        zip5 = zip_code[:5] if zip_code else None
        if zip5 and zip5 in self.cache:
            return self.cache[zip5]
        return None
    
    def set(self, zip_code: str, coords: Optional[Tuple[float, float]]):
        """Set coordinates in cache"""
        zip5 = zip_code[:5] if zip_code else None
        if zip5:
            self.cache[zip5] = coords
    
    def has(self, zip_code: str) -> bool:
        """Check if zip code is in cache"""
        zip5 = zip_code[:5] if zip_code else None
        return zip5 in self.cache if zip5 else False


# ============================================
# ZIPPOPOTAM.US API
# ============================================
def fetch_zip_coordinates(zip_code: str, delay: float = 0.1) -> Optional[Tuple[float, float]]:
    """
    Fetch coordinates for a US zip code using Zippopotam.us API
    Returns (latitude, longitude) or None if not found
    """
    zip5 = zip_code[:5] if zip_code else None
    if not zip5 or not zip5.isdigit():
        return None
    
    try:
        time.sleep(delay)  # Rate limiting
        response = requests.get(
            f"https://api.zippopotam.us/us/{zip5}",
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            if 'places' in data and len(data['places']) > 0:
                place = data['places'][0]
                lat = float(place['latitude'])
                lng = float(place['longitude'])
                return (lat, lng)
        
        return None
    except Exception as e:
        print(f"⚠️  API error for {zip5}: {e}")
        return None


# ============================================
# DATABASE OPERATIONS
# ============================================
def get_connection():
    """Create Azure SQL connection"""
    conn_str = (
        f"DRIVER={{ODBC Driver 18 for SQL Server}};"
        f"SERVER={CONFIG['server']};"
        f"DATABASE={CONFIG['database']};"
        f"UID={CONFIG['username']};"
        f"PWD={CONFIG['password']};"
        f"Encrypt=yes;"
        f"TrustServerCertificate=no;"
    )
    return pyodbc.connect(conn_str)


def ensure_geolocation_column(cursor):
    """Add GeoLocation column if it doesn't exist"""
    table = CONFIG['table_name']
    
    # Check if column exists
    cursor.execute(f"""
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '{table}' AND COLUMN_NAME = 'GeoLocation'
    """)
    
    if cursor.fetchone()[0] == 0:
        print(f"➕ Adding GeoLocation column to {table}...")
        cursor.execute(f"ALTER TABLE {table} ADD GeoLocation GEOGRAPHY NULL")
        cursor.commit()
        print("✅ GeoLocation column added")
    else:
        print(f"✅ GeoLocation column already exists in {table}")


def ensure_spatial_index(cursor):
    """Create spatial index if it doesn't exist"""
    table = CONFIG['table_name']
    index_name = f"IX_{table}_GeoLocation"
    
    # Check if index exists
    cursor.execute(f"""
        SELECT COUNT(*) FROM sys.indexes 
        WHERE name = '{index_name}'
    """)
    
    if cursor.fetchone()[0] == 0:
        print(f"➕ Creating spatial index {index_name}...")
        cursor.execute(f"""
            CREATE SPATIAL INDEX {index_name} 
            ON {table}(GeoLocation)
        """)
        cursor.commit()
        print("✅ Spatial index created")
    else:
        print(f"✅ Spatial index {index_name} already exists")


def get_zips_needing_coordinates(cursor) -> list:
    """Get all unique zip codes that don't have GeoLocation set"""
    table = CONFIG['table_name']
    
    cursor.execute(f"""
        SELECT DISTINCT ZipCode 
        FROM {table} 
        WHERE ZipCode IS NOT NULL 
          AND ZipCode != ''
          AND GeoLocation IS NULL
    """)
    
    return [row[0] for row in cursor.fetchall()]


def update_geolocation(cursor, zip_code: str, lat: float, lng: float) -> int:
    """Update GeoLocation for all records with given zip code"""
    table = CONFIG['table_name']
    
    cursor.execute(f"""
        UPDATE {table}
        SET GeoLocation = geography::Point(?, ?, 4326)
        WHERE ZipCode = ? AND GeoLocation IS NULL
    """, (lat, lng, zip_code))
    
    return cursor.rowcount


# ============================================
# MAIN SCRIPT
# ============================================
def main():
    print("=" * 60)
    print("GeoLocation Population Script")
    print("=" * 60)
    print(f"Server: {CONFIG['server']}")
    print(f"Database: {CONFIG['database']}")
    print(f"Table: {CONFIG['table_name']}")
    print()
    
    # Load cache
    cache = ZipCache(CONFIG['cache_file'])
    
    # Connect to database
    print("🔌 Connecting to Azure SQL...")
    try:
        conn = get_connection()
        cursor = conn.cursor()
        print("✅ Connected!\n")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return
    
    try:
        # Ensure column and index exist
        ensure_geolocation_column(cursor)
        ensure_spatial_index(cursor)
        print()
        
        # Get zip codes needing coordinates
        print("🔍 Finding zip codes needing GeoLocation...")
        zips_to_process = get_zips_needing_coordinates(cursor)
        print(f"   Found {len(zips_to_process)} unique zip codes to process\n")
        
        if not zips_to_process:
            print("✅ All records already have GeoLocation!")
            return
        
        # Process zip codes
        print("📍 Fetching coordinates and updating records...")
        updated_total = 0
        found = 0
        not_found = 0
        from_cache = 0
        from_api = 0
        
        for i, zip_code in enumerate(zips_to_process):
            # Try cache first
            coords = cache.get(zip_code)
            
            if coords:
                from_cache += 1
            elif not cache.has(zip_code):
                # Fetch from API
                coords = fetch_zip_coordinates(zip_code, CONFIG['api_delay'])
                cache.set(zip_code, coords)
                from_api += 1
            
            if coords:
                lat, lng = coords
                rows_updated = update_geolocation(cursor, zip_code, lat, lng)
                updated_total += rows_updated
                found += 1
            else:
                not_found += 1
            
            # Progress update
            if (i + 1) % 50 == 0 or (i + 1) == len(zips_to_process):
                print(f"   Progress: {i + 1}/{len(zips_to_process)} zips "
                      f"({found} found, {not_found} invalid, {updated_total} rows updated)")
        
        # Commit changes
        conn.commit()
        print()
        
        # Save cache
        cache.save()
        
        # Summary
        print()
        print("=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Zip codes processed:  {len(zips_to_process)}")
        print(f"  - From cache:       {from_cache}")
        print(f"  - From API:         {from_api}")
        print(f"  - Found:            {found}")
        print(f"  - Not found:        {not_found}")
        print(f"Total rows updated:   {updated_total}")
        print("=" * 60)
        
    finally:
        cursor.close()
        conn.close()
        print("\n🔌 Connection closed")


if __name__ == "__main__":
    main()
