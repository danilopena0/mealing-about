import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import pdfParse from 'pdf-parse';

const ANALYSIS_PROMPT = `You are a dietary menu analyzer. Analyze restaurant menu text and identify menu items with dietary properties.

For each item return:
- name: item name
- description: item description if available (optional)
- labels: array of dietary labels that apply:
  - type: "vegan" | "vegetarian" | "gluten-free"
  - confidence: "confirmed" (clearly stated) | "uncertain" (inferred)
  - askServer: string (what to ask staff, only for uncertain items, optional)
- modifications: array of strings (optional tweaks to make it diet-friendly)

Rules:
- Vegan: no meat, dairy, eggs, honey, or animal products
- Vegetarian: no meat/fish, but dairy/eggs OK
- Gluten-free: no wheat, barley, rye
- Mark uncertain when inferring (e.g. fries might share a fryer)
- Include ALL items, not just ones with dietary labels

Return ONLY valid JSON: {"items": [...]}`;

const MAX_TEXT_LENGTH = 12_000;

async function fetchTextFromUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MealingAbout/1.0)' },
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Could not fetch URL (${response.status})`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isPdf = contentType.includes('application/pdf') || url.split('?')[0]!.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    const buffer = Buffer.from(await response.arrayBuffer());
    try {
      const result = await pdfParse(buffer);
      const text = result.text?.trim() ?? '';
      if (text.length < 50) {
        throw new Error('Could not extract text from this PDF. It may be a scanned image — try pasting the menu text directly.');
      }
      return text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.startsWith('Could not extract')) throw err;
      throw new Error('Could not read this PDF. Try pasting the menu text directly.');
    }
  }

  const html = await response.text();
  const text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length < 50) {
    throw new Error('Could not extract readable text from that URL. Try pasting the menu text directly.');
  }

  return text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
}

interface AnalyzedLabel {
  type: 'vegan' | 'vegetarian' | 'gluten-free';
  confidence: 'confirmed' | 'uncertain';
  askServer?: string;
}

interface AnalyzedItem {
  name: string;
  description?: string;
  category?: 'food' | 'beverage';
  labels: AnalyzedLabel[];
  modifications?: string[];
}

async function analyzeWithPerplexity(menuText: string): Promise<AnalyzedItem[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY is not configured');

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: 'You are a JSON-only API. Return only valid JSON, no prose.' },
        { role: 'user', content: `${ANALYSIS_PROMPT}\n\nMenu text:\n${menuText}` },
      ],
      max_tokens: 8000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Perplexity API error: ${response.status} — ${err}`);
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from AI');

  const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlock ? codeBlock[1]! : content;
  const parsed = JSON.parse(jsonStr.trim()) as { items: AnalyzedItem[] };
  return parsed.items;
}

// ---------------------------------------------------------------------------
// Best-effort: try to find and save the restaurant to the database.
// Any failure is silently swallowed — the analyze response is never affected.
// ---------------------------------------------------------------------------

const PLACES_API_BASE = 'https://places.googleapis.com/v1';

interface FullPlaceResult {
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
  photos?: Array<{ name?: string }>;
}

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

async function searchPlacesByText(query: string): Promise<FullPlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  const response = await fetch(`${PLACES_API_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.rating',
        'places.userRatingCount',
        'places.priceLevel',
        'places.websiteUri',
        'places.nationalPhoneNumber',
        'places.servesVegetarianFood',
        'places.editorialSummary',
        'places.photos',
      ].join(','),
    },
    body: JSON.stringify({ textQuery: query, includedType: 'restaurant' }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) return [];
  const data = await response.json() as { places?: FullPlaceResult[] };
  return data.places ?? [];
}

/** Strip protocol + www, return bare hostname e.g. "bigbowl.com" */
function extractDomain(urlStr: string): string {
  return new URL(urlStr).hostname.replace(/^www\./, '');
}

/** "bigbowl.com" → "bigbowl" → "big bowl" (search query) */
function domainToQuery(domain: string): string {
  const withoutTld = domain.replace(/\.[^.]+$/, '');
  return withoutTld.replace(/[-_.]+/g, ' ').trim();
}

/** Find a trustworthy Places match: domain match first, single result fallback. */
function findTrustedMatch(places: FullPlaceResult[], inputDomain: string): FullPlaceResult | null {
  if (places.length === 0) return null;

  for (const place of places) {
    if (!place.websiteUri) continue;
    try {
      const placeDomain = new URL(place.websiteUri).hostname.replace(/^www\./, '');
      if (placeDomain === inputDomain || inputDomain.endsWith(`.${placeDomain}`)) {
        return place;
      }
    } catch { /* skip unparseable */ }
  }

  // Single result with no ambiguity — accept it
  if (places.length === 1) return places[0]!;

  return null;
}

/** Extract the city segment from a Google formatted address. */
function cityFromAddress(address: string): string {
  const parts = address.split(',').map((s) => s.trim());
  return parts[1] ?? parts[0] ?? 'unknown';
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function mapToMenuItemInsert(restaurantId: string, item: AnalyzedItem) {
  const isVegan = item.labels.some((l) => l.type === 'vegan');
  const isVegetarian = item.labels.some((l) => l.type === 'vegetarian');
  const isGlutenFree = item.labels.some((l) => l.type === 'gluten-free');
  const allConfirmed = item.labels.length > 0 && item.labels.every((l) => l.confidence === 'confirmed');
  const askServer = item.labels.find((l) => l.askServer)?.askServer ?? null;

  return {
    restaurant_id: restaurantId,
    name: item.name,
    description: item.description ?? null,
    category: item.category ?? 'food',
    is_vegan: isVegan,
    is_vegetarian: isVegetarian,
    is_gluten_free: isGlutenFree,
    confidence: allConfirmed ? 'certain' : 'uncertain' as 'certain' | 'uncertain',
    modifications: item.modifications ?? null,
    ask_server: askServer,
  };
}

async function tryPersistRestaurant(url: string, items: AnalyzedItem[]): Promise<{ slug: string; name: string } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  let inputDomain: string;
  try {
    inputDomain = extractDomain(url);
  } catch {
    return null;
  }

  const query = domainToQuery(inputDomain);
  if (!query) return null;

  const places = await searchPlacesByText(query);
  const place = findTrustedMatch(places, inputDomain);
  if (!place) return null;

  const name = place.displayName?.text ?? '';
  const address = place.formattedAddress ?? '';
  if (!name || !address) return null;

  const db = createClient(supabaseUrl, serviceKey);

  // Check if this restaurant already exists
  const { data: existing } = await db
    .from('restaurants')
    .select('id, slug')
    .eq('place_id', place.id)
    .single();

  let restaurantId: string;

  const slug: string = existing ? (existing.slug as string) : `${toSlug(name)}-${toSlug(cityFromAddress(address))}`;

  if (existing) {
    // Already in DB — refresh metadata but keep existing slug
    restaurantId = existing.id as string;
    await db.from('restaurants').update({
      name,
      address,
      latitude: place.location?.latitude ?? null,
      longitude: place.location?.longitude ?? null,
      rating: place.rating ?? null,
      user_rating_count: place.userRatingCount ?? null,
      price_level: place.priceLevel ? (PRICE_LEVEL_MAP[place.priceLevel] ?? null) : null,
      website_uri: place.websiteUri ?? null,
      phone: place.nationalPhoneNumber ?? null,
      serves_vegetarian_food: place.servesVegetarianFood ?? null,
      editorial_summary: place.editorialSummary?.text ?? null,
      photo_url: place.photos?.[0]?.name
        ? `${PLACES_API_BASE}/${place.photos[0].name}/media?maxWidthPx=800&key=${process.env.GOOGLE_PLACES_API_KEY}`
        : null,
      analysis_status: 'analyzed',
      last_analyzed_at: new Date().toISOString(),
      analysis_error: null,
      updated_at: new Date().toISOString(),
    }).eq('id', restaurantId);
  } else {
    const { data: inserted, error: insertError } = await db
      .from('restaurants')
      .insert({
        place_id: place.id,
        name,
        slug,
        address,
        latitude: place.location?.latitude ?? null,
        longitude: place.location?.longitude ?? null,
        rating: place.rating ?? null,
        user_rating_count: place.userRatingCount ?? null,
        price_level: place.priceLevel ? (PRICE_LEVEL_MAP[place.priceLevel] ?? null) : null,
        website_uri: place.websiteUri ?? null,
        phone: place.nationalPhoneNumber ?? null,
        serves_vegetarian_food: place.servesVegetarianFood ?? null,
        editorial_summary: place.editorialSummary?.text ?? null,
        photo_url: place.photos?.[0]?.name
          ? `${PLACES_API_BASE}/${place.photos[0].name}/media?maxWidthPx=800&key=${process.env.GOOGLE_PLACES_API_KEY}`
          : null,
        analysis_status: 'analyzed',
        last_analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError || !inserted) return null;
    restaurantId = inserted.id as string;
  }

  // Replace menu items
  await db.from('menu_items').delete().eq('restaurant_id', restaurantId);

  if (items.length > 0) {
    await db.from('menu_items').insert(items.map((item) => mapToMenuItemInsert(restaurantId, item)));
  }

  return { slug, name };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as { type: 'url' | 'text'; data: string };
    const { type, data } = body;

    if (!type || !data?.trim()) {
      return NextResponse.json({ error: 'Missing type or data' }, { status: 400 });
    }

    let menuText: string;
    if (type === 'url') {
      menuText = await fetchTextFromUrl(data.trim());
    } else {
      menuText = data.trim();
      if (menuText.length < 20) {
        return NextResponse.json({ error: 'Menu text is too short to analyze' }, { status: 400 });
      }
    }

    const items = await analyzeWithPerplexity(menuText);

    // Best-effort: try to save the restaurant to the database.
    // Errors are swallowed — the response is unaffected either way.
    let saved: { slug: string; name: string } | null = null;
    if (type === 'url') {
      saved = await tryPersistRestaurant(data.trim(), items).catch(() => null);
    }

    return NextResponse.json({ items, saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
