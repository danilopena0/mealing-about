import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../claude.js', () => ({
  analyzeWithClaude: vi.fn().mockResolvedValue([]),
  analyzeImageWithClaude: vi.fn().mockResolvedValue([]),
}));

vi.mock('../perplexity.js', () => ({
  analyzeWithPerplexity: vi.fn().mockResolvedValue([]),
}));

import { analyzeMenuText, analyzeMenuImage, MENU_ANALYSIS_PROMPT } from '../menu-analyzer.js';
import { analyzeWithClaude, analyzeImageWithClaude } from '../claude.js';
import { analyzeWithPerplexity } from '../perplexity.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('analyzeMenuText', () => {
  it('uses perplexity by default', async () => {
    await analyzeMenuText('menu text');
    expect(analyzeWithPerplexity).toHaveBeenCalledWith('menu text');
    expect(analyzeWithClaude).not.toHaveBeenCalled();
  });

  it('uses claude when provider is anthropic', async () => {
    await analyzeMenuText('menu text', 'anthropic');
    expect(analyzeWithClaude).toHaveBeenCalledWith('menu text');
    expect(analyzeWithPerplexity).not.toHaveBeenCalled();
  });
});

describe('analyzeMenuImage', () => {
  it('always uses Claude even when provider is perplexity', async () => {
    await analyzeMenuImage('base64data', 'perplexity');
    expect(analyzeImageWithClaude).toHaveBeenCalledWith('base64data');
  });

  it('uses Claude when provider is anthropic', async () => {
    await analyzeMenuImage('base64data', 'anthropic');
    expect(analyzeImageWithClaude).toHaveBeenCalledWith('base64data');
  });
});

describe('MENU_ANALYSIS_PROMPT', () => {
  it('includes dietary labels', () => {
    expect(MENU_ANALYSIS_PROMPT).toContain('vegan');
    expect(MENU_ANALYSIS_PROMPT).toContain('vegetarian');
    expect(MENU_ANALYSIS_PROMPT).toContain('gluten-free');
  });

  it('requests JSON output', () => {
    expect(MENU_ANALYSIS_PROMPT).toContain('JSON');
  });
});
