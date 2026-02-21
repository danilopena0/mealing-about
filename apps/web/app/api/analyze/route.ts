import { type NextRequest, NextResponse } from 'next/server';

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
  const timer = setTimeout(() => controller.abort(), 10_000);

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
      response_format: { type: 'json_object' },
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
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
