-- =============================================================
-- Mealing About: Pipeline schema (v2)
-- Replaces the user-driven parsed_menus flow with a pre-populated
-- dataset. parsed_menus is kept for backward compat but deprecated.
--
-- New tables:
--   restaurants  — one row per restaurant, enriched from Google Places
--   raw_menus    — intermediate scraped menu text (pipeline internal)
--   menu_items   — normalized AI-analyzed dietary items (public read)
-- =============================================================

-- =============================================================
-- restaurants
-- =============================================================

create table restaurants (
  id                    uuid primary key default gen_random_uuid(),

  -- Google Places identity
  place_id              text unique not null,
  name                  text not null,
  slug                  text unique not null,   -- URL-safe, e.g. "big-bowl-wicker-park"

  -- Location
  address               text not null,
  neighborhood          text,                   -- e.g. 'Humboldt Park'
  latitude              numeric,
  longitude             numeric,

  -- Google Places enrichment
  website_uri           text,
  phone                 text,
  rating                numeric,
  user_rating_count     int,
  price_level           int,                    -- 0–4
  serves_vegetarian_food boolean,
  editorial_summary     text,
  photo_url             text,

  -- Menu discovery (set during pipeline stage 3)
  menu_url              text,
  menu_type             text check (menu_type in ('html', 'pdf', 'none')),

  -- Pipeline status
  analysis_status       text not null default 'pending'
                          check (analysis_status in (
                            'pending',      -- not yet processed
                            'extracting',   -- stage 3-4 in progress
                            'extracted',    -- raw text saved, awaiting AI
                            'analyzing',    -- AI call in progress
                            'analyzed',     -- menu_items populated
                            'failed'        -- error, see analysis_error
                          )),
  analysis_error        text,                   -- last error message
  last_analyzed_at      timestamptz,

  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- Lookups by neighborhood for browse queries
create index idx_restaurants_neighborhood on restaurants(neighborhood);

-- Filter by pipeline status (pipeline picks up 'pending' rows)
create index idx_restaurants_analysis_status on restaurants(analysis_status);

-- Filter: restaurants Google flagged as vegetarian-friendly
create index idx_restaurants_serves_veg on restaurants(serves_vegetarian_food);

-- Sort by rating for default browse order
create index idx_restaurants_rating on restaurants(rating desc nulls last);

-- Auto-update updated_at
create trigger update_restaurants_updated_at
  before update on restaurants
  for each row
  execute function update_updated_at_column();   -- reuse trigger fn from migration 001


-- =============================================================
-- raw_menus
-- Intermediate storage for scraped/extracted menu text.
-- Pipeline-internal only — not exposed via API.
-- Deleted and re-created on each re-analysis run.
-- =============================================================

create table raw_menus (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references restaurants(id) on delete cascade,
  raw_text        text not null,
  source_url      text,
  extracted_at    timestamptz default now()
);

create index idx_raw_menus_restaurant_id on raw_menus(restaurant_id);


-- =============================================================
-- menu_items
-- One row per dish. Populated by AI analysis of raw_menus.
-- Cleared and re-inserted on each re-analysis run.
-- =============================================================

create table menu_items (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references restaurants(id) on delete cascade,

  name            text not null,
  description     text,

  -- Dietary flags (AI-assigned)
  is_vegan        boolean not null default false,
  is_vegetarian   boolean not null default false,
  is_gluten_free  boolean not null default false,

  -- How confident the AI is
  confidence      text not null default 'certain'
                    check (confidence in ('certain', 'uncertain')),

  -- Optional clarification hints
  modifications   text[],       -- e.g. ['ask for no butter', 'request GF bun']
  ask_server      text,         -- e.g. 'confirm oil used for frying'

  created_at      timestamptz default now()
);

-- Fast filtering: find all vegan items for a restaurant
create index idx_menu_items_restaurant_id on menu_items(restaurant_id);
create index idx_menu_items_is_vegan      on menu_items(is_vegan) where is_vegan = true;
create index idx_menu_items_is_vegetarian on menu_items(is_vegetarian) where is_vegetarian = true;
create index idx_menu_items_is_gluten_free on menu_items(is_gluten_free) where is_gluten_free = true;


-- =============================================================
-- Row Level Security
--
-- restaurants  → public read, pipeline writes via service role
-- raw_menus    → no public access (pipeline only, service role)
-- menu_items   → public read, pipeline writes via service role
--
-- The pipeline scripts use SUPABASE_SERVICE_ROLE_KEY which bypasses
-- RLS entirely, so no write policies are needed here.
-- =============================================================

alter table restaurants  enable row level security;
alter table raw_menus    enable row level security;
alter table menu_items   enable row level security;

-- Public can browse restaurants and menu items
create policy "Public read restaurants"
  on restaurants for select
  using (true);

create policy "Public read menu_items"
  on menu_items for select
  using (true);

-- raw_menus: no public access at all (pipeline uses service role key)
-- No policy = no anon access.


-- =============================================================
-- Convenience view: restaurants with vegan item counts
-- Used by the browse API to avoid N+1 queries.
-- =============================================================

create view restaurants_with_counts as
  select
    r.*,
    count(mi.id) filter (where mi.is_vegan)        as vegan_count,
    count(mi.id) filter (where mi.is_vegetarian)   as vegetarian_count,
    count(mi.id) filter (where mi.is_gluten_free)  as gluten_free_count,
    count(mi.id)                                    as total_item_count
  from restaurants r
  left join menu_items mi on mi.restaurant_id = r.id
  group by r.id;
