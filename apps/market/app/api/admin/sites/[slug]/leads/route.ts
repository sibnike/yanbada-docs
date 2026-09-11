import { NextResponse } from 'next/server'
import { q } from '@/lib/db'
import { bad, isUuid, ownerContext, readJson } from '@/lib/api'

export const dynamic = 'force-dynamic'

const STATUSES = ['new', 'contacted', 'invited', 'converted', 'declined']

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const context = await ownerContext(slug)
  if (context instanceof NextResponse) return context

  const body = await readJson(request)
  if (!isUuid(body.id)) return bad('Нет заявки')
  const status = String(body.status ?? '')
  if (!STATUSES.includes(status)) return bad('Неизвестный статус')

  // A lead becomes a tenant only after it registers in Vitrina; until then the
  // owner just moves it along the funnel.
  await q('UPDATE hub.site_leads SET status = $3 WHERE id = $1 AND site_id = $2', [
    body.id,
    context.site.id,
    status,
  ])
  return NextResponse.json({ ok: true })
}
