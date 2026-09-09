import { createAdminClient } from '@/lib/supabase/admin'
import type {
  PlacementSlot,
  PlacementStatus,
  SiteManualCard,
  SitePlacement,
  SitePlan,
} from '@/types/site'

const SLOTS: PlacementSlot[] = ['standard', 'featured', 'pinned']
const STATUSES: PlacementStatus[] = ['active', 'pending_payment', 'paused', 'expired', 'hidden']

function asI18n(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string' && v.trim()) out[k] = v
  }
  return out
}

function asStrings(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string' && v.length > 0) : []
}

/** All placements of a market, including expired ones (owner cabinet needs them). */
export async function loadSitePlacements(siteId: string): Promise<SitePlacement[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .schema('hub')
    .from('site_placements')
    .select('*')
    .eq('site_id', siteId)

  if (error) {
    console.error('[loadSitePlacements]', error.message)
    throw new Error(error.message)
  }

  return (data ?? []).map((raw) => {
    const row = raw as Record<string, unknown>
    return {
      id: String(row.id),
      site_id: String(row.site_id),
      tenant_id: String(row.tenant_id),
      listing_id: typeof row.listing_id === 'string' ? row.listing_id : null,
      plan_id: typeof row.plan_id === 'string' ? row.plan_id : null,
      slot: SLOTS.includes(row.slot as PlacementSlot) ? (row.slot as PlacementSlot) : 'standard',
      sort_weight: Number(row.sort_weight) || 0,
      status: STATUSES.includes(row.status as PlacementStatus)
        ? (row.status as PlacementStatus)
        : 'hidden',
      price_per_period: Number(row.price_per_period) || 0,
      currency: typeof row.currency === 'string' ? row.currency : 'KGS',
      paid_until: typeof row.paid_until === 'string' ? row.paid_until : null,
      grace_days: Number(row.grace_days) || 0,
    }
  })
}

/** publicOnly hides private deals from the pricing block. */
export async function loadSitePlans(siteId: string, publicOnly = true): Promise<SitePlan[]> {
  const supabase = createAdminClient()
  let query = supabase
    .schema('hub')
    .from('site_plans')
    .select('*')
    .eq('site_id', siteId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (publicOnly) query = query.eq('is_public', true)

  const { data, error } = await query
  if (error) {
    console.error('[loadSitePlans]', error.message)
    throw new Error(error.message)
  }

  return (data ?? []).map((raw) => {
    const row = raw as Record<string, unknown>
    return {
      id: String(row.id),
      site_id: String(row.site_id),
      slug: String(row.slug),
      name: asI18n(row.name),
      description: asI18n(row.description),
      price_per_card: Number(row.price_per_card) || 0,
      currency: typeof row.currency === 'string' ? row.currency : 'KGS',
      period_months: Number(row.period_months) || 1,
      card_quota: Number(row.card_quota) || 1,
      slot: SLOTS.includes(row.slot as PlacementSlot) ? (row.slot as PlacementSlot) : 'standard',
      trial_days: Number(row.trial_days) || 0,
      perks: asStrings(row.perks),
      is_public: row.is_public !== false,
      sort_order: Number(row.sort_order) || 0,
    }
  })
}

/** Owner-made cards for objects that have no tenant yet. */
export async function loadSiteManualCards(siteId: string): Promise<SiteManualCard[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .schema('hub')
    .from('site_manual_cards')
    .select('*')
    .eq('site_id', siteId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[loadSiteManualCards]', error.message)
    throw new Error(error.message)
  }

  return (data ?? []).map((raw) => {
    const row = raw as Record<string, unknown>
    const geo = row.geo as { lat?: unknown; lng?: unknown } | null
    return {
      id: String(row.id),
      site_id: String(row.site_id),
      kind: row.kind === 'service' || row.kind === 'company' ? row.kind : 'place',
      title: asI18n(row.title),
      body: asI18n(row.body),
      images: asStrings(row.images),
      price_from: typeof row.price_from === 'number' ? row.price_from : null,
      currency: typeof row.currency === 'string' ? row.currency : null,
      city_code: typeof row.city_code === 'string' ? row.city_code : null,
      geo:
        geo && typeof geo.lat === 'number' && typeof geo.lng === 'number'
          ? { lat: geo.lat, lng: geo.lng }
          : null,
      external_url: typeof row.external_url === 'string' ? row.external_url : null,
      claim_status:
        row.claim_status === 'requested' || row.claim_status === 'claimed'
          ? row.claim_status
          : 'unclaimed',
      sort_order: Number(row.sort_order) || 0,
    }
  })
}
