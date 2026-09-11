import { NextResponse } from 'next/server'
import { bad, readJson, text } from '@/lib/api'
import { q } from '@/lib/db'
import { answerFromSite, askOpenAI } from '@/lib/sites/assistant'
import { buildAssistantSystemPrompt } from '@/lib/sites/build-assistant-context'
import { loadKnowledge, loadPublicPayload } from '@/lib/sites/load'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const message = text((await readJson(request)).message, 800)
  if (!message) return bad('Пустой вопрос')

  const payload = await loadPublicPayload(slug)
  if (!payload) return bad('Витрина не найдена', 404)
  if (payload.site.settings.assistant?.enabled === false) return bad('Ассистент выключен', 403)

  const [knowledge, base] = await Promise.all([
    loadKnowledge(payload.site.id),
    q<{ title: Record<string, string>; body: string }>(
      'SELECT title, body FROM hub.assistant_base_knowledge WHERE is_active ORDER BY sort_order'
    ),
  ])

  const system = buildAssistantSystemPrompt({
    site: payload.site,
    pages: payload.pages,
    posts: payload.posts,
    companies: payload.companies,
    listings: payload.listings,
    siteKnowledge: knowledge,
    baseKnowledge: base.map((row) => ({ title: row.title?.ru ?? '', body: row.body })),
    plans: payload.plans,
    manualCards: payload.manual_cards,
  })

  const llm = await askOpenAI(system, message)
  return NextResponse.json(llm ?? answerFromSite(message, payload, knowledge))
}
