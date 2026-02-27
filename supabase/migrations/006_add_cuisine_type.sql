-- =============================================================
-- Mealing About: Add cuisine type columns to restaurants
--
-- Stores the Google Places API v1 primaryType and
-- primaryTypeDisplayName fields on the restaurants table so
-- that cuisine type is available for filtering and display
-- without a round-trip to the Places API.
--
-- Changes:
--   1. Add primary_type column to restaurants
--        machine-readable, e.g. "thai_restaurant"
--   2. Add primary_type_display column to restaurants
--        human-readable, e.g. "Thai restaurant"
--   3. Index on primary_type for fast filtering
-- =============================================================


-- =============================================================
-- 1. Add primary_type column to restaurants
--    Nullable because existing rows and future rows from
--    sources that do not return a primaryType are valid.
-- =============================================================

alter table restaurants
  add column primary_type text;


-- =============================================================
-- 2. Add primary_type_display column to restaurants
--    Human-readable label sourced from
--    primaryTypeDisplayName.text in the Places API response.
-- =============================================================

alter table restaurants
  add column primary_type_display text;


-- =============================================================
-- 3. Index on primary_type
-- =============================================================

create index idx_restaurants_primary_type on restaurants(primary_type);
