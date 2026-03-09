# Mealing About

A mobile app that helps users identify vegan, vegetarian, and gluten-free options on restaurant menus using AI.

## Demo

https://github.com/user-attachments/assets/a48f920c-9896-41ef-b5fb-a11775c7d838

## Tech Stack

- **Frontend**: Expo (React Native) with Expo Router — iOS, Android, and web
- **Backend**: Vercel serverless functions (TypeScript)
- **Database**: Supabase (Postgres) — caching parsed menus
- **AI Providers**: Perplexity (text menu analysis, default), Claude (image-based menu analysis)
- **APIs**: Google Places (restaurant search)
- **Monorepo**: pnpm workspaces

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **pnpm** 9+
- **Expo Go** app on your phone (for mobile testing)

### 1. Install Node.js (WSL)

If you don't have Node.js set up in WSL yet, install it via [nvm](https://github.com/nvm-sh/nvm):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### 2. Install pnpm via Corepack

```bash
corepack enable
corepack prepare pnpm@9.0.0 --activate
```

### 3. Install dependencies

```bash
pnpm install
```

### 4. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your API keys (see [Environment Variables](#environment-variables) below).

### 5. Start development

```bash
# Start the Expo development server
pnpm dev

# Or start web version
pnpm dev:web

# Start API locally (in a separate terminal)
cd packages/api && vercel dev
```

### WSL-Specific Notes

- **Expo on WSL**: The dev server runs in WSL but your phone needs to reach it. If direct connection doesn't work, use tunnel mode:
  ```bash
  cd apps/mobile && npx expo start --tunnel
  ```
- **Port forwarding**: WSL2 usually auto-forwards ports to Windows. If `localhost` doesn't work from your Windows browser, check your Windows firewall settings.
- **File watcher performance**: WSL2 has limited inotify support for files on the Windows filesystem (`/mnt/c/`). If hot reload is slow or unreliable, consider cloning the repo inside the WSL filesystem instead (e.g. `~/mealing-about`).

#### Recommended: Move Repo to WSL Filesystem

Running the project from `/mnt/c/` (the Windows filesystem) is significantly slower due to cross-filesystem I/O. For much faster bundling and hot reload, copy the repo into WSL's native filesystem:

```bash
cp -r /mnt/c/Users/ukule/PycharmProjects/mealing-about ~/mealing-about
cd ~/mealing-about
pnpm install
pnpm dev:web
```

You can still access it from Windows:
- **Browser**: `localhost:8081` works as normal
- **IDE**: Open the WSL path via `\\wsl$\Ubuntu\home\ukule\mealing-about`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_PLACES_API_KEY` | Yes | Google Places API key for restaurant search |
| `MENU_ANALYZER_PROVIDER` | No | `perplexity` (default) or `anthropic` |
| `PERPLEXITY_API_KEY` | Yes | Perplexity API key for text menu analysis |
| `ANTHROPIC_API_KEY` | For images | Claude API key for image-based menu analysis |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (public read) |
| `SUPABASE_SERVICE_ROLE_KEY` | For auto-save | Supabase service role key — allows the analyze endpoint to write restaurants/menu items to the DB |
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

### Data Pipeline

The pipeline pre-populates the database with restaurants and their analyzed menus. It runs four stages in sequence: discover → find menus → extract → analyze.

**Run the full pipeline (all stages):**

```bash
pnpm --filter @mealing-about/pipeline run run
```

**Run a specific stage in isolation:**

```bash
# Stage 1 — Discover restaurants from Google Places (includes website, phone, and dietary flags)
pnpm --filter @mealing-about/pipeline run discover

# Stage 2 — Find menu URLs for each restaurant
pnpm --filter @mealing-about/pipeline run find-menus

# Stage 3 — Extract menu text from URLs and PDFs
pnpm --filter @mealing-about/pipeline run extract

# Stage 4 — Analyze menus with AI for dietary labels
pnpm --filter @mealing-about/pipeline run analyze
```

Stages can be run independently — useful for re-running a failed stage or iterating on a single step without repeating the full pipeline. Each stage reads from and writes back to Supabase, so they pick up where a previous run left off.

### Database Migrations

Migrations live in `supabase/migrations/` and are applied in order by filename.

**Install the Supabase CLI** (one-time):

```bash
# via npm
npm install -g supabase

# or via Homebrew (macOS/Linux)
brew install supabase/tap/supabase
```

**Link to your project** (one-time per machine):

```bash
# Find your project ref in the Supabase dashboard URL:
# https://supabase.com/dashboard/project/<your-project-ref>
supabase link --project-ref <your-project-ref>
```

**Push pending migrations to the remote database:**

```bash
supabase db push
```

This applies any migration files in `supabase/migrations/` that haven't been run yet. Safe to run multiple times — already-applied migrations are skipped.

**Check migration status:**

```bash
supabase migration list
```

Shows which migrations have been applied to the remote database and which are pending.

**Local development with a local Postgres instance:**

```bash
# Start a local Supabase stack (Postgres + Studio)
supabase start

# Apply all migrations to the local database
supabase db reset

# Stop the local stack
supabase stop
```

`supabase db reset` wipes and recreates the local database from scratch, replaying all migrations. Useful for testing schema changes locally before pushing to production.

### Running the pipeline via GitHub Actions

The pipeline also runs as a GitHub Actions workflow (`.github/workflows/pipeline.yml`). It triggers automatically every Sunday at 4am UTC, and can be triggered manually at any time.

**From the GitHub UI:**

1. Go to the **Actions** tab in the repository
2. Select **Pipeline** from the left sidebar
3. Click **Run workflow**
4. Optionally pick a specific stage from the dropdown (leave blank to run all five)
5. Click the green **Run workflow** button

**From the CLI:**

```bash
# Run the full pipeline
gh workflow run pipeline.yml

# Run a specific stage
gh workflow run pipeline.yml --field stage=analyze

# Check on the run after triggering it
gh run list --workflow=pipeline.yml
gh run watch   # tail live logs of the most recent run
```

Once triggered, the job runs entirely on GitHub's servers — you can close your terminal or shut down your machine immediately after.

**Required GitHub secrets** (set under Settings → Secrets → Actions):

| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (write access) |
| `GOOGLE_PLACES_API_KEY` | Restaurant discovery |
| `PERPLEXITY_API_KEY` | Menu text analysis |
| `ANTHROPIC_API_KEY` | Image-based menu analysis |
| `GEMINI_API_KEY` | Menu analysis (Gemini provider) |

See [CLAUDE.md](CLAUDE.md) for AI-assisted development guidelines.
See [ARCHITECTURE.md](ARCHITECTURE.md) for system design documentation.

## Troubleshooting

### `node_modules missing` after cloning or moving the repo

```bash
pnpm install
```

### Vercel CLI not found

Use `npm` to install it globally (not `pnpm`):

```bash
npm install -g vercel
```

### `vercel dev` — "Function Runtimes must have a valid version"

The `functions` block in `packages/api/vercel.json` had `@vercel/node@3` (major-only).
Either remove the `functions` block or pin a full version like `@vercel/node@3.0.7`.
The current `vercel.json` omits it — `@vercel/node` is the default for `.ts` files.

### `vercel dev` — "No Output Directory named 'public' found"

The linked Vercel project has a build command set. Fix it in two places:

1. `packages/api/vercel.json` — set `"buildCommand": ""` and `"outputDirectory": "."` (already done)
2. Vercel dashboard → project Settings → General → clear **Build Command** and **Output Directory**, set **Framework Preset** to _Other_

### `vercel dev` recursion error

The `dev` script in `packages/api/package.json` used to be `vercel dev`, which caused
Vercel CLI to invoke itself. The script has been renamed to `start`. Run the API with:

```bash
cd packages/api && vercel dev
```

### Unable to resolve `@babel/runtime/helpers/interopRequireDefault`

`@babel/runtime` is missing from the mobile package. Install it:

```bash
pnpm --filter @mealing-about/mobile add @babel/runtime
```

## License

MIT
