const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;
const PLACES_API_BASE = 'https://places.googleapis.com/v1';

const PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.priceLevel',
  'places.currentOpeningHours.openNow',
  'places.photos',
].join(',');

function placesHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
    'X-Goog-FieldMask': PLACES_FIELD_MASK,
  };
}

interface PlacePhoto {
  name: string;
}

interface PlaceResult {
  id: string;
  displayName: {
    text: string;
    languageCode: string;
  };
  formattedAddress: string;
  location: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  priceLevel?: string;
  currentOpeningHours?: {
    openNow: boolean;
  };
  photos?: PlacePhoto[];
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

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

function priceLevelToNumber(priceLevel?: string): number | undefined {
  return priceLevel ? PRICE_LEVEL_MAP[priceLevel] : undefined;
}

export function calculateDistance(
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

// photoName is the `name` field from the Places API response, e.g. "places/{id}/photos/{ref}"
export function getPhotoUrl(photoName: string): string {
  return `${PLACES_API_BASE}/${photoName}/media?maxWidthPx=400&key=${GOOGLE_PLACES_API_KEY}`;
}

export async function searchNearbyRestaurants(
  latitude: number,
  longitude: number,
  radius: number = 1500
): Promise<Restaurant[]> {
  const response = await fetch(`${PLACES_API_BASE}/places:searchNearby`, {
    method: 'POST',
    headers: placesHeaders(),
    body: JSON.stringify({
      includedTypes: ['restaurant'],
      locationRestriction: {
        circle: {
          center: { latitude, longitude },
          radius,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = (await response.json()) as { places?: PlaceResult[] };
  const results = data.places || [];

  return results.map((place) => ({
    placeId: place.id,
    name: place.displayName.text,
    address: place.formattedAddress,
    distance: calculateDistance(
      latitude,
      longitude,
      place.location.latitude,
      place.location.longitude
    ),
    rating: place.rating,
    priceLevel: priceLevelToNumber(place.priceLevel),
    isOpen: place.currentOpeningHours?.openNow,
    photoUrl: place.photos?.[0] ? getPhotoUrl(place.photos[0].name) : undefined,
  }));
}

export async function searchByText(query: string): Promise<Restaurant[]> {
  const response = await fetch(`${PLACES_API_BASE}/places:searchText`, {
    method: 'POST',
    headers: placesHeaders(),
    body: JSON.stringify({
      textQuery: query,
      includedType: 'restaurant',
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = (await response.json()) as { places?: PlaceResult[] };
  const results = data.places || [];

  return results.map((place) => ({
    placeId: place.id,
    name: place.displayName.text,
    address: place.formattedAddress,
    rating: place.rating,
    priceLevel: priceLevelToNumber(place.priceLevel),
    isOpen: place.currentOpeningHours?.openNow,
    photoUrl: place.photos?.[0] ? getPhotoUrl(place.photos[0].name) : undefined,
  }));
}
