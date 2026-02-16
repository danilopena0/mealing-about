import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { analyzeWithPerplexity } from '../perplexity.js';

beforeEach(() => {
  vi.clearAllMocks();
});

function makeResponse(content: string) {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content } }],
    }),
  };
}

describe('analyzeWithPerplexity', () => {
  it('parses plain JSON response', async () => {
    const json = JSON.stringify({
      items: [{ name: 'Salad', labels: [{ type: 'vegan', confidence: 'confirmed' }] }],
    });
    mockFetch.mockResolvedValueOnce(makeResponse(json));

    const result = await analyzeWithPerplexity('menu');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Salad');
  });

  it('parses markdown-wrapped JSON response', async () => {
    const json = JSON.stringify({
      items: [{ name: 'Pasta', labels: [{ type: 'vegetarian', confidence: 'confirmed' }] }],
    });
    const wrapped = '```json\n' + json + '\n```';
    mockFetch.mockResolvedValueOnce(makeResponse(wrapped));

    const result = await analyzeWithPerplexity('menu');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Pasta');
  });

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    });

    await expect(analyzeWithPerplexity('menu')).rejects.toThrow('Perplexity API error: 429');
  });

  it('throws when response has no choices', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [] }),
    });

    await expect(analyzeWithPerplexity('menu')).rejects.toThrow('No response from Perplexity');
  });
});
