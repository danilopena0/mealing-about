-- =============================================================
-- Mealing About: Add category column to menu_items
--
-- Introduces a 'category' column ('food' | 'beverage') on
-- menu_items so that beverages can be tracked but excluded from
-- the dietary signal counts surfaced to users.
--
-- Changes:
--   1. Add category column to menu_items (default 'food')
--   2. Index on category for fast filtering
--   3. Rebuild restaurants_with_counts view so that:
--        - vegan_count / vegetarian_count / gluten_free_count
--          only count food items with confidence = 'certain'
--        - total_item_count continues to count every item
--        - beverage_count counts items where category = 'beverage'
-- =============================================================


-- =============================================================
-- 1. Add category column to menu_items
--    Defaults to 'food' so existing rows remain valid without
--    a backfill step. Constrained to the two supported values.
-- =============================================================

alter table menu_items
  add column category text not null default 'food'
    check (category in ('food', 'beverage'));


-- =============================================================
-- 2. Index on category
-- =============================================================

create index idx_menu_items_category on menu_items(category);


-- =============================================================
-- 3. Rebuild restaurants_with_counts
--    Dietary counts now exclude beverages so that a restaurant
--    stocking many vegan drinks does not inflate its food-diet
--    signal. A separate beverage_count column is added for UIs
--    that want to display or filter on drink options.
-- =============================================================

create or replace view restaurants_with_counts
  with (security_invoker = true)
as
  select
    r.*,
    count(mi.id) filter (where mi.is_vegan       and mi.confidence = 'certain' and mi.category = 'food') as vegan_count,
    count(mi.id) filter (where mi.is_vegetarian  and mi.confidence = 'certain' and mi.category = 'food') as vegetarian_count,
    count(mi.id) filter (where mi.is_gluten_free and mi.confidence = 'certain' and mi.category = 'food') as gluten_free_count,
    count(mi.id)                                                                                          as total_item_count,
    count(mi.id) filter (where mi.category = 'beverage')                                                 as beverage_count
  from restaurants r
  left join menu_items mi on mi.restaurant_id = r.id
  group by r.id;
