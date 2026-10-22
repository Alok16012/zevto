-- ═══════════════════════════════════════════════════════════════════════════
-- Zavtoo — product details migration
-- Extra product-page details edited in Admin → Products & Stock: a specification
-- table, warranty terms, a 360° view (photo frames) and Amazon / Flipkart links.
-- Run once in Supabase → SQL Editor on a database that already has
-- supabase/schema.sql applied. Safe to run again.
-- ═══════════════════════════════════════════════════════════════════════════

-- specs: [{"label": "Storage tank", "value": "10 L"}, …] shown as the Specifications box.
alter table public.products add column if not exists specs jsonb not null default '[]'::jsonb;
-- One point per line; empty = the general warranty terms are shown.
alter table public.products add column if not exists warranty_terms text not null default '';
-- Photos taken all the way round the product, in order; 8+ frames turn on the 360° view.
alter table public.products add column if not exists spin_images text[] not null default '{}';
alter table public.products add column if not exists amazon_url   text not null default '';
alter table public.products add column if not exists flipkart_url text not null default '';

alter table public.products drop constraint if exists products_specs_array;
alter table public.products add constraint products_specs_array check (jsonb_typeof(specs) = 'array' and jsonb_array_length(specs) <= 40);
alter table public.products drop constraint if exists products_market_links;
alter table public.products add constraint products_market_links check (
  (amazon_url = '' or amazon_url ~* '^https://([a-z0-9-]+\.)*(amazon\.in|amazon\.com|amzn\.to|amzn\.in)(/|$)')
  and (flipkart_url = '' or flipkart_url ~* '^https://([a-z0-9-]+\.)*(flipkart\.com|fkrt\.it|fkrt\.cc)(/|$)')
);
alter table public.products drop constraint if exists products_spin_count;
alter table public.products add constraint products_spin_count check (cardinality(spin_images) <= 72);
