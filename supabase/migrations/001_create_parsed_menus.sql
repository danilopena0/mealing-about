-- =============================================================
-- Mealing About: parsed_menus table
-- Caches AI-analyzed menu results so we don't re-analyze
-- the same restaurant menu repeatedly (30-day TTL in app code)
-- =============================================================

-- Stores one row per restaurant's analyzed menu
create table parsed_menus (
  id uuid primary key default gen_random_uuid(),          -- unique row ID
  place_id text unique not null,                          -- Google Places ID (one menu per restaurant)
  restaurant_name text,                                   -- human-readable name (optional)
  menu_items jsonb not null,                              -- AI-parsed menu items with dietary info
  source_type text,                                       -- how the menu was provided: 'photo', 'url', or 'text'
  created_at timestamptz default now(),                   -- when the menu was first analyzed
  updated_at timestamptz default now()                    -- when the menu was last re-analyzed
);

-- Fast lookups when checking if a menu is already cached
create index idx_parsed_menus_place_id on parsed_menus(place_id);

-- Used to find stale cache entries past the 30-day TTL
create index idx_parsed_menus_updated_at on parsed_menus(updated_at);

-- =============================================================
-- Auto-update updated_at on every row change
-- =============================================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_parsed_menus_updated_at
  before update on parsed_menus
  for each row
  execute function update_updated_at_column();

-- =============================================================
-- Row Level Security
-- Enables RLS so the anon key can only do what policies allow.
-- Since this table only holds cached menu data (nothing sensitive),
-- we allow full read/write access via the anon key.
-- =============================================================

alter table parsed_menus enable row level security;

create policy "Allow all access for anon"
  on parsed_menus
  for all
  using (true)
  with check (true);
