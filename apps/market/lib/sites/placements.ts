import { one } from '@/lib/db'
import { issueInvoice, planActivation } from '@/lib/sites/billing'
import type { SitePlan, SiteRow } from '@/types/site'

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

  for (const listingId of input.cards) {
    const placement = await one<{ id: string }>(
      `INSERT INTO hub.site_placements
         (site_id, tenant_id, listing_id, plan_id, request_id, slot, status,
          price_per_period, currency, paid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT ON CONSTRAINT site_placements_card_key DO UPDATE
         SET plan_id = EXCLUDED.plan_id,
             request_id = EXCLUDED.request_id,
             slot = EXCLUDED.slot,
             status = EXCLUDED.status,
             price_per_period = EXCLUDED.price_per_period,
             currency = EXCLUDED.currency,
             paid_until = COALESCE(hub.site_placements.paid_until, EXCLUDED.paid_until),
             hidden_reason = NULL,
             updated_at = now()
       RETURNING id`,
      [
        input.site.id,
        input.tenantId,
        listingId,
        input.plan?.id ?? null,
        input.requestId,
        input.plan?.slot ?? 'standard',
        status,
        price,
        currency,
        paidUntil?.toISOString() ?? null,
      ]
    )

    if (status === 'pending_payment' && placement) {
      const invoice = await issueInvoice({
        site: input.site,
        tenantId: input.tenantId,
        placementId: placement.id,
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
  const row = await one<{ count: number }>(
    'SELECT count(*)::int AS count FROM hub.site_placements WHERE site_id = $1 AND tenant_id = $2',
    [site.id, tenantId]
  )
  const current = Number(row?.count ?? 0)
  if (site.max_cards_per_tenant != null && current + adding > site.max_cards_per_tenant) {
    return `Лимит витрины: ${site.max_cards_per_tenant} карточек на компанию`
  }
  if (plan && adding > plan.card_quota) {
    return `Тариф «${plan.slug}» рассчитан на ${plan.card_quota} карточек`
  }
  return null
}
