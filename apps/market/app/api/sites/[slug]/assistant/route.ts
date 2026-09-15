import { NextResponse } from 'next/server'
import { bad, readJson, text } from '@/lib/api'
import { answerFromSite, askOpenAI } from '@/lib/sites/assistant'
import { buildAssistantSystemPrompt } from '@/lib/sites/build-assistant-context'
import { loadBaseKnowledge, loadKnowledge, loadPublicPayload } from '@/lib/sites/load'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const message = text((await readJson(request)).message, 800)
  if (!message) return bad('Пустой вопрос')

  const payload = await loadPublicPayload(slug)
  if (!payload) return bad('Витрина не найдена', 404)
  if (payload.site.settings.assistant?.enabled === false) return bad('Ассистент выключен', 403)

  const knowledge = await loadKnowledge(payload.site.id)
  const base = await loadBaseKnowledge()

  const system = buildAssistantSystemPrompt({
    site: payload.site,
    pages: payload.pages,
    posts: payload.posts,
    companies: payload.companies,
    listings: payload.listings,
    siteKnowledge: knowledge,
    baseKnowledge: base,
    plans: payload.plans,
    manualCards: payload.manual_cards,
  })

  const llm = await askOpenAI(system, message)
  return NextResponse.json(llm ?? answerFromSite(message, payload, knowledge))
}
