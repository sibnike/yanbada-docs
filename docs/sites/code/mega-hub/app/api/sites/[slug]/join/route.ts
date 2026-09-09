import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { getActiveSiteBySlug } from '@/lib/sites/get-site'
import { currentUserTenantIds } from '@/lib/sites/site-access'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ slug: string }> }

type JoinBody = {
  company_name?: string
  contact_name?: string
  contact?: Record<string, string>
  plan_slug?: string
  message?: string
  accepted_terms?: boolean
  tenant_id?: string
}

/**
 * Public intake for "place my cards here".
 *
 * A tenant admin gets a real placement request. Everyone else becomes a lead:
 * businesses a market owner recruits usually have no Vitrina account yet, and
 * dropping them would kill both the market and tenant acquisition.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  if (!checkRateLimit(`site-join:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Слишком много заявок, попробуйте позже' }, { status: 429 })
  }

  const { slug } = await context.params
  const site = await getActiveSiteBySlug(slug)
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  if (!site.accepts_requests) {
    return NextResponse.json({ error: 'Приём заявок закрыт' }, { status: 409 })
  }

  const body = (await request.json().catch(() => ({}))) as JoinBody
  const companyName = (body.company_name ?? '').trim()
  if (!companyName) {
    return NextResponse.json({ error: 'Укажите компанию' }, { status: 400 })
  }

  const contact = sanitizeContact(body.contact)
  if (Object.keys(contact).length === 0) {
    return NextResponse.json({ error: 'Оставьте телефон, email или telegram' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: plan } = body.plan_slug
    ? await supabase
        .schema('hub')
        .from('site_plans')
        .select('id')
        .eq('site_id', site.id)
        .eq('slug', body.plan_slug)
        .eq('is_active', true)
        .maybeSingle()
    : { data: null }

  const planId = plan ? String((plan as { id: string }).id) : null
  const acceptedAt = body.accepted_terms ? new Date().toISOString() : null

  const tenantIds = await currentUserTenantIds()
  const tenantId =
    body.tenant_id && tenantIds.includes(body.tenant_id) ? body.tenant_id : tenantIds[0] ?? null

  if (tenantId) {
    const { error } = await supabase
      .schema('hub')
      .from('site_placement_requests')
      .insert({
        site_id: site.id,
        tenant_id: tenantId,
        plan_id: planId,
        direction: 'tenant_request',
        include_company: true,
        message: body.message?.slice(0, 2000) ?? null,
        contact,
        accepted_terms_at: acceptedAt,
      })

    if (error) {
      console.error('[site join request]', error.message)
      return NextResponse.json({ error: 'Не удалось создать заявку' }, { status: 400 })
    }
    return NextResponse.json({ ok: true, kind: 'request' })
  }

  const { error } = await supabase.schema('hub').from('site_leads').insert({
    site_id: site.id,
    plan_id: planId,
    company_name: companyName.slice(0, 200),
    contact_name: body.contact_name?.slice(0, 200) ?? null,
    contact,
    message: body.message?.slice(0, 2000) ?? null,
    source: request.headers.get('referer'),
    accepted_terms_at: acceptedAt,
  })

  if (error) {
    console.error('[site join lead]', error.message)
    return NextResponse.json({ error: 'Не удалось отправить заявку' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, kind: 'lead' })
}

function sanitizeContact(raw: Record<string, string> | undefined): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, string> = {}
  for (const key of ['phone', 'email', 'telegram', 'whatsapp'] as const) {
    const value = raw[key]
    if (typeof value === 'string' && value.trim()) out[key] = value.trim().slice(0, 200)
  }
  return out
}
