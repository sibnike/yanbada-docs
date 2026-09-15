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
  'Public content of mega-hub market overlay. Same layer as /m: tenants from Vitrina cache, one or many. Does not replace /h or /p.';

COMMENT ON COLUMN hub.sites.template IS
  'operator = one tenant when /h microsite is not enough; destination = several tenants together';

COMMENT ON COLUMN hub.sites.marketplace_slug IS
  'Optional bind to hub.marketplaces.slug (same overlay). NULL = any listing in scope.';

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

-- No sample row here on purpose: a site without pages renders as an empty page
-- and still shows up in the cabinet picker. Sites come from the seed files
-- (20260909150000 destination market, 20260909160000 operator microsite).

NOTIFY pgrst, 'reload schema';
