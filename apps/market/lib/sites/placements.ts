import { hubDb, throwIf } from '@/lib/sb'
import { issueInvoice, planActivation } from '@/lib/sites/billing'
import type { SitePlan, SiteRow } from '@/types/site'

async function findPlacement(siteId: string, tenantId: string, listingId: string | null) {
  let query = hubDb()
    .from('site_placements')
    .select('id, paid_until')
    .eq('site_id', siteId)
    .eq('tenant_id', tenantId)
  query = listingId ? query.eq('listing_id', listingId) : query.is('listing_id', null)
  const { data, error } = await query.maybeSingle()
  throwIf(error)
  return data
}

/**
 * Approval creates the cards. A free or trial plan goes live at once; a paid one
 * waits for its invoice, so the card appears exactly when the money arrives.
 */
export async function approveCards(input: {
  site: SiteRow
  tenantId: string
  plan: SitePlan | null
  cards: (string | null)[]
  requestId: string | null
}): Promise<{ placements: number; invoices: number }> {
  const { status, paidUntil } = planActivation(input.plan)
  const price = input.plan?.price_per_card ?? 0
  const currency = input.plan?.currency ?? input.site.default_currency
  let invoices = 0
  const now = new Date().toISOString()

  for (const listingId of input.cards) {
    const existing = await findPlacement(input.site.id, input.tenantId, listingId)
    const row = {
      site_id: input.site.id,
      tenant_id: input.tenantId,
      listing_id: listingId,
      plan_id: input.plan?.id ?? null,
      request_id: input.requestId,
      slot: input.plan?.slot ?? 'standard',
      status,
      price_per_period: price,
      currency,
      paid_until: existing?.paid_until ?? paidUntil?.toISOString() ?? null,
      hidden_reason: null,
      updated_at: now,
    }

    let placementId: string | null = existing ? String(existing.id) : null
    if (existing) {
      const { error } = await hubDb().from('site_placements').update(row).eq('id', existing.id)
      throwIf(error)
    } else {
      const { data, error } = await hubDb().from('site_placements').insert(row).select('id').maybeSingle()
      throwIf(error)
      placementId = data ? String(data.id) : null
    }

    if (status === 'pending_payment' && placementId) {
      const invoice = await issueInvoice({
        site: input.site,
        tenantId: input.tenantId,
        placementId,
        amount: price,
        currency,
        months: input.plan?.period_months ?? 1,
      })
      if (invoice) invoices += 1
    }
  }

  return { placements: input.cards.length, invoices }
}

/** Guard rails the owner set: site-wide cap and the plan's own card quota. */
export async function cardLimitError(
  site: SiteRow,
  tenantId: string,
  plan: SitePlan | null,
  adding: number
): Promise<string | null> {
  const { data, error } = await hubDb()
    .from('site_placements')
    .select('id')
    .eq('site_id', site.id)
    .eq('tenant_id', tenantId)
  throwIf(error)
  const current = data?.length ?? 0
  if (site.max_cards_per_tenant != null && current + adding > site.max_cards_per_tenant) {
    return `Лимит витрины: ${site.max_cards_per_tenant} карточек на компанию`
  }
  if (plan && adding > plan.card_quota) {
    return `Тариф «${plan.slug}» рассчитан на ${plan.card_quota} карточек`
  }
  return null
}
