import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/menu-analyzer.js', () => ({
  analyzeMenuText: vi.fn().mockResolvedValue([]),
  analyzeMenuImage: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../lib/supabase.js', () => ({
  getCachedMenu: vi.fn().mockResolvedValue(null),
  cacheMenu: vi.fn().mockResolvedValue(undefined),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import handler from '../analyze-menu.js';
import { analyzeMenuText, analyzeMenuImage } from '../../lib/menu-analyzer.js';
import { getCachedMenu, cacheMenu } from '../../lib/supabase.js';

const mockAnalyzeMenuText = vi.mocked(analyzeMenuText);
const mockAnalyzeMenuImage = vi.mocked(analyzeMenuImage);
const mockGetCachedMenu = vi.mocked(getCachedMenu);
const mockCacheMenu = vi.mocked(cacheMenu);

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    body: {},
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

describe('analyze-menu handler', () => {
  describe('HTTP method handling', () => {
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
  });

  describe('input validation', () => {
    it('returns 400 when no input is provided', async () => {
      const res = mockRes();
      await handler(mockReq({ body: {} }), res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/menuImage|menuUrl|menuText/);
    });

    it('accepts menuText input', async () => {
      const items = [{ name: 'Salad', labels: [] }];
      mockAnalyzeMenuText.mockResolvedValueOnce(items as any);
      const res = mockRes();
      await handler(mockReq({ body: { menuText: 'Salad $10' } }), res);
      expect(res.statusCode).toBe(200);
      expect(res.body.items).toEqual(items);
      expect(res.body.cached).toBe(false);
    });

    it('accepts menuImage input', async () => {
      const items = [{ name: 'Pizza', labels: [] }];
      mockAnalyzeMenuImage.mockResolvedValueOnce(items as any);
      const res = mockRes();
      await handler(mockReq({ body: { menuImage: 'base64data' } }), res);
      expect(res.statusCode).toBe(200);
      expect(res.body.items).toEqual(items);
      expect(res.body.provider).toBe('anthropic');
    });
  });

  describe('caching', () => {
    it('returns cached result when cache hit', async () => {
      const cached = { menu_items: [{ name: 'Burger', labels: [] }] };
      mockGetCachedMenu.mockResolvedValueOnce(cached as any);

      const res = mockRes();
      await handler(mockReq({ body: { menuText: 'menu', placeId: 'place123' } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.body.cached).toBe(true);
      expect(res.body.items).toEqual(cached.menu_items);
      expect(mockAnalyzeMenuText).not.toHaveBeenCalled();
    });

    it('caches results when placeId provided and items found', async () => {
      const items = [{ name: 'Salad', labels: [] }];
      mockAnalyzeMenuText.mockResolvedValueOnce(items as any);

      const res = mockRes();
      await handler(mockReq({ body: { menuText: 'menu', placeId: 'place123' } }), res);

      expect(mockCacheMenu).toHaveBeenCalledWith('place123', null, items, 'text');
    });

    it('does not cache when no placeId', async () => {
      mockAnalyzeMenuText.mockResolvedValueOnce([]);
      const res = mockRes();
      await handler(mockReq({ body: { menuText: 'menu' } }), res);
      expect(mockCacheMenu).not.toHaveBeenCalled();
    });

    it('does not cache when items array is empty', async () => {
      mockAnalyzeMenuText.mockResolvedValueOnce([]);
      const res = mockRes();
      await handler(mockReq({ body: { menuText: 'menu', placeId: 'place123' } }), res);
      expect(mockCacheMenu).not.toHaveBeenCalled();
    });
  });

  describe('input priority (image > url > text)', () => {
    it('uses image when both image and text are provided', async () => {
      mockAnalyzeMenuImage.mockResolvedValueOnce([]);
      const res = mockRes();
      await handler(mockReq({ body: { menuImage: 'base64', menuText: 'text' } }), res);
      expect(mockAnalyzeMenuImage).toHaveBeenCalledWith('base64', undefined);
      expect(mockAnalyzeMenuText).not.toHaveBeenCalled();
    });

    it('uses url when both url and text are provided', async () => {
      const urlContent = 'Pasta $12, Salad $8, Burger $14, Fries $5, Soup $7, Dessert $6 -- all freshly made';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/plain' },
        text: async () => urlContent,
      });
      mockAnalyzeMenuText.mockResolvedValueOnce([]);
      const res = mockRes();
      await handler(mockReq({ body: { menuUrl: 'http://example.com/menu', menuText: 'text' } }), res);
      expect(mockFetch).toHaveBeenCalled();
      expect(mockAnalyzeMenuText).toHaveBeenCalledWith(urlContent, undefined);
    });
  });

  describe('fetchMenuFromUrl', () => {
    it('extracts text from HTML page', async () => {
      const html = '<html><body><p>Pasta $12</p><p>Burger $15</p><p>Grilled Salmon $22</p><p>Caesar Salad $10</p><script>trackUser()</script></body></html>';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html; charset=utf-8' },
        text: async () => html,
      });
      mockAnalyzeMenuText.mockResolvedValueOnce([]);

      const res = mockRes();
      await handler(mockReq({ body: { menuUrl: 'http://example.com/menu' } }), res);

      expect(res.statusCode).toBe(200);
      const calledWith = mockAnalyzeMenuText.mock.calls[0][0];
      expect(calledWith).toContain('Pasta $12');
      expect(calledWith).not.toContain('<p>');
      expect(calledWith).not.toContain('trackUser');
    });

    it('returns 500 when URL fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
      const res = mockRes();
      await handler(mockReq({ body: { menuUrl: 'http://example.com/menu' } }), res);
      expect(res.statusCode).toBe(500);
    });

    it('returns 500 for PDF URLs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/pdf' },
      });
      const res = mockRes();
      await handler(mockReq({ body: { menuUrl: 'http://example.com/menu.pdf' } }), res);
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toContain('PDF');
    });

    it('returns 500 when extracted text is too short', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html' },
        text: async () => '<html><body>Hi</body></html>',
      });
      const res = mockRes();
      await handler(mockReq({ body: { menuUrl: 'http://example.com/menu' } }), res);
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toContain('Try taking a photo');
    });

    it('truncates text over 12000 characters', async () => {
      const longText = 'A'.repeat(15000);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/plain' },
        text: async () => longText,
      });
      mockAnalyzeMenuText.mockResolvedValueOnce([]);

      const res = mockRes();
      await handler(mockReq({ body: { menuUrl: 'http://example.com/menu' } }), res);

      const calledWith = mockAnalyzeMenuText.mock.calls[0][0];
      expect(calledWith.length).toBe(12000);
    });
  });

  describe('error handling', () => {
    it('returns 500 when analyzer throws', async () => {
      mockAnalyzeMenuText.mockImplementation(async () => {
        throw new Error('AI service down');
      });
      const res = mockRes();
      await handler(mockReq({ body: { menuText: 'menu' } }), res);
      mockAnalyzeMenuText.mockResolvedValue([]);
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('AI service down');
    });
  });
});
