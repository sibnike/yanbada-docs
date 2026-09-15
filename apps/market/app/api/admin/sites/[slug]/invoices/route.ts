import { NextResponse } from 'next/server'
import { bad, isUuid, ownerContext, readJson } from '@/lib/api'
import { markInvoicePaid, voidInvoice } from '@/lib/sites/billing'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const { slug } = await params
  const context = await ownerContext(slug)
  if (context instanceof NextResponse) return context

  const body = await readJson(request)
  if (!isUuid(body.id)) return bad('Нет счёта')

  if (body.action === 'void') {
    await voidInvoice(String(body.id), context.site.id)
    return NextResponse.json({ ok: true })
  }

  const invoice = await markInvoicePaid(String(body.id), context.site.id)
  if (!invoice) return bad('Счёт уже оплачен или не найден', 409)
  return NextResponse.json({ ok: true, invoice })
}
