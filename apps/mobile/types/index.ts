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
