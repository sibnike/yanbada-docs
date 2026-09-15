import { NextResponse } from 'next/server'
import { hubDb, throwIf } from '@/lib/sb'
import { readJson, siteOr404 } from '@/lib/api'

export const dynamic = 'force-dynamic'

const COLUMN = {
  impression: 'impressions',
  click: 'clicks',
  booking_hit: 'booking_hits',
} as const

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const site = await siteOr404(slug)
  if (site instanceof NextResponse) return site

  const body = await readJson(request)
  const column = COLUMN[body.event as keyof typeof COLUMN]
  const listingIds = Array.isArray(body.listing_ids)
    ? (body.listing_ids as unknown[])
        .map(String)
        .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
        .slice(0, 60)
    : []
  if (!column || listingIds.length === 0) return NextResponse.json({ ok: true, counted: 0 })

  const { data: placements, error } = await hubDb()
    .from('site_placements')
    .select('id, listing_id')
    .eq('site_id', site.id)
    .in('listing_id', listingIds)
  throwIf(error)

  const today = new Date().toISOString().slice(0, 10)
  let counted = 0
  for (const placement of placements ?? []) {
    const { data: existing, error: existingError } = await hubDb()
      .from('site_card_stats')
      .select('id, impressions, clicks, booking_hits')
      .eq('placement_id', placement.id)
      .eq('day', today)
      .maybeSingle()
    throwIf(existingError)
    if (existing) {
      const { error: updateError } = await hubDb()
        .from('site_card_stats')
        .update({ [column]: Number(existing[column] ?? 0) + 1 })
        .eq('id', existing.id)
      throwIf(updateError)
    } else {
      const { error: insertError } = await hubDb().from('site_card_stats').insert({
        site_id: site.id,
        placement_id: placement.id,
        listing_id: placement.listing_id,
        day: today,
        [column]: 1,
      })
      throwIf(insertError)
    }
    counted += 1
  }

  return NextResponse.json({ ok: true, counted })
}
