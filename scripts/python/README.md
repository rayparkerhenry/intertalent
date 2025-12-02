# GeoLocation Population Scripts for InterTalentShowcase Pipeline

This folder contains scripts to help populate the `GeoLocation` column in your Azure SQL table for fast radius search functionality.

## Why GeoLocation?

| Without GeoLocation              | With GeoLocation                |
| -------------------------------- | ------------------------------- |
| ~20 minutes per radius search    | ~330ms per radius search        |
| Geocodes each profile on-the-fly | Uses pre-computed spatial index |

## Files

- `populate_geolocation.py` - Main script to populate GeoLocation column
- `requirements.txt` - Python dependencies
- `zip_coordinates_cache.json` - Pre-cached coordinates for ~3,233 US zip codes

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

**Note:** You also need [ODBC Driver 18 for SQL Server](https://docs.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)

### 2. Configure the Script

Edit `populate_geolocation.py` and update the CONFIG section:

```python
CONFIG = {
    'server': 'ipsql2025.database.windows.net',
    'database': 'intertalent_DB',
    'username': 'YOUR_USERNAME',  # <-- Update this
    'password': 'YOUR_PASSWORD',  # <-- Update this
    'table_name': 'InterTalentShowcase',  # <-- Your table name
    ...
}
```

Or set environment variables:

```bash
set AZURE_SQL_USER=your_username
set AZURE_SQL_PASSWORD=your_password
```

### 3. Run the Script

```bash
python populate_geolocation.py
```

## What the Script Does

1. **Adds GeoLocation column** (if it doesn't exist)

   ```sql
   ALTER TABLE InterTalentShowcase ADD GeoLocation GEOGRAPHY NULL
   ```

2. **Creates spatial index** (if it doesn't exist)

   ```sql
   CREATE SPATIAL INDEX IX_InterTalentShowcase_GeoLocation
   ON InterTalentShowcase(GeoLocation)
   ```

3. **Fetches coordinates** for each unique zip code:
   - First checks local cache (`zip_coordinates_cache.json`)
   - If not cached, fetches from [Zippopotam.us API](https://api.zippopotam.us/)
   - Saves new coordinates to cache for future runs

4. **Updates records** with GeoLocation:
   ```sql
   UPDATE InterTalentShowcase
   SET GeoLocation = geography::Point(@lat, @lng, 4326)
   WHERE ZipCode = @zipCode
   ```

## Integration with Your Pipeline

### Option A: Run After Excel Import

Add this script to run after your Excel → SQL import process:

```bash
# Your existing pipeline
python import_from_excel.py

# Then run GeoLocation population
python populate_geolocation.py
```

### Option B: Modify Your Import Script

Add GeoLocation population directly in your import script:

```python
import requests

def get_coordinates(zip_code):
    """Get lat/lng for a US zip code"""
    try:
        resp = requests.get(f"https://api.zippopotam.us/us/{zip_code[:5]}", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            place = data['places'][0]
            return float(place['latitude']), float(place['longitude'])
    except:
        pass
    return None, None

# In your insert loop:
lat, lng = get_coordinates(row['ZipCode'])
if lat and lng:
    cursor.execute("""
        INSERT INTO InterTalentShowcase (Name, ZipCode, ..., GeoLocation)
        VALUES (?, ?, ..., geography::Point(?, ?, 4326))
    """, (name, zipcode, ..., lat, lng))
```

## Pre-Cached Zip Codes

The included `zip_coordinates_cache.json` contains ~3,233 US zip codes already geocoded. This covers most common zip codes and speeds up the population process significantly.

## Troubleshooting

### "ODBC Driver not found"

Install [ODBC Driver 18 for SQL Server](https://docs.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)

### "Cannot connect to database"

1. Check your credentials
2. Ensure your IP is allowed in Azure SQL firewall
3. Or enable "Allow Azure services" in SQL Server networking

### "Some zip codes not found"

Normal - some zip codes (PO Boxes, military, etc.) aren't in Zippopotam.us. These records will have NULL GeoLocation and will be excluded from radius searches.

## API Rate Limiting

The script includes a 100ms delay between API calls to respect Zippopotam.us rate limits. For large datasets, the cache significantly speeds up subsequent runs.
