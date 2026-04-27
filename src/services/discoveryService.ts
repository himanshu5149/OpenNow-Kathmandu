import { Business } from '../types';

/**
 * Fetches real businesses from OpenStreetMap using the Overpass API.
 * This ensures the app is populated with real-world data based on the user's location.
 */
export async function fetchNearbyBusinesses(lat: number, lng: number, radiusMeters: number = 1000): Promise<Omit<Business, 'id' | 'status_open_count' | 'status_total_count'>[]> {
  // Overpass QL query: Find shops, cafes, ammenities around the lat/lng
  const query = `
    [out:json][timeout:25];
    (
      node["shop"](around:${radiusMeters},${lat},${lng});
      node["amenity"~"cafe|restaurant|pharmacy|bank|atm"](around:${radiusMeters},${lat},${lng});
    );
    out body;
  `;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Overpass API error');
    
    const data = await response.json();
    
    return data.elements.map((el: any) => {
      // Map OSM tags to our Business structure
      const name = el.tags.name || el.tags.brand || `Unknown ${el.tags.shop || el.tags.amenity || 'Spot'}`;
      const category = el.tags.shop || el.tags.amenity || 'General';
      
      const address = [el.tags['addr:street'], el.tags['addr:housenumber'], el.tags['addr:city']].filter(Boolean).join(', ') || null;
      
      return {
        name,
        category,
        address,
        lat: el.lat,
        lng: el.lon,
        last_status_update: null,
        phone: el.tags.phone || el.tags['contact:phone'] || null,
        website: el.tags.website || el.tags['contact:website'] || null,
        opening_hours: el.tags.opening_hours || null
      };
    });
  } catch (error) {
    console.error("OSM Discovery Failed:", error);
    return [];
  }
}
