-- Tourism landings: templates, itinerary cache, picker/map blocks.
-- Same DB as Vitrina (mega-vitrina). Copy to vitrina/supabase/migrations.

ALTER TABLE hub.sites DROP CONSTRAINT IF EXISTS sites_template_check;
ALTER TABLE hub.sites ADD CONSTRAINT sites_template_check
  CHECK (template IN ('operator', 'destination', 'visit_center', 'tour_operator', 'guide'));

ALTER TABLE hub.site_blocks DROP CONSTRAINT IF EXISTS site_blocks_type_check;
ALTER TABLE hub.site_blocks ADD CONSTRAINT site_blocks_type_check CHECK (type IN (
  'hero', 'info', 'stats', 'steps',
  'tenant_cards', 'listing_cards', 'manual_cards',
  'team', 'posts', 'gallery', 'reviews', 'faq',
  'map', 'contacts', 'partners', 'video',
  'pricing', 'join', 'cta',
  'tour_picker', 'route_map'
));

ALTER TABLE hub.listing_cache ADD COLUMN IF NOT EXISTS itinerary jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS itinerary jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.pages.itinerary IS
  'Route stops for a tour page: { day, title, lat, lng, note }[]. Canonical copy; hub.listing_cache.itinerary is the storefront cache.';
COMMENT ON COLUMN hub.listing_cache.itinerary IS
  'Synced from public.pages.itinerary. Used by hub.sites tour_picker / route_map.';

UPDATE hub.sites SET template = 'visit_center' WHERE template = 'destination';
UPDATE hub.sites SET template = 'tour_operator' WHERE template = 'operator';

INSERT INTO hub.site_blocks (page_id, type, payload, sort_order)
SELECT p.id, 'tour_picker',
  '{"title":{"ru":"Туры Каракола"},"layout":"split","limit":24,"anchor":"tours"}'::jsonb,
  15
FROM hub.site_pages p
JOIN hub.sites s ON s.id = p.site_id
WHERE s.slug = 'visit-karakol' AND p.slug = 'home'
  AND NOT EXISTS (
    SELECT 1 FROM hub.site_blocks b WHERE b.page_id = p.id AND b.type = 'tour_picker'
  );

INSERT INTO hub.site_blocks (page_id, type, payload, sort_order)
SELECT p.id, 'route_map',
  '{"title":{"ru":"Маршруты на карте"},"mode":"all","anchor":"route"}'::jsonb,
  25
FROM hub.site_pages p
JOIN hub.sites s ON s.id = p.site_id
WHERE s.slug = 'visit-karakol' AND p.slug = 'home'
  AND NOT EXISTS (
    SELECT 1 FROM hub.site_blocks b WHERE b.page_id = p.id AND b.type = 'route_map'
  );
