/**
 * Geospatial Search Utilities
 * Handles zip code to lat/lng conversion and distance calculations
 */

/**
 * Simple zip code to approximate lat/lng lookup
 * For production, use a proper zip code database or API
 * This uses a basic US zip code approximation
 */
export interface ZipLocation {
  zip: string;
  lat: number;
  lng: number;
}

/**
 * Calculate distance between two lat/lng points using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Get lat/lng for a zip code
 * Uses free ZipCodeAPI (https://www.zippopotam.us/)
 * Falls back to approximate calculation
 */
export async function getZipLocation(
  zipCode: string
): Promise<ZipLocation | null> {
  try {
    // Try ZipCodeAPI first
    const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`);

    if (response.ok) {
      const data = await response.json();
      if (data.places && data.places[0]) {
        return {
          zip: zipCode,
          lat: parseFloat(data.places[0].latitude),
          lng: parseFloat(data.places[0].longitude),
        };
      }
    }
  } catch (error) {
    console.warn('Zip code API failed, using fallback:', error);
  }

  // Fallback: approximate based on first 3 digits
  // This is VERY rough and only for demo purposes
  return getApproximateZipLocation(zipCode);
}

/**
 * Approximate lat/lng based on first 3 digits of zip code
 * US zip codes are geographically organized by prefix
 */
function getApproximateZipLocation(zipCode: string): ZipLocation | null {
  if (zipCode.length < 3) return null;

  const prefix = parseInt(zipCode.substring(0, 3));

  // Approximate centers for major zip prefixes
  // Source: USPS zip code allocation
  const zipRanges: { [key: string]: { lat: number; lng: number } } = {
    // Northeast
    '010-027': { lat: 42.0, lng: -71.0 }, // MA
    '028-029': { lat: 41.8, lng: -71.4 }, // RI
    '030-038': { lat: 43.0, lng: -71.5 }, // NH
    '039-049': { lat: 44.5, lng: -69.0 }, // ME
    '050-059': { lat: 44.0, lng: -72.7 }, // VT
    '060-069': { lat: 41.6, lng: -72.7 }, // CT
    '100-149': { lat: 40.7, lng: -74.0 }, // NY
    '150-196': { lat: 39.9, lng: -75.2 }, // PA
    '197-199': { lat: 39.3, lng: -76.6 }, // DE, MD

    // Southeast
    '200-205': { lat: 38.9, lng: -77.0 }, // DC, VA
    '220-246': { lat: 37.5, lng: -77.5 }, // VA
    '247-268': { lat: 35.8, lng: -78.6 }, // WV, NC
    '270-289': { lat: 33.7, lng: -84.4 }, // SC, GA
    '290-299': { lat: 33.5, lng: -86.8 }, // SC
    '300-329': { lat: 30.3, lng: -81.7 }, // FL
    '330-349': { lat: 33.5, lng: -86.8 }, // AL
    '350-369': { lat: 32.3, lng: -86.3 }, // AL
    '370-397': { lat: 35.5, lng: -86.6 }, // TN
    '398-399': { lat: 38.2, lng: -85.7 }, // KY

    // Midwest
    '400-427': { lat: 38.6, lng: -90.2 }, // KY, IN
    '430-458': { lat: 41.9, lng: -87.6 }, // IN, IL
    '460-479': { lat: 41.9, lng: -87.6 }, // IL
    '480-499': { lat: 42.3, lng: -83.0 }, // MI
    '500-528': { lat: 41.6, lng: -93.6 }, // IA
    '530-549': { lat: 43.1, lng: -89.4 }, // WI
    '550-567': { lat: 44.9, lng: -93.3 }, // MN
    '570-577': { lat: 46.8, lng: -100.8 }, // SD, ND
    '580-588': { lat: 46.8, lng: -100.8 }, // MT, ND
    '590-599': { lat: 46.6, lng: -112.0 }, // MT

    // South Central
    '600-629': { lat: 41.3, lng: -96.0 }, // IL, MO
    '630-658': { lat: 38.6, lng: -90.2 }, // MO
    '660-679': { lat: 39.1, lng: -94.6 }, // KS
    '680-699': { lat: 41.3, lng: -96.0 }, // NE
    '700-729': { lat: 29.8, lng: -95.4 }, // LA
    '730-749': { lat: 35.5, lng: -97.5 }, // AR, OK
    '750-799': { lat: 31.8, lng: -99.9 }, // TX
    '800-816': { lat: 39.7, lng: -104.9 }, // CO
    '820-831': { lat: 42.9, lng: -106.3 }, // WY
    '832-838': { lat: 43.5, lng: -112.0 }, // ID
    '840-847': { lat: 40.8, lng: -111.9 }, // UT

    // Southwest
    '850-865': { lat: 33.4, lng: -112.1 }, // AZ
    '870-884': { lat: 35.1, lng: -106.6 }, // NM
    '885-898': { lat: 36.1, lng: -115.2 }, // NV
    '889-891': { lat: 36.1, lng: -115.2 }, // NV

    // West Coast
    '900-961': { lat: 34.0, lng: -118.2 }, // CA
    '970-979': { lat: 45.5, lng: -122.7 }, // OR
    '980-994': { lat: 47.6, lng: -122.3 }, // WA
    '995-999': { lat: 61.2, lng: -149.9 }, // AK
  };

  // Find matching range
  for (const [range, coords] of Object.entries(zipRanges)) {
    const [min, max] = range.split('-').map((n) => parseInt(n));
    if (prefix >= min && prefix <= max) {
      return {
        zip: zipCode,
        lat: coords.lat,
        lng: coords.lng,
      };
    }
  }

  return null;
}

/**
 * Get profiles within radius of a zip code
 * Returns profile IDs that match the distance criteria
 */
export async function getProfilesWithinRadius(
  centerZip: string,
  radiusMiles: number,
  profileZips: { id: string; zip_code: string }[]
): Promise<string[]> {
  // Get center location
  const centerLocation = await getZipLocation(centerZip);
  if (!centerLocation) {
    console.warn('Could not geocode center zip:', centerZip);
    return [];
  }

  // Get locations for all profile zips (cache in production!)
  const profileLocations = await Promise.all(
    profileZips.map(async (profile) => {
      const location = await getZipLocation(profile.zip_code);
      return { id: profile.id, location };
    })
  );

  // Filter by distance
  const matchingIds = profileLocations
    .filter(({ location }) => {
      if (!location) return false;
      const distance = calculateDistance(
        centerLocation.lat,
        centerLocation.lng,
        location.lat,
        location.lng
      );
      return distance <= radiusMiles;
    })
    .map(({ id }) => id);

  return matchingIds;
}
