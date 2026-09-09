import { NextRequest, NextResponse } from 'next/server'
import { callAnthropic } from '@/lib/ai/call-anthropic'
import { extractJsonObject } from '@/lib/marketplace/marketplace-ai-json'
import { checkRateLimit } from '@/lib/rate-limit'
import { HEAVY_API_MAX_DURATION_SEC } from '@/lib/vercel/heavy-api-duration'
import {
  buildAssistantSystemPrompt,
  loadAssistantKnowledge,
} from '@/lib/sites/build-assistant-context'
import { getActiveSiteBySlug } from '@/lib/sites/get-site'
import { loadSiteManualCards, loadSitePlacements, loadSitePlans } from '@/lib/sites/load-placements'
import { loadSitePages, loadSitePosts } from '@/lib/sites/load-site-content'
import { searchSiteListings } from '@/lib/sites/search-site-listings'
import type { AssistantLink, AssistantReply } from '@/types/site'

export const dynamic = 'force-dynamic'
export const maxDuration = HEAVY_API_MAX_DURATION_SEC

type RouteContext = { params: Promise<{ slug: string }> }

type Body = {
  message?: string
  locale?: string
}

export async function POST(request: NextRequest, context: RouteContext) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  if (!checkRateLimit(`sites-assistant:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 })
  }

  const { slug } = await context.params
  const site = await getActiveSiteBySlug(slug)
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  if (site.settings.assistant?.enabled === false) {
    return NextResponse.json({ error: 'Assistant disabled' }, { status: 403 })
  }

  const body = (await request.json()) as Body
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) {
    return NextResponse.json({ error: 'message обязателен' }, { status: 400 })
  }

  const placements = await loadSitePlacements(site.id)
  const [{ listings, companies }, pages, posts, knowledge, plans, manualCards] = await Promise.all([
    searchSiteListings(site, placements),
    loadSitePages(site.id),
    loadSitePosts(site.id),
    loadAssistantKnowledge(site.id),
    loadSitePlans(site.id),
    loadSiteManualCards(site.id),
  ])

  const system = buildAssistantSystemPrompt({
    site,
    pages,
    posts,
    companies,
    listings,
    siteKnowledge: knowledge.siteKnowledge,
    baseKnowledge: knowledge.baseKnowledge,
    plans,
    manualCards,
  })

  const raw = await callAnthropic({
    system,
    user: message,
    maxTokens: 700,
  })

  let parsed: AssistantReply
  try {
    const obj = extractJsonObject(raw) as Partial<AssistantReply>
    parsed = {
      reply: typeof obj.reply === 'string' ? obj.reply : raw,
      links: Array.isArray(obj.links) ? obj.links.filter(isLink) : [],
    }
  } catch {
    parsed = { reply: raw, links: [] }
  }

  return NextResponse.json(parsed)
}

function isLink(v: unknown): v is AssistantLink {
  if (!v || typeof v !== 'object') return false
  const row = v as Record<string, unknown>
  const kind = row.kind
  return (
    typeof row.label === 'string' &&
    typeof row.href === 'string' &&
    (kind === 'listing' || kind === 'company' || kind === 'page' || kind === 'post')
  )
}
