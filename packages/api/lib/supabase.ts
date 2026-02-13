import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ParsedMenuRow {
  id: string;
  place_id: string;
  restaurant_name: string | null;
  menu_items: unknown;
  source_type: string | null;
  created_at: string;
  updated_at: string;
}

const CACHE_TTL_DAYS = 30;

export async function getCachedMenu(placeId: string): Promise<ParsedMenuRow | null> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CACHE_TTL_DAYS);

  const { data, error } = await supabase
    .from('parsed_menus')
    .select('*')
    .eq('place_id', placeId)
    .gte('updated_at', cutoffDate.toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return data as ParsedMenuRow;
}

export async function cacheMenu(
  placeId: string,
  restaurantName: string | null,
  menuItems: unknown,
  sourceType: 'photo' | 'url' | 'text'
): Promise<void> {
  const { error } = await supabase
    .from('parsed_menus')
    .upsert(
      {
        place_id: placeId,
        restaurant_name: restaurantName,
        menu_items: menuItems,
        source_type: sourceType,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'place_id',
      }
    );

  if (error) {
    console.error('Failed to cache menu:', error);
  }
}
