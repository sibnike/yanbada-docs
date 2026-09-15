import { NextResponse } from 'next/server'
import { hubDb, throwIf } from '@/lib/sb'
import { bad, isUuid, readJson, tenantContext, text } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** The tenant side of the funnel: ask the market owner for a card. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const context = await tenantContext(slug)
  if (context instanceof NextResponse) return context
  if (!context.site.accepts_requests) return bad('Приём заявок закрыт', 403)

  const body = await readJson(request)
  const listingIds = Array.isArray(body.listing_ids) ? body.listing_ids.filter(isUuid) : []
  const includeCompany = body.include_company === true
  if (listingIds.length === 0 && !includeCompany) return bad('Выберите хотя бы одну карточку')

  const { data: pending, error } = await hubDb()
    .from('site_placement_requests')
    .select('id')
    .eq('site_id', context.site.id)
    .eq('tenant_id', context.session.tenant)
    .eq('status', 'pending')
    .maybeSingle()
  throwIf(error)
  if (pending) return bad('Предыдущая заявка ещё на рассмотрении', 409)

  const { data, error: insertError } = await hubDb()
    .from('site_placement_requests')
    .insert({
      site_id: context.site.id,
      tenant_id: context.session.tenant,
      plan_id: isUuid(body.plan_id) ? body.plan_id : null,
      direction: 'tenant_request',
      listing_ids: listingIds,
      include_company: includeCompany,
      message: text(body.message, 1000),
      contact: { name: context.session.name ?? '' },
      status: 'pending',
      accepted_terms_at: new Date().toISOString(),
    })
    .select('id')
    .maybeSingle()
  throwIf(insertError)
  return NextResponse.json({ ok: true, id: data?.id })
}

/** Cancel a request the owner has not decided yet. */
export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const context = await tenantContext(slug)
  if (context instanceof NextResponse) return context

  const body = await readJson(request)
  if (!isUuid(body.id)) return bad('Нет заявки')
  const { error } = await hubDb()
    .from('site_placement_requests')
    .update({ status: 'cancelled', decided_at: new Date().toISOString() })
    .eq('id', body.id)
    .eq('site_id', context.site.id)
    .eq('tenant_id', context.session.tenant)
    .eq('status', 'pending')
  throwIf(error)
  return NextResponse.json({ ok: true })
}
