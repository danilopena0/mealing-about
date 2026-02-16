import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/google-places.js', () => ({
  searchNearbyRestaurants: vi.fn(),
}));

import handler from '../search-restaurants.js';
import { searchNearbyRestaurants } from '../../lib/google-places.js';

const mockSearchNearbyRestaurants = vi.mocked(searchNearbyRestaurants);

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    body: { latitude: 40.7128, longitude: -74.006 },
    ...overrides,
  } as any;
}

function mockRes() {
  const res: any = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: null as unknown,
    setHeader(key: string, value: string) {
      res.headers[key] = value;
      return res;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: unknown) {
      res.body = data;
      return res;
    },
    end() {
      return res;
    },
  };
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('search-restaurants handler', () => {
  it('returns 405 for GET requests', async () => {
    const res = mockRes();
    await handler(mockReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(405);
  });

  it('returns 200 for OPTIONS (CORS preflight)', async () => {
    const res = mockRes();
    await handler(mockReq({ method: 'OPTIONS' }), res);
    expect(res.statusCode).toBe(200);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
  });

  it('returns 400 for missing coordinates', async () => {
    const res = mockRes();
    await handler(mockReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid coordinates', async () => {
    const res = mockRes();
    await handler(mockReq({ body: { latitude: 999, longitude: -74 } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns sorted results on success', async () => {
    const restaurants = [
      { placeId: 'b', name: 'Far', distance: 500 },
      { placeId: 'a', name: 'Near', distance: 100 },
    ];
    mockSearchNearbyRestaurants.mockResolvedValueOnce(restaurants as any);

    const res = mockRes();
    await handler(mockReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body[0].name).toBe('Near');
    expect(res.body[1].name).toBe('Far');
  });
});
