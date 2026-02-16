import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { ApiError, searchRestaurants } from '../api';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ApiError', () => {
  it('has correct name and statusCode', () => {
    const err = new ApiError('not found', 404);
    expect(err.name).toBe('ApiError');
    expect(err.message).toBe('not found');
    expect(err.statusCode).toBe(404);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('searchRestaurants', () => {
  it('calls the correct endpoint with POST', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ placeId: '1', name: 'Test' }],
    });

    const result = await searchRestaurants({ latitude: 40, longitude: -74 });
    expect(result).toHaveLength(1);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/search-restaurants');
    expect(options.method).toBe('POST');
  });

  it('throws ApiError on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'server error' }),
    });

    await expect(
      searchRestaurants({ latitude: 40, longitude: -74 })
    ).rejects.toThrow(ApiError);
  });
});
