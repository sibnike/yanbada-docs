import { q, one } from '@/lib/db'
import type { SitePlan, SiteRow } from '@/types/site'

export type InvoiceRow = {
  id: string
  site_id: string
  tenant_id: string
  placement_id: string | null
  period_start: string
  period_end: string
  amount: number
  currency: string
  platform_fee: number
  owner_payout: number
  status: 'draft' | 'issued' | 'paid' | 'void'
  issued_at: string
  paid_at: string | null
}

export function addMonths(from: Date, months: number): Date {
  const next = new Date(from)
  next.setMonth(next.getMonth() + months)
  return next
}

/**
 * The platform bills the tenant and keeps platform_fee_percent; the rest is the
 * market owner's payout. One invoice covers one card for one period.
 */
export async function issueInvoice(input: {
  site: SiteRow
  tenantId: string
  placementId: string | null
  amount: number
  currency: string
  months: number
  from?: Date
}): Promise<InvoiceRow | null> {
  if (input.amount <= 0) return null
  const start = input.from ?? new Date()
  const end = addMonths(start, Math.max(1, input.months))
  const fee = Math.round((input.amount * input.site.platform_fee_percent) / 100)

  return one<InvoiceRow>(
    `INSERT INTO hub.site_invoices
       (site_id, tenant_id, placement_id, period_start, period_end,
        amount, currency, platform_fee, owner_payout, status)
     VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, $8, $9, 'issued')
     RETURNING *`,
    [
      input.site.id,
      input.tenantId,
      input.placementId,
      start.toISOString().slice(0, 10),
      end.toISOString().slice(0, 10),
      input.amount,
      input.currency,
      fee,
      input.amount - fee,
    ]
  )
}

/**
 * Payment received: the card goes live until the end of the paid period.
 * Extensions start from the current paid_until so nobody loses days.
 */
export async function markInvoicePaid(invoiceId: string, siteId: string): Promise<InvoiceRow | null> {
  const invoice = await one<InvoiceRow>(
    `UPDATE hub.site_invoices SET status = 'paid', paid_at = now()
      WHERE id = $1 AND site_id = $2 AND status <> 'paid'
      RETURNING *`,
    [invoiceId, siteId]
  )
  if (!invoice?.placement_id) return invoice

  const months = monthsBetween(invoice.period_start, invoice.period_end)
  await q(
    `UPDATE hub.site_placements
        SET status = 'active',
            paid_until = GREATEST(COALESCE(paid_until, now()), now()) + make_interval(months => $2),
            updated_at = now()
      WHERE id = $1`,
    [invoice.placement_id, months]
  )
  return invoice
}

export function monthsBetween(start: string, end: string): number {
  const a = new Date(start)
  const b = new Date(end)
  const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  return Math.max(1, months)
}

/** Trial plans go live immediately; paid ones wait for the invoice. */
export function planActivation(plan: SitePlan | null): {
  status: 'active' | 'pending_payment'
  paidUntil: Date | null
} {
  if (!plan || plan.price_per_card <= 0) return { status: 'active', paidUntil: null }
  if (plan.trial_days > 0) {
    const until = new Date()
    until.setDate(until.getDate() + plan.trial_days)
    return { status: 'active', paidUntil: until }
  }
  return { status: 'pending_payment', paidUntil: null }
}
