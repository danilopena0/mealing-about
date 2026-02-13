import type { VercelRequest, VercelResponse } from '@vercel/node';
import { searchNearbyRestaurants } from '../lib/google-places.js';

interface SearchRequest {
  latitude: number;
  longitude: number;
  radius?: number;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
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
    const body = req.body as SearchRequest;

    if (!body.latitude || !body.longitude) {
      return res.status(400).json({
        error: 'Missing required fields: latitude, longitude',
      });
    }

    const { latitude, longitude, radius = 1500 } = body;

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        error: 'Invalid coordinates',
      });
    }

    // Limit radius to reasonable bounds (100m to 5km)
    const clampedRadius = Math.min(Math.max(radius, 100), 5000);

    const restaurants = await searchNearbyRestaurants(
      latitude,
      longitude,
      clampedRadius
    );

    // Sort by distance
    restaurants.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    return res.status(200).json(restaurants);
  } catch (error) {
    console.error('Search restaurants error:', error);
    return res.status(500).json({
      error: 'Failed to search restaurants',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
