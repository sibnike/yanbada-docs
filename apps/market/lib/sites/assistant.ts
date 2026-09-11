import { loc } from '@/lib/sites/public-copy'
import type { AssistantLink, AssistantReply, SitePublicPayload, SiteKnowledge } from '@/types/site'

/**
 * Answer without an LLM key: score the site's own material against the question
 * and answer from the best matches. Same data the model would get, so the
 * assistant is never a stub — it just gets terser without a key.
 */
export function answerFromSite(
  question: string,
  payload: SitePublicPayload,
  knowledge: SiteKnowledge[],
  locale = 'ru'
): AssistantReply {
  const words = tokens(question)
  const slug = payload.site.slug
  const scored: { score: number; text: string; link?: AssistantLink }[] = []

  for (const listing of payload.listings) {
    const title = loc(listing.title, locale)
    const body = loc(listing.short_text, locale)
    const price = listing.price_from != null ? `${listing.price_from} ${listing.price_currency ?? ''}`.trim() : null
    scored.push({
      score: match(words, `${title} ${body} ${listing.tenant_name ?? ''} ${listing.marketplace_themes.join(' ')}`),
      text: `${title} — ${listing.tenant_name}${price ? `, от ${price}` : ''}. ${body}`,
      link: { label: title, href: `/s/${slug}#listing-${listing.id}`, kind: 'listing' },
    })
  }

  for (const post of payload.posts) {
    const title = loc(post.title, locale)
    scored.push({
      score: match(words, `${title} ${loc(post.excerpt, locale)} ${loc(post.body, locale)}`) * 0.9,
      text: `${title}: ${loc(post.excerpt, locale)}`,
      link: { label: title, href: `/s/${slug}/journal/${post.slug}`, kind: 'post' },
    })
  }

  for (const card of payload.manual_cards) {
    const title = loc(card.title, locale)
    scored.push({
      score: match(words, `${title} ${loc(card.body, locale)}`) * 0.8,
      text: `${title} — ${loc(card.body, locale)}`,
    })
  }

  for (const entry of knowledge) {
    // `rule` entries are instructions for the model, not something to read out.
    if (entry.kind === 'rule') continue
    scored.push({
      score: match(words, `${loc(entry.title, locale)} ${entry.body}`) * 1.1,
      text: entry.body,
    })
  }

  if (payload.plans.length > 0) {
    const planText = payload.plans
      .map((plan) => {
        const price =
          plan.price_per_card === 0
            ? 'бесплатно'
            : `${plan.price_per_card} ${plan.currency} за карточку / ${plan.period_months} мес.`
        return `${loc(plan.name, locale, plan.slug)} — ${price}`
      })
      .join('; ')
    scored.push({
      score: match(words, 'разместиться размещение тариф тарифы цена стоимость карточка компания попасть витрину') * 1.2,
      text: `Размещение платное: ${planText}. Заявку оставляют на странице «Разместиться».`,
      link: { label: 'Условия размещения', href: `/s/${slug}/join`, kind: 'page' },
    })
  }

  const best = scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3)
  if (best.length === 0) {
    const fallback = payload.listings.slice(0, 3)
    return {
      reply:
        'Не нашёл точного совпадения по витрине. Вот что есть сейчас: ' +
        fallback.map((l) => loc(l.title, locale)).join(', ') +
        '.',
      links: fallback.map((l) => ({
        label: loc(l.title, locale),
        href: `/s/${slug}#listing-${l.id}`,
        kind: 'listing' as const,
      })),
    }
  }

  return {
    reply: best.map((item) => item.text).join('\n\n'),
    links: best.map((item) => item.link).filter((link): link is AssistantLink => Boolean(link)),
  }
}

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2)
}

function match(words: string[], haystack: string): number {
  const text = haystack.toLowerCase()
  let score = 0
  for (const word of words) {
    const stem = word.length > 5 ? word.slice(0, word.length - 2) : word
    if (text.includes(stem)) score += 1
  }
  return score
}

export async function askOpenAI(system: string, message: string): Promise<AssistantReply | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: message },
      ],
    }),
  }).catch(() => null)

  if (!response?.ok) return null
  const data = (await response.json().catch(() => null)) as
    | { choices?: { message?: { content?: string } }[] }
    | null
  const raw = data?.choices?.[0]?.message?.content
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<AssistantReply>
    return {
      reply: typeof parsed.reply === 'string' ? parsed.reply : raw,
      links: Array.isArray(parsed.links) ? parsed.links.filter(isLink) : [],
    }
  } catch {
    return { reply: raw, links: [] }
  }
}

function isLink(value: unknown): value is AssistantLink {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (
    typeof row.label === 'string' &&
    typeof row.href === 'string' &&
    ['listing', 'company', 'page', 'post'].includes(String(row.kind))
  )
}
