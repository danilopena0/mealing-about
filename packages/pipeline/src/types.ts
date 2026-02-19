export interface RestaurantRow {
  id: string;
  place_id: string;
  name: string;
  slug: string;
  address: string;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  website_uri: string | null;
  phone: string | null;
  rating: number | null;
  user_rating_count: number | null;
  price_level: number | null;
  serves_vegetarian_food: boolean | null;
  editorial_summary: string | null;
  photo_url: string | null;
  menu_url: string | null;
  menu_type: 'html' | 'pdf' | 'none' | null;
  analysis_status: 'pending' | 'extracting' | 'extracted' | 'analyzing' | 'analyzed' | 'failed';
  analysis_error: string | null;
  last_analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MenuItemInsert {
  restaurant_id: string;
  name: string;
  description: string | null;
  is_vegan: boolean;
  is_vegetarian: boolean;
  is_gluten_free: boolean;
  confidence: 'certain' | 'uncertain';
  modifications: string[] | null;
  ask_server: string | null;
}

export interface AnalyzedMenuItem {
  name: string;
  description?: string;
  labels: Array<{
    type: 'vegan' | 'vegetarian' | 'gluten-free';
    confidence: 'confirmed' | 'uncertain';
    askServer?: string;
  }>;
  modifications?: string[];
}
