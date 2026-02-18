import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  analyzeMenuText,
  analyzeMenuImage,
  type MenuItem,
  type AnalyzerProvider,
} from '../lib/menu-analyzer.js';
import { getCachedMenu, cacheMenu } from '../lib/supabase.js';

interface AnalyzeRequest {
  menuImage?: string;
  menuUrl?: string;
  menuText?: string;
  placeId?: string;
  provider?: AnalyzerProvider;
}

interface AnalyzeResponse {
  items: MenuItem[];
  cached: boolean;
  provider?: AnalyzerProvider;
}

// Keep extracted text under this limit to avoid overflowing the AI's output token budget
const MAX_MENU_TEXT_LENGTH = 12_000;

async function fetchMenuFromUrl(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch menu URL: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('text/html')) {
    const html = await response.text();
    // Strip scripts, styles, and tags; collapse whitespace
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length > MAX_MENU_TEXT_LENGTH) {
      return text.slice(0, MAX_MENU_TEXT_LENGTH);
    }
    return text;
  }

  if (contentType.includes('application/pdf')) {
    throw new Error('PDF menus are not yet supported. Please use photo or text input.');
  }

  const text = await response.text();
  return text.length > MAX_MENU_TEXT_LENGTH ? text.slice(0, MAX_MENU_TEXT_LENGTH) : text;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as AnalyzeRequest;
    const { menuImage, menuUrl, menuText, placeId, provider } = body;

    // Validate that at least one input method is provided
    if (!menuImage && !menuUrl && !menuText) {
      return res.status(400).json({
        error: 'At least one input required: menuImage, menuUrl, or menuText',
      });
    }

    // Check cache if placeId is provided
    if (placeId) {
      const cached = await getCachedMenu(placeId);
      if (cached) {
        return res.status(200).json({
          items: cached.menu_items as MenuItem[],
          cached: true,
        } satisfies AnalyzeResponse);
      }
    }

    let items: MenuItem[];
    let sourceType: 'photo' | 'url' | 'text';
    let usedProvider: AnalyzerProvider = provider || 'perplexity';

    // Process based on input type (prioritize image > url > text)
    if (menuImage) {
      // Note: Image analysis always uses Claude as Perplexity doesn't support it
      items = await analyzeMenuImage(menuImage, provider);
      sourceType = 'photo';
      usedProvider = 'anthropic'; // Image always uses Claude
    } else if (menuUrl) {
      const extractedText = await fetchMenuFromUrl(menuUrl);
      if (extractedText.length < 50) {
        throw new Error('Could not extract sufficient text from URL. Try taking a photo instead.');
      }
      items = await analyzeMenuText(extractedText, provider);
      sourceType = 'url';
    } else {
      items = await analyzeMenuText(menuText!, provider);
      sourceType = 'text';
    }

    // Cache the results if placeId is provided
    if (placeId && items.length > 0) {
      await cacheMenu(placeId, null, items, sourceType);
    }

    return res.status(200).json({
      items,
      cached: false,
      provider: usedProvider,
    } satisfies AnalyzeResponse);
  } catch (error) {
    console.error('Analyze menu error:', error);
    return res.status(500).json({
      error: 'Failed to analyze menu',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
