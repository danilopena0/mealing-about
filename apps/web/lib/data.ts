import { supabase } from './supabase';
import { calculateDistance } from './distance';
import type { RestaurantSummary, MenuItem, DietFilter } from './types';

export async function getRestaurants(params: {
  neighborhood?: string;
  cuisineType?: string;
  diet?: DietFilter;
  search?: string;
  page?: number;
  limit?: number;
  userLat?: number;
  userLng?: number;
}): Promise<{ restaurants: RestaurantSummary[]; total: number }> {
  const { neighborhood, cuisineType, diet, search, page = 1, limit = 20, userLat, userLng } = params;
  const nearMe = userLat != null && userLng != null;

  // When sorting by distance we fetch more to sort in-memory; pagination is
  // disabled in that mode so we just return the closest results.
  const clampedLimit = nearMe ? 100 : Math.min(50, Math.max(1, limit));
  const clampedPage = nearMe ? 1 : Math.max(1, page);

  let query = supabase
    .from('restaurants_with_counts')
    .select('*', { count: 'exact' })
    .eq('analysis_status', 'analyzed');

  if (neighborhood) {
    query = query.eq('neighborhood', neighborhood);
  }

  if (cuisineType) {
    query = query.eq('primary_type', cuisineType);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  if (diet && diet !== 'all') {
    if (diet === 'vegan') {
      query = query.gt('vegan_count', 0);
    } else if (diet === 'vegetarian') {
      query = query.gt('vegetarian_count', 0);
    } else if (diet === 'gluten-free') {
      query = query.gt('gluten_free_count', 0);
    }
  }

  if (!nearMe) {
    query = query
      .order('rating', { ascending: false, nullsFirst: false })
      .range((clampedPage - 1) * clampedLimit, clampedPage * clampedLimit - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('getRestaurants error:', error);
    return { restaurants: [], total: 0 };
  }

  let restaurants = (data as RestaurantSummary[]) ?? [];

  if (nearMe) {
    // Attach distance and sort by proximity
    restaurants = restaurants
      .filter((r) => r.latitude != null && r.longitude != null)
      .map((r) => ({
        ...r,
        _distance: calculateDistance(userLat, userLng, r.latitude!, r.longitude!),
      }))
      .sort((a, b) => (a as RestaurantSummary & { _distance: number })._distance -
                      (b as RestaurantSummary & { _distance: number })._distance)
      .slice(0, 50);
  }

  return {
    restaurants,
    total: nearMe ? restaurants.length : (count ?? 0),
  };
}

export async function getRestaurant(slug: string): Promise<{
  restaurant: RestaurantSummary;
  menuItems: MenuItem[];
} | null> {
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants_with_counts')
    .select('*')
    .eq('slug', slug)
    .eq('analysis_status', 'analyzed')
    .single();

  if (restaurantError || !restaurant) {
    return null;
  }

  const { data: menuItems, error: menuError } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurant.id);

  if (menuError) {
    console.error('getRestaurant menuItems error:', menuError);
    return null;
  }

  return {
    restaurant: restaurant as RestaurantSummary,
    menuItems: (menuItems as MenuItem[]) ?? [],
  };
}

export async function getCuisineTypes(): Promise<Array<{ type: string; display: string }>> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('primary_type, primary_type_display')
    .eq('analysis_status', 'analyzed')
    .not('primary_type', 'is', null)
    .order('primary_type');

  if (error || !data) {
    console.error('getCuisineTypes error:', error);
    return [];
  }

  const seen = new Set<string>();
  const result: Array<{ type: string; display: string }> = [];
  for (const row of data) {
    if (row.primary_type && !seen.has(row.primary_type)) {
      seen.add(row.primary_type);
      result.push({
        type: row.primary_type as string,
        display: (row.primary_type_display as string) ?? row.primary_type as string,
      });
    }
  }
  return result.sort((a, b) => a.display.localeCompare(b.display));
}

export async function getNeighborhoods(): Promise<string[]> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('neighborhood')
    .eq('analysis_status', 'analyzed')
    .not('neighborhood', 'is', null)
    .order('neighborhood');

  if (error || !data) {
    console.error('getNeighborhoods error:', error);
    return [];
  }

  // Deduplicate
  const seen = new Set<string>();
  const result: string[] = [];
  for (const row of data) {
    if (row.neighborhood && !seen.has(row.neighborhood)) {
      seen.add(row.neighborhood);
      result.push(row.neighborhood);
    }
  }
  return result;
}

export async function getDietaryCounts(): Promise<{
  vegan: number;
  vegetarian: number;
  glutenFree: number;
}> {
  // Count restaurants with at least 1 item of each type
  const [veganRes, vegRes, gfRes] = await Promise.all([
    supabase
      .from('restaurants_with_counts')
      .select('id', { count: 'exact', head: true })
      .eq('analysis_status', 'analyzed')
      .gt('vegan_count', 0),
    supabase
      .from('restaurants_with_counts')
      .select('id', { count: 'exact', head: true })
      .eq('analysis_status', 'analyzed')
      .gt('vegetarian_count', 0),
    supabase
      .from('restaurants_with_counts')
      .select('id', { count: 'exact', head: true })
      .eq('analysis_status', 'analyzed')
      .gt('gluten_free_count', 0),
  ]);

  return {
    vegan: veganRes.count ?? 0,
    vegetarian: vegRes.count ?? 0,
    glutenFree: gfRes.count ?? 0,
  };
}
