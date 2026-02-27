-- =============================================================
-- Mealing About: Fix diet counts to exclude uncertain items
--
-- Previously vegan_count/vegetarian_count/gluten_free_count
-- included items where confidence = 'uncertain', causing
-- restaurants with only uncertain items to appear in diet
-- filter results.
--
-- Now the counts only reflect items the AI is confident about,
-- so browse filters surface genuinely reliable restaurants.
-- =============================================================

create or replace view restaurants_with_counts
  with (security_invoker = true)
as
  select
    r.*,
    count(mi.id) filter (where mi.is_vegan        and mi.confidence = 'certain') as vegan_count,
    count(mi.id) filter (where mi.is_vegetarian   and mi.confidence = 'certain') as vegetarian_count,
    count(mi.id) filter (where mi.is_gluten_free  and mi.confidence = 'certain') as gluten_free_count,
    count(mi.id)                                                                  as total_item_count
  from restaurants r
  left join menu_items mi on mi.restaurant_id = r.id
  group by r.id;
