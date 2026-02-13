import type {
  Restaurant,
  SearchRestaurantsRequest,
  AnalyzeMenuRequest,
  AnalyzeMenuResponse,
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

export async function analyzeMenu(
  request: AnalyzeMenuRequest
): Promise<AnalyzeMenuResponse> {
  return fetchApi<AnalyzeMenuResponse>('/analyze-menu', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export { ApiError };
