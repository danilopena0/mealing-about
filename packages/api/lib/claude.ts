import Anthropic from '@anthropic-ai/sdk';
import { MENU_ANALYSIS_PROMPT, type MenuItem } from './menu-analyzer.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function analyzeWithClaude(menuText: string): Promise<MenuItem[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: MENU_ANALYSIS_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Analyze this menu and identify all dietary options:\n\n${menuText}`,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const parsed = JSON.parse(textContent.text);
  return parsed.items;
}

export async function analyzeImageWithClaude(base64Image: string): Promise<MenuItem[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: MENU_ANALYSIS_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: 'Analyze this menu image and identify all dietary options. Extract all visible menu items.',
          },
        ],
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const parsed = JSON.parse(textContent.text);
  return parsed.items;
}
