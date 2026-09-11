// Pure prompt builder: no data access, so any runtime (mega-hub with Supabase,
// apps/market with pg) can feed it the same context.
import { getI18nText } from '@/lib/i18n/get-text'
import type {
  SiteCompany,
  SiteKnowledge,
  SiteListing,
  SiteManualCard,
  SitePage,
  SitePlan,
  SitePost,
  SiteRow,
} from '@/types/site'

export type AssistantContextInput = {
  site: SiteRow
  pages: SitePage[]
  posts: SitePost[]
  companies: SiteCompany[]
  listings: SiteListing[]
  siteKnowledge: SiteKnowledge[]
  baseKnowledge: { title: string; body: string }[]
  manualCards?: SiteManualCard[]
  plans?: SitePlan[]
}

export function buildAssistantSystemPrompt(input: AssistantContextInput): string {
  const name = getI18nText(input.site.settings.display_name, 'ru', getI18nText(input.site.name, 'ru', input.site.slug))
  const base = input.baseKnowledge.map((k) => `### ${k.title}\n${k.body}`).join('\n\n')
  const siteKb = input.siteKnowledge
    .map((k) => `### ${getI18nText(k.title, 'ru')} (${k.kind})\n${k.body}`)
    .join('\n\n')

  const pages = input.pages
    .map((p) => {
      const blocks = p.blocks.map((b) => `- блок ${b.type}`).join('\n')
      return `- /s/${input.site.slug}${p.slug === 'home' ? '' : '/' + p.slug} — ${getI18nText(p.title, 'ru', p.slug)}\n${blocks}`
    })
    .join('\n')

  const posts = input.posts
    .map((p) => `- /s/${input.site.slug}/journal/${p.slug} — ${getI18nText(p.title, 'ru')}: ${getI18nText(p.excerpt, 'ru')}`)
    .join('\n')

  const companies = input.companies
    .map((c) => `- ${c.name} (${c.slug ?? c.tenant_id}), ${[c.city, c.country].filter(Boolean).join(', ')}`)
    .join('\n')

  const listings = input.listings
    .map((l) => {
      const title = getI18nText(l.title, 'ru')
      const price = l.price_from != null ? `${l.price_from} ${l.price_currency ?? ''}`.trim() : 'цена не указана'
      return `- ${title} / оператор ${l.tenant_name} / ${price} / дата ${l.next_departure_date ?? '—'} / href=/s/${input.site.slug}#listing-${l.id}`
    })
    .join('\n')

  const manual = (input.manualCards ?? [])
    .map((c) => `- ${getI18nText(c.title, 'ru')} (${c.kind}, добавлено автором): ${getI18nText(c.body, 'ru')}`)
    .join('\n')

  // Owners get asked "how do I get listed" as often as guests ask about tours.
  const plans = (input.plans ?? [])
    .map((p) => {
      const price =
        p.price_per_card === 0
          ? 'бесплатно'
          : `${p.price_per_card} ${p.currency} за карточку / ${p.period_months} мес.`
      return `- ${getI18nText(p.name, 'ru', p.slug)}: ${price}, карточек до ${p.card_quota}, позиция ${p.slot}`
    })
    .join('\n')

  return `Ты менеджер сайта «${name}» (slug ${input.site.slug}).
Помогаешь гостю найти карточку тенанта, услугу или материал проекта. Не выдумывай факты вне контекста.

Ответ — только JSON:
{"reply": "текст на языке гостя", "links": [{"label": "...", "href": "...", "kind": "listing|company|page|post"}]}

## Базовые знания платформы
${base || '(нет)'}

## Знания этого сайта
${siteKb || '(нет отдельных статей)'}

## Страницы конструктора
${pages || '(нет)'}

## Журнал / доп. материалы
${posts || '(нет)'}

## Карточки тенантов
${companies || '(нет)'}

## Услуги
${listings || '(нет)'}

## Места от автора витрины (не тенанты, бронировать нельзя)
${manual || '(нет)'}

## Тарифы размещения (для компаний, которые хотят попасть в витрину)
${plans || '(размещение не продаётся)'}
${input.site.accepts_requests ? `Заявка: /s/${input.site.slug}/join` : 'Приём заявок закрыт.'}`
}
