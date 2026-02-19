import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (compatible; MealingAbout/1.0)';
const TIMEOUT_MS = 10_000;

const MENU_KEYWORDS = ['menu', 'food', 'eat', 'drink', 'dine'];

function isMenuLink(href: string): boolean {
  const lower = href.toLowerCase();
  return MENU_KEYWORDS.some((kw) => lower.includes(kw));
}

function isPdfLink(href: string): boolean {
  return href.toLowerCase().endsWith('.pdf');
}

function resolveUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

export async function findMenuUrl(
  websiteUri: string,
): Promise<{ menuUrl: string; menuType: 'html' | 'pdf' } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(websiteUri, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT },
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    const pdfLinks: string[] = [];
    const menuLinks: string[] = [];

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      const absolute = resolveUrl(href, websiteUri);
      if (!absolute) return;

      if (isPdfLink(href)) {
        pdfLinks.push(absolute);
      } else if (isMenuLink(href)) {
        menuLinks.push(absolute);
      }
    });

    if (pdfLinks.length > 0) {
      return { menuUrl: pdfLinks[0]!, menuType: 'pdf' };
    }

    if (menuLinks.length > 0) {
      return { menuUrl: menuLinks[0]!, menuType: 'html' };
    }

    return null;
  } catch {
    return null;
  }
}

export async function extractMenuText(menuUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(menuUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT },
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove non-content elements
    $('script, style, nav, footer, header').remove();

    // Try targeted selectors first
    const targetedSelectors = [
      'main',
      'article',
      '.menu',
      '#menu',
      '[class*="menu"]',
    ];

    let text = '';
    for (const selector of targetedSelectors) {
      const found = $(selector).text();
      if (found.trim().length > 100) {
        text = found;
        break;
      }
    }

    // Fall back to body
    if (text.trim().length === 0) {
      text = $('body').text();
    }

    // Clean up whitespace and remove short lines
    const cleaned = text
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter((line) => line.length >= 3)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');

    return cleaned.length > 0 ? cleaned : null;
  } catch {
    return null;
  }
}
