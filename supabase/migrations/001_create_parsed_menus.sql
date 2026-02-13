-- Cached menu analyses
create table parsed_menus (
  id uuid primary key default gen_random_uuid(),
  place_id text unique not null,
  restaurant_name text,
  menu_items jsonb not null,
  source_type text, -- 'photo', 'url', 'text'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast lookups by place_id
create index idx_parsed_menus_place_id on parsed_menus(place_id);

-- Index for cache TTL queries
create index idx_parsed_menus_updated_at on parsed_menus(updated_at);

-- Function to auto-update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at on row updates
create trigger update_parsed_menus_updated_at
  before update on parsed_menus
  for each row
  execute function update_updated_at_column();
