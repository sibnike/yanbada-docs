import { NextResponse } from 'next/server'
import { one } from '@/lib/db'
import { ownerContext, readJson } from '@/lib/api'
import { loadOwnerDashboard } from '@/lib/sites/dashboard'
import { toSite } from '@/lib/sites/load'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params
  const context = await ownerContext(slug)
  if (context instanceof NextResponse) return context
  return NextResponse.json(await loadOwnerDashboard(context.site))
}

/** Market configuration: branding, scope, how cards get in and what they cost. */
export async function PATCH(request: Request, { params }: Params) {
  const { slug } = await params
  const context = await ownerContext(slug)
  if (context instanceof NextResponse) return context

  const body = await readJson(request)
  const sets: string[] = []
  const values: unknown[] = [context.site.id]

  const push = (column: string, value: unknown) => {
    values.push(value)
    sets.push(`${column} = $${values.length}`)
  }

  if (body.settings && typeof body.settings === 'object') {
    push('settings', JSON.stringify({ ...context.site.settings, ...(body.settings as object) }))
  }
  if (body.seo && typeof body.seo === 'object') {
    push('seo', JSON.stringify({ ...context.site.seo, ...(body.seo as object) }))
  }
  if (body.name && typeof body.name === 'object') push('name', JSON.stringify(body.name))
  if (body.description && typeof body.description === 'object') {
    push('description', JSON.stringify(body.description))
  }
  if (typeof body.template === 'string' && ['operator', 'destination'].includes(body.template)) {
    push('template', body.template)
  }
  if (typeof body.placement_mode === 'string' && ['scope', 'approved', 'mixed'].includes(body.placement_mode)) {
    push('placement_mode', body.placement_mode)
  }
  if (
    typeof body.pricing_model === 'string' &&
    ['free', 'monthly', 'commission', 'hybrid'].includes(body.pricing_model)
  ) {
    push('pricing_model', body.pricing_model)
  }
  if (typeof body.accepts_requests === 'boolean') push('accepts_requests', body.accepts_requests)
  if (typeof body.is_active === 'boolean') push('is_active', body.is_active)
  if (body.max_cards_per_tenant === null || typeof body.max_cards_per_tenant === 'number') {
    push('max_cards_per_tenant', body.max_cards_per_tenant)
  }
  if (typeof body.platform_fee_percent === 'number') {
    push('platform_fee_percent', Math.min(100, Math.max(0, body.platform_fee_percent)))
  }
  if (typeof body.default_currency === 'string') push('default_currency', body.default_currency.slice(0, 8))

  if (sets.length === 0) return NextResponse.json({ ok: true, site: context.site })

  const row = await one(
    `UPDATE hub.sites SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 RETURNING *`,
    values
  )
  return NextResponse.json({ ok: true, site: row ? toSite(row) : context.site })
}
