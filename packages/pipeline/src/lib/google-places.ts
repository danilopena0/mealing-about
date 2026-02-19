const PLACES_API_BASE = 'https://places.googleapis.com/v1';
const API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

interface NearbyRestaurant {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  userRatingCount: number | null;
  priceLevel: number | null;
  photoUrl: string | null;
}

interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  userRatingCount: number | null;
  priceLevel: number | null;
  websiteUri: string | null;
  phone: string | null;
  servesVegetarianFood: boolean | null;
  editorialSummary: string | null;
  photoUrl: string | null;
}

function extractPhotoUrl(photos: unknown[]): string | null {
  if (!photos || photos.length === 0) return null;
  const photo = photos[0] as { name?: string };
  if (!photo.name) return null;
  return `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=800&key=${API_KEY}`;
}

export async function searchNearbyRestaurants(
  lat: number,
  lng: number,
  radius: number,
): Promise<NearbyRestaurant[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  let response: Response;
  try {
    response = await fetch(`${PLACES_API_BASE}/places:searchNearby`, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.photos',
      },
      body: JSON.stringify({
        includedTypes: ['restaurant'],
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius,
          },
        },
      }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(
      `Google Places searchNearby failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as { places?: unknown[] };
  const places = data.places ?? [];

  return places.map((place: unknown) => {
    const p = place as {
      id: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
      rating?: number;
      userRatingCount?: number;
      priceLevel?: string;
      photos?: unknown[];
    };

    return {
      placeId: p.id,
      name: p.displayName?.text ?? '',
      address: p.formattedAddress ?? '',
      latitude: p.location?.latitude ?? 0,
      longitude: p.location?.longitude ?? 0,
      rating: p.rating ?? null,
      userRatingCount: p.userRatingCount ?? null,
      priceLevel: p.priceLevel ? (PRICE_LEVEL_MAP[p.priceLevel] ?? null) : null,
      photoUrl: extractPhotoUrl(p.photos ?? []),
    };
  });
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  let response: Response;
  try {
    response = await fetch(`${PLACES_API_BASE}/places/${placeId}`, {
      signal: controller.signal,
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask':
          'id,displayName,formattedAddress,location,rating,userRatingCount,priceLevel,websiteUri,nationalPhoneNumber,servesVegetarianFood,editorialSummary,photos',
      },
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(
      `Google Places getPlaceDetails failed: ${response.status} ${response.statusText}`,
    );
  }

  const p = (await response.json()) as {
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    rating?: number;
    userRatingCount?: number;
    priceLevel?: string;
    websiteUri?: string;
    nationalPhoneNumber?: string;
    servesVegetarianFood?: boolean;
    editorialSummary?: { text?: string };
    photos?: unknown[];
  };

  return {
    placeId: p.id,
    name: p.displayName?.text ?? '',
    address: p.formattedAddress ?? '',
    latitude: p.location?.latitude ?? null,
    longitude: p.location?.longitude ?? null,
    rating: p.rating ?? null,
    userRatingCount: p.userRatingCount ?? null,
    priceLevel: p.priceLevel ? (PRICE_LEVEL_MAP[p.priceLevel] ?? null) : null,
    websiteUri: p.websiteUri ?? null,
    phone: p.nationalPhoneNumber ?? null,
    servesVegetarianFood: p.servesVegetarianFood ?? null,
    editorialSummary: p.editorialSummary?.text ?? null,
    photoUrl: extractPhotoUrl(p.photos ?? []),
  };
}
