import type { VercelRequest, VercelResponse } from '@vercel/node';
import { searchByText } from '../lib/google-places.js';

interface SearchByTextRequest {
  query: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
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
    const body = req.body as SearchByTextRequest;

    if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
      return res.status(400).json({
        error: 'Missing required field: query',
      });
    }

    if (body.query.length > 500) {
      return res.status(400).json({
        error: 'Query too long (max 500 characters)',
      });
    }

    const restaurants = await searchByText(body.query.trim());

    return res.status(200).json(restaurants);
  } catch (error) {
    console.error('Search by text error:', error);
    return res.status(500).json({
      error: 'Failed to search restaurants',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
