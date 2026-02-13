import { MENU_ANALYSIS_PROMPT, type MenuItem } from './menu-analyzer.js';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY!;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
}

export async function analyzeWithPerplexity(menuText: string): Promise<MenuItem[]> {
  const messages: PerplexityMessage[] = [
    {
      role: 'system',
      content: MENU_ANALYSIS_PROMPT,
    },
    {
      role: 'user',
      content: `Analyze this menu and identify all dietary options:\n\n${menuText}`,
    },
  ];

  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages,
      max_tokens: 4096,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
  }

  const data: PerplexityResponse = await response.json();

  if (!data.choices?.[0]?.message?.content) {
    throw new Error('No response from Perplexity');
  }

  const content = data.choices[0].message.content;

  // Extract JSON from the response (it might be wrapped in markdown code blocks)
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
  const jsonStr = jsonMatch[1]?.trim() || content.trim();

  const parsed = JSON.parse(jsonStr);
  return parsed.items;
}
