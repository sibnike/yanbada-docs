import { NextResponse } from 'next/server'
import { publicDb, hubDb, throwIf } from '@/lib/sb'
import { bad, isUuid, readJson, siteOr404 } from '@/lib/api'
import { clearSession, codeMatches, setSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await readJson(request)
  if (!codeMatches(body.code)) return bad('Неверный код доступа', 401)

  const site = await siteOr404(String(body.site ?? ''))
  if (site instanceof NextResponse) return site

  if (body.role === 'tenant') {
    if (!isUuid(body.tenant_id)) return bad('Не выбрана компания')
    const { data: tenant, error } = await publicDb()
      .from('tenants')
      .select('id, name')
      .eq('id', body.tenant_id)
      .maybeSingle()
    throwIf(error)
    if (!tenant) return bad('Компания не относится к этой витрине', 403)
    if (!site.tenant_ids.includes(tenant.id)) {
      const { data: placed, error: placeError } = await hubDb()
        .from('site_placements')
        .select('id')
        .eq('site_id', site.id)
        .eq('tenant_id', tenant.id)
        .limit(1)
        .maybeSingle()
      throwIf(placeError)
      if (!placed) return bad('Компания не относится к этой витрине', 403)
    }
    await setSession({ role: 'tenant', site: site.slug, tenant: tenant.id, name: tenant.name })
    return NextResponse.json({ ok: true, redirect: `/cabinet/${site.slug}/tenant` })
  }

  await setSession({ role: 'owner', site: site.slug, name: 'Владелец витрины' })
  return NextResponse.json({ ok: true, redirect: `/cabinet/${site.slug}` })
}

export async function DELETE() {
  await clearSession()
  return NextResponse.json({ ok: true })
}
