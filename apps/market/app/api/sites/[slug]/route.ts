import { NextResponse } from 'next/server'
import { loadPublicPayload } from '@/lib/sites/load'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await loadPublicPayload(slug)
  if (!payload) return NextResponse.json({ error: 'Витрина не найдена' }, { status: 404 })
  return NextResponse.json(payload)
}
