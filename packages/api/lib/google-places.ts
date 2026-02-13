const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;
const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';

export interface PlaceResult {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  price_level?: number;
  opening_hours?: {
    open_now: boolean;
  };
  photos?: Array<{
    photo_reference: string;
  }>;
}

export interface Restaurant {
  placeId: string;
  name: string;
  address: string;
  distance?: number;
  rating?: number;
  priceLevel?: number;
  isOpen?: boolean;
  photoUrl?: string;
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function getPhotoUrl(photoReference: string): string {
  return `${PLACES_API_BASE}/photo?maxwidth=400&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
}

export async function searchNearbyRestaurants(
  latitude: number,
  longitude: number,
  radius: number = 1500
): Promise<Restaurant[]> {
  const url = new URL(`${PLACES_API_BASE}/nearbysearch/json`);
  url.searchParams.set('location', `${latitude},${longitude}`);
  url.searchParams.set('radius', radius.toString());
  url.searchParams.set('type', 'restaurant');
  url.searchParams.set('key', GOOGLE_PLACES_API_KEY);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places API error: ${data.status}`);
  }

  const results: PlaceResult[] = data.results || [];

  return results.map((place) => ({
    placeId: place.place_id,
    name: place.name,
    address: place.vicinity,
    distance: calculateDistance(
      latitude,
      longitude,
      place.geometry.location.lat,
      place.geometry.location.lng
    ),
    rating: place.rating,
    priceLevel: place.price_level,
    isOpen: place.opening_hours?.open_now,
    photoUrl: place.photos?.[0]
      ? getPhotoUrl(place.photos[0].photo_reference)
      : undefined,
  }));
}
