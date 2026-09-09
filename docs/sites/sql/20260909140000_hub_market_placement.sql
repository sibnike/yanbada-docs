-- Market owner + paid card placement for hub.sites.
-- Additive: only schema hub. Does not alter vitrina app tables.
-- Copy into mega-hub/supabase/migrations/ AND vitrina/supabase/migrations/.

-- ─────────────────────────────────────────────────────────────
-- 1. Market settings on hub.sites
-- ─────────────────────────────────────────────────────────────

ALTER TABLE hub.sites
  ADD COLUMN placement_mode        text NOT NULL DEFAULT 'scope'
                                   CHECK (placement_mode IN ('scope', 'approved', 'mixed')),
  ADD COLUMN pricing_model         text NOT NULL DEFAULT 'free'
                                   CHECK (pricing_model IN ('free', 'monthly', 'commission', 'hybrid')),
  ADD COLUMN default_currency      text NOT NULL DEFAULT 'KGS',
  ADD COLUMN platform_fee_percent  numeric(5,2) NOT NULL DEFAULT 0
                                   CHECK (platform_fee_percent BETWEEN 0 AND 100),
  ADD COLUMN commission_percent    numeric(5,2) NOT NULL DEFAULT 0
                                   CHECK (commission_percent BETWEEN 0 AND 100),
  ADD COLUMN accepts_requests      boolean NOT NULL DEFAULT false,
  ADD COLUMN max_cards_per_tenant  int,
  ADD COLUMN locales               text[] NOT NULL DEFAULT ARRAY['ru'],
  ADD COLUMN seo                   jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN payout                jsonb NOT NULL DEFAULT '{}';

COMMENT ON COLUMN hub.sites.placement_mode IS
  'scope = auto by geo/theme; approved = only hub.site_placements rows; mixed = scope plus paid on top';
COMMENT ON COLUMN hub.sites.pricing_model IS
  'free | monthly (per card) | commission (share of booking) | hybrid';
COMMENT ON COLUMN hub.sites.platform_fee_percent IS
  'Platform cut of what the tenant pays. Rest is owner payout.';
COMMENT ON COLUMN hub.sites.accepts_requests IS
  'Public join form is open. Owner can close intake without deleting plans.';
COMMENT ON COLUMN hub.sites.payout IS
  'Owner payout details (bank/wallet). Never exposed in public payload.';

-- ─────────────────────────────────────────────────────────────
-- 2. Who runs the market (blogger, guide, association, tenant)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE hub.site_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     uuid NOT NULL REFERENCES hub.sites(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  role        text NOT NULL DEFAULT 'editor'
              CHECK (role IN ('owner', 'editor', 'moderator')),
  tenant_id   uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, user_id)
);

COMMENT ON TABLE hub.site_members IS
  'Market staff. Owner is not a platform admin: a blogger runs their own market.';
COMMENT ON COLUMN hub.site_members.tenant_id IS
  'Set when the owner is also a Vitrina tenant (operator runs its own market).';

CREATE INDEX site_members_user_idx ON hub.site_members (user_id);

-- Recursion-safe helper, same pattern as public.is_tenant_admin
CREATE OR REPLACE FUNCTION hub.is_site_member(p_site_id uuid, p_roles text[] DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, hub
AS $$
  SELECT EXISTS (
    SELECT 1 FROM hub.site_members m
    WHERE m.site_id = p_site_id
      AND m.user_id = auth.uid()
      AND (p_roles IS NULL OR m.role = ANY (p_roles))
  );
$$;

COMMENT ON FUNCTION hub.is_site_member IS
  'RLS helper: current user runs this market. NULL roles = any role.';

-- ─────────────────────────────────────────────────────────────
-- 3. Placement plans (one card = price per period)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE hub.site_plans (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id           uuid NOT NULL REFERENCES hub.sites(id) ON DELETE CASCADE,
  slug              text NOT NULL,
  name              jsonb NOT NULL,
  description       jsonb NOT NULL DEFAULT '{}',
  price_per_card    numeric(12,2) NOT NULL DEFAULT 0,
  currency          text NOT NULL DEFAULT 'KGS',
  period_months     int NOT NULL DEFAULT 1 CHECK (period_months > 0),
  card_quota        int NOT NULL DEFAULT 1 CHECK (card_quota > 0),
  slot              text NOT NULL DEFAULT 'standard'
                    CHECK (slot IN ('standard', 'featured', 'pinned')),
  trial_days        int NOT NULL DEFAULT 0 CHECK (trial_days >= 0),
  perks             jsonb NOT NULL DEFAULT '[]',
  is_public         boolean NOT NULL DEFAULT true,
  is_active         boolean NOT NULL DEFAULT true,
  sort_order        int NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, slug)
);

COMMENT ON TABLE hub.site_plans IS
  'What the market owner sells: N cards for price_per_card per period_months, in a given slot.';
COMMENT ON COLUMN hub.site_plans.slot IS
  'Position is the upsell: standard < featured < pinned.';
COMMENT ON COLUMN hub.site_plans.is_public IS
  'false = private deal, not shown in the pricing block.';

-- ─────────────────────────────────────────────────────────────
-- 4. Tenant asks to be placed / owner invites
-- ─────────────────────────────────────────────────────────────

CREATE TABLE hub.site_placement_requests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id            uuid NOT NULL REFERENCES hub.sites(id) ON DELETE CASCADE,
  tenant_id          uuid NOT NULL,
  plan_id            uuid REFERENCES hub.site_plans(id) ON DELETE SET NULL,
  direction          text NOT NULL DEFAULT 'tenant_request'
                     CHECK (direction IN ('tenant_request', 'owner_invite')),
  listing_ids        uuid[] NOT NULL DEFAULT '{}',
  include_company    boolean NOT NULL DEFAULT true,
  message            text,
  contact            jsonb NOT NULL DEFAULT '{}',
  status             text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reject_reason      text,
  accepted_terms_at  timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  decided_at         timestamptz,
  decided_by         uuid
);

COMMENT ON TABLE hub.site_placement_requests IS
  'Both directions: tenant applies, or market owner invites a tenant. Approval creates hub.site_placements.';
COMMENT ON COLUMN hub.site_placement_requests.reject_reason IS
  'Shown to the tenant. Without it the intake funnel dies.';

CREATE INDEX site_placement_requests_site_status_idx
  ON hub.site_placement_requests (site_id, status, created_at DESC);
CREATE INDEX site_placement_requests_tenant_idx
  ON hub.site_placement_requests (tenant_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 5. Approved placement = one card in this market
-- ─────────────────────────────────────────────────────────────

CREATE TABLE hub.site_placements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       uuid NOT NULL REFERENCES hub.sites(id) ON DELETE CASCADE,
  tenant_id     uuid NOT NULL,
  listing_id    uuid,
  plan_id       uuid REFERENCES hub.site_plans(id) ON DELETE SET NULL,
  request_id    uuid REFERENCES hub.site_placement_requests(id) ON DELETE SET NULL,
  slot          text NOT NULL DEFAULT 'standard'
                CHECK (slot IN ('standard', 'featured', 'pinned')),
  sort_weight   int NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'pending_payment', 'paused', 'expired', 'hidden')),
  price_per_period numeric(12,2) NOT NULL DEFAULT 0,
  currency      text NOT NULL DEFAULT 'KGS',
  starts_at     timestamptz NOT NULL DEFAULT now(),
  paid_until    timestamptz,
  grace_days    int NOT NULL DEFAULT 7 CHECK (grace_days >= 0),
  hidden_reason text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE hub.site_placements IS
  'One row = one card in one market. listing_id NULL = the company card itself.';
COMMENT ON COLUMN hub.site_placements.paid_until IS
  'NULL = free placement. Visible while now() < paid_until + grace_days.';

CREATE UNIQUE INDEX site_placements_listing_key
  ON hub.site_placements (site_id, listing_id) WHERE listing_id IS NOT NULL;
CREATE UNIQUE INDEX site_placements_company_key
  ON hub.site_placements (site_id, tenant_id) WHERE listing_id IS NULL;
CREATE INDEX site_placements_site_status_idx ON hub.site_placements (site_id, status);
CREATE INDEX site_placements_tenant_idx ON hub.site_placements (tenant_id);

-- Single source of truth for "is this card on the page right now"
CREATE OR REPLACE FUNCTION hub.placement_is_live(
  p_status text, p_paid_until timestamptz, p_grace_days int
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status = 'active'
     AND (p_paid_until IS NULL
          OR now() < p_paid_until + make_interval(days => COALESCE(p_grace_days, 0)));
$$;

COMMENT ON FUNCTION hub.placement_is_live IS
  'Active and either free or inside paid period plus grace. Grace keeps cards from vanishing on a late transfer.';

-- ─────────────────────────────────────────────────────────────
-- 6. Invoices (platform bills the tenant, owner gets payout)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE hub.site_invoices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id        uuid NOT NULL REFERENCES hub.sites(id) ON DELETE CASCADE,
  tenant_id      uuid NOT NULL,
  placement_id   uuid REFERENCES hub.site_placements(id) ON DELETE SET NULL,
  period_start   date NOT NULL,
  period_end     date NOT NULL,
  amount         numeric(12,2) NOT NULL,
  currency       text NOT NULL DEFAULT 'KGS',
  platform_fee   numeric(12,2) NOT NULL DEFAULT 0,
  owner_payout   numeric(12,2) NOT NULL DEFAULT 0,
  status         text NOT NULL DEFAULT 'issued'
                 CHECK (status IN ('draft', 'issued', 'paid', 'void')),
  external_ref   text,
  issued_at      timestamptz NOT NULL DEFAULT now(),
  paid_at        timestamptz,
  CONSTRAINT site_invoices_period CHECK (period_end > period_start)
);

CREATE INDEX site_invoices_site_status_idx ON hub.site_invoices (site_id, status, issued_at DESC);
CREATE INDEX site_invoices_tenant_idx ON hub.site_invoices (tenant_id, issued_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 7. Owner-made cards for objects that are not tenants yet
-- ─────────────────────────────────────────────────────────────

CREATE TABLE hub.site_manual_cards (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id        uuid NOT NULL REFERENCES hub.sites(id) ON DELETE CASCADE,
  kind           text NOT NULL DEFAULT 'place'
                 CHECK (kind IN ('place', 'service', 'company')),
  title          jsonb NOT NULL,
  body           jsonb NOT NULL DEFAULT '{}',
  images         text[] NOT NULL DEFAULT '{}',
  price_from     numeric(12,2),
  currency       text,
  city_code      text,
  geo            jsonb,
  external_url   text,
  claim_tenant_id uuid,
  claim_status   text NOT NULL DEFAULT 'unclaimed'
                 CHECK (claim_status IN ('unclaimed', 'requested', 'claimed')),
  sort_order     int NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE hub.site_manual_cards IS
  'Owner content for objects without a Vitrina tenant (lake, pass, cafe). Growth loop: the object owner can later claim the card and become a tenant.';

CREATE INDEX site_manual_cards_site_idx ON hub.site_manual_cards (site_id, sort_order) WHERE is_active;

-- ─────────────────────────────────────────────────────────────
-- 7b. Applications from businesses that are not tenants yet.
-- A blogger promotes the market to local businesses, most of which
-- have no Vitrina account. Without this the whole funnel is lost.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE hub.site_leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       uuid NOT NULL REFERENCES hub.sites(id) ON DELETE CASCADE,
  plan_id       uuid REFERENCES hub.site_plans(id) ON DELETE SET NULL,
  company_name  text NOT NULL,
  contact_name  text,
  contact       jsonb NOT NULL DEFAULT '{}',
  message       text,
  source        text,
  status        text NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'contacted', 'invited', 'converted', 'declined')),
  tenant_id     uuid,
  accepted_terms_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE hub.site_leads IS
  'Join-form applications without a tenant account. Owner converts them: invite to register in Vitrina, then create a placement.';
COMMENT ON COLUMN hub.site_leads.source IS
  'utm or referrer: a market owner running ads needs to know what worked.';

CREATE INDEX site_leads_site_status_idx ON hub.site_leads (site_id, status, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 8. Per-card stats — the reason a tenant renews
-- ─────────────────────────────────────────────────────────────

CREATE TABLE hub.site_card_stats (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       uuid NOT NULL REFERENCES hub.sites(id) ON DELETE CASCADE,
  placement_id  uuid REFERENCES hub.site_placements(id) ON DELETE CASCADE,
  listing_id    uuid,
  day           date NOT NULL,
  impressions   int NOT NULL DEFAULT 0,
  clicks        int NOT NULL DEFAULT 0,
  booking_hits  int NOT NULL DEFAULT 0,
  UNIQUE (placement_id, day)
);

CREATE INDEX site_card_stats_site_day_idx ON hub.site_card_stats (site_id, day DESC);

COMMENT ON TABLE hub.site_card_stats IS
  'Daily impressions/clicks/booking clickthroughs per placed card. Shown to the tenant before renewal.';

-- ─────────────────────────────────────────────────────────────
-- 9. Constructor blocks: everything a market page needs
-- ─────────────────────────────────────────────────────────────

ALTER TABLE hub.site_blocks DROP CONSTRAINT IF EXISTS site_blocks_type_check;
ALTER TABLE hub.site_blocks ADD CONSTRAINT site_blocks_type_check CHECK (type IN (
  'hero', 'info', 'stats', 'steps',
  'tenant_cards', 'listing_cards', 'manual_cards',
  'team', 'posts', 'gallery', 'reviews', 'faq',
  'map', 'contacts', 'partners', 'video',
  'pricing', 'join', 'cta'
));

COMMENT ON TABLE hub.site_blocks IS
  'Constructor blocks. tenant_cards/listing_cards resolve live from hub.*_cache; pricing/join read hub.site_plans; the rest is owner content in payload.';

-- ─────────────────────────────────────────────────────────────
-- 10. RLS
-- ─────────────────────────────────────────────────────────────

ALTER TABLE hub.site_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.site_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.site_placement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.site_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.site_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.site_manual_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.site_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.site_card_stats ENABLE ROW LEVEL SECURITY;

-- Staff list: readable by staff of the same market, writable by owner or platform
CREATE POLICY site_members_read ON hub.site_members
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR hub.is_site_member(site_id));

CREATE POLICY site_members_write ON hub.site_members
  FOR ALL TO authenticated
  USING (public.is_platform_admin() OR hub.is_site_member(site_id, ARRAY['owner']))
  WITH CHECK (public.is_platform_admin() OR hub.is_site_member(site_id, ARRAY['owner']));

-- Public tariffs are public: the join block must render for anonymous visitors
CREATE POLICY site_plans_public_select ON hub.site_plans
  FOR SELECT TO anon, authenticated
  USING (
    is_active AND is_public AND EXISTS (
      SELECT 1 FROM hub.sites s WHERE s.id = site_id AND s.is_active
    )
  );

CREATE POLICY site_plans_staff ON hub.site_plans
  FOR ALL TO authenticated
  USING (public.is_platform_admin() OR hub.is_site_member(site_id, ARRAY['owner']))
  WITH CHECK (public.is_platform_admin() OR hub.is_site_member(site_id, ARRAY['owner']));

-- Tenant sees and creates only its own requests
CREATE POLICY site_placement_requests_tenant ON hub.site_placement_requests
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR hub.is_site_member(site_id)
    OR public.is_tenant_admin(tenant_id)
  );

CREATE POLICY site_placement_requests_tenant_insert ON hub.site_placement_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    (direction = 'tenant_request' AND public.is_tenant_admin(tenant_id))
    OR public.is_platform_admin()
    OR hub.is_site_member(site_id, ARRAY['owner', 'moderator'])
  );

CREATE POLICY site_placement_requests_decide ON hub.site_placement_requests
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR hub.is_site_member(site_id, ARRAY['owner', 'moderator'])
    OR public.is_tenant_admin(tenant_id)
  )
  WITH CHECK (
    public.is_platform_admin()
    OR hub.is_site_member(site_id, ARRAY['owner', 'moderator'])
    OR public.is_tenant_admin(tenant_id)
  );

-- Live placements are public (that is what renders the page)
CREATE POLICY site_placements_public_select ON hub.site_placements
  FOR SELECT TO anon, authenticated
  USING (
    hub.placement_is_live(status, paid_until, grace_days)
    AND EXISTS (SELECT 1 FROM hub.sites s WHERE s.id = site_id AND s.is_active)
  );

CREATE POLICY site_placements_staff ON hub.site_placements
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin()
    OR hub.is_site_member(site_id, ARRAY['owner', 'moderator'])
    OR public.is_tenant_admin(tenant_id)
  )
  WITH CHECK (
    public.is_platform_admin()
    OR hub.is_site_member(site_id, ARRAY['owner', 'moderator'])
  );

-- Money: staff and the billed tenant only, never anon
CREATE POLICY site_invoices_read ON hub.site_invoices
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR hub.is_site_member(site_id, ARRAY['owner'])
    OR public.is_tenant_admin(tenant_id)
  );

CREATE POLICY site_invoices_write ON hub.site_invoices
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY site_manual_cards_public_select ON hub.site_manual_cards
  FOR SELECT TO anon, authenticated
  USING (
    is_active AND EXISTS (SELECT 1 FROM hub.sites s WHERE s.id = site_id AND s.is_active)
  );

CREATE POLICY site_manual_cards_staff ON hub.site_manual_cards
  FOR ALL TO authenticated
  USING (public.is_platform_admin() OR hub.is_site_member(site_id, ARRAY['owner', 'editor']))
  WITH CHECK (public.is_platform_admin() OR hub.is_site_member(site_id, ARRAY['owner', 'editor']));

-- Leads carry contact data: staff only, insert goes through service_role
CREATE POLICY site_leads_staff ON hub.site_leads
  FOR ALL TO authenticated
  USING (public.is_platform_admin() OR hub.is_site_member(site_id, ARRAY['owner', 'moderator']))
  WITH CHECK (public.is_platform_admin() OR hub.is_site_member(site_id, ARRAY['owner', 'moderator']));

CREATE POLICY site_card_stats_read ON hub.site_card_stats
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR hub.is_site_member(site_id)
    OR EXISTS (
      SELECT 1 FROM hub.site_placements p
      WHERE p.id = placement_id AND public.is_tenant_admin(p.tenant_id)
    )
  );

-- Market staff can also run the constructor of their own market
CREATE POLICY site_pages_owner ON hub.site_pages
  FOR ALL TO authenticated
  USING (hub.is_site_member(site_id, ARRAY['owner', 'editor']))
  WITH CHECK (hub.is_site_member(site_id, ARRAY['owner', 'editor']));

CREATE POLICY site_posts_owner ON hub.site_posts
  FOR ALL TO authenticated
  USING (hub.is_site_member(site_id, ARRAY['owner', 'editor']))
  WITH CHECK (hub.is_site_member(site_id, ARRAY['owner', 'editor']));

CREATE POLICY site_knowledge_owner ON hub.site_knowledge
  FOR ALL TO authenticated
  USING (hub.is_site_member(site_id, ARRAY['owner', 'editor']))
  WITH CHECK (hub.is_site_member(site_id, ARRAY['owner', 'editor']));

CREATE POLICY site_blocks_owner ON hub.site_blocks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hub.site_pages p
      WHERE p.id = page_id AND hub.is_site_member(p.site_id, ARRAY['owner', 'editor'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hub.site_pages p
      WHERE p.id = page_id AND hub.is_site_member(p.site_id, ARRAY['owner', 'editor'])
    )
  );

CREATE POLICY sites_owner_update ON hub.sites
  FOR UPDATE TO authenticated
  USING (hub.is_site_member(id, ARRAY['owner']))
  WITH CHECK (hub.is_site_member(id, ARRAY['owner']));

GRANT SELECT ON hub.site_plans, hub.site_placements, hub.site_manual_cards TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON hub.site_placement_requests TO authenticated;
GRANT SELECT ON hub.site_invoices, hub.site_card_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hub.site_members, hub.site_plans,
  hub.site_placements, hub.site_manual_cards TO authenticated;
GRANT SELECT, UPDATE ON hub.site_leads TO authenticated;
GRANT ALL ON hub.site_members, hub.site_plans, hub.site_placement_requests,
  hub.site_placements, hub.site_invoices, hub.site_manual_cards,
  hub.site_leads, hub.site_card_stats TO service_role;
GRANT EXECUTE ON FUNCTION hub.is_site_member TO authenticated;
GRANT EXECUTE ON FUNCTION hub.placement_is_live TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
