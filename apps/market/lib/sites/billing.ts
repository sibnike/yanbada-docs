import { hubDb, throwIf } from '@/lib/sb'
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

function toInvoice(row: Record<string, unknown>): InvoiceRow {
  return {
    id: String(row.id),
    site_id: String(row.site_id),
    tenant_id: String(row.tenant_id),
    placement_id: row.placement_id ? String(row.placement_id) : null,
    period_start: String(row.period_start).slice(0, 10),
    period_end: String(row.period_end).slice(0, 10),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency),
    platform_fee: Number(row.platform_fee ?? 0),
    owner_payout: Number(row.owner_payout ?? 0),
    status: String(row.status) as InvoiceRow['status'],
    issued_at: String(row.issued_at ?? ''),
    paid_at: row.paid_at ? String(row.paid_at) : null,
  }
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

  const { data, error } = await hubDb()
    .from('site_invoices')
    .insert({
      site_id: input.site.id,
      tenant_id: input.tenantId,
      placement_id: input.placementId,
      period_start: start.toISOString().slice(0, 10),
      period_end: end.toISOString().slice(0, 10),
      amount: input.amount,
      currency: input.currency,
      platform_fee: fee,
      owner_payout: input.amount - fee,
      status: 'issued',
    })
    .select('*')
    .maybeSingle()
  throwIf(error)
  return data ? toInvoice(data as Record<string, unknown>) : null
}

/**
 * Payment received: the card goes live until the end of the paid period.
 * Extensions start from the current paid_until so nobody loses days.
 */
export async function markInvoicePaid(invoiceId: string, siteId: string): Promise<InvoiceRow | null> {
  const current = await hubDb()
    .from('site_invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('site_id', siteId)
    .maybeSingle()
  throwIf(current.error)
  if (!current.data || current.data.status === 'paid') return null

  const { data, error } = await hubDb()
    .from('site_invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .eq('site_id', siteId)
    .select('*')
    .maybeSingle()
  throwIf(error)
  if (!data) return null
  const invoice = toInvoice(data as Record<string, unknown>)
  if (!invoice.placement_id) return invoice

  const months = monthsBetween(invoice.period_start, invoice.period_end)
  const placement = await hubDb()
    .from('site_placements')
    .select('paid_until')
    .eq('id', invoice.placement_id)
    .maybeSingle()
  throwIf(placement.error)
  const from = new Date(
    Math.max(
      Date.now(),
      placement.data?.paid_until ? new Date(String(placement.data.paid_until)).getTime() : 0
    )
  )
  const until = addMonths(from, months)
  const { error: placeError } = await hubDb()
    .from('site_placements')
    .update({
      status: 'active',
      paid_until: until.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoice.placement_id)
  throwIf(placeError)
  return invoice
}

export async function voidInvoice(invoiceId: string, siteId: string): Promise<void> {
  const { error } = await hubDb()
    .from('site_invoices')
    .update({ status: 'void' })
    .eq('id', invoiceId)
    .eq('site_id', siteId)
  throwIf(error)
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
