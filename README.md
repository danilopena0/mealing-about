# Mealing About

A mobile app that helps users identify vegan, vegetarian, and gluten-free options on restaurant menus using AI.

## Tech Stack

- **Frontend**: Expo (React Native) with Expo Router — iOS, Android, and web
- **Backend**: Vercel serverless functions (TypeScript)
- **Database**: Supabase (Postgres) — caching parsed menus
- **AI Providers**: Perplexity (text menu analysis, default), Claude (image-based menu analysis)
- **APIs**: Google Places (restaurant search)
- **Monorepo**: pnpm workspaces

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+
- Expo Go app on your phone (for mobile testing)

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# Start the Expo development server
pnpm dev

# Or start web version
pnpm dev:web

# Start API locally
pnpm --filter @mealing-about/api dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_PLACES_API_KEY` | Yes | Google Places API key for restaurant search |
| `MENU_ANALYZER_PROVIDER` | No | `perplexity` (default) or `anthropic` |
| `PERPLEXITY_API_KEY` | Yes | Perplexity API key for text menu analysis |
| `ANTHROPIC_API_KEY` | For images | Claude API key for image-based menu analysis |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `EXPO_PUBLIC_API_URL` | Yes | Backend API URL (e.g. `http://localhost:3000/api`) |

## Project Structure

```
mealing-about/
├── apps/
│   └── mobile/              # Expo app
│       ├── app/             # Expo Router screens
│       │   ├── _layout.tsx  # Root layout
│       │   ├── index.tsx    # Home screen
│       │   ├── restaurants.tsx  # Restaurant list
│       │   └── menu/[placeId].tsx  # Menu detail
│       ├── components/      # Reusable UI components
│       ├── hooks/           # Custom hooks (useLocation)
│       ├── lib/             # API client
│       └── types/           # Shared TypeScript types
├── packages/
│   └── api/                 # Vercel serverless functions
│       ├── api/             # Endpoints
│       │   ├── search-restaurants.ts
│       │   └── analyze-menu.ts
│       └── lib/             # Backend utilities
│           ├── google-places.ts
│           ├── menu-analyzer.ts
│           ├── perplexity.ts
│           ├── claude.ts
│           └── supabase.ts
├── supabase/
│   └── migrations/          # Database schema
├── pnpm-workspace.yaml
└── package.json             # Monorepo root
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/search-restaurants` | POST | Find nearby restaurants via Google Places |
| `/api/analyze-menu` | POST | Analyze menu text (Perplexity) or images (Claude) |

## Features

- **Location-based restaurant discovery** — auto-detect location, search nearby restaurants
- **Menu input methods** — photo capture, URL paste, or manual text entry
- **AI-powered menu analysis** — identifies vegan, vegetarian, and gluten-free options
- **Smart filtering** — filter results by dietary preference
- **Uncertainty handling** — flags items to ask your server about
- **Modification suggestions** — how to make items diet-friendly
- **Menu caching** — stores analyzed menus for 30 days via Supabase

## Development

```bash
pnpm dev              # Start Expo dev server
pnpm dev:web          # Start web version
pnpm typecheck        # Type check all packages
pnpm lint             # Lint all packages
```

See [CLAUDE.md](CLAUDE.md) for AI-assisted development guidelines.
See [ARCHITECTURE.md](ARCHITECTURE.md) for system design documentation.

## License

MIT
