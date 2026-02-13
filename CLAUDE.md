# CLAUDE.md - Project Intelligence

> This file provides context and constraints for AI-assisted development.
> It persists across sessions and compensates for context window limitations.

## Project Overview

**Name:** Mealing About
**Type:** mobile-app (React Native/Expo + Vercel serverless)
**Status:** active-development
**One-liner:** Mobile app to identify vegan, vegetarian, and gluten-free options on restaurant menus using AI

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mealing About                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [Expo Mobile App]  ────────►  [Vercel API]  ────────►  [AI]  │
│        │                             │                          │
│        │                             ├──► Google Places API     │
│        │                             ├──► Perplexity API (text) │
│        │                             ├──► Claude API (images)   │
│        │                             └──► Supabase (cache)      │
│        │                                                        │
│        └──► Location Services                                   │
│        └──► Camera/Photos                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components
- `apps/mobile/` - Expo app with Expo Router, handles UI and device features
- `packages/api/` - Vercel serverless functions for backend logic
- `supabase/` - Database migrations for menu caching

### Important Decisions
1. **Expo Router for navigation**: File-based routing matches mental model, typed routes
2. **Vercel serverless over standalone backend**: Simpler deployment, scales to zero
3. **Supabase for caching**: Free tier sufficient, easy setup, good TypeScript support
4. **Perplexity as default AI provider**: Fast, cost-effective for text analysis; Claude as fallback for images
5. **pnpm workspaces**: Efficient disk usage, strict dependency management

## Development Principles

### Non-Negotiable Constraints
These are load-bearing. Do not deviate without explicit discussion.

- **Type safety**: All code must be TypeScript with strict mode
- **Mobile-first**: UI must work on small screens first, then adapt up
- **Offline graceful**: App must not crash when offline, show cached data
- **Privacy-conscious**: Location only when needed, no tracking
- **API key security**: Never expose API keys in client code

### Flexible Guidelines
Agent has latitude here. Suggest alternatives if better.

- Component structure and file organization
- Styling approach (StyleSheet vs styled-components)
- State management (React state vs external library)
- Error message wording

### Code Style Preferences
- Functional components with hooks
- Named exports over default exports
- Explicit return types on functions
- Early returns over nested conditionals
- Descriptive variable names over comments

## Working Patterns

### Session Workflow
1. **Before generating**: State what you're building and acceptance criteria
2. **During generation**: Work in bounded chunks, test frequently
3. **After generation**: Run type checks, verify on device/simulator
4. **Before committing**: Update this file if architecture changed

### Common Commands

```bash
# Development
pnpm dev              # Start Expo dev server
pnpm dev:web          # Start web version
pnpm --filter @mealing-about/api dev  # Start API locally

# Type checking
pnpm typecheck        # Check all packages

# Linting
pnpm lint             # Lint all packages
```

## Testing Strategy

### Test Types
- **Unit**: Pure functions in lib/, utility helpers
- **Integration**: API endpoint behavior
- **Manual**: UI flows on device/simulator (priority for MVP)

### Running Tests
```bash
# Type checking is the primary automated check for now
pnpm typecheck
```

## Known Gotchas

1. **Expo location on web**: Works differently than native, test both
2. **Image picker base64**: Can be large, may need compression
3. **Claude response parsing**: Always validate JSON response structure
4. **Vercel cold starts**: First API call may be slow, show loading state
5. **Google Places quota**: Free tier has daily limits, handle gracefully

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/search-restaurants` | POST | Find nearby restaurants via Google Places |
| `/api/analyze-menu` | POST | Analyze menu via Perplexity (text) or Claude (images) |

## Environment Variables

| Variable | Required | Where Used |
|----------|----------|------------|
| `GOOGLE_PLACES_API_KEY` | Yes | API package |
| `MENU_ANALYZER_PROVIDER` | No | API package (default: perplexity) |
| `PERPLEXITY_API_KEY` | Yes | API package (text analysis) |
| `ANTHROPIC_API_KEY` | For images | API package (image analysis fallback) |
| `SUPABASE_URL` | Yes | API package |
| `SUPABASE_ANON_KEY` | Yes | API package |
| `EXPO_PUBLIC_API_URL` | Yes | Mobile app |

## Changelog

| Date | Change | Rationale |
|------|--------|-----------|
| 2026-01-26 | Initial setup | Project bootstrap with monorepo structure |
| 2026-01-28 | Added Perplexity | Perplexity as default provider, Claude for images |
