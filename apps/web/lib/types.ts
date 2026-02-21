export interface RestaurantSummary {
  id: string;
  slug: string;
  name: string;
  address: string;
  neighborhood: string | null;
  rating: number | null;
  user_rating_count: number | null;
  price_level: number | null;
  serves_vegetarian_food: boolean | null;
  editorial_summary: string | null;
  photo_url: string | null;
  website_uri: string | null;
  vegan_count: number;
  vegetarian_count: number;
  gluten_free_count: number;
  total_item_count: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  is_vegan: boolean;
  is_vegetarian: boolean;
  is_gluten_free: boolean;
  confidence: 'certain' | 'uncertain';
  modifications: string[] | null;
  ask_server: string | null;
}

export type DietFilter = 'all' | 'vegan' | 'vegetarian' | 'gluten-free';
