import { q } from '@/lib/db'
import { loadManualCards, loadPages, loadPlans, loadPosts } from '@/lib/sites/load'
import { loc } from '@/lib/sites/public-copy'
import type { I18nMap, SiteManualCard, SitePage, SitePlan, SitePost, SiteRow } from '@/types/site'

export type PlacementView = {
  id: string
  tenant_id: string
  tenant_name: string | null
  listing_id: string | null
  listing_title: string
  plan_name: string | null
  slot: string
  sort_weight: number
  status: string
  price_per_period: number
  currency: string
  paid_until: string | null
  grace_days: number
  live: boolean
  impressions: number
  clicks: number
  booking_hits: number
}

export type RequestView = {
  id: string
  tenant_id: string
  tenant_name: string | null
  plan_id: string | null
  plan_name: string | null
  direction: 'tenant_request' | 'owner_invite'
  listing_ids: string[]
  listing_titles: string[]
  include_company: boolean
  message: string | null
  contact: Record<string, string>
  status: string
  reject_reason: string | null
  created_at: string
}

export type LeadView = {
  id: string
  company_name: string
  contact_name: string | null
  contact: Record<string, string>
  plan_name: string | null
  message: string | null
  source: string | null
  status: string
  created_at: string
}

export type InvoiceView = {
  id: string
  tenant_id: string
  tenant_name: string | null
  period_start: string
  period_end: string
  amount: number
  currency: string
  platform_fee: number
  owner_payout: number
  status: string
  paid_at: string | null
}

export type TenantOption = {
  tenant_id: string
  name: string
  listings: { id: string; title: string; placed: boolean }[]
  company_placed: boolean
}

export type OwnerDashboard = {
  site: SiteRow
  placements: PlacementView[]
  requests: RequestView[]
  leads: LeadView[]
  invoices: InvoiceView[]
  plans: SitePlan[]
  pages: SitePage[]
  posts: SitePost[]
  manualCards: SiteManualCard[]
  tenants: TenantOption[]
  daily: { day: string; impressions: number; clicks: number; booking_hits: number }[]
}

type Row = Record<string, unknown>

const day = (value: unknown): string =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value ? String(value).slice(0, 10) : ''

const stamp = (value: unknown): string =>
  value instanceof Date ? value.toISOString() : value ? String(value) : ''

export async function loadOwnerDashboard(site: SiteRow): Promise<OwnerDashboard> {
  const [placementRows, requestRows, leadRows, invoiceRows, dailyRows] = await Promise.all([
    q<Row>(
      `SELECT p.*, t.name AS tenant_name, l.title AS listing_title, pl.name AS plan_name,
              hub.placement_is_live(p.status, p.paid_until, p.grace_days) AS live,
              COALESCE(s.impressions, 0) AS impressions,
              COALESCE(s.clicks, 0) AS clicks,
              COALESCE(s.booking_hits, 0) AS booking_hits
         FROM hub.site_placements p
         LEFT JOIN public.tenants t ON t.id = p.tenant_id
         LEFT JOIN hub.listing_cache l ON l.id = p.listing_id
         LEFT JOIN hub.site_plans pl ON pl.id = p.plan_id
         LEFT JOIN LATERAL (
           SELECT sum(impressions)::int AS impressions,
                  sum(clicks)::int AS clicks,
                  sum(booking_hits)::int AS booking_hits
             FROM hub.site_card_stats cs
            WHERE cs.placement_id = p.id AND cs.day > current_date - 14
         ) s ON true
        WHERE p.site_id = $1
        ORDER BY live DESC, p.slot DESC, p.sort_weight DESC, p.created_at`,
      [site.id]
    ),
    q<Row>(
      `SELECT r.*, t.name AS tenant_name, pl.name AS plan_name
         FROM hub.site_placement_requests r
         LEFT JOIN public.tenants t ON t.id = r.tenant_id
         LEFT JOIN hub.site_plans pl ON pl.id = r.plan_id
        WHERE r.site_id = $1
        ORDER BY (r.status = 'pending') DESC, r.created_at DESC`,
      [site.id]
    ),
    q<Row>(
      `SELECT l.*, pl.name AS plan_name
         FROM hub.site_leads l
         LEFT JOIN hub.site_plans pl ON pl.id = l.plan_id
        WHERE l.site_id = $1
        ORDER BY (l.status = 'new') DESC, l.created_at DESC`,
      [site.id]
    ),
    q<Row>(
      `SELECT i.*, t.name AS tenant_name
         FROM hub.site_invoices i
         LEFT JOIN public.tenants t ON t.id = i.tenant_id
        WHERE i.site_id = $1
        ORDER BY i.issued_at DESC`,
      [site.id]
    ),
    q<Row>(
      `SELECT day, sum(impressions)::int AS impressions, sum(clicks)::int AS clicks,
              sum(booking_hits)::int AS booking_hits
         FROM hub.site_card_stats
        WHERE site_id = $1 AND day > current_date - 14
        GROUP BY day ORDER BY day`,
      [site.id]
    ),
  ])

  const requestListingIds = Array.from(
    new Set(requestRows.flatMap((row) => (Array.isArray(row.listing_ids) ? row.listing_ids.map(String) : [])))
  )
  const listingTitles = new Map<string, string>()
  if (requestListingIds.length > 0) {
    const rows = await q<Row>('SELECT id, title FROM hub.listing_cache WHERE id = ANY($1::uuid[])', [
      requestListingIds,
    ])
    for (const row of rows) listingTitles.set(String(row.id), loc(row.title as I18nMap, 'ru'))
  }

  const [plans, pages, posts, manualCards, tenants] = await Promise.all([
    loadPlans(site.id),
    loadPages(site.id, false),
    loadPosts(site.id, false),
    loadManualCards(site.id),
    loadTenantOptions(site),
  ])

  return {
    site,
    plans,
    pages,
    posts,
    manualCards,
    tenants,
    placements: placementRows.map((row) => ({
      id: String(row.id),
      tenant_id: String(row.tenant_id),
      tenant_name: row.tenant_name ? String(row.tenant_name) : null,
      listing_id: row.listing_id ? String(row.listing_id) : null,
      listing_title: row.listing_id
        ? loc(row.listing_title as I18nMap, 'ru', 'Услуга')
        : 'Карточка компании',
      plan_name: row.plan_name ? loc(row.plan_name as I18nMap, 'ru') : null,
      slot: String(row.slot),
      sort_weight: Number(row.sort_weight ?? 0),
      status: String(row.status),
      price_per_period: Number(row.price_per_period ?? 0),
      currency: String(row.currency ?? site.default_currency),
      paid_until: row.paid_until ? stamp(row.paid_until) : null,
      grace_days: Number(row.grace_days ?? 7),
      live: row.live === true,
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
      booking_hits: Number(row.booking_hits ?? 0),
    })),
    requests: requestRows.map((row) => {
      const ids = Array.isArray(row.listing_ids) ? row.listing_ids.map(String) : []
      return {
        id: String(row.id),
        tenant_id: String(row.tenant_id),
        tenant_name: row.tenant_name ? String(row.tenant_name) : null,
        plan_id: row.plan_id ? String(row.plan_id) : null,
        plan_name: row.plan_name ? loc(row.plan_name as I18nMap, 'ru') : null,
        direction: row.direction === 'owner_invite' ? 'owner_invite' : 'tenant_request',
        listing_ids: ids,
        listing_titles: ids.map((id) => listingTitles.get(id) ?? 'Услуга'),
        include_company: row.include_company === true,
        message: row.message ? String(row.message) : null,
        contact: (row.contact && typeof row.contact === 'object' ? row.contact : {}) as Record<string, string>,
        status: String(row.status),
        reject_reason: row.reject_reason ? String(row.reject_reason) : null,
        created_at: stamp(row.created_at),
      }
    }),
    leads: leadRows.map((row) => ({
      id: String(row.id),
      company_name: String(row.company_name),
      contact_name: row.contact_name ? String(row.contact_name) : null,
      contact: (row.contact && typeof row.contact === 'object' ? row.contact : {}) as Record<string, string>,
      plan_name: row.plan_name ? loc(row.plan_name as I18nMap, 'ru') : null,
      message: row.message ? String(row.message) : null,
      source: row.source ? String(row.source) : null,
      status: String(row.status),
      created_at: stamp(row.created_at),
    })),
    invoices: invoiceRows.map((row) => ({
      id: String(row.id),
      tenant_id: String(row.tenant_id),
      tenant_name: row.tenant_name ? String(row.tenant_name) : null,
      period_start: day(row.period_start),
      period_end: day(row.period_end),
      amount: Number(row.amount ?? 0),
      currency: String(row.currency),
      platform_fee: Number(row.platform_fee ?? 0),
      owner_payout: Number(row.owner_payout ?? 0),
      status: String(row.status),
      paid_at: row.paid_at ? stamp(row.paid_at) : null,
    })),
    daily: dailyRows.map((row) => ({
      day: day(row.day),
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
      booking_hits: Number(row.booking_hits ?? 0),
    })),
  }
}

export type TenantDashboard = {
  site: SiteRow
  tenantName: string
  placements: PlacementView[]
  requests: RequestView[]
  invoices: InvoiceView[]
  plans: SitePlan[]
  listings: { id: string; title: string; placed: boolean }[]
  companyPlaced: boolean
}

/** What a placed company sees: its cards, what they cost, what they brought. */
export async function loadTenantDashboard(site: SiteRow, tenantId: string): Promise<TenantDashboard> {
  const owner = await loadOwnerDashboard(site)
  const option = owner.tenants.find((t) => t.tenant_id === tenantId)

  return {
    site,
    tenantName: option?.name ?? 'Компания',
    placements: owner.placements.filter((p) => p.tenant_id === tenantId),
    requests: owner.requests.filter((r) => r.tenant_id === tenantId),
    invoices: owner.invoices.filter((i) => i.tenant_id === tenantId),
    plans: owner.plans.filter((p) => p.is_public),
    listings: option?.listings ?? [],
    companyPlaced: option?.company_placed ?? false,
  }
}

/** Tenants the owner can invite: everyone in scope plus everyone already placed. */
async function loadTenantOptions(site: SiteRow): Promise<TenantOption[]> {
  const rows = await q<Row>(
    `SELECT t.id, t.name,
            (SELECT array_agg(DISTINCT p.listing_id) FROM hub.site_placements p
              WHERE p.site_id = $1 AND p.tenant_id = t.id AND p.listing_id IS NOT NULL) AS placed_listings,
            EXISTS (SELECT 1 FROM hub.site_placements p
                     WHERE p.site_id = $1 AND p.tenant_id = t.id AND p.listing_id IS NULL) AS company_placed
       FROM public.tenants t
      WHERE t.id = ANY($2::uuid[])
         OR EXISTS (SELECT 1 FROM hub.site_placements p WHERE p.site_id = $1 AND p.tenant_id = t.id)
      ORDER BY t.name`,
    [site.id, site.tenant_ids]
  )
  if (rows.length === 0) return []

  const listings = await q<Row>(
    'SELECT id, tenant_id, title FROM hub.listing_cache WHERE tenant_id = ANY($1::uuid[]) ORDER BY page_slug',
    [rows.map((row) => String(row.id))]
  )

  return rows.map((row) => {
    const tenantId = String(row.id)
    const placed = new Set((Array.isArray(row.placed_listings) ? row.placed_listings : []).map(String))
    return {
      tenant_id: tenantId,
      name: String(row.name),
      company_placed: row.company_placed === true,
      listings: listings
        .filter((l) => String(l.tenant_id) === tenantId)
        .map((l) => ({
          id: String(l.id),
          title: loc(l.title as I18nMap, 'ru', 'Услуга'),
          placed: placed.has(String(l.id)),
        })),
    }
  })
}
