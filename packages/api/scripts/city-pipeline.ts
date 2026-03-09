#!/usr/bin/env tsx
/**
 * City Pipeline
 *
 * Discovers and analyzes restaurants across the top 5 US cities (vegan-scene-based).
 *
 * Stage 1 – Discovery: calls Google Places searchNearby for each neighborhood,
 *   deduplicates by placeId, and upserts into the restaurants table.
 *
 * Stage 2 – Analysis: for each pending restaurant, asks Perplexity to search
 *   for the menu online and analyze it for dietary flags, then writes results
 *   to menu_items.
 *
 * Usage:
 *   pnpm --filter @mealing-about/api pipeline
 *   pnpm --filter @mealing-about/api pipeline --stage1-only
 *   pnpm --filter @mealing-about/api pipeline --stage2-only
 *   pnpm --filter @mealing-about/api pipeline --dry-run        # estimate cost, no API calls
 *   pnpm --filter @mealing-about/api pipeline --limit 50       # analyze at most 50 restaurants
 */

import 'dotenv/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { searchNearbyRestaurants } from '../lib/google-places.js';
import { MENU_ANALYSIS_PROMPT, type MenuItem } from '../lib/menu-analyzer.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY!;

const NEIGHBORHOOD_RADIUS_M = 1200;
const DISCOVERY_DELAY_MS = 300;  // ~3 req/s, well within Google's 100 RPM limit
const ANALYSIS_DELAY_MS = 1500;  // stay well within Perplexity rate limits

// Pricing estimates (conservative)
const GOOGLE_PLACES_COST_PER_CALL = 0.032;    // USD per searchNearby request
const PERPLEXITY_COST_PER_RESTAURANT = 0.005; // USD per sonar analysis (~2500 tokens)

const args = process.argv.slice(2);
const STAGE1_ONLY = args.includes('--stage1-only');
const STAGE2_ONLY = args.includes('--stage2-only');
const DRY_RUN = args.includes('--dry-run');

const limitArg = args.indexOf('--limit');
const LIMIT = limitArg !== -1 ? parseInt(args[limitArg + 1] ?? '0', 10) : Infinity;

// ---------------------------------------------------------------------------
// City / neighborhood definitions
// ---------------------------------------------------------------------------

interface Neighborhood {
  name: string;
  lat: number;
  lng: number;
}

interface City {
  name: string;
  neighborhoods: Neighborhood[];
}

const CITIES: City[] = [
  {
    name: 'New York',
    neighborhoods: [
      { name: 'East Village',     lat: 40.7265, lng: -73.9815 },
      { name: 'West Village',     lat: 40.7337, lng: -74.0027 },
      { name: 'Lower East Side',  lat: 40.7157, lng: -73.9863 },
      { name: 'Williamsburg',     lat: 40.7081, lng: -73.9571 },
      { name: 'Park Slope',       lat: 40.6681, lng: -73.9800 },
      { name: 'Bushwick',         lat: 40.6944, lng: -73.9213 },
      { name: 'Crown Heights',    lat: 40.6694, lng: -73.9444 },
      { name: 'Greenpoint',       lat: 40.7293, lng: -73.9546 },
      { name: 'Astoria',          lat: 40.7721, lng: -73.9301 },
      { name: 'Jackson Heights',  lat: 40.7484, lng: -73.8917 },
      { name: 'Harlem',           lat: 40.8116, lng: -73.9465 },
      { name: 'Upper West Side',  lat: 40.7870, lng: -73.9754 },
      { name: 'Midtown',          lat: 40.7549, lng: -73.9840 },
      { name: 'Brooklyn Heights', lat: 40.6961, lng: -73.9936 },
      { name: 'DUMBO',            lat: 40.7035, lng: -73.9889 },
    ],
  },
  {
    name: 'Los Angeles',
    neighborhoods: [
      { name: 'Silver Lake',   lat: 34.0870, lng: -118.2695 },
      { name: 'Echo Park',     lat: 34.0783, lng: -118.2606 },
      { name: 'Los Feliz',     lat: 34.1062, lng: -118.2908 },
      { name: 'Venice',        lat: 33.9850, lng: -118.4695 },
      { name: 'West Hollywood',lat: 34.0900, lng: -118.3617 },
      { name: 'Koreatown',     lat: 34.0584, lng: -118.2999 },
      { name: 'Highland Park', lat: 34.1145, lng: -118.1875 },
      { name: 'Culver City',   lat: 34.0211, lng: -118.3965 },
      { name: 'Downtown',      lat: 34.0522, lng: -118.2437 },
      { name: 'Mid-City',      lat: 34.0359, lng: -118.3420 },
    ],
  },
  {
    name: 'Chicago',
    neighborhoods: [
      { name: 'Wicker Park',      lat: 41.9088, lng: -87.6773 },
      { name: 'Logan Square',     lat: 41.9217, lng: -87.7029 },
      { name: 'Pilsen',           lat: 41.8557, lng: -87.6578 },
      { name: 'Andersonville',    lat: 41.9817, lng: -87.6681 },
      { name: 'Rogers Park',      lat: 42.0085, lng: -87.6680 },
      { name: 'Lincoln Park',     lat: 41.9248, lng: -87.6520 },
      { name: 'Ukrainian Village',lat: 41.8951, lng: -87.6809 },
      { name: 'Hyde Park',        lat: 41.7943, lng: -87.5907 },
    ],
  },
  {
    name: 'San Francisco',
    neighborhoods: [
      { name: 'Mission District', lat: 37.7599, lng: -122.4148 },
      { name: 'Castro',           lat: 37.7609, lng: -122.4350 },
      { name: 'Haight-Ashbury',   lat: 37.7692, lng: -122.4481 },
      { name: 'North Beach',      lat: 37.8061, lng: -122.4103 },
      { name: 'Hayes Valley',     lat: 37.7762, lng: -122.4244 },
      { name: 'SoMa',             lat: 37.7785, lng: -122.4056 },
      { name: 'Richmond',         lat: 37.7786, lng: -122.4852 },
      { name: 'Noe Valley',       lat: 37.7502, lng: -122.4334 },
      { name: 'Inner Sunset',     lat: 37.7542, lng: -122.4652 },
    ],
  },
  {
    name: 'Portland',
    neighborhoods: [
      { name: 'Alberta Arts District', lat: 45.5603, lng: -122.6466 },
      { name: 'Division Street',       lat: 45.5035, lng: -122.6312 },
      { name: 'Pearl District',        lat: 45.5265, lng: -122.6829 },
      { name: 'Hawthorne',             lat: 45.5122, lng: -122.6341 },
      { name: 'Mississippi Ave',       lat: 45.5568, lng: -122.6750 },
      { name: 'Northwest',             lat: 45.5290, lng: -122.6996 },
      { name: 'Buckman',               lat: 45.5194, lng: -122.6518 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(name: string, neighborhood: string, city: string, placeId: string): string {
  const base = `${name} ${neighborhood} ${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base}-${placeId.slice(-6)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Perplexity: search for and analyze a restaurant menu online
// ---------------------------------------------------------------------------

async function analyzeRestaurantOnline(
  name: string,
  address: string,
  city: string
): Promise<MenuItem[]> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: MENU_ANALYSIS_PROMPT },
        {
          role: 'user',
          content:
            `Search for the complete menu of "${name}" restaurant at ${address}, ${city}. ` +
            `Find all food and beverage items available and analyze each one for vegan, ` +
            `vegetarian, and gluten-free suitability following the system instructions.`,
        },
      ],
      max_tokens: 8000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Perplexity error: ${response.status} - ${text}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from Perplexity');

  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
  const jsonStr = (jsonMatch[1] ?? content).trim();

  const parsed = JSON.parse(jsonStr) as { items: MenuItem[] };
  return parsed.items;
}

// ---------------------------------------------------------------------------
// Stage 1: Discovery
// ---------------------------------------------------------------------------

async function runDiscovery(supabase: SupabaseClient): Promise<void> {
  const totalNeighborhoods = CITIES.reduce((sum, c) => sum + c.neighborhoods.length, 0);
  const estimatedCost = (totalNeighborhoods * GOOGLE_PLACES_COST_PER_CALL).toFixed(2);

  console.log('\n=== Stage 1: Discovery ===\n');
  console.log(`  ${totalNeighborhoods} neighborhoods × $${GOOGLE_PLACES_COST_PER_CALL} = ~$${estimatedCost} (Google Places)`);

  if (DRY_RUN) {
    console.log('\n  [dry-run] Skipping API calls.');
    return;
  }

  console.log('');

  let totalInserted = 0;

  for (const city of CITIES) {
    console.log(`\n[${city.name}]`);

    const seen = new Set<string>();

    for (let i = 0; i < city.neighborhoods.length; i++) {
      const hood = city.neighborhoods[i];
      process.stdout.write(`  ${hood.name} ... `);

      const restaurants = await searchNearbyRestaurants(hood.lat, hood.lng, NEIGHBORHOOD_RADIUS_M);

      const newRestaurants = restaurants.filter((r) => !seen.has(r.placeId));
      newRestaurants.forEach((r) => seen.add(r.placeId));

      const rows = newRestaurants.map((r) => ({
        place_id: r.placeId,
        name: r.name,
        slug: generateSlug(r.name, hood.name, city.name, r.placeId),
        address: r.address,
        neighborhood: hood.name,
        city: city.name,
        latitude: r.latitude ?? null,
        longitude: r.longitude ?? null,
        rating: r.rating ?? null,
        user_rating_count: r.userRatingCount ?? null,
        price_level: r.priceLevel ?? null,
        serves_vegetarian_food: r.servesVegetarianFood ?? null,
        website_uri: r.websiteUri ?? null,
        photo_url: r.photoUrl ?? null,
        primary_type: r.cuisineType ?? null,
        primary_type_display: r.cuisineTypeDisplay ?? null,
        analysis_status: 'pending',
      }));

      if (rows.length === 0) {
        console.log('0 new');
      } else {
        const { error } = await supabase
          .from('restaurants')
          .upsert(rows, { onConflict: 'place_id', ignoreDuplicates: true });

        if (error) {
          console.error(`\n  ERROR upserting ${hood.name}:`, error.message);
        } else {
          totalInserted += rows.length;
          console.log(`${rows.length} new`);
        }
      }

      if (i < city.neighborhoods.length - 1) {
        await sleep(DISCOVERY_DELAY_MS);
      }
    }

    console.log(`  -> ${seen.size} unique restaurants discovered in ${city.name}`);
  }

  console.log(`\nDiscovery complete. ${totalInserted} restaurants inserted.`);
}

// ---------------------------------------------------------------------------
// Stage 2: Analysis
// ---------------------------------------------------------------------------

async function runAnalysis(supabase: SupabaseClient): Promise<void> {
  console.log('\n=== Stage 2: Analysis ===\n');

  const { data: allPending, error } = await supabase
    .from('restaurants')
    .select('id, name, address, city, neighborhood')
    .eq('analysis_status', 'pending')
    .order('city')
    .order('neighborhood');

  if (error) {
    console.error('Failed to fetch pending restaurants:', error.message);
    return;
  }

  if (!allPending || allPending.length === 0) {
    console.log('No pending restaurants to analyze.');
    return;
  }

  const pending = isFinite(LIMIT) ? allPending.slice(0, LIMIT) : allPending;
  const estimatedCost = (pending.length * PERPLEXITY_COST_PER_RESTAURANT).toFixed(2);

  console.log(`  ${allPending.length} pending restaurants${isFinite(LIMIT) ? `, capped at ${LIMIT} by --limit` : ''}`);
  console.log(`  ${pending.length} × $${PERPLEXITY_COST_PER_RESTAURANT} = ~$${estimatedCost} (Perplexity)\n`);

  if (DRY_RUN) {
    console.log('  [dry-run] Skipping API calls.');
    return;
  }

  let succeeded = 0;
  let failed = 0;
  let totalCost = 0;

  for (let i = 0; i < pending.length; i++) {
    const r = pending[i] as {
      id: string;
      name: string;
      address: string;
      city: string;
      neighborhood: string;
    };

    process.stdout.write(`[${i + 1}/${pending.length}] ${r.name} (${r.neighborhood}, ${r.city}) ... `);

    // Mark as analyzing
    await supabase
      .from('restaurants')
      .update({ analysis_status: 'analyzing' })
      .eq('id', r.id);

    try {
      const items = await analyzeRestaurantOnline(r.name, r.address, r.city);

      if (items.length === 0) {
        throw new Error('No menu items found');
      }

      // Clear old items and insert new ones
      await supabase.from('menu_items').delete().eq('restaurant_id', r.id);

      const menuRows = items.map((item) => ({
        restaurant_id: r.id,
        name: item.name,
        description: item.description ?? null,
        is_vegan: item.labels.some((l) => l.type === 'vegan'),
        is_vegetarian: item.labels.some((l) => l.type === 'vegetarian'),
        is_gluten_free: item.labels.some((l) => l.type === 'gluten-free'),
        confidence: item.labels.every((l) => l.confidence === 'confirmed') ? 'certain' : 'uncertain',
        modifications: item.modifications ?? null,
        ask_server: item.labels.find((l) => l.askServer)?.askServer ?? null,
      }));

      await supabase.from('menu_items').insert(menuRows);

      await supabase
        .from('restaurants')
        .update({ analysis_status: 'analyzed', last_analyzed_at: new Date().toISOString() })
        .eq('id', r.id);

      totalCost += PERPLEXITY_COST_PER_RESTAURANT;
      console.log(`${items.length} items  (running cost: ~$${totalCost.toFixed(2)})`);
      succeeded++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await supabase
        .from('restaurants')
        .update({ analysis_status: 'failed', analysis_error: message })
        .eq('id', r.id);
      console.log(`FAILED: ${message}`);
      failed++;
    }

    if (i < pending.length - 1) {
      await sleep(ANALYSIS_DELAY_MS);
    }
  }

  console.log(`\nAnalysis complete. ${succeeded} succeeded, ${failed} failed. Estimated cost: ~$${totalCost.toFixed(2)}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!SUPABASE_URL) {
    console.error('Missing SUPABASE_URL — add it to packages/api/.env');
    process.exit(1);
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY — add it to packages/api/.env (find it in Supabase dashboard → Settings → API → service_role)');
    process.exit(1);
  }
  if (!STAGE1_ONLY && !PERPLEXITY_API_KEY) {
    console.error('Missing PERPLEXITY_API_KEY (required for analysis stage)');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (!STAGE2_ONLY) await runDiscovery(supabase);
  if (!STAGE1_ONLY) await runAnalysis(supabase);

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Pipeline error:', err);
  process.exit(1);
});
