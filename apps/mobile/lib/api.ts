import type {
  Restaurant,
  SearchRestaurantsRequest,
  SearchByTextRequest,
  AnalyzeMenuRequest,
  AnalyzeMenuResponse,
  RestaurantSummary,
  PreloadedMenuItem,
  DietFilter,
} from '@/types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || 'An error occurred',
      response.status
    );
  }

  return response.json();
}

export async function searchRestaurants(
  request: SearchRestaurantsRequest
): Promise<Restaurant[]> {
  return fetchApi<Restaurant[]>('/search-restaurants', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function searchByText(
  request: SearchByTextRequest
): Promise<Restaurant[]> {
  return fetchApi<Restaurant[]>('/search-by-text', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function analyzeMenu(
  request: AnalyzeMenuRequest
): Promise<AnalyzeMenuResponse> {
  return fetchApi<AnalyzeMenuResponse>('/analyze-menu', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function browseRestaurants(params: {
  neighborhood?: string;
  diet?: DietFilter;
  page?: number;
  limit?: number;
}): Promise<{ restaurants: RestaurantSummary[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params.neighborhood) searchParams.set('neighborhood', params.neighborhood);
  if (params.diet && params.diet !== 'all') searchParams.set('diet', params.diet);
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const endpoint = query ? `/restaurants?${query}` : '/restaurants';

  const data = await fetchApi<{ restaurants: RestaurantSummary[]; total: number; page: number; limit: number }>(endpoint);
  return { restaurants: data.restaurants, total: data.total };
}

export async function getRestaurantDetail(slug: string): Promise<{
  restaurant: RestaurantSummary;
  menuItems: PreloadedMenuItem[];
}> {
  return fetchApi<{ restaurant: RestaurantSummary; menuItems: PreloadedMenuItem[] }>(
    `/restaurant?slug=${encodeURIComponent(slug)}`
  );
}

export { ApiError };
