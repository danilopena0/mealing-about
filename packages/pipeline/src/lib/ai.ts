import type { AnalyzedMenuItem } from '../types.js';

const ANALYSIS_PROMPT = `You are a dietary menu analyzer. Analyze restaurant menu text and identify ALL menu items with their dietary properties.

For each item return:
- name: item name
- description: item description if available
- category: "food" or "beverage". Beverages include drinks, cocktails, wine, beer, spirits, smoothies, juices, coffee, tea, soft drinks, and water. Everything else (including desserts) is "food".
- labels: array of dietary labels that apply
  - type: "vegan" | "vegetarian" | "gluten-free"
  - confidence: "confirmed" (clearly stated) | "uncertain" (inferred)
  - askServer: string (what to ask staff, only for uncertain items)
- modifications: array of strings (optional tweaks to make it diet-friendly)

Rules:
- Vegan: no meat, dairy, eggs, honey, or animal products
- Vegetarian: no meat/fish, but dairy/eggs OK
- Gluten-free: no wheat, barley, rye
- Mark uncertain when you're inferring (e.g. fries might share a fryer)
- Include ALL items, not just ones with dietary labels

Return ONLY valid JSON:
{"items": [...]}`;

function extractJsonFromResponse(text: string): AnalyzedMenuItem[] {
  // Extract JSON from markdown code blocks if present
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = codeBlockMatch ? codeBlockMatch[1]! : text;

  const parsed = JSON.parse(jsonText.trim()) as { items?: AnalyzedMenuItem[] };
  if (!Array.isArray(parsed.items)) {
    throw new Error(
      `AI response missing "items" array. Got keys: ${Object.keys(parsed).join(', ')}`,
    );
  }
  return parsed.items;
}

async function analyzeWithPerplexity(menuText: string): Promise<AnalyzedMenuItem[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY!;

  const attempt = async (): Promise<AnalyzedMenuItem[]> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);

    let response: Response;
    try {
      response = await fetch('https://api.perplexity.ai/chat/completions', {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'You are a JSON-only API. Never add explanations or prose. Return only valid JSON.',
            },
            {
              role: 'user',
              content: `${ANALYSIS_PROMPT}\n\nMenu text:\n${menuText}`,
            },
          ],
        }),
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText} — ${body}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from Perplexity');

    return extractJsonFromResponse(content);
  };

  const maxRetries = 2;
  let lastErr: Error | undefined;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await attempt();
    } catch (err) {
      lastErr = err as Error;
      const isRetryable =
        err instanceof SyntaxError ||
        (err instanceof Error && err.message.includes('"items" array')) ||
        (err instanceof Error && err.message.includes('aborted'));
      if (isRetryable && i < maxRetries) {
        console.log(`  Perplexity returned bad/no response, retrying (${i + 1}/${maxRetries})...`);
        continue;
      }
      throw err;
    }
  }
  throw lastErr!;
}

export async function analyzeMenuText(menuText: string): Promise<AnalyzedMenuItem[]> {
  return await analyzeWithPerplexity(menuText);
}
