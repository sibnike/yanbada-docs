import { NextResponse } from 'next/server'
import { bad, ownerContext, readJson } from '@/lib/api'
import { loadOwnerDashboard } from '@/lib/sites/dashboard'
import { toSite } from '@/lib/sites/load'
import { updateSiteRow } from '@/lib/sites/write'

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
  const patch: Record<string, unknown> = {}

  if (body.settings && typeof body.settings === 'object') {
    patch.settings = { ...context.site.settings, ...(body.settings as object) }
  }
  if (body.seo && typeof body.seo === 'object') {
    patch.seo = { ...context.site.seo, ...(body.seo as object) }
  }
  if (body.name && typeof body.name === 'object') patch.name = body.name
  if (body.description && typeof body.description === 'object') patch.description = body.description
  if (
    typeof body.template === 'string' &&
    ['operator', 'destination', 'visit_center', 'tour_operator', 'guide'].includes(body.template)
  ) {
    patch.template = body.template === 'operator' ? 'tour_operator' : body.template === 'destination' ? 'visit_center' : body.template
  }
  if (typeof body.placement_mode === 'string' && ['scope', 'approved', 'mixed'].includes(body.placement_mode)) {
    patch.placement_mode = body.placement_mode
  }
  if (
    typeof body.pricing_model === 'string' &&
    ['free', 'monthly', 'commission', 'hybrid'].includes(body.pricing_model)
  ) {
    patch.pricing_model = body.pricing_model
  }
  if (typeof body.accepts_requests === 'boolean') patch.accepts_requests = body.accepts_requests
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active
  if (body.max_cards_per_tenant === null || typeof body.max_cards_per_tenant === 'number') {
    patch.max_cards_per_tenant = body.max_cards_per_tenant
  }
  if (typeof body.platform_fee_percent === 'number') {
    patch.platform_fee_percent = Math.min(100, Math.max(0, body.platform_fee_percent))
  }
  if (typeof body.default_currency === 'string') patch.default_currency = body.default_currency.slice(0, 8)

  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true, site: context.site })

  try {
    const row = await updateSiteRow(context.site.id, patch)
    return NextResponse.json({ ok: true, site: row ? toSite(row) : context.site })
  } catch (error) {
    return bad(error instanceof Error ? error.message : 'Не удалось сохранить', 500)
  }
}
