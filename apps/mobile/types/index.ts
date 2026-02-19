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

export interface Restaurant {
  placeId: string;
  name: string;
  address: string;
  distance?: number;
  rating?: number;
  priceLevel?: number;
  isOpen?: boolean;
  photoUrl?: string;
}

export interface ParsedMenu {
  id: string;
  placeId: string;
  restaurantName: string;
  items: MenuItem[];
  sourceType: 'photo' | 'url' | 'text';
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface SearchRestaurantsRequest {
  latitude: number;
  longitude: number;
  radius?: number;
}

export interface SearchByTextRequest {
  query: string;
}

export type AnalyzerProvider = 'perplexity' | 'anthropic';

export interface AnalyzeMenuRequest {
  menuImage?: string;
  menuUrl?: string;
  menuText?: string;
  placeId?: string;
  provider?: AnalyzerProvider;
}

export interface AnalyzeMenuResponse {
  items: MenuItem[];
  cached: boolean;
  provider?: AnalyzerProvider;
}

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
  vegan_count: number;
  vegetarian_count: number;
  gluten_free_count: number;
  total_item_count: number;
}

export interface PreloadedMenuItem {
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
