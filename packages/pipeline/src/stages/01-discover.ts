import 'dotenv/config';
import { supabase } from '../lib/supabase.js';
import { searchNearbyRestaurants } from '../lib/google-places.js';
import { isChain } from '../chain-blocklist.js';
import { generateUniqueSlug } from '../lib/slugify.js';
import { NEIGHBORHOODS } from '../neighborhoods.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function main(): Promise<void> {
  console.log('Stage 1: Discover restaurants');

  // Load existing place_id→slug map so re-runs reuse the same slug
  const { data: existingRows } = await supabase
    .from('restaurants')
    .select('place_id, slug');
  const existingSlugByPlaceId = new Map<string, string>(
    (existingRows ?? []).map((r) => [r.place_id as string, r.slug as string]),
  );
  const existingSlugs = new Set<string>(existingSlugByPlaceId.values());

  for (const neighborhood of NEIGHBORHOODS) {
    try {
      const places = await searchNearbyRestaurants(
        neighborhood.latitude,
        neighborhood.longitude,
        neighborhood.radius,
      );

      // Filter by rating, review count, and chain status
      const filtered = places.filter(
        (p) =>
          (p.rating ?? 0) >= 4.0 &&
          (p.userRatingCount ?? 0) >= 30 &&
          !isChain(p.name),
      );

      let newCount = 0;

      for (const place of filtered) {
        // Reuse existing slug on re-runs to avoid drift (e.g. big-bowl-2, big-bowl-3)
        const slug =
          existingSlugByPlaceId.get(place.placeId) ??
          generateUniqueSlug(place.name, neighborhood.name, existingSlugs);
        existingSlugs.add(slug);

        const { error } = await supabase.from('restaurants').upsert(
          {
            place_id: place.placeId,
            name: place.name,
            slug,
            address: place.address,
            neighborhood: neighborhood.name,
            latitude: place.latitude,
            longitude: place.longitude,
            rating: place.rating,
            user_rating_count: place.userRatingCount,
            price_level: place.priceLevel,
            photo_url: place.photoUrl,
            analysis_status: 'pending',
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'place_id',
            ignoreDuplicates: false,
          },
        );

        if (error) {
          console.error(`  ✗ Failed to upsert ${place.name}:`, error.message);
        } else {
          newCount++;
        }
      }

      console.log(
        `✓ [${neighborhood.name}] Found ${filtered.length} restaurants, ${newCount} upserted`,
      );
    } catch (err) {
      console.error(`✗ [${neighborhood.name}] Error:`, (err as Error).message);
    }

    // Rate limit: 200ms between neighborhood searches
    await sleep(200);
  }

  console.log('Stage 1 complete.');
}

// Run when executed directly (not when imported by run.ts)
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error in stage 1:', err);
    process.exit(1);
  });
}
