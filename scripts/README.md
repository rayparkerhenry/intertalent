# InterTalent Portal - Deployment & Pipeline Scripts

## Folder Structure

```
scripts/
├── python/                     # Python scripts for data pipeline
│   ├── populate_geolocation.py # GeoLocation population script
│   ├── requirements.txt        # Python dependencies
│   ├── zip_coordinates_cache.json # Pre-cached zip coordinates
│   └── README.md               # Python scripts documentation
│
├── import-to-ray-test-accurate.ts  # TypeScript import with accurate coords
├── test-radius-search.ts           # Test script for radius search
└── ... other utility scripts
```

## For Client: GeoLocation Pipeline Integration

See `scripts/python/README.md` for detailed instructions on integrating GeoLocation population into your Excel → Azure SQL pipeline.

### Quick Summary

1. After importing data to `InterTalentShowcase`, run:

   ```bash
   cd scripts/python
   pip install -r requirements.txt
   python populate_geolocation.py
   ```

2. This adds the `GeoLocation` column (GEOGRAPHY type) with spatial coordinates from zip codes.

3. Enables fast radius search (~330ms vs ~20 minutes).

## Pre-Cached Coordinates

The `zip_coordinates_cache.json` file contains ~3,233 US zip codes with accurate lat/lng coordinates from Zippopotam.us API. This covers most zip codes in the employee data.
