import 'dotenv/config';
import { supabase } from '../lib/supabase.js';
import { analyzeMenuText } from '../lib/ai.js';
import type { MenuItemInsert, AnalyzedMenuItem } from '../types.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapItemToInsert(
  restaurantId: string,
  item: AnalyzedMenuItem,
): MenuItemInsert {
  const isVegan = item.labels.some((l) => l.type === 'vegan');
  const isVegetarian = item.labels.some((l) => l.type === 'vegetarian');
  const isGlutenFree = item.labels.some((l) => l.type === 'gluten-free');

  const allConfirmed =
    item.labels.length > 0 && item.labels.every((l) => l.confidence === 'confirmed');
  const confidence: 'certain' | 'uncertain' = allConfirmed ? 'certain' : 'uncertain';

  const askServer =
    item.labels.find((l) => l.askServer)?.askServer ?? null;

  return {
    restaurant_id: restaurantId,
    name: item.name,
    description: item.description ?? null,
    is_vegan: isVegan,
    is_vegetarian: isVegetarian,
    is_gluten_free: isGlutenFree,
    confidence,
    modifications: item.modifications ?? null,
    ask_server: askServer,
  };
}

export async function main(): Promise<void> {
  console.log('Stage 5: Analyze menu items with AI');

  // Query restaurants joined with raw_menus where status is 'extracted'
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, raw_menus(raw_text)')
    .eq('analysis_status', 'extracted');

  if (error) {
    throw new Error(`Failed to query restaurants: ${error.message}`);
  }

  if (!restaurants || restaurants.length === 0) {
    console.log('No restaurants to analyze.');
    return;
  }

  console.log(`Analyzing ${restaurants.length} restaurants...`);

  for (const restaurant of restaurants) {
    // Update status to analyzing
    await supabase
      .from('restaurants')
      .update({
        analysis_status: 'analyzing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', restaurant.id);

    try {
      const rawMenus = restaurant.raw_menus as Array<{ raw_text: string }> | null;
      const rawText = rawMenus?.[0]?.raw_text;

      if (!rawText) {
        throw new Error('No raw menu text found');
      }

      const items = await analyzeMenuText(rawText);

      // Delete existing menu_items for this restaurant
      await supabase.from('menu_items').delete().eq('restaurant_id', restaurant.id);

      // Insert new menu_items
      if (items.length > 0) {
        const inserts: MenuItemInsert[] = items.map((item) =>
          mapItemToInsert(restaurant.id as string, item),
        );

        const { error: insertError } = await supabase
          .from('menu_items')
          .insert(inserts);

        if (insertError) {
          throw new Error(`Failed to insert menu items: ${insertError.message}`);
        }
      }

      // Update restaurant as analyzed
      await supabase
        .from('restaurants')
        .update({
          analysis_status: 'analyzed',
          last_analyzed_at: new Date().toISOString(),
          analysis_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', restaurant.id);

      const veganCount = items.filter((i) =>
        i.labels.some((l) => l.type === 'vegan'),
      ).length;
      const vegCount = items.filter((i) =>
        i.labels.some((l) => l.type === 'vegetarian'),
      ).length;
      const gfCount = items.filter((i) =>
        i.labels.some((l) => l.type === 'gluten-free'),
      ).length;

      console.log(
        `✓ ${restaurant.name} — ${items.length} items (${veganCount} vegan, ${vegCount} vegetarian, ${gfCount} GF)`,
      );
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

    // Rate limit: 1000ms between AI calls
    await sleep(1000);
  }

  console.log('Stage 5 complete.');
}

// Run when executed directly (not when imported by run.ts)
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error in stage 5:', err);
    process.exit(1);
  });
}
