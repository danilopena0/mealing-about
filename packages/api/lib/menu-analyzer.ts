import { analyzeWithClaude, analyzeImageWithClaude } from './claude.js';
import { analyzeWithPerplexity } from './perplexity.js';

export type DietaryLabel = 'vegan' | 'vegetarian' | 'gluten-free';
export type Confidence = 'confirmed' | 'uncertain';

export interface DietaryInfo {
  type: DietaryLabel;
  confidence: Confidence;
  askServer?: string;
}

export interface MenuItem {
  name: string;
  description?: string;
  labels: DietaryInfo[];
  modifications?: string[];
}

export type AnalyzerProvider = 'perplexity' | 'anthropic';

const DEFAULT_PROVIDER: AnalyzerProvider =
  (process.env.MENU_ANALYZER_PROVIDER as AnalyzerProvider) || 'perplexity';

export const MENU_ANALYSIS_PROMPT = `You are a dietary menu analyzer. Your task is to analyze restaurant menus and identify items that are vegan, vegetarian, or gluten-free.

For each menu item, you must:
1. Extract the item name and description
2. Determine which dietary labels apply (vegan, vegetarian, gluten-free)
3. Mark confidence as "confirmed" if ingredients clearly indicate the diet compatibility, or "uncertain" if you're inferring based on typical recipes
4. For uncertain items, provide an "askServer" suggestion for what to verify with restaurant staff
5. Suggest modifications that could make items compatible with specific diets

Guidelines:
- Vegan: No animal products (meat, dairy, eggs, honey)
- Vegetarian: No meat/fish, but may include dairy and eggs
- Gluten-free: No wheat, barley, rye, or their derivatives

Return ONLY valid JSON matching this schema:
{
  "items": [
    {
      "name": "string",
      "description": "string (optional)",
      "labels": [
        {
          "type": "vegan" | "vegetarian" | "gluten-free",
          "confidence": "confirmed" | "uncertain",
          "askServer": "string (optional, for uncertain items)"
        }
      ],
      "modifications": ["string"] (optional, suggestions to make item diet-friendly)
    }
  ]
}

Be thorough but practical. Common items like french fries should be marked as potentially gluten-free with uncertainty (ask about shared fryer). Bread items should not be marked gluten-free unless specified.`;

export async function analyzeMenuText(
  menuText: string,
  provider: AnalyzerProvider = DEFAULT_PROVIDER
): Promise<MenuItem[]> {
  if (provider === 'anthropic') {
    return analyzeWithClaude(menuText);
  }
  return analyzeWithPerplexity(menuText);
}

export async function analyzeMenuImage(
  base64Image: string,
  provider: AnalyzerProvider = DEFAULT_PROVIDER
): Promise<MenuItem[]> {
  // Perplexity doesn't support image analysis, fall back to Claude
  if (provider === 'perplexity') {
    console.log('Image analysis not supported by Perplexity, falling back to Claude');
    return analyzeImageWithClaude(base64Image);
  }
  return analyzeImageWithClaude(base64Image);
}
