import 'dotenv/config';
import { supabase } from '../lib/supabase.js';
import { getPlaceDetails } from '../lib/google-places.js';

const BATCH_SIZE = 50;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function main(): Promise<void> {
  console.log('Stage 2: Enrich restaurants with place details');

  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, place_id, name')
    .is('website_uri', null)
    .eq('analysis_status', 'pending')
    .limit(BATCH_SIZE);

  if (error) {
    throw new Error(`Failed to query restaurants: ${error.message}`);
  }

  if (!restaurants || restaurants.length === 0) {
    console.log('No restaurants to enrich.');
    return;
  }

  console.log(`Enriching ${restaurants.length} restaurants...`);

  for (const restaurant of restaurants) {
    try {
      const details = await getPlaceDetails(restaurant.place_id as string);

      if (!details.websiteUri) {
        // No website — mark as failed
        await supabase
          .from('restaurants')
          .update({
            menu_type: 'none',
            analysis_status: 'failed',
            analysis_error: 'No website found',
            updated_at: new Date().toISOString(),
          })
          .eq('id', restaurant.id);

        console.log(`✗ ${restaurant.name} — no website found`);
      } else {
        await supabase
          .from('restaurants')
          .update({
            website_uri: details.websiteUri,
            phone: details.phone,
            serves_vegetarian_food: details.servesVegetarianFood,
            editorial_summary: details.editorialSummary,
            photo_url: details.photoUrl,
            user_rating_count: details.userRatingCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', restaurant.id);

        console.log(`✓ Enriched: ${restaurant.name} — website: ${details.websiteUri}`);
      }
    } catch (err) {
      console.error(`✗ ${restaurant.name} — error:`, (err as Error).message);
    }

    // Rate limit: 100ms between calls
    await sleep(100);
  }

  console.log('Stage 2 complete.');
}

// Run when executed directly (not when imported by run.ts)
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error in stage 2:', err);
    process.exit(1);
  });
}
