-- Website content from paanifilter.com for a database that already exists.
-- Run once in Supabase → SQL Editor. Safe to re-run; re-run schema.sql too for the spare parts and gallery.

-- Product photos column (also created by schema.sql).
alter table public.products add column if not exists images text[] not null default '{}';

-- Spare parts from paanifilter.com (also in schema.sql).
insert into public.products (id, name, spec, price, mrp, category, art, stages, warranty, description, sort) values
  ('membrane-75', '75 GPD RO Membrane Premium', 'Universal fit · 75 GPD', 850, 1200, 'spare', 'cartridge', '75 GPD', '6 Months',
   'High-rejection TFC membrane for all standard RO systems. Fits Kent, Aquaguard & more.', 8),
  ('sediment-5', 'Sediment Filter 5 Micron (Pack of 3)', 'Multi brand · 5 micron', 299, 450, 'spare', 'cartridge', '3 filters', '30 Days',
   'Removes dirt, sand & rust. Compatible with standard 10-inch filter housings.', 9),
  ('booster-pump-24v', 'RO Booster Pump 24V DC Motor', 'Universal · 24V DC', 1299, 1800, 'spare', 'spare', '24V DC', '3 Months',
   'High-pressure booster pump for low water pressure RO systems. 24V DC, 75-100 GPD.', 10),
  ('cto-carbon', 'Carbon Block Filter CTO (4 Stage)', 'Premium · carbon block', 549, 750, 'spare', 'cartridge', 'Carbon block', '30 Days',
   'Removes chlorine, bad taste & odour. Activated carbon block technology for pure water.', 11),
  ('smps-24v', 'SMPS Power Supply 24V 2A Adapter', 'Universal · 24V 2A', 399, 599, 'spare', 'spare', '24V 2A', '3 Months',
   'Reliable 24V 2A SMPS adapter for RO booster pumps. Input 220V AC, Output 24V DC.', 12),
  ('service-kit-7', 'Complete RO Service Kit (7 Pcs)', 'Combo pack · 7 pieces', 1999, 3200, 'spare', 'spare', '7 pieces', '30 Days',
   'All-in-one kit: Sediment + Carbon + UF + Membrane + SMPS + Connectors + Spanner.', 13),
  ('uf-membrane', 'UF Hollow Fiber Ultra Membrane', 'Multi brand · UF', 699, 999, 'spare', 'cartridge', 'UF', '30 Days',
   'Ultra-filtration membrane for bacteria removal without electricity. 0.01 micron filtration.', 14),
  ('valve-kit', 'Ball Valve & Connector Kit Set', 'Universal · fittings', 149, 250, 'spare', 'spare', 'Kit', '30 Days',
   'Complete set of ball valves, check valves, elbow & straight connectors for RO system installation.', 15)
on conflict (id) do nothing;

insert into public.service_catalog (type, tagline, price, price_note, duration, includes, sort) values
  ('Repair', 'Expert diagnosis and repair of all RO water purifier problems at your doorstep by certified technicians.', 299, 'visit charge · spare parts if needed', '30–90 min', '{"Low water pressure fix","Water leakage repair","Bad taste/odour fix","Pump & motor repair","90-day service warranty"}', 1),
  ('Filter Change', 'Timely replacement of RO filters, membranes, and cartridges to ensure 100% pure water quality.', 499, 'filters + service included', '30 min', '{"Sediment filter change","Carbon CTO filter change","RO membrane replacement","UV lamp replacement","Post-service water quality test"}', 2),
  ('Installation', 'Professional installation of brand new RO water purifiers with complete setup, testing, and demo.', 399, 'installation charges only', '45–60 min', '{"Free site inspection","All brands supported","Pipeline setup included","Full demo & training","Post-installation support"}', 3),
  ('Deep Cleaning', 'Thorough internal cleaning and UV sanitization of your RO purifier for maximum hygiene and performance.', 349, 'complete cleaning service', '45–60 min', '{"Complete disassembly cleaning","Tank & housing washed","UV sanitization treatment","TDS check post cleaning","Performance test done"}', 4),
  ('Water Test', 'Professional TDS, pH, and contamination testing to ensure your water is safe and identify purifier needs.', 199, 'includes test report', '20 min', '{"TDS level measurement","pH & hardness testing","Bacteria/contamination check","Detailed written report","Expert recommendation"}', 5),
  ('AMC', 'Regular servicing, priority support and free filter replacements — one plan for the whole year.', 999, 'per year · Silver plan (Gold ₹1,799 · Platinum ₹2,999)', '1 year cover', '{"2 service visits a year","Filter inspection","Basic cleaning","Phone support"}', 6)
on conflict (type) do update set tagline = excluded.tagline, price = excluded.price, price_note = excluded.price_note,
  duration = excluded.duration, includes = excluded.includes, sort = excluded.sort, active = true;
update public.service_catalog set sort = 7 where type = 'Uninstall';

update public.products set description = 'High-rejection TFC membrane for all standard RO systems. Fits Kent, Aquaguard & more.', warranty = '6 Months' where id = 'membrane-75';
update public.products set description = 'Removes dirt, sand & rust. Compatible with standard 10-inch filter housings.', warranty = '30 Days' where id = 'sediment-5';
update public.products set description = 'High-pressure booster pump for low water pressure RO systems. 24V DC, 75-100 GPD.', warranty = '3 Months' where id = 'booster-pump-24v';
update public.products set description = 'Removes chlorine, bad taste & odour. Activated carbon block technology for pure water.', warranty = '30 Days' where id = 'cto-carbon';
update public.products set description = 'Reliable 24V 2A SMPS adapter for RO booster pumps. Input 220V AC, Output 24V DC.', warranty = '3 Months' where id = 'smps-24v';
update public.products set description = 'All-in-one kit: Sediment + Carbon + UF + Membrane + SMPS + Connectors + Spanner.', warranty = '30 Days' where id = 'service-kit-7';
update public.products set description = 'Ultra-filtration membrane for bacteria removal without electricity. 0.01 micron filtration.', warranty = '30 Days' where id = 'uf-membrane';
update public.products set description = 'Complete set of ball valves, check valves, elbow & straight connectors for RO system installation.', warranty = '30 Days' where id = 'valve-kit';

insert into public.coupons (code, title, descr, kind, value, max_off, min_order, applies_to, expires) values
  ('PURE30', '30% off your first service', 'Get 30% off your first service booking.', 'percent', 30, null, 0, 'service', '2027-12-31')
on conflict (code) do nothing;

-- Real part photos (served from the website's /products/parts folder).
-- Only touches products with no photos or only these built-in part photos, so photos uploaded in admin are kept.
update public.products set images = '{/products/parts/sediment-spun-filter-1.jpg,/products/parts/black-inline-cartridge-1.jpg,/products/parts/membrane-housing-1.jpg}' where id = 'spares' and not exists (select 1 from unnest(images) u where u not like '/products/parts/%');
update public.products set images = '{/products/parts/blue-cap-cartridge-1.jpg,/products/parts/grey-cap-cartridge-1.jpg,/products/parts/black-inline-cartridge-1.jpg}' where id = 'cartridges' and not exists (select 1 from unnest(images) u where u not like '/products/parts/%');
update public.products set images = '{/products/parts/membrane-housing-1.jpg,/products/parts/membrane-housing-2.jpg,/products/parts/membrane-housing-3.jpg}' where id = 'membrane-75' and not exists (select 1 from unnest(images) u where u not like '/products/parts/%');
update public.products set images = '{/products/parts/sediment-spun-filter-1.jpg,/products/parts/sediment-spun-filter-2.jpg,/products/parts/sediment-spun-filter-3.jpg}' where id = 'sediment-5' and not exists (select 1 from unnest(images) u where u not like '/products/parts/%');
update public.products set images = '{/products/parts/black-inline-cartridge-1.jpg,/products/parts/black-inline-cartridge-2.jpg,/products/parts/black-inline-cartridge-3.jpg}' where id = 'cto-carbon' and not exists (select 1 from unnest(images) u where u not like '/products/parts/%');
update public.products set images = '{/products/parts/blue-cap-cartridge-1.jpg,/products/parts/blue-cap-cartridge-2.jpg,/products/parts/blue-cap-cartridge-3.jpg}' where id = 'uf-membrane' and not exists (select 1 from unnest(images) u where u not like '/products/parts/%');
update public.products set images = '{/products/parts/sediment-spun-filter-1.jpg,/products/parts/black-inline-cartridge-1.jpg,/products/parts/blue-cap-cartridge-1.jpg,/products/parts/membrane-housing-1.jpg}' where id = 'service-kit-7' and not exists (select 1 from unnest(images) u where u not like '/products/parts/%');
