# Architecture

> System-level documentation that survives context window limits.
> Update this when components change or new patterns emerge.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              User Device                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Expo Mobile App                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │  │
│  │  │  Home       │  │ Restaurants │  │   Menu      │                   │  │
│  │  │  Screen     │──│   List      │──│  Analysis   │                   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │  │
│  │         │                                  │                          │  │
│  │         ▼                                  ▼                          │  │
│  │  ┌─────────────┐                   ┌─────────────┐                   │  │
│  │  │  Location   │                   │   Camera/   │                   │  │
│  │  │  Services   │                   │   Photos    │                   │  │
│  │  └─────────────┘                   └─────────────┘                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Vercel Edge Network                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Serverless Functions                             │  │
│  │  ┌─────────────────────┐      ┌─────────────────────┐                │  │
│  │  │  search-restaurants │      │    analyze-menu     │                │  │
│  │  └─────────────────────┘      └─────────────────────┘                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
              │                              │                    │
              ▼                              ▼                    ▼
     ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
     │  Google Places  │    │  Perplexity AI  │    │   Claude API    │    │    Supabase     │
     │      API        │    │  (text menus)   │    │   (images)      │    │   (Postgres)    │
     └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Components

### Mobile App (`apps/mobile/`)

**Purpose:** User-facing mobile and web application
**Location:** `apps/mobile/`

**Key files:**
- `app/_layout.tsx` - Root layout with navigation stack
- `app/index.tsx` - Home screen with location permission flow
- `app/restaurants.tsx` - Restaurant list with search results
- `app/menu/[placeId].tsx` - Menu analysis screen
- `hooks/useLocation.ts` - Location permission and tracking
- `lib/api.ts` - Backend API client
- `types/index.ts` - Shared TypeScript types

**Dependencies:** Expo, React Native, expo-router, expo-location, expo-image-picker

### API Package (`packages/api/`)

**Purpose:** Backend serverless functions
**Location:** `packages/api/`

**Key files:**
- `api/search-restaurants.ts` - Restaurant search endpoint
- `api/analyze-menu.ts` - Menu analysis endpoint
- `lib/menu-analyzer.ts` - Provider abstraction for AI analysis
- `lib/perplexity.ts` - Perplexity API client (text menus)
- `lib/claude.ts` - Anthropic Claude API client (image menus)
- `lib/google-places.ts` - Google Places API client
- `lib/supabase.ts` - Supabase client for caching

**Dependencies:** @anthropic-ai/sdk, @supabase/supabase-js, @vercel/node

## Data Flow

### Restaurant Search Flow
1. User taps "Search restaurants near me"
2. App requests location permission (if not granted)
3. App gets current coordinates from device
4. App calls `POST /api/search-restaurants` with coordinates
5. API calls Google Places nearbySearch
6. API transforms results and returns sorted by distance
7. App displays restaurant list

### Menu Analysis Flow
1. User selects a restaurant and taps to analyze menu
2. User provides menu via photo, URL, or text
3. App calls `POST /api/analyze-menu` with input
4. API checks Supabase cache for existing analysis
5. If cache miss:
   - For text/URL input: API calls Perplexity for analysis
   - For image input: API calls Claude for analysis (Perplexity doesn't support images)
6. API caches result in Supabase (keyed by place_id)
7. API returns structured menu items with provider info
8. App displays items with dietary labels and filters

## External Dependencies

| Dependency | Purpose | Version | Notes |
|------------|---------|---------|-------|
| Expo | Mobile framework | 52.x | Managed workflow |
| expo-router | Navigation | 4.x | File-based routing |
| @anthropic-ai/sdk | Claude API | 0.30.x | Menu analysis |
| @supabase/supabase-js | Database | 2.45.x | Caching layer |

## Configuration

### Environment Variables
| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| `GOOGLE_PLACES_API_KEY` | Restaurant search | Yes | - |
| `ANTHROPIC_API_KEY` | Menu analysis | Yes | - |
| `SUPABASE_URL` | Database connection | Yes | - |
| `SUPABASE_ANON_KEY` | Database auth | Yes | - |
| `EXPO_PUBLIC_API_URL` | API base URL | Yes | http://localhost:3000/api |

### Config Files
- `.env` - Local environment (not committed)
- `apps/mobile/app.json` - Expo configuration
- `packages/api/vercel.json` - Vercel deployment config

## Integration Points

### APIs Consumed
- **Google Places**: nearbySearch for restaurant discovery
- **Claude**: messages API for menu image/text analysis
- **Supabase**: REST API for cache reads/writes

### APIs Exposed
- `POST /api/search-restaurants`: `{ latitude, longitude, radius? }` → `Restaurant[]`
- `POST /api/analyze-menu`: `{ menuImage?, menuUrl?, menuText?, placeId? }` → `{ items, cached }`

## Error Handling Strategy

- **Location errors**: Graceful fallback, manual entry option
- **API errors**: Show user-friendly message, retry button
- **Claude parsing errors**: Return partial results if possible
- **Network errors**: Show cached data if available

## Performance Considerations

- **Bottleneck:** Claude analysis (5-10 seconds)
- **Mitigation:** Loading state with progress indication, caching
- **Scaling path:** Pre-cache popular chain menus, batch analysis

## Security Notes

- API keys stored in environment variables only
- Supabase anon key is safe for client-side (RLS policies protect data)
- No user authentication in MVP (Phase 2)
- No PII collected

## Future Considerations

- [ ] User accounts via Supabase Auth
- [ ] Favorites and history
- [ ] Pre-cached popular chain menus
- [ ] Offline mode with SQLite
- [ ] Push notifications for new menu updates
