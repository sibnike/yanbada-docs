import { NextResponse } from 'next/server'
import { one } from '@/lib/db'
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
    const tenant = await one<{ id: string; name: string }>(
      `SELECT t.id, t.name FROM public.tenants t
        WHERE t.id = $1
          AND (t.id = ANY($2::uuid[])
               OR EXISTS (SELECT 1 FROM hub.site_placements p
                           WHERE p.site_id = $3 AND p.tenant_id = t.id))`,
      [body.tenant_id, site.tenant_ids, site.id]
    )
    if (!tenant) return bad('Компания не относится к этой витрине', 403)
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
