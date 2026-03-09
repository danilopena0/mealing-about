-- =============================================================
-- Mealing About: Add city column to restaurants
--
-- Supports the city pipeline which pre-populates restaurants
-- across the top 5 US cities (vegan-scene-based).
-- =============================================================

alter table restaurants
  add column city text;

create index idx_restaurants_city on restaurants(city);
