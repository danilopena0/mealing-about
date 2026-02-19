import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<VercelResponse> {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const { neighborhood, diet, page: pageParam, limit: limitParam } = req.query;

    const page = Math.max(1, parseInt(String(pageParam ?? '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(limitParam ?? '20'), 10) || 20));

    let query = supabase
      .from('restaurants_with_counts')
      .select('*', { count: 'exact' })
      .eq('analysis_status', 'analyzed');

    if (neighborhood && typeof neighborhood === 'string') {
      query = query.eq('neighborhood', neighborhood);
    }

    if (diet && typeof diet === 'string') {
      if (diet === 'vegan') {
        query = query.gt('vegan_count', 0);
      } else if (diet === 'vegetarian') {
        query = query.gt('vegetarian_count', 0);
      } else if (diet === 'gluten-free') {
        query = query.gt('gluten_free_count', 0);
      }
    }

    query = query
      .order('rating', { ascending: false, nullsFirst: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error', message: error.message });
    }

    return res.status(200).json({
      restaurants: data ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('Restaurants endpoint error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
