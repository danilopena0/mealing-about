import 'dotenv/config';
import { supabase } from '../lib/supabase.js';
import { findMenuUrl } from '../lib/scraper.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function main(): Promise<void> {
  console.log('Stage 3: Find menu URLs');

  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, website_uri')
    .not('website_uri', 'is', null)
    .is('menu_url', null)
    .eq('analysis_status', 'pending');

  if (error) {
    throw new Error(`Failed to query restaurants: ${error.message}`);
  }

  if (!restaurants || restaurants.length === 0) {
    console.log('No restaurants to find menus for.');
    return;
  }

  console.log(`Finding menus for ${restaurants.length} restaurants...`);

  for (const restaurant of restaurants) {
    try {
      const result = await findMenuUrl(restaurant.website_uri as string);

      if (result) {
        await supabase
          .from('restaurants')
          .update({
            menu_url: result.menuUrl,
            menu_type: result.menuType,
            updated_at: new Date().toISOString(),
          })
          .eq('id', restaurant.id);

        console.log(`✓ ${restaurant.name} — ${result.menuType}: ${result.menuUrl}`);
      } else {
        await supabase
          .from('restaurants')
          .update({
            menu_type: 'none',
            analysis_status: 'failed',
            analysis_error: 'No menu found on website',
            updated_at: new Date().toISOString(),
          })
          .eq('id', restaurant.id);

        console.log(`✗ ${restaurant.name} — no menu found`);
      }
    } catch (err) {
      console.error(`✗ ${restaurant.name} — error:`, (err as Error).message);
    }

    // Rate limit: 500ms between scrapes
    await sleep(500);
  }

  console.log('Stage 3 complete.');
}

// Run when executed directly (not when imported by run.ts)
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error in stage 3:', err);
    process.exit(1);
  });
}
