import { NextResponse } from 'next/server'
import { hubDb, throwIf } from '@/lib/sb'
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

  const { error } = await hubDb()
    .from('site_leads')
    .update({ status })
    .eq('id', body.id)
    .eq('site_id', context.site.id)
  throwIf(error)
  return NextResponse.json({ ok: true })
}
