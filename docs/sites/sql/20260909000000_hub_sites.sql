-- Additive hub.sites tables. Does not alter vitrina app tables
-- (hub_nodes, pages, bookings, tenant settings).
-- Copy into mega-hub/supabase/migrations/ AND vitrina/supabase/migrations/
-- (same DB; prod push is from vitrina). Do not change vitrina app/.

CREATE TABLE hub.sites (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text NOT NULL UNIQUE,
  name                  jsonb NOT NULL,
  description           jsonb,
  template              text NOT NULL
                        CHECK (template IN ('operator', 'destination')),
  tenant_ids            uuid[] NOT NULL DEFAULT '{}',
  theme_slugs           text[] NOT NULL DEFAULT '{}',
  country_codes         text[] NOT NULL DEFAULT '{}',
  city_codes            text[] NOT NULL DEFAULT '{}',
  marketplace_slug      text,
  featured_listing_ids  uuid[] NOT NULL DEFAULT '{}',
  subdomain             text,
  custom_domain         text,
  settings              jsonb NOT NULL DEFAULT '{}',
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sites_scope_not_empty CHECK (
    cardinality(tenant_ids) > 0
    OR cardinality(theme_slugs) > 0
    OR cardinality(country_codes) > 0
    OR cardinality(city_codes) > 0
  )
);

COMMENT ON TABLE hub.sites IS
  'Additive project pages in mega-hub (/s/{slug}). Does not replace Tenant Hub /h, tenant pages /p, or B2B /m.';

COMMENT ON COLUMN hub.sites.template IS
  'operator = single-tenant (or few) brand site; destination = geo/theme showcase across tenants';

COMMENT ON COLUMN hub.sites.marketplace_slug IS
  'Optional extra filter: listing_cache.marketplace_slugs. NULL = any listing in scope. Not tied to the TourHub app.';

COMMENT ON COLUMN hub.sites.settings IS
  'Branding jsonb: logo_url, favicon_url, accent_color, brand_color, hero_image_url, hero_title, hero_subtitle, intro, footer_text, display_name, map_center';

CREATE UNIQUE INDEX sites_subdomain_key
  ON hub.sites (subdomain) WHERE subdomain IS NOT NULL;

CREATE UNIQUE INDEX sites_custom_domain_key
  ON hub.sites (custom_domain) WHERE custom_domain IS NOT NULL;

CREATE INDEX sites_tenant_ids_idx ON hub.sites USING GIN (tenant_ids);
CREATE INDEX sites_theme_slugs_idx ON hub.sites USING GIN (theme_slugs);
CREATE INDEX sites_country_codes_idx ON hub.sites USING GIN (country_codes);
CREATE INDEX sites_city_codes_idx ON hub.sites USING GIN (city_codes);

ALTER TABLE hub.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sites_public_select" ON hub.sites
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "sites_admin_write" ON hub.sites
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

GRANT SELECT ON hub.sites TO anon, authenticated;
GRANT ALL ON hub.sites TO service_role;

-- Destination demo: tourism in Kazakhstan (no marketplace channel required)
INSERT INTO hub.sites (
  slug, name, description, template,
  theme_slugs, country_codes, marketplace_slug, settings
) VALUES (
  'visit-kazakhstan',
  '{"ru": "Visit Kazakhstan", "en": "Visit Kazakhstan", "kk": "Visit Kazakhstan"}'::jsonb,
  '{"ru": "Туры, гиды и маршруты по Казахстану от проверенных операторов.", "en": "Tours, guides and routes across Kazakhstan from verified operators."}'::jsonb,
  'destination',
  ARRAY['tourism', 'guides'],
  ARRAY['KZ'],
  NULL,
  '{
    "accent_color": "#0D9488",
    "brand_color": "#0F172A",
    "hero_image_url": "",
    "hero_title": {"ru": "Казахстан, который хочется пройти пешком", "en": "Kazakhstan you want to walk through"},
    "hero_subtitle": {"ru": "Степь, озёра и города — в одном каталоге операторов.", "en": "Steppe, lakes and cities — one catalog of operators."},
    "footer_text": {"ru": "Данные операторов — из Vitrina. Бронирование на странице услуги.", "en": "Operator data from Vitrina. Book on the service page."}
  }'::jsonb
);

-- Operator demo: empty tenant_ids until platform admin patches the real tenant UUID.
-- After seed, PATCH /api/admin/sites/kendala-studio { "tenant_ids": ["<uuid>"] }
-- Slug is NOT kendala.tourhub.kz (that host is Vitrina tenant hub).

NOTIFY pgrst, 'reload schema';
