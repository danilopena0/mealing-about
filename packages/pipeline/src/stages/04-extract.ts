import 'dotenv/config';
import { supabase } from '../lib/supabase.js';
import { extractMenuText } from '../lib/scraper.js';
import { extractPdfText } from '../lib/pdf.js';

export async function main(): Promise<void> {
  console.log('Stage 4: Extract raw menu text');

  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, menu_url, menu_type')
    .not('menu_url', 'is', null)
    .eq('analysis_status', 'pending');

  if (error) {
    throw new Error(`Failed to query restaurants: ${error.message}`);
  }

  if (!restaurants || restaurants.length === 0) {
    console.log('No restaurants to extract menus for.');
    return;
  }

  console.log(`Extracting menus for ${restaurants.length} restaurants...`);

  for (const restaurant of restaurants) {
    // Mark as extracting
    await supabase
      .from('restaurants')
      .update({
        analysis_status: 'extracting',
        updated_at: new Date().toISOString(),
      })
      .eq('id', restaurant.id);

    try {
      let text: string | null = null;
      const menuType = restaurant.menu_type as string;
      const menuUrl = restaurant.menu_url as string;

      if (menuType === 'pdf') {
        text = await extractPdfText(menuUrl);
      } else if (menuType === 'html') {
        text = await extractMenuText(menuUrl);
      }

      if (text && text.length > 100) {
        // Delete existing raw_menus entry and insert fresh
        await supabase.from('raw_menus').delete().eq('restaurant_id', restaurant.id);

        await supabase.from('raw_menus').insert({
          restaurant_id: restaurant.id,
          raw_text: text,
          source_url: menuUrl,
        });

        await supabase
          .from('restaurants')
          .update({
            analysis_status: 'extracted',
            updated_at: new Date().toISOString(),
          })
          .eq('id', restaurant.id);

        console.log(`✓ ${restaurant.name} — extracted ${text.length} chars`);
      } else {
        await supabase
          .from('restaurants')
          .update({
            analysis_status: 'failed',
            analysis_error: 'Could not extract menu text',
            updated_at: new Date().toISOString(),
          })
          .eq('id', restaurant.id);

        console.log(`✗ ${restaurant.name} — extraction failed or insufficient text`);
      }
    } catch (err) {
      await supabase
        .from('restaurants')
        .update({
          analysis_status: 'failed',
          analysis_error: (err as Error).message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', restaurant.id);

      console.error(`✗ ${restaurant.name} — error:`, (err as Error).message);
    }
  }

  console.log('Stage 4 complete.');
}

// Run when executed directly (not when imported by run.ts)
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error in stage 4:', err);
    process.exit(1);
  });
}
