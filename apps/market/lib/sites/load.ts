import { q, one } from '@/lib/db'
import {
  applyPlacements,
  listingMatchesSiteScope,
  placementIsLive,
  type SiteBlock,
  type SiteBlockType,
  type SiteCompany,
  type SiteKnowledge,
  type SiteListing,
  type SiteManualCard,
  type SitePage,
  type SitePlacement,
  type SitePlan,
  type SitePost,
  type SitePublicPayload,
  type SiteRow,
  SITE_BLOCK_TYPES,
} from '@/types/site'

type Row = Record<string, unknown>

function iso(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function json<T extends object>(value: unknown, fallback: T): T {
  return value && typeof value === 'object' ? (value as T) : fallback
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : []
}

export function toSite(row: Row): SiteRow {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: json(row.name, {}),
    description: row.description ? json(row.description, {}) : null,
    template: row.template === 'operator' ? 'operator' : 'destination',
    tenant_ids: strings(row.tenant_ids),
    theme_slugs: strings(row.theme_slugs),
    country_codes: strings(row.country_codes),
    city_codes: strings(row.city_codes),
    marketplace_slug: row.marketplace_slug ? String(row.marketplace_slug) : null,
    featured_listing_ids: strings(row.featured_listing_ids),
    subdomain: row.subdomain ? String(row.subdomain) : null,
    custom_domain: row.custom_domain ? String(row.custom_domain) : null,
    settings: json(row.settings, {}),
    is_active: row.is_active !== false,
    created_at: iso(row.created_at) ?? '',
    updated_at: iso(row.updated_at) ?? '',
    placement_mode:
      row.placement_mode === 'approved' || row.placement_mode === 'mixed'
        ? row.placement_mode
        : 'scope',
    pricing_model:
      row.pricing_model === 'monthly' || row.pricing_model === 'commission' || row.pricing_model === 'hybrid'
        ? row.pricing_model
        : 'free',
    default_currency: String(row.default_currency ?? 'KGS'),
    platform_fee_percent: Number(row.platform_fee_percent ?? 0),
    commission_percent: Number(row.commission_percent ?? 0),
    accepts_requests: row.accepts_requests === true,
    max_cards_per_tenant: row.max_cards_per_tenant == null ? null : Number(row.max_cards_per_tenant),
    locales: strings(row.locales).length > 0 ? strings(row.locales) : ['ru'],
    seo: json(row.seo, {}),
  }
}

export async function getSite(slug: string): Promise<SiteRow | null> {
  const row = await one<Row>('SELECT * FROM hub.sites WHERE slug = $1', [slug])
  return row ? toSite(row) : null
}

export async function listSites(): Promise<SiteRow[]> {
  const rows = await q<Row>('SELECT * FROM hub.sites ORDER BY created_at')
  return rows.map(toSite)
}

export async function loadPages(siteId: string, publishedOnly = true): Promise<SitePage[]> {
  const pages = await q<Row>(
    `SELECT * FROM hub.site_pages
      WHERE site_id = $1 ${publishedOnly ? 'AND is_published' : ''}
      ORDER BY sort_order, created_at`,
    [siteId]
  )
  if (pages.length === 0) return []

  const blocks = await q<Row>(
    `SELECT * FROM hub.site_blocks
      WHERE page_id = ANY($1::uuid[]) ${publishedOnly ? 'AND is_active' : ''}
      ORDER BY sort_order, created_at`,
    [pages.map((p) => String(p.id))]
  )

  const byPage = new Map<string, SiteBlock[]>()
  for (const raw of blocks) {
    const type = String(raw.type) as SiteBlockType
    if (!SITE_BLOCK_TYPES.includes(type)) continue
    const list = byPage.get(String(raw.page_id)) ?? []
    list.push({
      id: String(raw.id),
      page_id: String(raw.page_id),
      type,
      payload: json(raw.payload, {}),
      sort_order: Number(raw.sort_order ?? 0),
    })
    byPage.set(String(raw.page_id), list)
  }

  return pages.map((raw) => ({
    id: String(raw.id),
    site_id: String(raw.site_id),
    slug: String(raw.slug),
    kind: raw.kind === 'blog' ? 'blog' : raw.kind === 'page' ? 'page' : 'home',
    title: json(raw.title, {}),
    sort_order: Number(raw.sort_order ?? 0),
    is_published: raw.is_published !== false,
    blocks: byPage.get(String(raw.id)) ?? [],
  }))
}

export async function loadPosts(siteId: string, publishedOnly = true): Promise<SitePost[]> {
  const rows = await q<Row>(
    `SELECT * FROM hub.site_posts
      WHERE site_id = $1 ${publishedOnly ? 'AND is_published' : ''}
      ORDER BY published_at DESC NULLS LAST, created_at DESC`,
    [siteId]
  )
  return rows.map((raw) => ({
    id: String(raw.id),
    site_id: String(raw.site_id),
    slug: String(raw.slug),
    title: json(raw.title, {}),
    excerpt: json(raw.excerpt, {}),
    body: json(raw.body, {}),
    cover_url: raw.cover_url ? String(raw.cover_url) : null,
    published_at: iso(raw.published_at),
  }))
}

export async function loadPlans(siteId: string, publicOnly = false): Promise<SitePlan[]> {
  const rows = await q<Row>(
    `SELECT * FROM hub.site_plans
      WHERE site_id = $1 AND is_active ${publicOnly ? 'AND is_public' : ''}
      ORDER BY sort_order, price_per_card`,
    [siteId]
  )
  return rows.map((raw) => ({
    id: String(raw.id),
    site_id: String(raw.site_id),
    slug: String(raw.slug),
    name: json(raw.name, {}),
    description: json(raw.description, {}),
    price_per_card: Number(raw.price_per_card ?? 0),
    currency: String(raw.currency ?? 'KGS'),
    period_months: Number(raw.period_months ?? 1),
    card_quota: Number(raw.card_quota ?? 1),
    slot: raw.slot === 'featured' || raw.slot === 'pinned' ? raw.slot : 'standard',
    trial_days: Number(raw.trial_days ?? 0),
    perks: Array.isArray(raw.perks) ? (raw.perks as unknown[]).map(String) : [],
    is_public: raw.is_public !== false,
    sort_order: Number(raw.sort_order ?? 0),
  }))
}

export function toPlacement(raw: Row): SitePlacement {
  return {
    id: String(raw.id),
    site_id: String(raw.site_id),
    tenant_id: String(raw.tenant_id),
    listing_id: raw.listing_id ? String(raw.listing_id) : null,
    plan_id: raw.plan_id ? String(raw.plan_id) : null,
    slot: raw.slot === 'featured' || raw.slot === 'pinned' ? raw.slot : 'standard',
    sort_weight: Number(raw.sort_weight ?? 0),
    status: String(raw.status ?? 'active') as SitePlacement['status'],
    price_per_period: Number(raw.price_per_period ?? 0),
    currency: String(raw.currency ?? 'KGS'),
    paid_until: iso(raw.paid_until),
    grace_days: Number(raw.grace_days ?? 7),
  }
}

export async function loadPlacements(siteId: string): Promise<SitePlacement[]> {
  const rows = await q<Row>(
    'SELECT * FROM hub.site_placements WHERE site_id = $1 ORDER BY sort_weight DESC, created_at',
    [siteId]
  )
  return rows.map(toPlacement)
}

export async function loadManualCards(siteId: string): Promise<SiteManualCard[]> {
  const rows = await q<Row>(
    'SELECT * FROM hub.site_manual_cards WHERE site_id = $1 AND is_active ORDER BY sort_order, created_at',
    [siteId]
  )
  return rows.map((raw) => ({
    id: String(raw.id),
    site_id: String(raw.site_id),
    kind: raw.kind === 'service' || raw.kind === 'company' ? raw.kind : 'place',
    title: json(raw.title, {}),
    body: json(raw.body, {}),
    images: strings(raw.images),
    price_from: raw.price_from == null ? null : Number(raw.price_from),
    currency: raw.currency ? String(raw.currency) : null,
    city_code: raw.city_code ? String(raw.city_code) : null,
    geo: raw.geo ? (raw.geo as { lat: number; lng: number }) : null,
    external_url: raw.external_url ? String(raw.external_url) : null,
    claim_status:
      raw.claim_status === 'requested' || raw.claim_status === 'claimed' ? raw.claim_status : 'unclaimed',
    sort_order: Number(raw.sort_order ?? 0),
  }))
}

export async function loadKnowledge(siteId: string): Promise<SiteKnowledge[]> {
  const rows = await q<Row>(
    'SELECT * FROM hub.site_knowledge WHERE site_id = $1 AND is_active ORDER BY sort_order',
    [siteId]
  )
  return rows.map((raw) => ({
    id: String(raw.id),
    site_id: String(raw.site_id),
    title: json(raw.title, {}),
    body: String(raw.body ?? ''),
    kind: raw.kind === 'faq' || raw.kind === 'rule' ? raw.kind : 'article',
  }))
}

/**
 * In `approved` mode the placement rows decide what is on the page: a paid card
 * stays even if the tenant later edits its geo or themes. Scope filters only
 * drive `scope` and `mixed`.
 */
export async function loadListings(
  site: SiteRow,
  placements: SitePlacement[],
  limit = 48
): Promise<{ listings: SiteListing[]; companies: SiteCompany[] }> {
  const live = placements.filter((p) => placementIsLive(p))
  const placedListingIds = live.map((p) => p.listing_id).filter((id): id is string => Boolean(id))
  const placedTenants = Array.from(new Set(live.map((p) => p.tenant_id)))

  let rows: Row[] = []
  if (site.placement_mode === 'approved') {
    if (placedListingIds.length > 0) {
      rows = await q<Row>('SELECT * FROM hub.listing_cache WHERE id = ANY($1::uuid[])', [placedListingIds])
    }
  } else {
    const where: string[] = []
    const params: unknown[] = []
    if (site.tenant_ids.length > 0) {
      params.push(site.tenant_ids)
      where.push(`tenant_id = ANY($${params.length}::uuid[])`)
    }
    if (site.theme_slugs.length > 0) {
      params.push(site.theme_slugs)
      where.push(`marketplace_themes && $${params.length}::text[]`)
    }
    if (site.marketplace_slug) {
      params.push([site.marketplace_slug])
      where.push(`marketplace_slugs @> $${params.length}::text[]`)
    }
    rows = await q<Row>(
      `SELECT * FROM hub.listing_cache ${where.length ? 'WHERE ' + where.join(' AND ') : ''} LIMIT 200`,
      params
    )
  }

  const tenantIds = Array.from(new Set([...rows.map((r) => String(r.tenant_id)), ...placedTenants]))
  if (tenantIds.length === 0) return { listings: [], companies: [] }

  const [tenants, companies] = await Promise.all([
    q<Row>('SELECT id, name, slug FROM public.tenants WHERE id = ANY($1::uuid[])', [tenantIds]),
    q<Row>('SELECT * FROM hub.company_cache WHERE tenant_id = ANY($1::uuid[])', [tenantIds]),
  ])
  const tenantById = new Map(tenants.map((t) => [String(t.id), t]))
  const companyByTenant = new Map(companies.map((c) => [String(c.tenant_id), c]))

  const featured = new Set(site.featured_listing_ids)
  const skipScope = site.placement_mode === 'approved'
  const matched: SiteListing[] = []

  for (const row of rows) {
    const tenantId = String(row.tenant_id)
    const company = companyByTenant.get(tenantId) ?? null
    if (
      !skipScope &&
      !listingMatchesSiteScope(
        {
          tenant_id: tenantId,
          marketplace_themes: strings(row.marketplace_themes),
          marketplace_slugs: strings(row.marketplace_slugs),
          service_country_code: row.service_country_code ? String(row.service_country_code) : null,
          service_city_codes: strings(row.service_city_codes),
        },
        company ? { country: str(company.country), city: str(company.city) } : null,
        site
      )
    ) {
      continue
    }

    const tenant = tenantById.get(tenantId)
    matched.push({
      id: String(row.id),
      tenant_id: tenantId,
      tenant_slug: str(tenant?.slug),
      tenant_name: str(tenant?.name) ?? str(company?.name),
      page_slug: String(row.page_slug),
      title: json(row.title, {}),
      short_text: json(row.short_text, {}),
      cover_image_url: str(row.cover_image_url),
      images: strings(row.images),
      price_from: row.price_from == null ? null : Number(row.price_from),
      price_currency: str(row.price_currency),
      marketplace_themes: strings(row.marketplace_themes),
      service_country_code: str(row.service_country_code),
      service_city_codes: strings(row.service_city_codes),
      next_departure_date: iso(row.next_departure_date)?.slice(0, 10) ?? null,
      seats_left: row.seats_left == null ? null : Number(row.seats_left),
      featured: featured.has(String(row.id)),
    })
  }

  const ordered = applyPlacements(matched, placements, site.placement_mode)
  const sorted =
    site.placement_mode === 'scope'
      ? [...ordered].sort((a, b) => Number(b.featured) - Number(a.featured))
      : ordered
  const listings = sorted.slice(0, limit)

  // A company card can be placed without any listing, so keep placed tenants.
  const usedTenants = Array.from(new Set([...listings.map((l) => l.tenant_id), ...placedTenants]))
  const companyCards: SiteCompany[] = usedTenants.map((id) => {
    const company = companyByTenant.get(id)
    const tenant = tenantById.get(id)
    return {
      tenant_id: id,
      slug: str(tenant?.slug),
      name: str(tenant?.name) ?? str(company?.name),
      city: str(company?.city),
      country: str(company?.country),
      logo_url: str(company?.logo_url),
      cover_photo_url: str(company?.cover_photo_url),
      short_description: company?.short_description ? (company.short_description as string) : null,
      about: json(company?.about, {}),
      gallery: company?.gallery ?? [],
    }
  })

  return { listings, companies: companyCards }
}

function str(value: unknown): string | null {
  return value == null ? null : String(value)
}

export async function loadPublicPayload(slug: string): Promise<SitePublicPayload | null> {
  const site = await getSite(slug)
  if (!site || !site.is_active) return null

  const [pages, posts, plans, placements, manualCards] = await Promise.all([
    loadPages(site.id),
    loadPosts(site.id),
    loadPlans(site.id, true),
    loadPlacements(site.id),
    loadManualCards(site.id),
  ])
  const { listings, companies } = await loadListings(site, placements)

  return { site, listings, companies, pages, posts, plans, manual_cards: manualCards }
}
