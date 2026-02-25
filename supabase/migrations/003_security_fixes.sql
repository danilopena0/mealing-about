-- =============================================================
-- Mealing About: Security hardening
-- Fixes flagged by Supabase security linter:
--   1. restaurants_with_counts view — default SECURITY DEFINER
--   2. update_updated_at_column — mutable search_path
--   3. parsed_menus — anon write access via always-true WITH CHECK
-- =============================================================


-- =============================================================
-- 1. Fix restaurants_with_counts view
--    Default view security in older Postgres/Supabase builds runs
--    as the view creator, bypassing the querying user's RLS.
--    security_invoker = true enforces the caller's RLS policies.
-- =============================================================

create or replace view restaurants_with_counts
  with (security_invoker = true)
as
  select
    r.*,
    count(mi.id) filter (where mi.is_vegan)        as vegan_count,
    count(mi.id) filter (where mi.is_vegetarian)   as vegetarian_count,
    count(mi.id) filter (where mi.is_gluten_free)  as gluten_free_count,
    count(mi.id)                                    as total_item_count
  from restaurants r
  left join menu_items mi on mi.restaurant_id = r.id
  group by r.id;


-- =============================================================
-- 2. Fix update_updated_at_column — pin search_path
--    Without a fixed search_path a malicious schema in the
--    caller's path could shadow pg built-ins used by the fn.
-- =============================================================

create or replace function update_updated_at_column()
  returns trigger
  language plpgsql
  security invoker
  set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =============================================================
-- 3. Fix parsed_menus RLS — remove unrestricted anon writes
--    The previous "Allow all access for anon" policy let anyone
--    insert, update, or delete cache rows via the anon key.
--    Writes come from the pipeline using SUPABASE_SERVICE_ROLE_KEY
--    (which bypasses RLS), so no write policy is needed.
-- =============================================================

drop policy if exists "Allow all access for anon" on parsed_menus;

-- Public read is intentional (cached menu data, nothing sensitive)
create policy "Public read parsed_menus"
  on parsed_menus for select
  using (true);

-- raw_menus note: RLS is enabled with no policies (migration 002).
-- This is intentional — no anon or authenticated access is desired.
-- The pipeline writes via service role key which bypasses RLS.
-- No changes needed; the linter warning can be safely ignored.
