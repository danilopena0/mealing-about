import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { searchNearbyRestaurants, searchByText } from '../google-places.js';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GOOGLE_PLACES_API_KEY = 'test-api-key';
});

const mockPlace = {
  id: 'place123',
  displayName: { text: 'The Burger Joint', languageCode: 'en' },
  formattedAddress: '123 Main St, New York, NY',
  location: { latitude: 40.713, longitude: -74.006 },
  rating: 4.2,
  priceLevel: 'PRICE_LEVEL_MODERATE',
  currentOpeningHours: { openNow: true },
  photos: [{ name: 'places/place123/photos/photo1' }],
  primaryType: 'restaurant',
  primaryTypeDisplayName: { text: 'Restaurant', languageCode: 'en' },
};

function mockSuccessResponse(places: unknown[]) {
  return {
    ok: true,
    json: async () => ({ places }),
  };
}

describe('searchNearbyRestaurants', () => {
  it('calls the Places API with correct params', async () => {
    mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));
    await searchNearbyRestaurants(40.7128, -74.006);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('searchNearby');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body);
    expect(body.locationRestriction.circle.center.latitude).toBe(40.7128);
    expect(body.locationRestriction.circle.radius).toBe(1500);
  });

  it('accepts custom radius', async () => {
    mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));
    await searchNearbyRestaurants(40.7128, -74.006, 500);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.locationRestriction.circle.radius).toBe(500);
  });

  it('maps place results to Restaurant shape', async () => {
    mockFetch.mockResolvedValueOnce(mockSuccessResponse([mockPlace]));
    const results = await searchNearbyRestaurants(40.7128, -74.006);

    expect(results).toHaveLength(1);
    const r = results[0];
    expect(r.placeId).toBe('place123');
    expect(r.name).toBe('The Burger Joint');
    expect(r.address).toBe('123 Main St, New York, NY');
    expect(r.rating).toBe(4.2);
    expect(r.priceLevel).toBe(2); // PRICE_LEVEL_MODERATE → 2
    expect(r.isOpen).toBe(true);
    expect(r.photoUrl).toContain('places/place123/photos/photo1');
    expect(r.cuisineType).toBe('restaurant');
  });

  it('calculates distance from search origin', async () => {
    mockFetch.mockResolvedValueOnce(mockSuccessResponse([mockPlace]));
    // place is at 40.713, searching from 40.7128 — very close
    const results = await searchNearbyRestaurants(40.7128, -74.006);
    expect(results[0].distance).toBeGreaterThan(0);
    expect(results[0].distance).toBeLessThan(500);
  });

  it('returns empty array when no places returned', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const results = await searchNearbyRestaurants(40.7128, -74.006);
    expect(results).toEqual([]);
  });

  it('handles place with no photos', async () => {
    mockFetch.mockResolvedValueOnce(
      mockSuccessResponse([{ ...mockPlace, photos: undefined }])
    );
    const results = await searchNearbyRestaurants(40.7128, -74.006);
    expect(results[0].photoUrl).toBeUndefined();
  });

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403, text: async () => '' });
    await expect(searchNearbyRestaurants(40.7128, -74.006)).rejects.toThrow(
      'Google Places API error: 403'
    );
  });
});

describe('searchByText', () => {
  it('calls searchText endpoint with query', async () => {
    mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));
    await searchByText('pizza near times square');

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('searchText');
    const body = JSON.parse(options.body);
    expect(body.textQuery).toBe('pizza near times square');
    expect(body.includedType).toBe('restaurant');
  });

  it('maps place results to Restaurant shape', async () => {
    mockFetch.mockResolvedValueOnce(mockSuccessResponse([mockPlace]));
    const results = await searchByText('burger');

    expect(results).toHaveLength(1);
    expect(results[0].placeId).toBe('place123');
    expect(results[0].name).toBe('The Burger Joint');
    expect(results[0].distance).toBeUndefined(); // text search has no distance
  });

  it('returns empty array when no places returned', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const results = await searchByText('xyz123');
    expect(results).toEqual([]);
  });

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
    await expect(searchByText('pizza')).rejects.toThrow('Google Places API error: 429');
  });
});
