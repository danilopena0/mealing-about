import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AnalyzedMenuItem } from '../types.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Parse "Please retry in 41.8s" from Gemini 429 error messages
function parseRetryDelay(message: string): number | null {
  const match = message.match(/Please retry in (\d+(?:\.\d+)?)s/);
  return match ? Math.ceil(parseFloat(match[1])) : null;
}

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

async function analyzeWithGemini(menuText: string): Promise<AnalyzedMenuItem[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const attempt = async (): Promise<AnalyzedMenuItem[]> => {
    const result = await model.generateContent(
      `${ANALYSIS_PROMPT}\n\nMenu text:\n${menuText}`,
    );
    const text = result.response.text();
    if (!text) throw new Error('Empty response from Gemini');
    return extractJsonFromResponse(text);
  };

  try {
    return await attempt();
  } catch (err) {
    const retryDelay = parseRetryDelay((err as Error).message);
    if (retryDelay !== null && retryDelay <= 90) {
      console.log(`  Gemini rate limited — waiting ${retryDelay}s...`);
      await sleep(retryDelay * 1000);
      return await attempt();
    }
    throw err;
  }
}

async function analyzeWithClaude(menuText: string): Promise<AnalyzedMenuItem[]> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    timeout: 30_000,
  });

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `${ANALYSIS_PROMPT}\n\nMenu text:\n${menuText}`,
      },
    ],
  });

  const content = message.content[0];
  if (!content || content.type !== 'text') {
    throw new Error('Empty or unexpected response from Claude');
  }

  return extractJsonFromResponse(content.text);
}

export async function analyzeMenuText(menuText: string): Promise<AnalyzedMenuItem[]> {
  // Try Perplexity first (using existing credits)
  try {
    return await analyzeWithPerplexity(menuText);
  } catch (err) {
    console.error('  Perplexity failed, trying Gemini:', (err as Error).message);
  }

  // Fall back to Gemini
  try {
    return await analyzeWithGemini(menuText);
  } catch (err) {
    throw new Error(
      `All AI providers failed. Last error: ${(err as Error).message}`,
    );
  }
}
