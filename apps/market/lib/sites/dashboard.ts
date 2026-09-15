import { hubDb, publicDb, throwIf } from '@/lib/sb'
import { loadManualCards, loadPages, loadPlans, loadPosts } from '@/lib/sites/load'
import { loc } from '@/lib/sites/public-copy'
import { placementIsLive, type PlacementStatus } from '@/types/site'
import type { I18nMap, SiteManualCard, SitePage, SitePlan, SitePost, SiteRow } from '@/types/site'

type Row = Record<string, unknown>

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

const day = (value: unknown): string =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value ? String(value).slice(0, 10) : ''

const stamp = (value: unknown): string =>
  value instanceof Date ? value.toISOString() : value ? String(value) : ''

function sinceDays(days: number): string {
  const from = new Date()
  from.setDate(from.getDate() - days)
  return from.toISOString().slice(0, 10)
}

export async function loadOwnerDashboard(site: SiteRow): Promise<OwnerDashboard> {
  const since = sinceDays(14)
  const [placementRes, requestRes, leadRes, invoiceRes, statsRes] = await Promise.all([
    hubDb().from('site_placements').select('*').eq('site_id', site.id).order('created_at', { ascending: false }),
    hubDb().from('site_placement_requests').select('*').eq('site_id', site.id).order('created_at', { ascending: false }),
    hubDb().from('site_leads').select('*').eq('site_id', site.id).order('created_at', { ascending: false }),
    hubDb().from('site_invoices').select('*').eq('site_id', site.id).order('issued_at', { ascending: false }),
    hubDb().from('site_card_stats').select('*').eq('site_id', site.id).gt('day', since),
  ])
  throwIf(placementRes.error)
  throwIf(requestRes.error)
  throwIf(leadRes.error)
  throwIf(invoiceRes.error)
  throwIf(statsRes.error)

  const placementRows = (placementRes.data ?? []) as Row[]
  const requestRows = (requestRes.data ?? []) as Row[]
  const leadRows = (leadRes.data ?? []) as Row[]
  const invoiceRows = (invoiceRes.data ?? []) as Row[]
  const statsRows = (statsRes.data ?? []) as Row[]

  const tenantIds = Array.from(
    new Set([
      ...placementRows.map((row) => String(row.tenant_id)),
      ...requestRows.map((row) => String(row.tenant_id)),
      ...invoiceRows.map((row) => String(row.tenant_id)),
      ...site.tenant_ids,
    ].filter(Boolean))
  )
  const listingIds = Array.from(
    new Set([
      ...placementRows.map((row) => row.listing_id).filter(Boolean).map(String),
      ...requestRows.flatMap((row) => (Array.isArray(row.listing_ids) ? row.listing_ids.map(String) : [])),
    ])
  )
  const planIds = Array.from(
    new Set(
      [
        ...placementRows.map((row) => row.plan_id),
        ...requestRows.map((row) => row.plan_id),
        ...leadRows.map((row) => row.plan_id),
      ]
        .filter(Boolean)
        .map(String)
    )
  )

  const [tenantsRes, listingsRes, extraPlansRes] = await Promise.all([
    tenantIds.length > 0
      ? publicDb().from('tenants').select('id, name').in('id', tenantIds)
      : Promise.resolve({ data: [] as Row[], error: null }),
    listingIds.length > 0
      ? hubDb().from('listing_cache').select('id, title').in('id', listingIds)
      : Promise.resolve({ data: [] as Row[], error: null }),
    planIds.length > 0
      ? hubDb().from('site_plans').select('id, name').in('id', planIds)
      : Promise.resolve({ data: [] as Row[], error: null }),
  ])
  throwIf(tenantsRes.error)
  throwIf(listingsRes.error)
  throwIf(extraPlansRes.error)

  const tenantName = new Map(((tenantsRes.data ?? []) as Row[]).map((row) => [String(row.id), String(row.name)]))
  const listingTitle = new Map(
    ((listingsRes.data ?? []) as Row[]).map((row) => [String(row.id), loc(row.title as I18nMap, 'ru', 'Услуга')])
  )
  const planName = new Map(
    ((extraPlansRes.data ?? []) as Row[]).map((row) => [String(row.id), loc(row.name as I18nMap, 'ru')])
  )

  const statsByPlacement = new Map<string, { impressions: number; clicks: number; booking_hits: number }>()
  const dailyMap = new Map<string, { day: string; impressions: number; clicks: number; booking_hits: number }>()
  for (const row of statsRows) {
    const key = String(row.placement_id ?? '')
    const current = statsByPlacement.get(key) ?? { impressions: 0, clicks: 0, booking_hits: 0 }
    current.impressions += Number(row.impressions ?? 0)
    current.clicks += Number(row.clicks ?? 0)
    current.booking_hits += Number(row.booking_hits ?? 0)
    statsByPlacement.set(key, current)

    const dayKey = day(row.day)
    const daily = dailyMap.get(dayKey) ?? { day: dayKey, impressions: 0, clicks: 0, booking_hits: 0 }
    daily.impressions += Number(row.impressions ?? 0)
    daily.clicks += Number(row.clicks ?? 0)
    daily.booking_hits += Number(row.booking_hits ?? 0)
    dailyMap.set(dayKey, daily)
  }

  const [plans, pages, posts, manualCards, tenants] = await Promise.all([
    loadPlans(site.id),
    loadPages(site.id, false),
    loadPosts(site.id, false),
    loadManualCards(site.id),
    loadTenantOptions(site, placementRows),
  ])

  const placements: PlacementView[] = placementRows.map((row) => {
    const live = placementIsLive({
      status: String(row.status) as PlacementStatus,
      paid_until: row.paid_until ? stamp(row.paid_until) : null,
      grace_days: Number(row.grace_days ?? 7),
    })
    const stats = statsByPlacement.get(String(row.id)) ?? { impressions: 0, clicks: 0, booking_hits: 0 }
    return {
      id: String(row.id),
      tenant_id: String(row.tenant_id),
      tenant_name: tenantName.get(String(row.tenant_id)) ?? null,
      listing_id: row.listing_id ? String(row.listing_id) : null,
      listing_title: row.listing_id ? listingTitle.get(String(row.listing_id)) ?? 'Услуга' : 'Карточка компании',
      plan_name: row.plan_id ? planName.get(String(row.plan_id)) ?? null : null,
      slot: String(row.slot),
      sort_weight: Number(row.sort_weight ?? 0),
      status: String(row.status),
      price_per_period: Number(row.price_per_period ?? 0),
      currency: String(row.currency ?? site.default_currency),
      paid_until: row.paid_until ? stamp(row.paid_until) : null,
      grace_days: Number(row.grace_days ?? 7),
      live,
      impressions: stats.impressions,
      clicks: stats.clicks,
      booking_hits: stats.booking_hits,
    }
  })

  placements.sort((a, b) => Number(b.live) - Number(a.live) || a.slot.localeCompare(b.slot))

  return {
    site,
    plans,
    pages,
    posts,
    manualCards,
    tenants,
    placements,
    requests: requestRows.map((row) => {
      const ids = Array.isArray(row.listing_ids) ? row.listing_ids.map(String) : []
      return {
        id: String(row.id),
        tenant_id: String(row.tenant_id),
        tenant_name: tenantName.get(String(row.tenant_id)) ?? null,
        plan_id: row.plan_id ? String(row.plan_id) : null,
        plan_name: row.plan_id ? planName.get(String(row.plan_id)) ?? null : null,
        direction: row.direction === 'owner_invite' ? 'owner_invite' : 'tenant_request',
        listing_ids: ids,
        listing_titles: ids.map((id) => listingTitle.get(id) ?? 'Услуга'),
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
      plan_name: row.plan_id ? planName.get(String(row.plan_id)) ?? null : null,
      message: row.message ? String(row.message) : null,
      source: row.source ? String(row.source) : null,
      status: String(row.status),
      created_at: stamp(row.created_at),
    })),
    invoices: invoiceRows.map((row) => ({
      id: String(row.id),
      tenant_id: String(row.tenant_id),
      tenant_name: tenantName.get(String(row.tenant_id)) ?? null,
      period_start: day(row.period_start),
      period_end: day(row.period_end),
      amount: Number(row.amount ?? 0),
      currency: String(row.currency),
      platform_fee: Number(row.platform_fee ?? 0),
      owner_payout: Number(row.owner_payout ?? 0),
      status: String(row.status),
      paid_at: row.paid_at ? stamp(row.paid_at) : null,
    })),
    daily: Array.from(dailyMap.values()).sort((a, b) => a.day.localeCompare(b.day)),
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
async function loadTenantOptions(site: SiteRow, placementRows: Row[]): Promise<TenantOption[]> {
  const tenantIds = Array.from(
    new Set([...site.tenant_ids, ...placementRows.map((row) => String(row.tenant_id))])
  )
  if (tenantIds.length === 0) return []

  const [tenantsRes, listingsRes] = await Promise.all([
    publicDb().from('tenants').select('id, name').in('id', tenantIds).order('name'),
    hubDb().from('listing_cache').select('id, tenant_id, title').in('tenant_id', tenantIds).order('page_slug'),
  ])
  throwIf(tenantsRes.error)
  throwIf(listingsRes.error)

  const listings = (listingsRes.data ?? []) as Row[]
  const placedByTenant = new Map<string, Set<string>>()
  const companyPlaced = new Set<string>()
  for (const row of placementRows) {
    const tenantId = String(row.tenant_id)
    if (!row.listing_id) {
      companyPlaced.add(tenantId)
      continue
    }
    const set = placedByTenant.get(tenantId) ?? new Set<string>()
    set.add(String(row.listing_id))
    placedByTenant.set(tenantId, set)
  }

  return ((tenantsRes.data ?? []) as Row[]).map((row) => {
    const tenantId = String(row.id)
    const placed = placedByTenant.get(tenantId) ?? new Set<string>()
    return {
      tenant_id: tenantId,
      name: String(row.name),
      company_placed: companyPlaced.has(tenantId),
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
