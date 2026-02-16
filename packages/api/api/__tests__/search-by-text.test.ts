import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/google-places.js', () => ({
  searchByText: vi.fn(),
}));

import handler from '../search-by-text.js';
import { searchByText } from '../../lib/google-places.js';

const mockSearchByText = vi.mocked(searchByText);

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    body: { query: 'pizza near times square' },
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

describe('search-by-text handler', () => {
  it('returns 400 for missing query', async () => {
    const res = mockRes();
    await handler(mockReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for empty query', async () => {
    const res = mockRes();
    await handler(mockReq({ body: { query: '   ' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns restaurants on success', async () => {
    const restaurants = [
      { placeId: 'a', name: 'Pizza Place', address: '123 Main St' },
    ];
    mockSearchByText.mockResolvedValueOnce(restaurants as any);

    const res = mockRes();
    await handler(mockReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Pizza Place');
  });
});
